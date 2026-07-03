<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFanficController extends Controller
{
    // GET /api/admin/fanfics?status=&search=&featured=
    public function index(Request $request): JsonResponse
    {
        $query = Fanfic::with('author:id,name,email')
            ->orderBy('created_at');

        $query->where('status', $request->query('status', 'pending'));

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('city_name', 'like', "%{$search}%")
                  ->orWhere('caption',   'like', "%{$search}%");
            });
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        return response()->json($query->get());
    }

    // PATCH /api/admin/fanfics/{fanfic}/approve
    public function approve(Request $request, Fanfic $fanfic): JsonResponse
    {
        $this->authorize('moderate', $fanfic);

        $fanfic->update([
            'status'           => 'approved',
            'rejection_reason' => null,
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        return response()->json($fanfic);
    }

    // PATCH /api/admin/fanfics/{fanfic}/reject
    public function reject(Request $request, Fanfic $fanfic): JsonResponse
    {
        $this->authorize('moderate', $fanfic);

        $request->validate([
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $fanfic->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->input('rejection_reason'),
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        return response()->json($fanfic);
    }

    // PATCH /api/admin/fanfics/{fanfic}/feature
    public function feature(Fanfic $fanfic): JsonResponse
    {
        $this->authorize('moderate', $fanfic);
        $fanfic->update(['is_featured' => true]);
        return response()->json($fanfic);
    }

    // PATCH /api/admin/fanfics/{fanfic}/unfeature
    public function unfeature(Fanfic $fanfic): JsonResponse
    {
        $this->authorize('moderate', $fanfic);
        $fanfic->update(['is_featured' => false]);
        return response()->json($fanfic);
    }

    // PATCH /api/admin/fanfics/{fanfic}/block-user
    public function blockUser(Fanfic $fanfic): JsonResponse
    {
        $this->authorize('moderate', $fanfic);
        $fanfic->loadMissing('author');
        $fanfic->author->update(['is_blocked' => true]);
        return response()->json(['message' => "Usuario {$fanfic->author->name} bloqueado."]);
    }

    // PATCH /api/admin/users/{user}/unblock
    public function unblockUser(User $user): JsonResponse
    {
        $user->update(['is_blocked' => false]);
        return response()->json(['message' => "Usuario {$user->name} desbloqueado."]);
    }

    // GET /api/admin/users/blocked
    public function blockedUsers(): JsonResponse
    {
        $users = User::where('is_blocked', true)
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }
}
