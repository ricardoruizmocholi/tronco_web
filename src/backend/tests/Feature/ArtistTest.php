<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ArtistTest extends TestCase
{
    use RefreshDatabase;

    private Artist $active;
    private Artist $inactive;
    private User   $admin;
    private User   $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->active = Artist::create([
            'name'         => 'Verdina Moss',
            'bio'          => 'Ilustradora colaboradora.',
            'avatar_url'   => 'https://placehold.co/400x400/5BBB2A/FAFAF8?text=VM',
            'social_links' => ['instagram' => 'https://instagram.com/verdina'],
            'video_urls'   => ['https://www.youtube.com/embed/test'],
            'is_active'    => true,
        ]);

        $this->inactive = Artist::create([
            'name'      => 'Artista Inactivo',
            'is_active' => false,
        ]);

        $this->admin = User::create([
            'name'     => 'Admin',
            'email'    => 'admin@test.com',
            'password' => bcrypt('password'),
            'role'     => 'admin',
        ]);

        $this->user = User::create([
            'name'     => 'User',
            'email'    => 'user@test.com',
            'password' => bcrypt('password'),
        ]);
    }

    #[Test]
    public function public_index_returns_only_active_artists(): void
    {
        $response = $this->getJson('/api/artists');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Verdina Moss');
    }

    #[Test]
    public function public_index_includes_images(): void
    {
        $this->active->images()->create(['url' => 'https://placehold.co/800x600', 'position' => 1]);

        $response = $this->getJson('/api/artists');

        $response->assertOk()
            ->assertJsonStructure(['0' => ['id', 'name', 'bio', 'avatar_url', 'social_links', 'images']]);
    }

    #[Test]
    public function public_show_returns_active_artist_with_relations(): void
    {
        $response = $this->getJson("/api/artists/{$this->active->id}");

        $response->assertOk()
            ->assertJsonPath('name', 'Verdina Moss')
            ->assertJsonStructure(['id', 'name', 'bio', 'social_links', 'video_urls', 'images', 'products']);
    }

    #[Test]
    public function public_show_returns_404_for_inactive_artist(): void
    {
        $response = $this->getJson("/api/artists/{$this->inactive->id}");

        $response->assertNotFound();
    }

    #[Test]
    public function public_show_returns_404_for_nonexistent_artist(): void
    {
        $response = $this->getJson('/api/artists/99999');

        $response->assertNotFound();
    }

    #[Test]
    public function guest_cannot_create_artist(): void
    {
        $response = $this->postJson('/api/admin/artists', ['name' => 'Nuevo']);

        $response->assertUnauthorized();
    }

    #[Test]
    public function regular_user_cannot_create_artist(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/admin/artists', ['name' => 'Nuevo']);

        $response->assertForbidden();
    }

    #[Test]
    public function admin_can_create_artist(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/artists', [
                'name'         => 'Óscar Tronco',
                'bio'          => 'Diseñador gráfico.',
                'social_links' => ['instagram' => 'https://instagram.com/oscar'],
                'video_urls'   => [],
            ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'Óscar Tronco');

        $this->assertDatabaseHas('artists', ['name' => 'Óscar Tronco', 'is_active' => 1]);
    }

    #[Test]
    public function admin_can_toggle_artist_active_status(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/artists/{$this->active->id}/toggle");

        $this->assertDatabaseHas('artists', ['id' => $this->active->id, 'is_active' => 0]);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/artists/{$this->active->id}/toggle");

        $this->assertDatabaseHas('artists', ['id' => $this->active->id, 'is_active' => 1]);
    }

    #[Test]
    public function admin_can_add_gallery_image(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/admin/artists/{$this->active->id}/images", [
                'url'     => 'https://placehold.co/800x600/5BBB2A/FAFAF8?text=Test',
                'caption' => 'Imagen de prueba',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('artist_images', [
            'artist_id' => $this->active->id,
            'caption'   => 'Imagen de prueba',
        ]);
    }

    #[Test]
    public function admin_can_delete_gallery_image(): void
    {
        $image = $this->active->images()->create([
            'url'      => 'https://placehold.co/800x600',
            'position' => 1,
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/admin/artists/{$this->active->id}/images/{$image->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('artist_images', ['id' => $image->id]);
    }

    #[Test]
    public function cannot_delete_image_belonging_to_different_artist(): void
    {
        $otherArtist = Artist::create(['name' => 'Otro', 'is_active' => true]);
        $image       = $otherArtist->images()->create([
            'url'      => 'https://placehold.co/800x600',
            'position' => 1,
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/admin/artists/{$this->active->id}/images/{$image->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('artist_images', ['id' => $image->id]);
    }
}
