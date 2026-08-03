<?php

namespace App\Exports;

use App\Exports\Concerns\StylesExportSheet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;

// Hoja "Resumen": todos los valores numéricos son fórmulas Excel reales que referencian la
// hoja "Pedidos" con rangos EXACTOS (Pedidos!H2:H{lastRow}), calculados a partir de la misma
// colección que recibe OrdersDataSheet (inyectada por OrdersExport, una sola consulta para
// ambas hojas). Un rango genérico enorme (H2:H100000) agota la memoria: PhpSpreadsheet evalúa
// las fórmulas en PHP puro al autoajustar columnas, y recorrer 100.000 filas por fórmula es
// inviable — probado con OOM real durante el desarrollo de esta feature. Solo la ESTRUCTURA
// (qué filas de estado o de mes generar) se decide en PHP inspeccionando los datos — los
// NÚMEROS que ve el usuario siempre son fórmulas.
class OrdersSummarySheet implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const STATUSES = [
        'pending'          => 'Pendiente',
        'paid'             => 'Pagado',
        'failed'           => 'Fallido',
        'shipped'          => 'Enviado',
        'cancelled'        => 'Cancelado',
        'delivered'        => 'Entregado',
        'return_requested' => 'Devolución solicitada',
        'return_approved'  => 'Devolución aprobada',
        'return_rejected'  => 'Devolución rechazada',
        'return_received'  => 'Devuelto recibido',
        'refunded'         => 'Reembolsado',
    ];

    private const MONTH_NAMES = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
    ];

    private readonly int $lastDataRow;

    private array $boldRows = [];
    private array $highlightCells = [];
    private ?array $statusTableRows = null;
    private ?array $monthTableRows = null;
    private ?array $moneyRowsRange = null;

    public function __construct(private Collection $orders)
    {
        // Fila 1 = cabecera de "Pedidos". Con 0 pedidos, aun así referenciamos la fila 2
        // (vacía) para que los rangos de fórmula sigan siendo válidos.
        $this->lastDataRow = max(2, $orders->count() + 1);
    }

    public function title(): string
    {
        return 'Resumen';
    }

    public function array(): array
    {
        $range = fn (string $col) => "Pedidos!{$col}2:{$col}{$this->lastDataRow}";

        $rows = [];

        $rows[] = ['RESUMEN DE PEDIDOS'];
        $this->boldRows[] = count($rows);

        $rows[] = [null];

        $rows[] = ['Total de pedidos exportados', '=COUNTA(' . $range('A') . ')'];
        $totalRow = count($rows);
        $this->highlightCells[] = "B{$totalRow}";

        $rows[] = [null];

        $rows[] = ['PEDIDOS POR ESTADO'];
        $this->boldRows[] = count($rows);

        $rows[] = ['Estado', 'Cantidad', '% del total'];
        $this->boldRows[] = count($rows);

        $firstStatusRow = count($rows) + 1;
        foreach (self::STATUSES as $code => $label) {
            $rows[] = [$label, "=COUNTIF(" . $range('E') . ",\"{$code}\")", null];
            $r = count($rows);
            $rows[$r - 1][2] = "=IFERROR(B{$r}/\$B\${$totalRow},0)";
        }
        $lastStatusRow = count($rows);
        $this->statusTableRows = [$firstStatusRow, $lastStatusRow];

        $rows[] = [null];

        $rows[] = ['Ingreso total bruto (€)', '=SUM(' . $range('H') . ')'];
        $grossRow = count($rows);
        $this->highlightCells[] = "B{$grossRow}";

        $rows[] = ['Ingreso total neto estimado (€)', '=SUM(' . $range('O') . ')'];
        $netRow = count($rows);
        $this->highlightCells[] = "B{$netRow}";

        $rows[] = ['Ticket medio (€)', "=IFERROR(B{$grossRow}/B{$totalRow},0)"];
        $avgRow = count($rows);
        $this->highlightCells[] = "B{$avgRow}";
        $this->moneyRowsRange = [$grossRow, $avgRow];

        $rows[] = [null];

        $rows[] = ['MES CON MÁS INGRESOS'];
        $this->boldRows[] = count($rows);

        $rows[] = ['Mes', 'Ingresos (€)'];
        $this->boldRows[] = count($rows);

        $months = $this->distinctMonths();
        if ($months) {
            $firstMonthRow = count($rows) + 1;
            foreach ($months as $month) {
                $nextY = $month['m'] === 12 ? $month['y'] + 1 : $month['y'];
                $nextM = $month['m'] === 12 ? 1 : $month['m'] + 1;
                $rows[] = [
                    $month['label'],
                    "=SUMIFS(" . $range('H') . "," . $range('D')
                        . ",\">=\"&DATE({$month['y']},{$month['m']},1)," . $range('D')
                        . ",\"<\"&DATE({$nextY},{$nextM},1))",
                ];
            }
            $lastMonthRow = count($rows);
            $this->monthTableRows = [$firstMonthRow, $lastMonthRow];

            $rows[] = [
                'Mes con más ingresos',
                "=INDEX(A{$firstMonthRow}:A{$lastMonthRow},MATCH(MAX(B{$firstMonthRow}:B{$lastMonthRow}),B{$firstMonthRow}:B{$lastMonthRow},0))",
            ];
            $winnerRow = count($rows);
            $this->highlightCells[] = "B{$winnerRow}";
        } else {
            $rows[] = ['Mes con más ingresos', 'Sin datos'];
        }

        return $rows;
    }

    // A partir de la misma colección que ve OrdersDataSheet — sin segunda consulta a la BD.
    private function distinctMonths(): array
    {
        $months = [];
        foreach ($this->orders as $order) {
            $key = $order->created_at->format('Y-m');
            if (!isset($months[$key])) {
                $months[$key] = [
                    'label' => self::MONTH_NAMES[(int) $order->created_at->format('n')] . ' ' . $order->created_at->format('Y'),
                    'y'     => (int) $order->created_at->format('Y'),
                    'm'     => (int) $order->created_at->format('n'),
                ];
            }
        }
        ksort($months);

        return array_values($months);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                foreach ($this->boldRows as $row) {
                    $this->styleBold($sheet, "A{$row}:C{$row}");
                }
                $this->styleSummaryHighlights($sheet, $this->highlightCells);

                if ($this->moneyRowsRange) {
                    [$first, $last] = $this->moneyRowsRange;
                    $this->formatMoneyColumns($sheet, ['B'], $first, $last);
                }
                if ($this->monthTableRows) {
                    [$first, $last] = $this->monthTableRows;
                    $this->formatMoneyColumns($sheet, ['B'], $first, $last);
                }
                if ($this->statusTableRows) {
                    [$first, $last] = $this->statusTableRows;
                    $sheet->getStyle("C{$first}:C{$last}")->getNumberFormat()->setFormatCode('0.0%');
                }
            },
        ];
    }
}
