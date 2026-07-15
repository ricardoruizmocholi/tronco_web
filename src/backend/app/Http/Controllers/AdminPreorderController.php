<?php

namespace App\Http\Controllers;

use App\Models\Preorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function export(Request $request): StreamedResponse
    {
        $query = Preorder::with(['product:id,name', 'variant:id,size'])
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $filename = 'preorders_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['ID', 'Email', 'Nombre', 'Producto', 'Talla', 'Estado', 'Fecha']);

            $query->chunk(200, function ($rows) use ($handle) {
                foreach ($rows as $p) {
                    fputcsv($handle, [
                        $p->id,
                        $p->email,
                        $p->name ?? '—',
                        $p->product?->name ?? '—',
                        $p->variant?->size ?? '—',
                        $p->status,
                        $p->created_at->format('d/m/Y H:i'),
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
