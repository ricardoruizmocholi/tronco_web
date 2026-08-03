<?php

namespace App\Exports;

use App\Models\ReturnRequest;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReturnsExport implements WithMultipleSheets
{
    public function __construct(private array $filters = []) {}

    public function sheets(): array
    {
        $returns = $this->query()->get();

        return [
            new ReturnsDataSheet($returns),
            new ReturnsSummarySheet($returns),
        ];
    }

    private function query()
    {
        $query = ReturnRequest::with(['order', 'user'])->latest();

        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }
        if (!empty($this->filters['user_email'])) {
            $query->whereHas('user', fn ($q) => $q->where('email', 'like', '%' . $this->filters['user_email'] . '%'));
        }
        if (!empty($this->filters['date_from'])) {
            $query->whereDate('requested_at', '>=', $this->filters['date_from']);
        }
        if (!empty($this->filters['date_to'])) {
            $query->whereDate('requested_at', '<=', $this->filters['date_to']);
        }

        return $query;
    }
}
