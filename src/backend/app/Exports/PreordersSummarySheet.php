<?php

namespace App\Exports;

use App\Exports\Concerns\StylesExportSheet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;

class PreordersSummarySheet implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const STATUSES = [
        'pending'   => 'Pendiente',
        'notified'  => 'Notificado',
        'converted' => 'Convertido',
    ];

    private readonly int $lastDataRow;

    private array $boldRows = [];
    private array $highlightCells = [];
    private ?array $productTableRows = null;
    private ?int $conversionRow = null;

    public function __construct(private Collection $preorders)
    {
        $this->lastDataRow = max(2, $preorders->count() + 1);
    }

    public function title(): string
    {
        return 'Resumen preorders';
    }

    public function array(): array
    {
        $range = fn (string $col) => "Preorders!{$col}2:{$col}{$this->lastDataRow}";

        $rows = [];

        $rows[] = ['RESUMEN DE PREORDERS'];
        $this->boldRows[] = count($rows);

        $rows[] = [null];

        $rows[] = ['Total preorders', '=COUNTA(' . $range('A') . ')'];
        $totalRow = count($rows);
        $this->highlightCells[] = "B{$totalRow}";

        $rows[] = [null];

        $rows[] = ['POR PRODUCTO'];
        $this->boldRows[] = count($rows);
        $rows[] = ['Producto', 'Cantidad', '% del total'];
        $this->boldRows[] = count($rows);

        $products = $this->preorders->pluck('product.name')->filter()->unique()->values();
        $firstProductRow = count($rows) + 1;
        foreach ($products as $product) {
            // Los nombres de producto pueden llevar comillas — se escapan duplicándolas,
            // que es como Excel espera un " literal dentro de un argumento de texto.
            $escaped = str_replace('"', '""', $product);
            $rows[] = [$product, "=COUNTIF(" . $range('B') . ",\"{$escaped}\")", null];
            $r = count($rows);
            $rows[$r - 1][2] = "=IFERROR(B{$r}/\$B\${$totalRow},0)";
        }
        $lastProductRow = count($rows);
        $productTableRows = $products->isNotEmpty() ? [$firstProductRow, $lastProductRow] : null;

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

        $rows[] = ['Tasa de conversión', "=IFERROR(B{$statusRows['converted']}/B{$totalRow},0)"];
        $conversionRow = count($rows);
        $this->highlightCells[] = "B{$conversionRow}";

        $this->productTableRows = $productTableRows;
        $this->conversionRow    = $conversionRow;

        return $rows;
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

                if ($this->productTableRows) {
                    [$first, $last] = $this->productTableRows;
                    $sheet->getStyle("C{$first}:C{$last}")->getNumberFormat()->setFormatCode('0.0%');
                }
                if ($this->conversionRow) {
                    $sheet->getStyle("B{$this->conversionRow}")->getNumberFormat()->setFormatCode('0.0%');
                }
            },
        ];
    }
}
