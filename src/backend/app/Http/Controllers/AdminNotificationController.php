<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Preorder;
use App\Models\ReturnRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class AdminNotificationController extends Controller
{
    // GET /api/admin/notifications
    // Agrega en vivo las tareas pendientes ya modeladas por su propio `status` —
    // sin tabla propia, ver spec/features/024-admin-sidebar-notificaciones/spec.md.
    public function index(): JsonResponse
    {
        $items = $this->pendingOrders()
            ->concat($this->pendingReturns())
            ->concat($this->pendingPreorders())
            ->sortByDesc('created_at')
            ->values();

        return response()->json([
            'total' => $items->count(),
            'items' => $items,
        ]);
    }

    private function pendingOrders(): Collection
    {
        return Order::where('status', 'pending')
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Order $order) => [
                'type'       => 'order',
                'id'         => $order->id,
                'title'      => "Pedido #{$order->id}",
                'subtitle'   => ($order->user->name ?? 'Invitado') . ' · ' . $this->money($order->total),
                'created_at' => $order->created_at,
            ]);
    }

    private function pendingReturns(): Collection
    {
        return ReturnRequest::where('status', 'pending')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ReturnRequest $return) => [
                'type'       => 'return',
                'id'         => $return->id,
                'title'      => "Devolución #{$return->id}",
                'subtitle'   => "Pedido #{$return->order_id} · {$return->reason}",
                'created_at' => $return->created_at,
            ]);
    }

    private function pendingPreorders(): Collection
    {
        return Preorder::where('status', 'pending')
            ->with('product:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Preorder $preorder) => [
                'type'       => 'preorder',
                'id'         => $preorder->id,
                'title'      => 'Preorder — ' . ($preorder->product->name ?? 'Producto eliminado'),
                'subtitle'   => $preorder->name,
                'created_at' => $preorder->created_at,
            ]);
    }

    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, ',', '.') . ' €';
    }
}
