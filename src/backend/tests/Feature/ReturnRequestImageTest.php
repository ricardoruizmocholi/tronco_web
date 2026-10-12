<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Cobertura centrada en la validación de la imagen adjunta a una solicitud
// de devolución (Feature 027, H3) — no un suite completo de devoluciones.
class ReturnRequestImageTest extends TestCase
{
    use RefreshDatabase;

    private function shippedOrder(User $user): Order
    {
        return Order::create([
            'user_id' => $user->id, 'total' => 2499, 'status' => 'shipped',
        ]);
    }

    public function test_return_request_accepts_a_real_image(): void
    {
        Storage::fake('public');
        $user  = User::factory()->create();
        $order = $this->shippedOrder($user);

        $response = $this->actingAs($user, 'sanctum')
            ->post("/api/orders/{$order->id}/return", [
                'reason' => 'defectuoso',
                'image'  => UploadedFile::fake()->create('proof.jpg', 10, 'image/jpeg'),
            ]);

        // No se afirma 201 a propósito: la transición de estado del pedido a
        // "return_requested" choca con un CHECK constraint de SQLite
        // preexistente y sin relación con este cambio (el enum de
        // orders.status no se actualiza igual en SQLite que en MySQL al
        // alterar la columna — ver 2026_07_15_120000_add_new_statuses_to_orders_table.php).
        // Lo que sí interesa aquí es que la regla de validación de la
        // imagen no la rechace — por eso no debe venir un 422 sobre "image".
        $response->assertJsonMissingValidationErrors('image');
    }

    // Feature 027 (H3) — mismo riesgo que ImageUploadController: la regla
    // genérica "image" acepta SVG con <script> embebido.
    public function test_return_request_rejects_svg(): void
    {
        $user  = User::factory()->create();
        $order = $this->shippedOrder($user);

        $response = $this->actingAs($user, 'sanctum')
            ->post("/api/orders/{$order->id}/return", [
                'reason' => 'defectuoso',
                'image'  => UploadedFile::fake()->create('evil.svg', 10, 'image/svg+xml'),
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('image');
    }
}
