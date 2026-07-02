<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use PHPUnit\Framework\Attributes\Test;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User    $user;
    private Product $product;
    private Product $soldOut;
    private string  $webhookSecret = 'whsec_test_fake_secret_abc123';

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::create(['name' => 'Camisetas', 'slug' => 'camisetas']);

        $this->user = User::create([
            'name'     => 'Test User',
            'email'    => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->product = Product::create([
            'category_id' => $category->id,
            'name'        => 'Camiseta Classic',
            'slug'        => 'camiseta-classic',
            'description' => 'Descripción de test.',
            'price'       => 2499,
            'stock'       => 10,
            'is_active'   => true,
        ]);

        $this->soldOut = Product::create([
            'category_id' => $category->id,
            'name'        => 'Camiseta Agotada',
            'slug'        => 'camiseta-agotada',
            'description' => 'Producto agotado de test.',
            'price'       => 1999,
            'stock'       => 0,
            'is_active'   => true,
        ]);

        Config::set('services.stripe.webhook', $this->webhookSecret);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Sustituye el cliente HTTP de Stripe por uno que devuelve una sesión fake.
     * Evita llamadas reales a la API sin necesitar @runInSeparateProcess.
     */
    private function mockStripeSession(
        string $sessionId = 'cs_test_mock123',
        string $url = 'https://checkout.stripe.com/pay/cs_test_mock123'
    ): void {
        Config::set('services.stripe.secret', 'sk_test_fake_key');

        $fakeBody = json_encode([
            'id'       => $sessionId,
            'object'   => 'checkout.session',
            'url'      => $url,
            'livemode' => false,
        ]);

        $mockClient = new class ($fakeBody) implements ClientInterface {
            public function __construct(private string $body) {}

            public function request($method, $absUrl, $headers, $params, $hasFile, $apiMode = 'v1', $maxNetworkRetries = null): array
            {
                return [$this->body, 200, []];
            }
        };

        ApiRequestor::setHttpClient($mockClient);
    }

    /** Computa una cabecera Stripe-Signature válida para verificación local. */
    private function stripeSignature(string $payload): string
    {
        $timestamp = time();
        $hmac      = hash_hmac('sha256', "{$timestamp}.{$payload}", $this->webhookSecret);
        return "t={$timestamp},v1={$hmac}";
    }

    /** Construye el payload JSON de un evento checkout.session.completed. */
    private function webhookPayload(int $orderId, string $sessionId = 'cs_test_abc'): string
    {
        return json_encode([
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id'                  => $sessionId,
                    'client_reference_id' => (string) $orderId,
                    'payment_intent'      => 'pi_test_xxx',
                ],
            ],
        ]);
    }

    /**
     * Envía el payload RAW al endpoint del webhook.
     * La firma se calcula sobre el string exacto para que Stripe::constructEvent lo acepte.
     */
    private function sendWebhook(string $rawPayload): \Illuminate\Testing\TestResponse
    {
        return $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE'          => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($rawPayload),
            ],
            $rawPayload
        );
    }

    // ─── Tests de autenticación ────────────────────────────────────────────────

    #[Test]
    public function guest_cannot_initiate_checkout(): void
    {
        $response = $this->postJson('/api/checkout', [
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
        ]);

        $response->assertStatus(401);
        $this->assertDatabaseCount('orders', 0);
    }

    // ─── Tests de validación de stock ─────────────────────────────────────────

    #[Test]
    public function checkout_is_rejected_when_quantity_exceeds_stock(): void
    {
        // stock=10, quantity=11: pasa la validación max:100 pero falla la comprobación de stock
        $response = $this->actingAs($this->user)
            ->postJson('/api/checkout', [
                'items' => [['product_id' => $this->product->id, 'quantity' => 11]],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Stock insuficiente para algunos productos.');

        $this->assertDatabaseCount('orders', 0);
    }

    #[Test]
    public function checkout_is_rejected_when_product_is_sold_out(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/checkout', [
                'items' => [['product_id' => $this->soldOut->id, 'quantity' => 1]],
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    #[Test]
    public function checkout_is_rejected_with_empty_items(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/checkout', ['items' => []]);

        $response->assertStatus(422);
    }

    // ─── Test de checkout exitoso ──────────────────────────────────────────────

    #[Test]
    public function checkout_creates_pending_order_with_backend_prices_and_returns_stripe_url(): void
    {
        $this->mockStripeSession();

        $response = $this->actingAs($this->user)
            ->postJson('/api/checkout', [
                'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['checkout_url'])
            ->assertJsonPath('checkout_url', 'https://checkout.stripe.com/pay/cs_test_mock123');

        // El pedido se crea con status pending — el backend recalcula el total
        $this->assertDatabaseHas('orders', [
            'user_id' => $this->user->id,
            'status'  => 'pending',
            'total'   => 2499 * 2, // recalculado en backend, ignorando cualquier precio del frontend
        ]);

        // Los items congelan el unit_price del backend en el momento de compra
        $order = Order::first();
        $this->assertDatabaseHas('order_items', [
            'order_id'   => $order->id,
            'product_id' => $this->product->id,
            'quantity'   => 2,
            'unit_price' => 2499,
        ]);

        // El stock NO se descuenta hasta que el webhook confirme el pago
        $this->assertDatabaseHas('products', [
            'id'    => $this->product->id,
            'stock' => 10,
        ]);
    }

    // ─── Tests de webhook ─────────────────────────────────────────────────────

    #[Test]
    public function webhook_marks_order_as_paid_and_decrements_stock(): void
    {
        $order = Order::create(['user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending']);
        $order->items()->create([
            'product_id' => $this->product->id,
            'quantity'   => 3,
            'unit_price' => 2499,
        ]);

        $response = $this->sendWebhook($this->webhookPayload($order->id));

        $response->assertStatus(200);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('products', [
            'id'    => $this->product->id,
            'stock' => 7, // 10 - 3
        ]);
    }

    #[Test]
    public function webhook_is_idempotent_and_does_not_decrement_stock_twice(): void
    {
        // Simula el estado después del primer procesamiento exitoso
        $order = Order::create([
            'user_id'           => $this->user->id,
            'total'             => 2499,
            'status'            => 'paid',
            'stripe_session_id' => 'cs_test_abc',
        ]);
        $order->items()->create([
            'product_id' => $this->product->id,
            'quantity'   => 3,
            'unit_price' => 2499,
        ]);
        $this->product->update(['stock' => 7]); // stock ya descontado

        // Stripe reenvía el mismo evento
        $response = $this->sendWebhook($this->webhookPayload($order->id));

        $response->assertStatus(200);

        // El stock sigue siendo 7 — no se descontó dos veces
        $this->assertDatabaseHas('products', [
            'id'    => $this->product->id,
            'stock' => 7,
        ]);
    }

    #[Test]
    public function webhook_rejects_request_with_invalid_signature(): void
    {
        $order   = Order::create(['user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending']);
        $payload = $this->webhookPayload($order->id);

        $response = $this->call(
            'POST',
            '/api/stripe/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE'          => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => 't=1234567890,v1=firma_invalida',
            ],
            $payload
        );

        $response->assertStatus(400);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }
}
