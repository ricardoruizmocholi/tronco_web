<?php

namespace App\Http\Controllers;

use App\Exports\PreordersExport;
use App\Models\Preorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class AdminPreorderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Preorder::with(['product:id,name,slug', 'variant:id,size', 'user:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('email')) {
            $query->where('email', 'like', '%' . $request->email . '%');
        }

        return response()->json($query->paginate(20));
    }

    public function stats(): JsonResponse
    {
        $total   = Preorder::count();
        $pending = Preorder::where('status', 'pending')->count();
        $notified = Preorder::where('status', 'notified')->count();
        $converted = Preorder::where('status', 'converted')->count();

        $topProduct = Preorder::selectRaw('product_id, count(*) as total')
            ->groupBy('product_id')
            ->orderByDesc('total')
            ->with('product:id,name')
            ->first();

        return response()->json([
            'total'     => $total,
            'pending'   => $pending,
            'notified'  => $notified,
            'converted' => $converted,
            'top_product' => $topProduct ? [
                'name'  => $topProduct->product?->name,
                'total' => $topProduct->total,
            ] : null,
        ]);
    }

    public function notify(Request $request, Preorder $preorder): JsonResponse
    {
        $preorder->update(['status' => 'notified']);
        return response()->json($preorder);
    }

    public function export(Request $request)
    {
        $filters = $request->only(['product_id', 'status']);

        $filename = 'preorders_' . now()->format('Y-m-d') . '.xlsx';

        return Excel::download(new PreordersExport($filters), $filename);
    }
}
