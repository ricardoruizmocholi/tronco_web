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

class NewsletterDataSheet implements FromCollection, WithHeadings, WithMapping, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const LAST_COLUMN = 'E';
    private const DATE_COLUMNS = ['D'];

    private int $currentRow = 1;

    public function __construct(private Collection $subscribers) {}

    public function title(): string
    {
        return 'Subscribers';
    }

    public function collection(): Collection
    {
        return $this->subscribers;
    }

    public function headings(): array
    {
        return ['ID', 'Email', 'Nombre', 'Fecha suscripción', 'Confirmado (Sí/No)'];
    }

    public function map($subscriber): array
    {
        $this->currentRow++;

        return [
            $subscriber->id,
            $subscriber->email,
            $subscriber->name ?? '—',
            ExcelDate::PHPToExcel($subscriber->created_at),
            $subscriber->confirmed_at ? 'Sí' : 'No',
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastDataRow = $this->currentRow;

                $this->styleHeaderRow($sheet, self::LAST_COLUMN);
                $this->applyZebraStriping($sheet, self::LAST_COLUMN, 2, $lastDataRow);
                $this->freezeHeaderRow($sheet);
                $this->formatDateColumns($sheet, self::DATE_COLUMNS, 2, $lastDataRow);
            },
        ];
    }
}
