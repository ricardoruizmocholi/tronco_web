<?php

namespace App\Http\Controllers;

use App\Http\Requests\ArtistRequest;
use App\Models\Artist;
use App\Models\ArtistImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArtistController extends Controller
{
    // ─── Público ──────────────────────────────────────────────────────────────

    // GET /api/artists — lista pública de artistas activos con imágenes
    public function index(): JsonResponse
    {
        $artists = Artist::where('is_active', true)
            ->with('images')
            ->orderBy('name')
            ->get();

        return response()->json($artists);
    }

    // GET /api/artists/{artist} — perfil público con imágenes, productos activos y social_links
    public function show(Artist $artist): JsonResponse
    {
        if (! $artist->is_active) {
            return response()->json(['message' => 'Artista no encontrado.'], 404);
        }

        $artist->load([
            'images',
            'products' => fn ($q) => $q->where('is_active', true)->with('images'),
        ]);

        return response()->json($artist);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    // GET /api/admin/artists — todos los artistas (activos e inactivos)
    public function adminIndex(): JsonResponse
    {
        $artists = Artist::with('images')->orderBy('name')->get();
        return response()->json($artists);
    }

    // POST /api/admin/artists
    public function store(ArtistRequest $request): JsonResponse
    {
        $artist = Artist::create($request->validated());
        $artist->load('images');
        return response()->json($artist, 201);
    }

    // PUT /api/admin/artists/{artist}
    public function update(ArtistRequest $request, Artist $artist): JsonResponse
    {
        $artist->update($request->validated());
        $artist->load('images');
        return response()->json($artist);
    }

    // DELETE /api/admin/artists/{artist} — soft: desactiva, no borra
    public function destroy(Artist $artist): JsonResponse
    {
        $artist->update(['is_active' => false]);
        return response()->json(['message' => 'Artista desactivado.']);
    }

    // PATCH /api/admin/artists/{artist}/toggle — invierte is_active
    public function toggle(Artist $artist): JsonResponse
    {
        $artist->update(['is_active' => ! $artist->is_active]);
        return response()->json($artist);
    }

    // ─── Gestión de imágenes de galería ───────────────────────────────────────

    // POST /api/admin/artists/{artist}/images
    public function storeImage(Request $request, Artist $artist): JsonResponse
    {
        $request->validate([
            'url'      => ['required', 'string', 'url', 'max:2048'],
            'caption'  => ['nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:1'],
        ]);

        $position = $request->integer('position') ?: ($artist->images()->max('position') + 1);

        $image = $artist->images()->create([
            'url'      => $request->string('url'),
            'caption'  => $request->input('caption'),
            'position' => $position,
        ]);

        return response()->json($image, 201);
    }

    // DELETE /api/admin/artists/{artist}/images/{image}
    public function destroyImage(Artist $artist, ArtistImage $image): JsonResponse
    {
        if ($image->artist_id !== $artist->id) {
            return response()->json(['message' => 'Imagen no pertenece a este artista.'], 403);
        }

        $image->delete();
        return response()->json(['message' => 'Imagen eliminada.']);
    }

    // DELETE /api/admin/artists/{artist}/permanent
    public function permanentDestroy(Artist $artist): JsonResponse
    {
        $artist->delete();
        return response()->json(['message' => 'Artista eliminado permanentemente.']);
    }
}
