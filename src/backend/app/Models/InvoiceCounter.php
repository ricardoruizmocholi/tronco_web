<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceCounter extends Model
{
    protected $fillable = [
        'series',
        'year',
        'last_number',
    ];

    protected function casts(): array
    {
        return [
            'year'        => 'integer',
            'last_number' => 'integer',
        ];
    }
}
