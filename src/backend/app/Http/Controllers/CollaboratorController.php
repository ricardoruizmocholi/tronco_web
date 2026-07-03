<?php

namespace App\Http\Controllers;

use App\Models\Collaborator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollaboratorController extends Controller
{
    // GET /api/collaborators
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            Collaborator::active()->orderBy('position')->orderBy('id')->get()
        );
    }

    // GET /api/admin/collaborators
    public function index(): JsonResponse
    {
        return response()->json(
            Collaborator::orderBy('position')->orderBy('id')->get()
        );
    }

    // POST /api/admin/collaborators
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'logo_url'    => 'nullable|url|max:2048',
            'url'         => 'required|url|max:2048',
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
            'position'    => 'integer|min:0',
        ]);

        return response()->json(Collaborator::create($data), 201);
    }

    // PUT /api/admin/collaborators/{collaborator}
    public function update(Request $request, Collaborator $collaborator): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'logo_url'    => 'nullable|url|max:2048',
            'url'         => 'sometimes|url|max:2048',
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
            'position'    => 'integer|min:0',
        ]);

        $collaborator->update($data);

        return response()->json($collaborator);
    }

    // DELETE /api/admin/collaborators/{collaborator}
    public function destroy(Collaborator $collaborator): JsonResponse
    {
        $collaborator->delete();

        return response()->json(['message' => 'Colaborador eliminado.']);
    }
}
