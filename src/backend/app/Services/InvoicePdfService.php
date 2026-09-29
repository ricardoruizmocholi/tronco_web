<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class InvoicePdfService
{
    public function generate(Invoice $invoice): string
    {
        $invoice->loadMissing('order.items.product');

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'company' => Setting::get('company_billing_info', []),
        ]);

        $path = "invoices/{$invoice->year}/{$invoice->full_number}.pdf";
        Storage::disk('local')->put($path, $pdf->output());
        $invoice->update(['pdf_path' => $path]);

        return $path;
    }

    // Devuelve la ruta del PDF ya generado, o lo regenera si por lo que sea
    // no existe en disco (borrado manual, fallo puntual al facturar…). El
    // contenido es determinista a partir de la factura ya emitida, así que
    // regenerar no cambia ni un número ni un importe.
    public function ensurePdf(Invoice $invoice): string
    {
        if ($invoice->pdf_path && Storage::disk('local')->exists($invoice->pdf_path)) {
            return $invoice->pdf_path;
        }

        return $this->generate($invoice);
    }
}
