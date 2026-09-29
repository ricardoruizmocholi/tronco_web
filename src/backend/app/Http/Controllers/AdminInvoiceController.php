<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\InvoicePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminInvoiceController extends Controller
{
    public function __construct(private readonly InvoicePdfService $pdfs) {}

    // GET /api/admin/invoices — listado con filtros de fecha y cliente
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with('order:id,user_id', 'order.user:id,name,email')
            ->orderByDesc('issued_at');

        if ($request->filled('date_from')) {
            $query->whereDate('issued_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('issued_at', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_number', 'like', "%{$search}%")
                  ->orWhere('buyer_name', 'like', "%{$search}%")
                  ->orWhereHas('order.user', fn ($u) =>
                      $u->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                  );
            });
        }

        return response()->json($query->paginate(20));
    }

    // GET /api/admin/invoices/{invoice}
    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load('order.items.product:id,name', 'order.user:id,name,email');

        return response()->json($invoice);
    }

    // GET /api/admin/invoices/{invoice}/download
    public function download(Invoice $invoice): BinaryFileResponse
    {
        $path = $this->pdfs->ensurePdf($invoice);

        return response()->download(
            Storage::disk('local')->path($path),
            "{$invoice->full_number}.pdf"
        );
    }
}
