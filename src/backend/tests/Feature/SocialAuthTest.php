<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider as SocialiteProviderContract;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    private function fakeGoogleUser(string $id, string $name, string $email): SocialiteUser
    {
        $socialiteUser = new SocialiteUser();
        $socialiteUser->id = $id;
        $socialiteUser->name = $name;
        $socialiteUser->email = $email;

        return $socialiteUser;
    }

    private function mockSocialiteDriver(SocialiteUser $user): void
    {
        $provider = Mockery::mock(SocialiteProviderContract::class);
        $provider->shouldReceive('user')->andReturn($user);
        $provider->shouldIgnoreMissing($provider); // permite ->stateless() aunque no esté en el contrato

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    // Reproduce exactamente la petición que envía Google al volver: una navegación
    // GET normal, SIN el header Origin/Referer de localhost que Sanctum's
    // EnsureFrontendRequestsAreStateful necesita para inyectar StartSession
    // (mismo mecanismo que documenta AuthTest::fromBrowser()).
    public function test_callback_establishes_a_real_session_like_googles_real_redirect(): void
    {
        $this->mockSocialiteDriver($this->fakeGoogleUser('999888777', 'Nuevo Usuario', 'nuevo@example.com'));

        $response = $this->get('/auth/google/callback?code=fake-code&state=fake-state');

        $response->assertRedirect(config('app.frontend_url').'/?auth=success');

        $this->assertDatabaseHas('users', [
            'email'     => 'nuevo@example.com',
            'google_id' => '999888777',
        ]);

        $this->assertAuthenticated();
    }

    public function test_callback_links_google_id_to_existing_user_with_same_email(): void
    {
        $existing = User::factory()->create(['email' => 'yaexiste@example.com']);
        $this->mockSocialiteDriver($this->fakeGoogleUser('111222333', $existing->name, 'yaexiste@example.com'));

        $this->get('/auth/google/callback?code=fake-code&state=fake-state')
             ->assertRedirect(config('app.frontend_url').'/?auth=success');

        $this->assertDatabaseHas('users', [
            'id'        => $existing->id,
            'google_id' => '111222333',
        ]);
        $this->assertAuthenticatedAs($existing->fresh());
    }
}
