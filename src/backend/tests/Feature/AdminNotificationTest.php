<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Preorder;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_lists_pending_orders_returns_and_preorders(): void
    {
        $customer = User::factory()->create(['name' => 'María García']);

        $order = Order::create([
            'user_id' => $customer->id,
            'status'  => 'pending',
            'total'   => 4500,
        ]);

        $paidOrder = Order::create([
            'user_id' => $customer->id,
            'status'  => 'paid',
            'total'   => 2000,
        ]);

        $return = ReturnRequest::create([
            'order_id' => $paidOrder->id,
            'user_id'  => $customer->id,
            'reason'   => 'defectuoso',
            'status'   => 'pending',
        ]);

        ReturnRequest::create([
            'order_id' => $paidOrder->id,
            'user_id'  => $customer->id,
            'reason'   => 'otro',
            'status'   => 'approved',
        ]);

        $product = Product::create([
            'name'        => 'Camiseta Troncodrilo',
            'slug'        => 'camiseta-troncodrilo',
            'description' => 'Camiseta de algodón',
            'price'       => 1999,
        ]);

        $preorder = Preorder::create([
            'product_id' => $product->id,
            'email'      => 'cliente@example.com',
            'name'       => 'Cliente Interesado',
            'status'     => 'pending',
        ]);

        Preorder::create([
            'product_id' => $product->id,
            'email'      => 'otro@example.com',
            'status'     => 'converted',
        ]);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/notifications');

        $response->assertOk()->assertJson(['total' => 3]);

        $items = collect($response->json('items'));

        $this->assertTrue($items->contains(fn ($i) => $i['type'] === 'order' && $i['id'] === $order->id));
        $this->assertTrue($items->contains(fn ($i) => $i['type'] === 'return' && $i['id'] === $return->id));
        $this->assertTrue($items->contains(fn ($i) => $i['type'] === 'preorder' && $i['id'] === $preorder->id));
        $this->assertCount(3, $items);
    }

    public function test_returns_empty_when_nothing_pending(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJson(['total' => 0, 'items' => []]);
    }

    public function test_non_admin_cannot_access(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/notifications')
            ->assertForbidden();
    }

    public function test_guest_cannot_access(): void
    {
        $this->getJson('/api/admin/notifications')
            ->assertUnauthorized();
    }
}
