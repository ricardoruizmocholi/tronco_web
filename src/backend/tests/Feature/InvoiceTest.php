<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    private User    $user;
    private Product $product;
    private string  $webhookSecret = 'whsec_test_fake_secret_abc123';

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::create(['name' => 'Camisetas', 'slug' => 'camisetas']);

        $this->user = User::create([
            'name'     => 'María García',
            'email'    => 'maria@example.com',
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

        Setting::set('company_billing_info', [
            'legal_name' => 'Troncodrilo Shop SL', 'tax_id' => 'B12345678',
            'address_line1' => 'Calle Test 1', 'postal_code' => '28001',
            'city' => 'Madrid', 'province' => 'Madrid', 'country' => 'ES', 'tax_rate' => 21,
        ]);

        Config::set('services.stripe.webhook', $this->webhookSecret);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function paidOrder(array $overrides = []): Order
    {
        $order = Order::create(array_merge([
            'user_id'          => $this->user->id,
            'total'            => 4998,
            'shipping_cost'    => 0,
            'status'           => 'paid',
            'shipping_address' => [
                'name' => $this->user->name, 'address_line1' => 'Calle Envío 1',
                'postal_code' => '28001', 'city' => 'Madrid', 'state' => 'Madrid', 'country' => 'ES',
            ],
        ], $overrides));

        $order->items()->create([
            'product_id' => $this->product->id,
            'quantity'   => 2,
            'unit_price' => 2499,
        ]);

        return $order;
    }

    private function stripeSignature(string $payload): string
    {
        $timestamp = time();
        $hmac      = hash_hmac('sha256', "{$timestamp}.{$payload}", $this->webhookSecret);
        return "t={$timestamp},v1={$hmac}";
    }

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

    private function sendWebhook(string $rawPayload): \Illuminate\Testing\TestResponse
    {
        return $this->call(
            'POST', '/api/stripe/webhook', [], [], [],
            [
                'CONTENT_TYPE'          => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($rawPayload),
            ],
            $rawPayload
        );
    }

    // ─── Numeración correlativa ────────────────────────────────────────────────

    #[Test]
    public function invoice_numbers_are_sequential_without_gaps_or_duplicates(): void
    {
        $service = app(InvoiceService::class);
        $numbers = [];

        for ($i = 0; $i < 8; $i++) {
            $order = $this->paidOrder();
            $numbers[] = $service->createForOrder($order)->number;
        }

        sort($numbers);
        $this->assertSame(range(1, 8), $numbers);
    }

    #[Test]
    public function invoice_full_number_follows_series_year_number_format(): void
    {
        $order   = $this->paidOrder();
        $invoice = app(InvoiceService::class)->createForOrder($order);

        $this->assertSame(sprintf('A-%d-000001', (int) now()->year), $invoice->full_number);
    }

    // ─── Desglose de IVA ────────────────────────────────────────────────────────

    #[Test]
    public function invoice_breaks_down_vat_from_tax_inclusive_total(): void
    {
        // total = 4998 (2 x 2499), sin gastos de envío
        $order   = $this->paidOrder();
        $invoice = app(InvoiceService::class)->createForOrder($order);

        $this->assertSame(4998, $invoice->total);
        // El total ya incluye IVA — subtotal + tax_amount deben sumar exactamente el total
        $this->assertSame($invoice->total, $invoice->subtotal + $invoice->tax_amount);
        $this->assertEquals(21.00, (float) $invoice->tax_rate);
    }

    // ─── Generación automática desde el webhook ───────────────────────────────

    #[Test]
    public function webhook_creates_simplified_invoice_when_no_billing_info_given(): void
    {
        $order = Order::create(['user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending']);
        $order->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 2499]);

        $this->sendWebhook($this->webhookPayload($order->id))->assertStatus(200);

        $this->assertDatabaseCount('invoices', 1);
        $invoice = Invoice::first();
        $this->assertSame($order->id, $invoice->order_id);
        $this->assertTrue($invoice->is_simplified);
        $this->assertSame($this->user->name, $invoice->buyer_name);
        $this->assertNull($invoice->buyer_tax_id);
    }

    #[Test]
    public function webhook_creates_full_invoice_when_billing_info_present(): void
    {
        $order = Order::create([
            'user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending',
            'billing_info' => [
                'tax_name' => 'María García Freelance', 'tax_id' => '12345678A',
                'address_line1' => 'Calle Facturación 5', 'postal_code' => '28002',
                'city' => 'Madrid', 'province' => 'Madrid', 'country' => 'ES',
            ],
        ]);
        $order->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 2499]);

        $this->sendWebhook($this->webhookPayload($order->id))->assertStatus(200);

        $invoice = Invoice::first();
        $this->assertFalse($invoice->is_simplified);
        $this->assertSame('María García Freelance', $invoice->buyer_name);
        $this->assertSame('12345678A', $invoice->buyer_tax_id);
    }

    #[Test]
    public function webhook_does_not_duplicate_invoice_on_resend(): void
    {
        $order = Order::create([
            'user_id' => $this->user->id, 'total' => 2499, 'status' => 'paid',
            'stripe_session_id' => 'cs_test_abc',
        ]);
        $order->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 2499]);
        app(InvoiceService::class)->createForOrder($order);

        // Stripe reenvía el mismo evento — el pedido ya estaba paid, así que
        // el webhook ni siquiera intenta volver a facturar (guard de idempotencia)
        $this->sendWebhook($this->webhookPayload($order->id))->assertStatus(200);

        $this->assertDatabaseCount('invoices', 1);
    }

    #[Test]
    public function invoice_generates_a_downloadable_pdf(): void
    {
        $order = Order::create(['user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending']);
        $order->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_price' => 2499]);

        $this->sendWebhook($this->webhookPayload($order->id))->assertStatus(200);

        $invoice = Invoice::first();
        $this->assertNotNull($invoice->pdf_path);
        $this->assertTrue(\Illuminate\Support\Facades\Storage::disk('local')->exists($invoice->pdf_path));
    }

    // ─── Permisos y endpoints ──────────────────────────────────────────────────

    #[Test]
    public function non_admin_cannot_list_invoices(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/admin/invoices')
            ->assertForbidden();
    }

    #[Test]
    public function admin_can_list_and_search_invoices(): void
    {
        $order   = $this->paidOrder();
        $invoice = app(InvoiceService::class)->createForOrder($order);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/invoices?search=' . urlencode($invoice->full_number))
            ->assertOk()
            ->assertJsonPath('data.0.full_number', $invoice->full_number);
    }

    #[Test]
    public function admin_can_download_invoice_pdf(): void
    {
        $order   = $this->paidOrder();
        $invoice = app(InvoiceService::class)->createForOrder($order);

        $this->actingAs($this->admin(), 'sanctum')
            ->get("/api/admin/invoices/{$invoice->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    #[Test]
    public function customer_can_download_own_invoice(): void
    {
        $order   = $this->paidOrder();
        app(InvoiceService::class)->createForOrder($order);

        $this->actingAs($this->user, 'sanctum')
            ->get("/api/orders/{$order->id}/invoice")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    #[Test]
    public function customer_cannot_download_someone_elses_invoice(): void
    {
        $order = $this->paidOrder();
        app(InvoiceService::class)->createForOrder($order);

        $stranger = User::create([
            'name' => 'Otro', 'email' => 'otro@example.com', 'password' => bcrypt('password'),
        ]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertForbidden();
    }

    #[Test]
    public function downloading_invoice_of_order_without_one_returns_404(): void
    {
        $order = Order::create(['user_id' => $this->user->id, 'total' => 2499, 'status' => 'pending']);

        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertNotFound();
    }

    // ─── Datos de facturación del emisor ───────────────────────────────────────

    #[Test]
    public function admin_can_update_billing_settings(): void
    {
        $payload = [
            'legal_name' => 'Troncodrilo Shop SL', 'tax_id' => 'B87654321',
            'address_line1' => 'Nueva Calle 9', 'address_line2' => null,
            'postal_code' => '28003', 'city' => 'Madrid', 'province' => 'Madrid',
            'country' => 'ES', 'tax_rate' => 21,
        ];

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/billing-settings', $payload)
            ->assertOk()
            ->assertJsonPath('tax_id', 'B87654321');

        $this->assertSame('B87654321', Setting::get('company_billing_info')['tax_id']);
    }

    #[Test]
    public function non_admin_cannot_update_billing_settings(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/admin/billing-settings', ['legal_name' => 'x'])
            ->assertForbidden();
    }
}
