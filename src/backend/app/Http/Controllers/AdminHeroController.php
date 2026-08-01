<?php

namespace App\Http\Controllers;

use App\Models\HeroSlide;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminHeroController extends Controller
{
    // GET /api/admin/hero-slides
    public function index(): JsonResponse
    {
        return response()->json(
            HeroSlide::orderBy('position')->orderBy('id')->get()
        );
    }

    // POST /api/admin/hero-slides
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'      => 'required|in:image,video',
            'url'       => 'required|string|max:2048',
            'title'     => 'nullable|string|max:255',
            'subtitle'  => 'nullable|string|max:255',
            'cta_text'  => 'nullable|string|max:255',
            'cta_url'   => 'nullable|string|max:2048',
            'is_active' => 'boolean',
            'position'  => 'integer|min:0',
        ]);

        return response()->json(HeroSlide::create($data), 201);
    }

    // PUT /api/admin/hero-slides/{id}
    public function update(Request $request, HeroSlide $heroSlide): JsonResponse
    {
        $data = $request->validate([
            'type'      => 'sometimes|in:image,video',
            'url'       => 'sometimes|string|max:2048',
            'title'     => 'nullable|string|max:255',
            'subtitle'  => 'nullable|string|max:255',
            'cta_text'  => 'nullable|string|max:255',
            'cta_url'   => 'nullable|string|max:2048',
            'is_active' => 'boolean',
            'position'  => 'integer|min:0',
        ]);

        $heroSlide->update($data);

        return response()->json($heroSlide);
    }

    // DELETE /api/admin/hero-slides/{id}
    public function destroy(HeroSlide $heroSlide): JsonResponse
    {
        $heroSlide->delete();

        return response()->json(['message' => 'Slide eliminado.']);
    }

    // PUT /api/admin/hero-slides/reorder — acepta [{id, position}, ...]
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slides'             => 'required|array',
            'slides.*.id'        => 'required|integer|exists:hero_slides,id',
            'slides.*.position'  => 'required|integer|min:0',
        ]);

        foreach ($data['slides'] as $slide) {
            HeroSlide::where('id', $slide['id'])->update(['position' => $slide['position']]);
        }

        return response()->json(
            HeroSlide::orderBy('position')->orderBy('id')->get()
        );
    }
}
