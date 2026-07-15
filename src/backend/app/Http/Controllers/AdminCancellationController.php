<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\StripeRefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminCancellationController extends Controller
{
    public function __construct(private StripeRefundService $refunds) {}

    public function cancel(int $id): JsonResponse
    {
        $order = Order::with('items.product')->findOrFail($id);

        if ($order->status !== 'paid') {
            return response()->json(['message' => 'Solo se pueden cancelar pedidos en estado "paid".'], 422);
        }

        if (! $order->stripe_payment_intent_id) {
            Log::error("Admin cancel order #{$order->id}: stripe_payment_intent_id is null.");
            return response()->json(['message' => 'No se puede procesar el reembolso. El pedido no tiene ID de pago.'], 422);
        }

        try {
            $refund = $this->refunds->refund($order->stripe_payment_intent_id);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error("Admin Stripe refund failed for order #{$order->id}: " . $e->getMessage());
            return response()->json(['message' => 'Error al procesar el reembolso en Stripe.'], 422);
        }

        DB::transaction(function () use ($order, $refund) {
            $order->update(['status' => 'cancelled']);
            foreach ($order->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', $item->quantity);
                }
            }
            Log::info("Admin cancelled order #{$order->id}, Stripe refund {$refund->id}.");
        });

        return response()->json(['message' => 'Pedido cancelado y reembolso iniciado.', 'status' => 'cancelled']);
    }
}
