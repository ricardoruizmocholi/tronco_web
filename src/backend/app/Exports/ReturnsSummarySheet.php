<?php

namespace App\Exports;

use App\Exports\Concerns\StylesExportSheet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;

// Igual que OrdersSummarySheet: rangos exactos (no genéricos de 100.000 filas — ver la nota
// en esa clase sobre el OOM real que provoca en PhpSpreadsheet) y filas espaciadoras `[null]`
// (un array vacío `[]` lo salta el writer de maatwebsite/excel y desincroniza los números de
// fila de todas las fórmulas).
class ReturnsSummarySheet implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const REASONS = [
        'defectuoso'     => 'Defectuoso / dañado',
        'no_corresponde' => 'No corresponde al pedido',
        'desistimiento'  => 'Desistimiento (14 días)',
        'otro'           => 'Otro',
    ];

    private const STATUSES = [
        'pending'  => 'Pendientes',
        'approved' => 'Aprobadas',
        'rejected' => 'Rechazadas',
        'received' => 'Recibidas',
        'refunded' => 'Reembolsadas',
    ];

    private readonly int $lastDataRow;

    private array $boldRows = [];
    private array $highlightCells = [];
    private ?int $approvalRateRow = null;
    private ?int $refundedTotalRow = null;

    public function __construct(private Collection $returns)
    {
        $this->lastDataRow = max(2, $returns->count() + 1);
    }

    public function title(): string
    {
        return 'Resumen devoluciones';
    }

    public function array(): array
    {
        $range = fn (string $col) => "Devoluciones!{$col}2:{$col}{$this->lastDataRow}";

        $rows = [];

        $rows[] = ['RESUMEN DE DEVOLUCIONES'];
        $this->boldRows[] = count($rows);

        $rows[] = [null];

        $rows[] = ['Total solicitudes', '=COUNTA(' . $range('A') . ')'];
        $totalRow = count($rows);
        $this->highlightCells[] = "B{$totalRow}";

        $rows[] = [null];

        $rows[] = ['POR MOTIVO'];
        $this->boldRows[] = count($rows);
        $rows[] = ['Motivo', 'Cantidad'];
        $this->boldRows[] = count($rows);
        foreach (self::REASONS as $code => $label) {
            $rows[] = [$label, "=COUNTIF(" . $range('E') . ",\"{$code}\")"];
        }

        $rows[] = [null];

        $rows[] = ['POR ESTADO'];
        $this->boldRows[] = count($rows);
        $rows[] = ['Estado', 'Cantidad'];
        $this->boldRows[] = count($rows);
        $statusRows = [];
        foreach (self::STATUSES as $code => $label) {
            $rows[] = [$label, "=COUNTIF(" . $range('F') . ",\"{$code}\")"];
            $statusRows[$code] = count($rows);
        }

        $rows[] = [null];

        $rows[] = ['Tasa de aprobación', "=IFERROR(B{$statusRows['approved']}/B{$totalRow},0)"];
        $this->approvalRateRow = count($rows);
        $this->highlightCells[] = "B{$this->approvalRateRow}";

        $rows[] = ['Importe total reembolsado (€)', '=SUM(' . $range('K') . ')'];
        $this->refundedTotalRow = count($rows);
        $this->highlightCells[] = "B{$this->refundedTotalRow}";

        $rows[] = ['Tiempo medio de resolución (días)', "=IFERROR(AVERAGE(" . $range('L') . "),0)"];
        $avgDaysRow = count($rows);
        $this->highlightCells[] = "B{$avgDaysRow}";

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                foreach ($this->boldRows as $row) {
                    $this->styleBold($sheet, "A{$row}:B{$row}");
                }
                $this->styleSummaryHighlights($sheet, $this->highlightCells);

                if ($this->approvalRateRow) {
                    $sheet->getStyle("B{$this->approvalRateRow}")
                        ->getNumberFormat()->setFormatCode('0.0%');
                }
                if ($this->refundedTotalRow) {
                    $this->formatMoneyColumns($sheet, ['B'], $this->refundedTotalRow, $this->refundedTotalRow);
                }
            },
        ];
    }
}
