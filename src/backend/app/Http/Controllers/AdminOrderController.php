<?php

namespace App\Http\Controllers;

use App\Exports\OrdersExport;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class AdminOrderController extends Controller
{
    // GET /api/admin/orders
    public function index(Request $request): JsonResponse
    {
        $query = Order::with('user:id,name,email')
            ->withCount('items')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('user_email')) {
            $query->whereHas('user', fn ($q) =>
                $q->where('email', 'like', '%' . $request->user_email . '%')
            );
        }
        if ($request->filled('min_amount')) {
            $query->where('total', '>=', (int) ($request->min_amount * 100));
        }
        if ($request->filled('max_amount')) {
            $query->where('total', '<=', (int) ($request->max_amount * 100));
        }

        $orders = $query->paginate(15);

        return response()->json($orders);
    }

    // GET /api/admin/orders/{order}
    public function show(Order $order): JsonResponse
    {
        $order->load([
            'user:id,name,email',
            'items.product:id,name,slug',
            'items.variant:id,size',
        ]);

        $data = [
            'id'               => $order->id,
            'status'           => $order->status,
            'total'            => $order->total,
            'shipping_cost'    => $order->shipping_cost ?? 0,
            'shipping_address' => $order->shipping_address,
            'created_at'       => $order->created_at,
            'user'             => $order->user,
            'items'            => $order->items->map(fn ($item) => [
                'id'           => $item->id,
                'product_name' => $item->product?->name ?? '—',
                'product_slug' => $item->product?->slug,
                'variant_size' => $item->variant?->size ?? null,
                'unit_price'   => $item->unit_price,
                'quantity'     => $item->quantity,
                'subtotal'     => $item->unit_price * $item->quantity,
            ]),
        ];

        return response()->json($data);
    }

    // PUT /api/admin/orders/{order}/status
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $order->update(['status' => $request->status]);

        return response()->json([
            'id'     => $order->id,
            'status' => $order->status,
        ]);
    }

    // GET /api/admin/orders/stats
    public function stats(): JsonResponse
    {
        $from = now()->startOfMonth();
        $to   = now()->endOfMonth();

        $totalRevenue = Order::where('status', 'paid')
            ->whereBetween('created_at', [$from, $to])
            ->sum('total');

        $orderCount = Order::where('status', 'paid')
            ->whereBetween('created_at', [$from, $to])
            ->count();

        // Producto más vendido del mes (todos los estados excepto cancelled)
        $topProduct = OrderItem::select('product_id')
            ->selectRaw('SUM(quantity) as units_sold')
            ->whereHas('order', fn ($q) =>
                $q->whereBetween('created_at', [$from, $to])
                  ->where('status', '!=', 'cancelled')
            )
            ->groupBy('product_id')
            ->orderByDesc('units_sold')
            ->with('product:id,name')
            ->first();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'order_count'   => $orderCount,
            'top_product'   => $topProduct ? [
                'name'       => $topProduct->product?->name ?? '—',
                'units_sold' => (int) $topProduct->units_sold,
            ] : null,
        ]);
    }

    // GET /api/admin/orders/pending-count
    public function pendingCount(): JsonResponse
    {
        $count = Order::where('status', 'pending')->count();

        return response()->json(['count' => $count]);
    }

    // GET /api/admin/orders/export
    public function export(Request $request)
    {
        $filters = $request->only(['status', 'date_from', 'date_to', 'user_email', 'min_amount', 'max_amount']);

        $filename = 'pedidos_' . now()->format('Y-m-d') . '.xlsx';

        return Excel::download(new OrdersExport($filters), $filename);
    }
}
