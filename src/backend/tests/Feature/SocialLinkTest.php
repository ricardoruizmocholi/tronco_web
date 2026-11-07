<?php

namespace Tests\Feature;

use App\Models\SocialLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialLinkTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function link(array $attrs = []): SocialLink
    {
        return SocialLink::create($attrs + [
            'platform' => 'instagram', 'url' => 'https://instagram.com/x', 'position' => 0, 'is_active' => true,
        ]);
    }

    // ── Público ──────────────────────────────────────────────────────────

    public function test_public_lists_only_active_in_order_without_internal_fields(): void
    {
        $this->link(['platform' => 'tiktok', 'position' => 2]);
        $this->link(['platform' => 'youtube', 'position' => 1]);
        $this->link(['platform' => 'discord', 'position' => 0, 'is_active' => false]);

        $res = $this->getJson('/api/social-links')->assertOk();

        $this->assertSame(['youtube', 'tiktok'], array_column($res->json(), 'platform'));
        $this->assertSame(['id', 'platform', 'label', 'url'], array_keys($res->json()[0]));
    }

    public function test_public_returns_empty_array_when_none(): void
    {
        $this->getJson('/api/social-links')->assertOk()->assertExactJson([]);
    }

    public function test_public_is_rate_limited(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/social-links')->assertOk();
        }
        $this->getJson('/api/social-links')->assertStatus(429);
    }

    // ── Autorización admin (cada verbo) ──────────────────────────────────

    public function test_every_admin_endpoint_requires_auth_and_admin(): void
    {
        $l = $this->link();
        $user = User::factory()->create(['role' => 'user']);
        $body = ['platform' => 'tiktok', 'url' => 'https://tiktok.com/x', 'ids' => [$l->id]];

        $calls = [
            ['getJson',    '/api/admin/social-links'],
            ['postJson',   '/api/admin/social-links'],
            ['putJson',    '/api/admin/social-links/reorder'],
            ['putJson',    "/api/admin/social-links/{$l->id}"],
            ['patchJson',  "/api/admin/social-links/{$l->id}/toggle"],
            ['deleteJson', "/api/admin/social-links/{$l->id}"],
        ];

        // Primero todos como invitado: actingAs() persiste en el test una vez usado.
        foreach ($calls as [$method, $url]) {
            $this->{$method}($url, $body)->assertStatus(401);
        }
        foreach ($calls as [$method, $url]) {
            $this->actingAs($user, 'sanctum')->{$method}($url, $body)->assertStatus(403);
        }

        $this->assertDatabaseHas('social_links', ['id' => $l->id, 'platform' => 'instagram']);
    }

    // ── Validación ───────────────────────────────────────────────────────

    public function test_store_rejects_dangerous_or_invalid_urls(): void
    {
        $bad = [
            'javascript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x',
            'ftp://example.com/file', '//evil.com', 'https://user:pass@evil.com',
            'https://exa mple.com', 'not a url', 'https://example.com/'.str_repeat('a', 260),
        ];

        foreach ($bad as $url) {
            $this->actingAs($this->admin(), 'sanctum')
                ->postJson('/api/admin/social-links', ['platform' => 'website', 'url' => $url])
                ->assertStatus(422)->assertJsonValidationErrors('url');
        }

        $this->assertSame(0, SocialLink::count());
    }

    public function test_store_rejects_unknown_platform_and_long_label(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/social-links', ['platform' => 'myspace', 'url' => 'https://a.com'])
            ->assertStatus(422)->assertJsonValidationErrors('platform');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/social-links', [
                'platform' => 'github', 'url' => 'https://github.com/x', 'label' => str_repeat('a', 61),
            ])->assertStatus(422)->assertJsonValidationErrors('label');
    }

    public function test_store_accepts_http_and_https_and_ignores_client_position(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/social-links', ['platform' => 'website', 'url' => 'http://example.com', 'position' => 99])
            ->assertStatus(201);
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/social-links', ['platform' => 'x', 'url' => 'https://x.com/troncodrilo', 'label' => 'X oficial'])
            ->assertStatus(201)->assertJsonPath('position', 1);

        $this->assertSame([0, 1], SocialLink::ordered()->pluck('position')->all());
    }

    public function test_store_is_limited_to_twelve(): void
    {
        for ($i = 0; $i < SocialLink::MAX_LINKS; $i++) {
            $this->link(['position' => $i]);
        }

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/social-links', ['platform' => 'tiktok', 'url' => 'https://tiktok.com/x'])
            ->assertStatus(422);

        $this->assertSame(SocialLink::MAX_LINKS, SocialLink::count());
    }

    // ── Operaciones ──────────────────────────────────────────────────────

    public function test_update_toggle_and_delete(): void
    {
        $admin = $this->admin();
        $l = $this->link();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/social-links/{$l->id}", ['url' => 'javascript:alert(1)'])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/social-links/{$l->id}", ['url' => 'https://instagram.com/nuevo', 'position' => 50])
            ->assertOk();
        $l->refresh();
        $this->assertSame('https://instagram.com/nuevo', $l->url);
        $this->assertSame(0, $l->position);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/social-links/{$l->id}/toggle")
            ->assertOk()->assertJsonPath('is_active', false);

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/social-links/{$l->id}")->assertOk();
        $this->assertDatabaseMissing('social_links', ['id' => $l->id]);
    }

    public function test_admin_index_includes_inactive_and_platform_list(): void
    {
        $this->link(['is_active' => false]);

        $res = $this->actingAs($this->admin(), 'sanctum')->getJson('/api/admin/social-links')->assertOk();

        $this->assertCount(1, $res->json('data'));
        $this->assertSame('Instagram', $res->json('platforms.instagram'));
    }

    public function test_reorder_sets_positions_from_id_order(): void
    {
        $a = $this->link(['position' => 0]);
        $b = $this->link(['platform' => 'tiktok', 'position' => 1]);
        $c = $this->link(['platform' => 'youtube', 'position' => 2]);

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/social-links/reorder', ['ids' => [$c->id, $a->id, $b->id]])
            ->assertOk();

        $this->assertSame([$c->id, $a->id, $b->id], SocialLink::ordered()->pluck('id')->all());
    }

    public function test_reorder_rejects_incomplete_duplicate_or_unknown_ids(): void
    {
        $a = $this->link();
        $b = $this->link(['platform' => 'tiktok', 'position' => 1]);
        $admin = $this->admin();

        foreach ([[$a->id], [$a->id, $a->id], [$a->id, 9999], 'nope'] as $ids) {
            $this->actingAs($admin, 'sanctum')
                ->putJson('/api/admin/social-links/reorder', ['ids' => $ids])
                ->assertStatus(422);
        }
    }

    public function test_admin_routes_are_rate_limited(): void
    {
        $admin = $this->admin();

        for ($i = 0; $i < 60; $i++) {
            $this->actingAs($admin, 'sanctum')->getJson('/api/admin/social-links')->assertOk();
        }
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/social-links')->assertStatus(429);
    }
}
