<?php

namespace Tests\Feature;

use App\Models\Fanfic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FanficTest extends TestCase
{
    use RefreshDatabase;

    private User  $admin;
    private User  $user;
    private User  $otherUser;
    private array $validPayload;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin     = User::factory()->create(['role' => 'admin']);
        $this->user      = User::factory()->create(['role' => 'user']);
        $this->otherUser = User::factory()->create(['role' => 'user']);

        $this->validPayload = [
            'title'     => 'Mi aventura con Troncodrilo',
            'content'   => 'Era una noche oscura en el pantano...',
            'latitude'  => 40.4168,
            'longitude' => -3.7038,
        ];
    }

    private function makeFanfic(User $user, array $overrides = []): Fanfic
    {
        return Fanfic::create(array_merge([
            'user_id'   => $user->id,
            'title'     => 'Fanfic de ' . $user->name,
            'content'   => 'Contenido de prueba.',
            'latitude'  => 40.4168,
            'longitude' => -3.7038,
            'status'    => 'pending',
        ], $overrides));
    }

    // ── Creación ──────────────────────────────────────────────

    #[Test]
    public function guest_cannot_create_fanfic(): void
    {
        $this->postJson('/api/fanfics', $this->validPayload)
            ->assertUnauthorized();
    }

    #[Test]
    public function authenticated_user_can_create_fanfic(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/fanfics', $this->validPayload)
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('title', 'Mi aventura con Troncodrilo');

        $this->assertDatabaseHas('fanfics', [
            'user_id' => $this->user->id,
            'status'  => 'pending',
        ]);
    }

    #[Test]
    public function user_cannot_create_second_fanfic(): void
    {
        $this->makeFanfic($this->user);

        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/fanfics', $this->validPayload)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Ya tienes un fanfic enviado. Puedes editarlo desde /mi-fanfic.');
    }

    // ── Edición ───────────────────────────────────────────────

    #[Test]
    public function user_can_edit_own_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/fanfics/{$fanfic->id}", [
                ...$this->validPayload,
                'title' => 'Título actualizado',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Título actualizado');
    }

    #[Test]
    public function editing_fanfic_resets_status_to_pending(): void
    {
        $fanfic = $this->makeFanfic($this->user, [
            'status'           => 'rejected',
            'rejection_reason' => 'Contenido inapropiado.',
            'reviewed_by'      => $this->admin->id,
            'reviewed_at'      => now(),
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/fanfics/{$fanfic->id}", $this->validPayload)
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('rejection_reason', null);

        $this->assertDatabaseHas('fanfics', [
            'id'          => $fanfic->id,
            'status'      => 'pending',
            'reviewed_by' => null,
        ]);
    }

    #[Test]
    public function user_cannot_edit_another_users_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->otherUser);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/fanfics/{$fanfic->id}", $this->validPayload)
            ->assertForbidden();
    }

    #[Test]
    public function guest_cannot_edit_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->putJson("/api/fanfics/{$fanfic->id}", $this->validPayload)
            ->assertUnauthorized();
    }

    // ── Mine ──────────────────────────────────────────────────

    #[Test]
    public function mine_returns_own_fanfic_with_status(): void
    {
        $fanfic = $this->makeFanfic($this->user, ['status' => 'approved']);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/fanfics/mine')
            ->assertOk()
            ->assertJsonPath('id', $fanfic->id)
            ->assertJsonPath('status', 'approved');
    }

    #[Test]
    public function mine_returns_404_when_user_has_no_fanfic(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/fanfics/mine')
            ->assertNotFound();
    }

    #[Test]
    public function mine_shows_rejection_reason_when_rejected(): void
    {
        $this->makeFanfic($this->user, [
            'status'           => 'rejected',
            'rejection_reason' => 'El contenido no cumple las normas.',
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/fanfics/mine')
            ->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('rejection_reason', 'El contenido no cumple las normas.');
    }

    // ── Globo público ─────────────────────────────────────────

    #[Test]
    public function public_index_returns_only_approved_fanfics(): void
    {
        $this->makeFanfic($this->user,      ['status' => 'approved']);
        $this->makeFanfic($this->otherUser, ['status' => 'pending']);

        $this->getJson('/api/fanfics')
            ->assertOk()
            ->assertJsonCount(1);
    }

    #[Test]
    public function public_index_does_not_expose_sensitive_fields(): void
    {
        $this->makeFanfic($this->user, [
            'status'           => 'approved',
            'rejection_reason' => 'ya no aplica',
        ]);

        $data = $this->getJson('/api/fanfics')->assertOk()->json('0');

        $this->assertArrayNotHasKey('rejection_reason', $data);
        $this->assertArrayNotHasKey('reviewed_by',      $data);
        $this->assertArrayNotHasKey('status',           $data);
    }

    #[Test]
    public function public_index_includes_author_name(): void
    {
        $this->makeFanfic($this->user, ['status' => 'approved']);

        $this->getJson('/api/fanfics')
            ->assertOk()
            ->assertJsonStructure(['0' => ['id', 'title', 'content', 'latitude', 'longitude', 'author']]);
    }

    // ── Moderación admin ──────────────────────────────────────

    #[Test]
    public function admin_can_approve_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/fanfics/{$fanfic->id}/approve")
            ->assertOk()
            ->assertJsonPath('status', 'approved');

        $this->assertDatabaseHas('fanfics', [
            'id'          => $fanfic->id,
            'status'      => 'approved',
            'reviewed_by' => $this->admin->id,
        ]);
    }

    #[Test]
    public function admin_can_reject_fanfic_with_reason(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/fanfics/{$fanfic->id}/reject", [
                'rejection_reason' => 'El fanfic contiene spoilers del episodio 5.',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('rejection_reason', 'El fanfic contiene spoilers del episodio 5.');
    }

    #[Test]
    public function admin_can_reject_fanfic_without_reason(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/fanfics/{$fanfic->id}/reject")
            ->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('rejection_reason', null);
    }

    #[Test]
    public function regular_user_cannot_approve_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->otherUser, 'sanctum')
            ->patchJson("/api/admin/fanfics/{$fanfic->id}/approve")
            ->assertForbidden();
    }

    #[Test]
    public function regular_user_cannot_reject_fanfic(): void
    {
        $fanfic = $this->makeFanfic($this->user);

        $this->actingAs($this->otherUser, 'sanctum')
            ->patchJson("/api/admin/fanfics/{$fanfic->id}/reject")
            ->assertForbidden();
    }

    #[Test]
    public function guest_cannot_access_admin_fanfic_queue(): void
    {
        $this->getJson('/api/admin/fanfics')
            ->assertUnauthorized();
    }

    #[Test]
    public function admin_index_defaults_to_pending_queue(): void
    {
        $this->makeFanfic($this->user,      ['status' => 'pending']);
        $this->makeFanfic($this->otherUser, ['status' => 'approved']);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/fanfics')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.status', 'pending');
    }
}
