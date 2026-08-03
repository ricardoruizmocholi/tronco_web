<?php

namespace App\Exports;

use App\Models\Preorder;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class PreordersExport implements WithMultipleSheets
{
    public function __construct(private array $filters = []) {}

    public function sheets(): array
    {
        $preorders = $this->query()->get();

        return [
            new PreordersDataSheet($preorders),
            new PreordersSummarySheet($preorders),
        ];
    }

    private function query()
    {
        $query = Preorder::with(['product:id,name', 'variant:id,size'])
            ->orderByDesc('created_at');

        if (!empty($this->filters['product_id'])) {
            $query->where('product_id', $this->filters['product_id']);
        }
        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        return $query;
    }
}
