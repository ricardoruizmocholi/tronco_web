<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Contracts\Validation\UncompromisedVerifier;
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

    // Feature 027 (M2) — la regla unique:users,email por defecto de
    // Laravel confirma literalmente "ya está en uso". Un mensaje genérico
    // en el mismo campo/forma de respuesta mitiga la enumeración sin
    // romper el frontend (sigue siendo 422 + errors.email).
    public function test_duplicate_email_gets_generic_message_not_confirming_existence(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->fromBrowser()->postJson('/api/register', [
            'name'                  => 'Otro',
            'email'                 => 'existing@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertStringNotContainsString(
            'already been taken',
            (string) $response->json('errors.email.0')
        );
    }

    // Feature 027 (B2) — Password::uncompromised() debe rechazar de verdad
    // una contraseña filtrada, no solo estar presente en la regla. Se
    // sustituye el UncompromisedVerifier del contenedor en vez de fakear
    // la llamada HTTP a HaveIBeenPwned directamente — el fake por defecto
    // de TestCase (que simula "no comprometida" para el resto de tests)
    // se resuelve antes que cualquier Http::fake() más específico que se
    // registre después, por orden de registro, así que no sirve aquí.
    public function test_registration_rejects_a_known_compromised_password(): void
    {
        $this->app->bind(UncompromisedVerifier::class, fn () => new class implements UncompromisedVerifier {
            public function verify($data): bool
            {
                return false; // simula "sí está en una filtración conocida"
            }
        });

        $response = $this->fromBrowser()->postJson('/api/register', [
            'name' => 'Test', 'email' => 'newuser@example.com',
            'password' => 'correct horse battery staple',
            'password_confirmation' => 'correct horse battery staple',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
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

    // Feature 027 (H1) — sin esto, /login aceptaba intentos ilimitados
    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        User::factory()->create(['email' => 'victim@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->fromBrowser()->postJson('/api/login', [
                'email' => 'victim@example.com', 'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        // El 6.º intento en la misma ventana de 1 minuto debe bloquearse,
        // incluso con la contraseña correcta — el límite es por IP, no por
        // si las credenciales son válidas.
        $this->fromBrowser()->postJson('/api/login', [
            'email' => 'victim@example.com', 'password' => 'password',
        ])->assertStatus(429);
    }

    // Feature 027 (H1) — /register también debe limitarse, mismo contador que /login
    public function test_register_is_rate_limited_after_five_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->fromBrowser()->postJson('/api/register', [
                'name' => "User {$i}", 'email' => "user{$i}@example.com",
                'password' => 'password123', 'password_confirmation' => 'password123',
            ])->assertStatus(201);
        }

        $this->fromBrowser()->postJson('/api/register', [
            'name' => 'One More', 'email' => 'onemore@example.com',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertStatus(429);
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
