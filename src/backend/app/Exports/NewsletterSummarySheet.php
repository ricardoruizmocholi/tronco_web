<?php

namespace App\Exports;

use App\Exports\Concerns\StylesExportSheet;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;

class NewsletterSummarySheet implements FromArray, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const MONTH_NAMES = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
    ];

    private readonly int $lastDataRow;

    private array $boldRows = [];
    private array $highlightCells = [];

    public function __construct(private Collection $subscribers)
    {
        $this->lastDataRow = max(2, $subscribers->count() + 1);
    }

    public function title(): string
    {
        return 'Resumen newsletter';
    }

    public function array(): array
    {
        $range = fn (string $col) => "Subscribers!{$col}2:{$col}{$this->lastDataRow}";

        $rows = [];

        $rows[] = ['RESUMEN DE NEWSLETTER'];
        $this->boldRows[] = count($rows);

        $rows[] = [null];

        $rows[] = ['Total subscribers', '=COUNTA(' . $range('A') . ')'];
        $this->highlightCells[] = 'B' . count($rows);

        $rows[] = [
            'Suscritos este mes',
            '=COUNTIFS(' . $range('D') . ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1))',
        ];
        $this->highlightCells[] = 'B' . count($rows);

        $rows[] = [
            'Suscritos este año',
            '=COUNTIFS(' . $range('D') . ',">="&DATE(YEAR(TODAY()),1,1))',
        ];
        $this->highlightCells[] = 'B' . count($rows);

        $rows[] = [null];

        $rows[] = ['CRECIMIENTO POR MES (últimos 6 meses)'];
        $this->boldRows[] = count($rows);
        $rows[] = ['Mes', 'Nuevos subscribers'];
        $this->boldRows[] = count($rows);

        foreach ($this->lastSixMonths() as $month) {
            $nextY = $month['m'] === 12 ? $month['y'] + 1 : $month['y'];
            $nextM = $month['m'] === 12 ? 1 : $month['m'] + 1;
            $rows[] = [
                $month['label'],
                "=COUNTIFS(" . $range('D') . ",\">=\"&DATE({$month['y']},{$month['m']},1)," . $range('D')
                    . ",\"<\"&DATE({$nextY},{$nextM},1))",
            ];
        }

        return $rows;
    }

    // Los 6 meses naturales más recientes (mes actual + los 5 anteriores), de más antiguo a
    // más reciente — no depende de qué meses tengan datos, a diferencia de OrdersSummarySheet.
    private function lastSixMonths(): array
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months[] = [
                'label' => self::MONTH_NAMES[$date->month] . ' ' . $date->year,
                'y'     => $date->year,
                'm'     => $date->month,
            ];
        }

        return $months;
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
            },
        ];
    }
}
