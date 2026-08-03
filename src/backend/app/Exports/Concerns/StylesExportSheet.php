<?php

namespace App\Exports\Concerns;

use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

// Formato visual compartido por las 8 hojas de la Feature 021 (4 exports × datos/resumen).
// Todos los métodos operan directamente sobre el Worksheet de PhpSpreadsheet (obtenido vía
// $event->sheet->getDelegate() en el AfterSheet de cada hoja) — no dependen de FromCollection
// ni de ningún otro concern, así que funcionan igual en hojas de datos (WithMapping) y en
// hojas de resumen (FromArray).
trait StylesExportSheet
{
    protected function styleHeaderRow(Worksheet $sheet, string $lastColumn, int $headerRow = 1): void
    {
        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1C1F1A'],
            ],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(22);
    }

    // Fondo #F5F5F5 en filas pares de datos (blanco en las impares — el color por defecto).
    protected function applyZebraStriping(Worksheet $sheet, string $lastColumn, int $firstDataRow, int $lastDataRow): void
    {
        for ($row = $firstDataRow; $row <= $lastDataRow; $row++) {
            if (($row - $firstDataRow) % 2 === 1) {
                $sheet->getStyle("A{$row}:{$lastColumn}{$row}")->applyFromArray([
                    'fill' => [
                        'fillType'   => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F5F5F5'],
                    ],
                ]);
            }
        }
    }

    protected function freezeHeaderRow(Worksheet $sheet, int $headerRow = 1): void
    {
        $sheet->freezePane('A' . ($headerRow + 1));
    }

    // $columns p.ej. ['F', 'H']. Requiere que la celda contenga un número (céntimos ya
    // convertidos a euros), no un string formateado a mano.
    protected function formatMoneyColumns(Worksheet $sheet, array $columns, int $firstDataRow, int $lastDataRow): void
    {
        foreach ($columns as $col) {
            $sheet->getStyle("{$col}{$firstDataRow}:{$col}{$lastDataRow}")
                ->getNumberFormat()->setFormatCode('#,##0.00" €"');
        }
    }

    // $columns p.ej. ['D']. Requiere que la celda contenga un serial de fecha Excel
    // (ExcelDate::PHPToExcel($carbon)), no un string — si no, dd/mm/yyyy no tiene efecto
    // y las fórmulas DAYS()/SUMIFS por fecha del resto de la feature no funcionan.
    protected function formatDateColumns(Worksheet $sheet, array $columns, int $firstDataRow, int $lastDataRow): void
    {
        foreach ($columns as $col) {
            $sheet->getStyle("{$col}{$firstDataRow}:{$col}{$lastDataRow}")
                ->getNumberFormat()->setFormatCode('dd/mm/yyyy');
        }
    }

    protected function styleBold(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray(['font' => ['bold' => true]]);
    }

    // Negrita + color primario de marca para los valores destacados de una hoja Resumen.
    protected function styleSummaryHighlights(Worksheet $sheet, array $cells): void
    {
        foreach ($cells as $cell) {
            $sheet->getStyle($cell)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '5BBB2A']],
            ]);
        }
    }
}
