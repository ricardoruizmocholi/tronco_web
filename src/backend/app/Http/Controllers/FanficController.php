<?php

namespace App\Http\Controllers;

use App\Http\Requests\FanficRequest;
use App\Models\Fanfic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FanficController extends Controller
{
    // GET /api/fanfics — público, solo aprobados para el globo
    public function publicIndex(): JsonResponse
    {
        $fanfics = Fanfic::approved()
            ->with('author:id,name')
            ->select(['id', 'user_id', 'title', 'content', 'latitude', 'longitude'])
            ->get();

        return response()->json($fanfics);
    }

    // GET /api/fanfics/mine — fanfic del usuario autenticado
    public function mine(Request $request): JsonResponse
    {
        $fanfic = $request->user()->fanfic()->with('reviewer:id,name')->first();

        if (! $fanfic) {
            return response()->json(['message' => 'Aún no tienes un fanfic.'], 404);
        }

        return response()->json($fanfic);
    }

    // POST /api/fanfics — crear (falla si ya tiene uno)
    public function store(FanficRequest $request): JsonResponse
    {
        if ($request->user()->fanfic()->exists()) {
            return response()->json([
                'message' => 'Ya tienes un fanfic enviado. Puedes editarlo desde /mi-fanfic.',
            ], 409);
        }

        $fanfic = Fanfic::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status'  => 'pending',
        ]);

        return response()->json($fanfic, 201);
    }

    // PUT /api/fanfics/{fanfic} — editar el propio, resetea a pending
    public function update(FanficRequest $request, Fanfic $fanfic): JsonResponse
    {
        $this->authorize('update', $fanfic);

        $fanfic->update([
            ...$request->validated(),
            'status'           => 'pending',
            'rejection_reason' => null,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
        ]);

        return response()->json($fanfic);
    }
}
