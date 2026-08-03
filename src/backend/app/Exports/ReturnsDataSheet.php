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

class ReturnsDataSheet implements FromCollection, WithHeadings, WithMapping, WithTitle, WithEvents, ShouldAutoSize
{
    use StylesExportSheet;

    private const LAST_COLUMN = 'L';
    private const MONEY_COLUMNS = ['K'];
    // G=solicitud, H=aprobación, I=recepción, J=reembolso.
    private const DATE_COLUMNS = ['G', 'H', 'I', 'J'];

    private int $currentRow = 1;

    public function __construct(private Collection $returns) {}

    public function title(): string
    {
        return 'Devoluciones';
    }

    public function collection(): Collection
    {
        return $this->returns;
    }

    public function headings(): array
    {
        return [
            'ID', 'Pedido ID', 'Usuario', 'Email', 'Motivo', 'Estado',
            'Fecha solicitud', 'Fecha aprobación', 'Fecha recepción', 'Fecha reembolso',
            'Importe reembolsado (€)', 'Días hasta resolución',
        ];
    }

    public function map($rr): array
    {
        $this->currentRow++;
        $row = $this->currentRow;

        return [
            $rr->id,
            $rr->order_id,
            $rr->user?->name ?? '—',
            $rr->user?->email ?? '—',
            $rr->reason,
            $rr->status,
            $rr->requested_at ? ExcelDate::PHPToExcel($rr->requested_at) : null,
            $rr->approved_at ? ExcelDate::PHPToExcel($rr->approved_at) : null,
            $rr->received_at ? ExcelDate::PHPToExcel($rr->received_at) : null,
            $rr->refunded_at ? ExcelDate::PHPToExcel($rr->refunded_at) : null,
            $rr->refund_amount !== null ? $rr->refund_amount / 100 : null,
            // Días desde la solicitud (G) hasta el reembolso (J); si aún no hay reembolso,
            // hasta la recepción (I); si tampoco hay recepción, "Pendiente".
            "=IF(J{$row}<>\"\",DAYS(J{$row},G{$row}),IF(I{$row}<>\"\",DAYS(I{$row},G{$row}),\"Pendiente\"))",
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
                $this->formatMoneyColumns($sheet, self::MONEY_COLUMNS, 2, $lastDataRow);
                $this->formatDateColumns($sheet, self::DATE_COLUMNS, 2, $lastDataRow);
            },
        ];
    }
}
