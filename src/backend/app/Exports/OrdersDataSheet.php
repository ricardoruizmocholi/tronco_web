<?php

namespace App\Exports;

use App\Exports\Concerns\StylesExportSheet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class OrdersDataSheet implements FromCollection, WithHeadings, WithMapping, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    // Columnas calculadas (fórmulas): M=Total con IVA, N=Comisión Stripe, O=Neto estimado.
    private const LAST_COLUMN = 'O';
    private const MONEY_COLUMNS = ['F', 'G', 'H', 'M', 'N', 'O'];
    private const DATE_COLUMNS  = ['D'];

    // Fila Excel de la fila que se está mapeando ahora mismo — la cabecera ocupa la fila 1,
    // así que la primera fila de datos es la 2. WithMapping no recibe el índice de fila, así
    // que lo llevamos nosotros para poder escribir fórmulas con referencias relativas (=H2*1.21).
    private int $currentRow = 1;

    public function __construct(private Collection $orders) {}

    public function title(): string
    {
        return 'Pedidos';
    }

    public function collection(): Collection
    {
        return $this->orders;
    }

    public function headings(): array
    {
        return [
            'ID', 'Usuario', 'Email', 'Fecha', 'Estado',
            'Subtotal (€)', 'Envío (€)', 'Total (€)', 'Nº Items', 'Dirección',
            'Transportista', 'Nº Seguimiento',
            'Total con IVA (21%)', 'Comisión Stripe estimada', 'Neto estimado',
        ];
    }

    public function map($order): array
    {
        $this->currentRow++;
        $row = $this->currentRow;

        $subtotal = ($order->total - ($order->shipping_cost ?? 0)) / 100;
        $shipping = ($order->shipping_cost ?? 0) / 100;
        $total    = $order->total / 100;

        return [
            $order->id,
            $order->user?->name ?? '—',
            $order->user?->email ?? '—',
            ExcelDate::PHPToExcel($order->created_at),
            $order->status,
            $subtotal,
            $shipping,
            $total,
            $order->items->sum('quantity'),
            $this->formatAddress($order->shipping_address),
            $order->carrier ?? '',
            $order->tracking_number ?? '',
            "=H{$row}*1.21",
            "=H{$row}*0.014+0.25",
            "=H{$row}-N{$row}",
        ];
    }

    private function formatAddress(?array $address): string
    {
        if (!$address) return '';

        return collect([
            $address['address_line1'] ?? null,
            $address['city'] ?? null,
            $address['postal_code'] ?? null,
        ])->filter()->implode(', ');
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // $this->currentRow ya refleja la última fila de datos escrita (empezó en 1
                // y se incrementa una vez por cada map() llamado).
                $lastDataRow = $this->currentRow;
                $totalsRow   = $lastDataRow + 1;

                $this->styleHeaderRow($sheet, self::LAST_COLUMN);
                $this->applyZebraStriping($sheet, self::LAST_COLUMN, 2, $lastDataRow);
                $this->freezeHeaderRow($sheet);
                $this->formatMoneyColumns($sheet, self::MONEY_COLUMNS, 2, $lastDataRow);
                $this->formatDateColumns($sheet, self::DATE_COLUMNS, 2, $lastDataRow);

                if ($lastDataRow >= 2) {
                    $sheet->setCellValue("A{$totalsRow}", "=COUNTA(A2:A{$lastDataRow})");
                    $sheet->setCellValue("B{$totalsRow}", 'TOTALES');
                    $sheet->setCellValue("F{$totalsRow}", "=SUM(F2:F{$lastDataRow})");
                    $sheet->setCellValue("G{$totalsRow}", "=SUM(G2:G{$lastDataRow})");
                    $sheet->setCellValue("H{$totalsRow}", "=SUM(H2:H{$lastDataRow})");
                    $sheet->setCellValue("O{$totalsRow}", "=SUM(O2:O{$lastDataRow})");

                    $this->formatMoneyColumns($sheet, ['F', 'G', 'H', 'O'], $totalsRow, $totalsRow);
                    $this->styleBold($sheet, "A{$totalsRow}:O{$totalsRow}");
                }
            },
        ];
    }
}
