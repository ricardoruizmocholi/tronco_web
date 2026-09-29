<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'order_id',
        'series',
        'year',
        'number',
        'full_number',
        'issued_at',
        'is_simplified',
        'buyer_name',
        'buyer_tax_id',
        'buyer_address',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total',
        'pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'year'          => 'integer',
            'number'        => 'integer',
            'issued_at'     => 'datetime',
            'is_simplified' => 'boolean',
            'buyer_address' => 'array',
            'subtotal'      => 'integer',
            'tax_rate'      => 'decimal:2',
            'tax_amount'    => 'integer',
            'total'         => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
