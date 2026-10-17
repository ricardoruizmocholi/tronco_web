<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_notification_for_existing_user(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'existe@troncodrilo.test']);

        $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);

        $response->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);
    }

    // Mismo criterio que el registro (Feature 027, M2): la respuesta no
    // debe confirmar ni negar si el email tiene cuenta.
    public function test_forgot_password_returns_same_response_for_nonexistent_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/forgot-password', ['email' => 'no-existe@troncodrilo.test']);

        $response->assertOk()
            ->assertJson(['message' => 'Si ese email tiene una cuenta, recibirás un enlace para restablecer la contraseña.']);
        Notification::assertNothingSent();
    }

    public function test_reset_password_with_valid_token_updates_password(): void
    {
        $user = User::factory()->create(['email' => 'reset@troncodrilo.test']);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token'                 => $token,
            'email'                 => $user->email,
            'password'              => 'nueva-password-fuerte',
            'password_confirmation' => 'nueva-password-fuerte',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('nueva-password-fuerte', $user->refresh()->password));
    }

    public function test_reset_password_with_invalid_token_fails(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/reset-password', [
            'token'                 => 'token-invalido',
            'email'                 => $user->email,
            'password'              => 'nueva-password-fuerte',
            'password_confirmation' => 'nueva-password-fuerte',
        ]);

        $response->assertStatus(422);
    }

    public function test_forgot_password_is_rate_limited_after_five_attempts(): void
    {
        Notification::fake();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/forgot-password', ['email' => "intento{$i}@troncodrilo.test"]);
        }

        $response = $this->postJson('/api/forgot-password', ['email' => 'sexto@troncodrilo.test']);

        $response->assertStatus(429);
    }
}
