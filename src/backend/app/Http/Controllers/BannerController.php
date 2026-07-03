<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    // GET /api/banners
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            Banner::active()->orderBy('position')->orderBy('id')->get()
        );
    }

    // GET /api/admin/banners
    public function index(): JsonResponse
    {
        return response()->json(
            Banner::orderBy('position')->orderBy('id')->get()
        );
    }

    // POST /api/admin/banners
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'     => 'required|string|max:255',
            'subtitle'  => 'nullable|string|max:255',
            'image_url' => 'required|url|max:2048',
            'cta_text'  => 'nullable|string|max:255',
            'cta_url'   => 'nullable|url|max:2048',
            'is_active' => 'boolean',
            'position'  => 'integer|min:0',
        ]);

        return response()->json(Banner::create($data), 201);
    }

    // PUT /api/admin/banners/{banner}
    public function update(Request $request, Banner $banner): JsonResponse
    {
        $data = $request->validate([
            'title'     => 'sometimes|string|max:255',
            'subtitle'  => 'nullable|string|max:255',
            'image_url' => 'sometimes|url|max:2048',
            'cta_text'  => 'nullable|string|max:255',
            'cta_url'   => 'nullable|url|max:2048',
            'is_active' => 'boolean',
            'position'  => 'integer|min:0',
        ]);

        $banner->update($data);

        return response()->json($banner);
    }

    // DELETE /api/admin/banners/{banner}
    public function destroy(Banner $banner): JsonResponse
    {
        $banner->delete();

        return response()->json(['message' => 'Banner eliminado.']);
    }
}
