<?php

namespace App\Http\Controllers;

use App\Http\Requests\FanficRequest;
use App\Models\Fanfic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\CursorPaginator;

class FanficController extends Controller
{
    // GET /api/fanfics — público, solo aprobados para el globo
    public function publicIndex(): CursorPaginator
    {
        return Fanfic::approved()
            ->with('author:id,name')
            ->select(['id', 'user_id', 'image_url', 'caption', 'city_name',
                      'latitude', 'longitude', 'is_featured', 'created_at'])
            ->orderByDesc('is_featured')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->cursorPaginate(20);
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

    // POST /api/fanfics — crear (falla si bloqueado o ya tiene uno)
    public function store(FanficRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->is_blocked) {
            return response()->json([
                'message' => 'Tu cuenta no puede subir contenido. Contacta con el administrador.',
            ], 403);
        }

        if ($user->fanfic()->exists()) {
            return response()->json([
                'message' => 'Ya tienes un fanfic enviado. Puedes editarlo desde /mi-fanfic.',
            ], 409);
        }

        $fanfic = Fanfic::create([
            ...$request->validated(),
            'user_id' => $user->id,
            'status'  => 'pending',
        ]);

        return response()->json($fanfic, 201);
    }

    // PUT /api/fanfics/{fanfic} — editar el propio, resetea a pending
    public function update(FanficRequest $request, Fanfic $fanfic): JsonResponse
    {
        $this->authorize('update', $fanfic);

        $data = $request->validated();

        // Conservar image_url existente si no se envía una nueva
        if (! $request->filled('image_url')) {
            unset($data['image_url']);
        }

        $fanfic->update([
            ...$data,
            'status'           => 'pending',
            'rejection_reason' => null,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
        ]);

        return response()->json($fanfic->fresh());
    }
}
