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

class PreordersDataSheet implements FromCollection, WithHeadings, WithMapping, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const LAST_COLUMN = 'G';
    private const DATE_COLUMNS = ['G'];

    private int $currentRow = 1;

    public function __construct(private Collection $preorders) {}

    public function title(): string
    {
        return 'Preorders';
    }

    public function collection(): Collection
    {
        return $this->preorders;
    }

    public function headings(): array
    {
        return ['ID', 'Producto', 'Talla', 'Email', 'Nombre', 'Estado', 'Fecha solicitud'];
    }

    public function map($preorder): array
    {
        $this->currentRow++;

        return [
            $preorder->id,
            $preorder->product?->name ?? '—',
            $preorder->variant?->size ?? '—',
            $preorder->email,
            $preorder->name ?? '—',
            $preorder->status,
            ExcelDate::PHPToExcel($preorder->created_at),
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
