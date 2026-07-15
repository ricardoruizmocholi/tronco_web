<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    // GET /api/orders — pedidos del usuario autenticado, más recientes primero
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with(['items.product:id,name,slug,image_url', 'returnRequest'])
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // GET /api/orders/{order} — detalle de un pedido (solo el propietario)
    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $order->load('items.product:id,name,slug,image_url,price');

        return response()->json($order);
    }
}
