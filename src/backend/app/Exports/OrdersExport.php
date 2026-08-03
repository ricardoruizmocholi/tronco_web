<?php

namespace App\Exports;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

// Orquestador: consulta los pedidos UNA sola vez y reparte la misma colección a las dos hojas.
// Evita una segunda consulta idéntica en OrdersSummarySheet y, sobre todo, permite que el
// Resumen use rangos de fórmula EXACTOS (Pedidos!H2:H37) en vez de un rango genérico enorme
// (H2:H100000) — PhpSpreadsheet evalúa las fórmulas en PHP puro al autoajustar columnas, y un
// rango de 100.000 filas por fórmula agota la memoria (probado: OOM real con ese enfoque).
class OrdersExport implements WithMultipleSheets
{
    public function __construct(private array $filters = []) {}

    public function sheets(): array
    {
        $orders = $this->query()->get();

        return [
            new OrdersDataSheet($orders),
            new OrdersSummarySheet($orders),
        ];
    }

    private function query()
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

        return $query;
    }
}
