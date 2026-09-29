<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1A1A1A; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .company { width: 55%; }
    .company h1 { font-size: 16px; margin: 0 0 6px; }
    .meta { width: 40%; text-align: right; }
    .meta .number { font-size: 15px; font-weight: bold; margin-bottom: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 47%; border: 1px solid #ddd; padding: 10px 12px; }
    .party h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; border-bottom: 2px solid #1A1A1A; padding: 6px 4px; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 4px; border-bottom: 1px solid #eee; }
    .text-right { text-align: right; }
    .totals { width: 45%; margin-left: 55%; }
    .totals td { border: none; padding: 4px; }
    .totals .total-row td { font-weight: bold; font-size: 13px; border-top: 2px solid #1A1A1A; }
    .footer { margin-top: 40px; font-size: 9px; color: #888; }
</style>
</head>
<body>

    <div class="header">
        <div class="company">
            <h1>{{ $company['legal_name'] ?? '' }}</h1>
            <p>
                NIF/CIF: {{ $company['tax_id'] ?? '' }}<br>
                {{ $company['address_line1'] ?? '' }}
                @if(!empty($company['address_line2'])), {{ $company['address_line2'] }}@endif
                <br>
                {{ $company['postal_code'] ?? '' }} {{ $company['city'] ?? '' }}, {{ $company['province'] ?? '' }}
                ({{ $company['country'] ?? '' }})
            </p>
        </div>
        <div class="meta">
            <div class="number">Factura {{ $invoice->full_number }}</div>
            <p>Fecha de emisión: {{ $invoice->issued_at->format('d/m/Y') }}</p>
            @if($invoice->is_simplified)
                <p>Factura simplificada</p>
            @endif
        </div>
    </div>

    <div class="parties">
        <div class="party">
            <h2>Datos del cliente</h2>
            <p>
                {{ $invoice->buyer_name }}<br>
                @if($invoice->buyer_tax_id)
                    NIF/CIF: {{ $invoice->buyer_tax_id }}<br>
                @endif
                {{ $invoice->buyer_address['address_line1'] ?? '' }}
                @if(!empty($invoice->buyer_address['address_line2'])), {{ $invoice->buyer_address['address_line2'] }}@endif
                <br>
                {{ $invoice->buyer_address['postal_code'] ?? '' }} {{ $invoice->buyer_address['city'] ?? '' }}
                @if(!empty($invoice->buyer_address['province'])), {{ $invoice->buyer_address['province'] }}@endif
                ({{ $invoice->buyer_address['country'] ?? '' }})
            </p>
        </div>
        <div class="party">
            <h2>Pedido</h2>
            <p>
                Pedido #{{ $invoice->order->id }}<br>
                Fecha del pedido: {{ $invoice->order->created_at->format('d/m/Y') }}
            </p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Concepto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Precio unitario</th>
                <th class="text-right">Importe</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->order->items as $item)
                <tr>
                    <td>{{ $item->product->name ?? 'Producto eliminado' }}</td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->unit_price / 100, 2, ',', '.') }} €</td>
                    <td class="text-right">{{ number_format($item->unit_price * $item->quantity / 100, 2, ',', '.') }} €</td>
                </tr>
            @endforeach
            @if($invoice->order->shipping_cost > 0)
                <tr>
                    <td>Gastos de envío</td>
                    <td class="text-right">1</td>
                    <td class="text-right">{{ number_format($invoice->order->shipping_cost / 100, 2, ',', '.') }} €</td>
                    <td class="text-right">{{ number_format($invoice->order->shipping_cost / 100, 2, ',', '.') }} €</td>
                </tr>
            @endif
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Base imponible</td>
            <td class="text-right">{{ number_format($invoice->subtotal / 100, 2, ',', '.') }} €</td>
        </tr>
        <tr>
            <td>IVA ({{ rtrim(rtrim(number_format($invoice->tax_rate, 2, ',', '.'), '0'), ',') }}%)</td>
            <td class="text-right">{{ number_format($invoice->tax_amount / 100, 2, ',', '.') }} €</td>
        </tr>
        <tr class="total-row">
            <td>Total</td>
            <td class="text-right">{{ number_format($invoice->total / 100, 2, ',', '.') }} €</td>
        </tr>
    </table>

    <div class="footer">
        Factura generada electrónicamente. Serie {{ $invoice->series }} — {{ $invoice->year }}.
    </div>

</body>
</html>
