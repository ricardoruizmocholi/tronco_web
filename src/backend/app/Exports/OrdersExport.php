<?php

namespace App\Exports;

use App\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class OrdersExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private array $filters = []) {}

    public function collection(): Collection
    {
        $query = Order::with(['user:id,name,email', 'items'])
            ->orderBy('created_at', 'desc');

        if (!empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }
        if (!empty($this->filters['date_from'])) {
            $query->whereDate('created_at', '>=', $this->filters['date_from']);
        }
        if (!empty($this->filters['date_to'])) {
            $query->whereDate('created_at', '<=', $this->filters['date_to']);
        }
        if (!empty($this->filters['user_email'])) {
            $query->whereHas('user', fn ($q) => $q->where('email', 'like', '%' . $this->filters['user_email'] . '%'));
        }
        if (!empty($this->filters['min_amount'])) {
            $query->where('total', '>=', (int) ($this->filters['min_amount'] * 100));
        }
        if (!empty($this->filters['max_amount'])) {
            $query->where('total', '<=', (int) ($this->filters['max_amount'] * 100));
        }

        return $query->get();
    }

    public function headings(): array
    {
        return ['ID', 'Usuario', 'Email', 'Estado', 'Total (€)', 'Envío (€)', 'Artículos', 'Fecha'];
    }

    public function map($order): array
    {
        return [
            $order->id,
            $order->user?->name ?? '—',
            $order->user?->email ?? '—',
            $order->status,
            number_format($order->total / 100, 2, '.', ''),
            number_format(($order->shipping_cost ?? 0) / 100, 2, '.', ''),
            $order->items->sum('quantity'),
            $order->created_at->format('d/m/Y H:i'),
        ];
    }
}
