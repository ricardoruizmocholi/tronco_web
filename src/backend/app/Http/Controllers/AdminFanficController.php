<?php

namespace App\Http\Controllers;

use App\Models\Fanfic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFanficController extends Controller
{
    // GET /api/admin/fanfics?status=pending|approved|rejected
    public function index(Request $request): JsonResponse
    {
        $status  = $request->query('status', 'pending');
        $fanfics = Fanfic::where('status', $status)
            ->with('author:id,name,email')
            ->orderBy('created_at')
            ->get();

        return response()->json($fanfics);
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
}
