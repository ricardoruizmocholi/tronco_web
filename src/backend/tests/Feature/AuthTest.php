<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // Simula la cabecera que envía el navegador en producción, necesaria para
    // que Sanctum's EnsureFrontendRequestsAreStateful inyecte StartSession.
    private function fromBrowser(): static
    {
        return $this->withHeader('Origin', 'http://localhost');
    }

    public function test_user_can_register(): void
    {
        $response = $this->fromBrowser()->postJson('/api/register', [
            'name'                  => 'Ricardo',
            'email'                 => 'ricardo@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['id', 'name', 'email', 'role']);

        $this->assertDatabaseHas('users', [
            'email' => 'ricardo@example.com',
            'role'  => 'user',
        ]);
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create();

        $this->fromBrowser()->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'password',
        ])->assertOk()
          ->assertJsonStructure(['id', 'name', 'email', 'role']);
    }

    public function test_login_fails_with_wrong_credentials(): void
    {
        User::factory()->create(['email' => 'test@example.com']);

        $this->fromBrowser()->postJson('/api/login', [
            'email'    => 'test@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized()
          ->assertJson(['message' => 'Credenciales incorrectas.']);
    }

    public function test_admin_route_returns_403_for_non_admin(): void
    {
        Route::middleware(['auth:sanctum', 'admin'])
             ->get('/_test/admin-only', fn () => response()->json('ok'));

        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
             ->getJson('/_test/admin-only')
             ->assertForbidden()
             ->assertJson(['message' => 'Forbidden.']);
    }
}
