<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\StripeRefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CancellationController extends Controller
{
    public function __construct(private StripeRefundService $refunds) {}

    public function cancel(Request $request, int $id): JsonResponse
    {
        $order = Order::with('items.product')->findOrFail($id);

        // Only the order owner can cancel
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        return match ($order->status) {
            'pending'   => $this->cancelPending($order),
            'paid'      => $this->cancelPaid($order),
            'shipped', 'delivered' => response()->json([
                'message' => 'El pedido ya fue enviado. Usa el flujo de devolución.',
                'redirect' => 'return',
            ], 422),
            default => response()->json(['message' => 'Este pedido no se puede cancelar.'], 422),
        };
    }

    private function cancelPending(Order $order): JsonResponse
    {
        DB::transaction(function () use ($order) {
            $order->update(['status' => 'cancelled']);
            $this->restoreStock($order);
        });

        return response()->json(['message' => 'Pedido cancelado correctamente.', 'status' => 'cancelled']);
    }

    private function cancelPaid(Order $order): JsonResponse
    {
        if (! $order->stripe_payment_intent_id) {
            Log::error("Cancel paid order #{$order->id}: stripe_payment_intent_id is null.");
            return response()->json(['message' => 'No se puede procesar el reembolso. Contacta con soporte.'], 422);
        }

        try {
            $refund = $this->refunds->refund($order->stripe_payment_intent_id);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error("Stripe refund failed for order #{$order->id}: " . $e->getMessage());
            return response()->json(['message' => 'Error al procesar el reembolso. Inténtalo de nuevo.'], 422);
        }

        DB::transaction(function () use ($order, $refund) {
            $order->update(['status' => 'cancelled']);
            $this->restoreStock($order);
            Log::info("Order #{$order->id} cancelled with Stripe refund {$refund->id}.");
        });

        return response()->json(['message' => 'Pedido cancelado y reembolso iniciado.', 'status' => 'cancelled']);
    }

    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product) {
                $item->product->increment('stock', $item->quantity);
            }
        }
    }
}
