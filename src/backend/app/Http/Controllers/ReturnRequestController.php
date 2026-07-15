<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\ReturnStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReturnRequestController extends Controller
{
    public function store(Request $request, int $orderId): JsonResponse
    {
        $order = Order::with('items')->findOrFail($orderId);

        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        if (! in_array($order->status, ['shipped', 'delivered'])) {
            return response()->json(['message' => 'Solo se pueden devolver pedidos enviados o entregados.'], 422);
        }

        if ($order->returnRequest()->exists()) {
            return response()->json(['message' => 'Ya existe una solicitud de devolución para este pedido.'], 422);
        }

        $data = $request->validate([
            'reason'      => ['required', 'in:defectuoso,no_corresponde,desistimiento,otro'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image'       => ['required', 'file', 'image', 'max:5120'],
        ]);

        $file      = $request->file('image');
        $filename  = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->storeAs('images', $filename, 'public');
        $imageUrl  = config('app.url') . '/storage/images/' . $filename;

        $returnRequest = DB::transaction(function () use ($order, $data, $imageUrl, $request) {
            $rr = ReturnRequest::create([
                'order_id'     => $order->id,
                'user_id'      => $request->user()->id,
                'reason'       => $data['reason'],
                'description'  => $data['description'] ?? null,
                'image_url'    => $imageUrl,
                'status'       => 'pending',
                'requested_at' => now(),
            ]);

            ReturnStatusHistory::create([
                'return_request_id' => $rr->id,
                'changed_by'        => $request->user()->id,
                'from_status'       => $order->status,
                'to_status'         => 'return_requested',
                'notes'             => 'Solicitud iniciada por el usuario.',
                'created_at'        => now(),
            ]);

            $order->update(['status' => 'return_requested']);

            return $rr;
        });

        return response()->json($returnRequest->load('order'), 201);
    }

    public function index(Request $request): JsonResponse
    {
        $returns = ReturnRequest::with(['order.items.product', 'history.changedByUser'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($returns);
    }
}
