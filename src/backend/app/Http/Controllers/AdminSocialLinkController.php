<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReorderSocialLinksRequest;
use App\Http\Requests\SocialLinkRequest;
use App\Models\SocialLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminSocialLinkController extends Controller
{
    // GET /api/admin/social-links
    public function index(): JsonResponse
    {
        return response()->json([
            'data'      => SocialLink::ordered()->get(),
            'platforms' => SocialLink::PLATFORMS,
        ]);
    }

    // POST /api/admin/social-links — la posición la asigna el servidor
    public function store(SocialLinkRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['position'] = (SocialLink::max('position') ?? -1) + 1;

        return response()->json(SocialLink::create($data), 201);
    }

    // PUT /api/admin/social-links/{socialLink}
    public function update(SocialLinkRequest $request, SocialLink $socialLink): JsonResponse
    {
        $socialLink->update($request->validated());

        return response()->json($socialLink);
    }

    // PATCH /api/admin/social-links/{socialLink}/toggle
    public function toggle(SocialLink $socialLink): JsonResponse
    {
        $socialLink->update(['is_active' => ! $socialLink->is_active]);

        return response()->json($socialLink);
    }

    // DELETE /api/admin/social-links/{socialLink}
    public function destroy(SocialLink $socialLink): JsonResponse
    {
        $socialLink->delete();

        return response()->json(['message' => 'Red social eliminada.']);
    }

    // PUT /api/admin/social-links/reorder — { ids: [3,1,2] } en el orden deseado
    public function reorder(ReorderSocialLinksRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request) {
            foreach ($request->validated()['ids'] as $position => $id) {
                SocialLink::whereKey($id)->update(['position' => $position]);
            }
        });

        return response()->json(SocialLink::ordered()->get());
    }
}
