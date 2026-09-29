<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceCounter;
use App\Models\Order;
use App\Models\Setting;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    private const SERIES = 'A';

    // Crea la factura del pedido, con numeración correlativa sin huecos.
    // Debe llamarse una sola vez por pedido — el caller (el webhook de
    // Stripe) es responsable de la idempotencia (no facturar dos veces
    // el mismo order_id); aquí solo se garantiza que el NÚMERO nunca se
    // repite ni deja huecos entre facturas.
    public function createForOrder(Order $order): Invoice
    {
        $companyInfo = Setting::get('company_billing_info', []);
        $taxRate     = (float) ($companyInfo['tax_rate'] ?? 21);

        // Los precios del catálogo ya incluyen IVA (práctica estándar B2C en
        // España) — la factura desglosa el total ya cobrado, no añade IVA
        // encima. subtotal = base imponible, tax_amount = cuota.
        $total     = $order->total + $order->shipping_cost;
        $subtotal  = (int) round($total / (1 + $taxRate / 100));
        $taxAmount = $total - $subtotal;

        $billingInfo  = $order->billing_info;
        $isSimplified = empty($billingInfo);

        if ($isSimplified) {
            $buyerName    = $order->user->name;
            $buyerTaxId   = null;
            $buyerAddress = $order->shipping_address ?? [];
        } else {
            $buyerName    = $billingInfo['tax_name'];
            $buyerTaxId   = $billingInfo['tax_id'];
            $buyerAddress = collect($billingInfo)
                ->only(['address_line1', 'address_line2', 'postal_code', 'city', 'province', 'country'])
                ->all();
        }

        return $this->withNumberLock(function (int $number, string $series, int $year) use (
            $order, $isSimplified, $buyerName, $buyerTaxId, $buyerAddress, $subtotal, $taxRate, $taxAmount, $total
        ) {
            return Invoice::create([
                'order_id'      => $order->id,
                'series'        => $series,
                'year'          => $year,
                'number'        => $number,
                'full_number'   => sprintf('%s-%d-%06d', $series, $year, $number),
                'issued_at'     => now(),
                'is_simplified' => $isSimplified,
                'buyer_name'    => $buyerName,
                'buyer_tax_id'  => $buyerTaxId,
                'buyer_address' => $buyerAddress,
                'subtotal'      => $subtotal,
                'tax_rate'      => $taxRate,
                'tax_amount'    => $taxAmount,
                'total'         => $total,
            ]);
        });
    }

    // Bloquea la fila del contador de la serie/año actual (SELECT ... FOR
    // UPDATE dentro de una transacción) e incrementa antes de crear la
    // factura, todo en el mismo commit — si algo falla después, el
    // contador también revierte, así que el número se reutiliza en vez
    // de perderse. Ver spec/features/026-facturacion/spec.md.
    private function withNumberLock(\Closure $callback): Invoice
    {
        $series   = self::SERIES;
        $year     = (int) now()->year;
        $attempts = 0;

        while (true) {
            try {
                return DB::transaction(function () use ($callback, $series, $year) {
                    $counter = InvoiceCounter::lockForUpdate()
                        ->firstOrCreate(['series' => $series, 'year' => $year], ['last_number' => 0]);

                    $number = $counter->last_number + 1;
                    $counter->update(['last_number' => $number]);

                    return $callback($number, $series, $year);
                });
            } catch (QueryException $e) {
                // Solo puede pasar en la primerísima factura de una serie/año:
                // dos procesos intentan el firstOrCreate a la vez y el segundo
                // choca contra unique(series, year). Reintenta con transacción
                // limpia — la fila ya existirá y el lockForUpdate() se
                // comportará con normalidad.
                $attempts++;
                if ($attempts >= 3 || ! str_contains($e->getMessage(), 'Duplicate entry')) {
                    throw $e;
                }
            }
        }
    }
}
