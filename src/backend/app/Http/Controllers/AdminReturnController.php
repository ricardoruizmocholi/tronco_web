<?php

namespace App\Http\Controllers;

use App\Models\ReturnRequest;
use App\Models\ReturnStatusHistory;
use App\Services\StripeRefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminReturnController extends Controller
{
    public function __construct(private StripeRefundService $refunds) {}

    public function index(Request $request): JsonResponse
    {
        $query = ReturnRequest::with(['order', 'user'])
            ->latest();

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->user_email) {
            $query->whereHas('user', fn ($q) => $q->where('email', 'like', '%' . $request->user_email . '%'));
        }
        if ($request->date_from) {
            $query->whereDate('requested_at', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('requested_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    public function show(int $id): JsonResponse
    {
        $rr = ReturnRequest::with(['order.items.product', 'user', 'history.changedByUser'])
            ->findOrFail($id);

        return response()->json($rr);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $rr = ReturnRequest::with('order')->findOrFail($id);

        if ($rr->status !== 'pending') {
            return response()->json(['message' => 'Solo se pueden aprobar solicitudes pendientes.'], 422);
        }

        DB::transaction(function () use ($rr, $request) {
            $prev = $rr->status;
            $rr->update(['status' => 'approved', 'approved_at' => now()]);
            $rr->order->update(['status' => 'return_approved']);

            ReturnStatusHistory::create([
                'return_request_id' => $rr->id,
                'changed_by'        => $request->user()->id,
                'from_status'       => $prev,
                'to_status'         => 'approved',
                'notes'             => null,
                'created_at'        => now(),
            ]);
        });

        return response()->json(['message' => 'Devolución aprobada.', 'status' => 'approved']);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $rr = ReturnRequest::with('order')->findOrFail($id);

        if (! in_array($rr->status, ['pending', 'approved'])) {
            return response()->json(['message' => 'No se puede rechazar en el estado actual.'], 422);
        }

        $data = $request->validate([
            'admin_notes' => ['required', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($rr, $data, $request) {
            $prev = $rr->status;
            $rr->update([
                'status'      => 'rejected',
                'admin_notes' => $data['admin_notes'],
                'rejected_at' => now(),
            ]);
            $rr->order->update(['status' => 'return_rejected']);

            ReturnStatusHistory::create([
                'return_request_id' => $rr->id,
                'changed_by'        => $request->user()->id,
                'from_status'       => $prev,
                'to_status'         => 'rejected',
                'notes'             => $data['admin_notes'],
                'created_at'        => now(),
            ]);
        });

        return response()->json(['message' => 'Devolución rechazada.', 'status' => 'rejected']);
    }

    /**
     * Confirm physical reception of the returned product.
     * This is the ONLY place where Stripe Refund is executed.
     */
    public function receive(Request $request, int $id): JsonResponse
    {
        $rr = ReturnRequest::with(['order.items.product'])->findOrFail($id);

        if ($rr->status !== 'approved') {
            return response()->json(['message' => 'Solo se puede confirmar recepción de devoluciones aprobadas.'], 422);
        }

        $order = $rr->order;

        if (! $order->stripe_payment_intent_id) {
            Log::error("AdminReturnController@receive: order #{$order->id} has no stripe_payment_intent_id.");
            return response()->json(['message' => 'No se puede procesar el reembolso. El pedido no tiene ID de pago.'], 422);
        }

        // For desistimiento, full refund including shipping (legal obligation)
        // For other reasons, admin can pass a custom amount (partial refund)
        if ($rr->reason === 'desistimiento') {
            $refundAmount = $order->total + ($order->shipping_cost ?? 0);
        } else {
            $data = $request->validate([
                'refund_amount' => ['nullable', 'integer', 'min:1'],
            ]);
            $refundAmount = $data['refund_amount'] ?? $order->total;
        }

        try {
            $refund = $this->refunds->refund($order->stripe_payment_intent_id, $refundAmount);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error("Stripe refund failed for return #{$rr->id}: " . $e->getMessage());
            return response()->json(['message' => 'Error al procesar el reembolso en Stripe: ' . $e->getMessage()], 422);
        }

        DB::transaction(function () use ($rr, $order, $refund, $refundAmount, $request) {
            $prev = $rr->status;

            // Mark as received + refunded in a single action
            $rr->update([
                'status'          => 'refunded',
                'stripe_refund_id'=> $refund->id,
                'refund_amount'   => $refundAmount,
                'received_at'     => now(),
                'refunded_at'     => now(),
            ]);

            $order->update(['status' => 'refunded']);

            // Restore stock
            foreach ($order->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', $item->quantity);
                }
            }

            ReturnStatusHistory::create([
                'return_request_id' => $rr->id,
                'changed_by'        => $request->user()->id,
                'from_status'       => $prev,
                'to_status'         => 'refunded',
                'notes'             => "Reembolso Stripe: {$refund->id} — {$refundAmount} céntimos.",
                'created_at'        => now(),
            ]);

            Log::info("Return #{$rr->id} received and refunded (Stripe {$refund->id}, {$refundAmount} cents).");
        });

        return response()->json([
            'message'       => 'Recepción confirmada y reembolso procesado.',
            'status'        => 'refunded',
            'stripe_refund' => $refund->id,
            'refund_amount' => $refundAmount,
        ]);
    }

    public function pendingCount(): JsonResponse
    {
        $count = ReturnRequest::where('status', 'pending')->count();
        return response()->json(['count' => $count]);
    }
}
