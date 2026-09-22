<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_status_endpoint_reflects_current_flag(): void
    {
        $this->getJson('/api/maintenance-status')->assertOk()->assertJson(['active' => false]);

        Setting::set('maintenance_mode', true);

        $this->getJson('/api/maintenance-status')->assertOk()->assertJson(['active' => true]);
    }

    public function test_admin_can_toggle_maintenance(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/maintenance', ['active' => true])
            ->assertOk()
            ->assertJson(['active' => true]);

        $this->assertTrue(Setting::get('maintenance_mode'));

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/maintenance', ['active' => false])
            ->assertOk()
            ->assertJson(['active' => false]);

        $this->assertFalse(Setting::get('maintenance_mode'));
    }

    public function test_non_admin_cannot_toggle_maintenance(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/admin/maintenance', ['active' => true])
            ->assertForbidden();
    }

    public function test_public_route_is_blocked_when_maintenance_active(): void
    {
        Setting::set('maintenance_mode', true);

        $this->getJson('/api/products')
            ->assertStatus(503)
            ->assertJson(['maintenance' => true]);
    }

    public function test_public_route_works_normally_when_maintenance_inactive(): void
    {
        $this->getJson('/api/products')->assertOk();
    }

    public function test_admin_routes_stay_reachable_during_maintenance(): void
    {
        Setting::set('maintenance_mode', true);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/products')
            ->assertOk();
    }

    public function test_login_stays_reachable_during_maintenance(): void
    {
        Setting::set('maintenance_mode', true);
        $user = User::factory()->create();

        // Origin de localhost — necesario para que Sanctum's
        // EnsureFrontendRequestsAreStateful inyecte sesión (mismo patrón que
        // AuthTest::fromBrowser()).
        $this->withHeader('Origin', 'http://localhost')
            ->postJson('/api/login', [
                'email'    => $user->email,
                'password' => 'password',
            ])->assertOk();
    }

    public function test_user_endpoint_stays_reachable_during_maintenance(): void
    {
        Setting::set('maintenance_mode', true);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson('/api/user')
            ->assertOk();
    }

    public function test_health_check_stays_reachable_during_maintenance(): void
    {
        Setting::set('maintenance_mode', true);

        $this->getJson('/api/health')->assertOk();
    }

    public function test_stripe_webhook_route_is_not_blocked_by_maintenance(): void
    {
        Setting::set('maintenance_mode', true);

        $response = $this->post('/api/stripe/webhook', []);

        // No aserto un status concreto ni que la respuesta sea JSON — sin firma
        // válida de Stripe fallará por otro motivo, pero nunca con el 503 del
        // middleware de mantenimiento, que es lo único que este test verifica:
        // que la ruta ni siquiera pasa por él.
        $this->assertNotEquals(503, $response->getStatusCode());
    }

    public function test_maintenance_status_endpoint_itself_is_never_blocked(): void
    {
        Setting::set('maintenance_mode', true);

        $this->getJson('/api/maintenance-status')
            ->assertOk()
            ->assertJson(['active' => true]);
    }
}
