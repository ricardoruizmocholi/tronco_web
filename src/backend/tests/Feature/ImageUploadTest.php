<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_authenticated_user_can_upload_a_real_image(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/upload-image', [
                'image' => UploadedFile::fake()->create('photo.jpg', 10, 'image/jpeg'),
            ]);

        $response->assertStatus(201)->assertJsonStructure(['url']);
        $this->assertStringEndsWith('.jpg', $response->json('url'));
    }

    // Feature 027 (H3) — la regla genérica "image" de Laravel acepta SVG,
    // que puede llevar <script> embebido. mimes:jpeg,png,gif,webp lo excluye.
    public function test_svg_upload_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/upload-image', [
                'image' => UploadedFile::fake()->create('evil.svg', 10, 'image/svg+xml'),
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('image');
    }

    public function test_stored_filename_uses_real_mime_not_client_extension(): void
    {
        $user = User::factory()->create();

        // Nombre de archivo del cliente dice .png, pero el MIME real
        // detectado es jpeg — el archivo guardado debe usar la extensión
        // del MIME real, no la del nombre original que mande el cliente.
        $file = UploadedFile::fake()->create('disguised.png', 10, 'image/jpeg');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/upload-image', ['image' => $file]);

        $response->assertStatus(201);
        $this->assertStringEndsWith('.jpg', $response->json('url'));
    }

    public function test_guest_cannot_upload_image(): void
    {
        $this->postJson('/api/upload-image', [
            'image' => UploadedFile::fake()->create('photo.jpg', 10, 'image/jpeg'),
        ])->assertUnauthorized();
    }
}
