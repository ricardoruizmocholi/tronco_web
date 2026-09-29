<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\InvoicePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OrderController extends Controller
{
    public function __construct(private readonly InvoicePdfService $invoicePdfs) {}

    // GET /api/orders — pedidos del usuario autenticado, más recientes primero
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with(['items.product:id,name,slug,image_url', 'returnRequest', 'invoice:id,order_id,full_number'])
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

        $order->load('items.product:id,name,slug,image_url,price', 'invoice:id,order_id,full_number');

        return response()->json($order);
    }

    // GET /api/orders/{order}/invoice — descarga de la propia factura
    public function invoice(Request $request, Order $order): JsonResponse|BinaryFileResponse
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $invoice = $order->invoice;
        if (! $invoice) {
            return response()->json(['message' => 'Este pedido todavía no tiene factura.'], 404);
        }

        $path = $this->invoicePdfs->ensurePdf($invoice);

        return response()->download(
            Storage::disk('local')->path($path),
            "{$invoice->full_number}.pdf"
        );
    }
}
