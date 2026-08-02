<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReturnRequest extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'reason',
        'description',
        'image_url',
        'status',
        'admin_notes',
        'stripe_refund_id',
        'refund_amount',
        'requested_at',
        'approved_at',
        'rejected_at',
        'received_at',
        'refunded_at',
        'return_tracking_number',
        'return_tracking_url',
        'return_carrier',
        'return_tracking_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'refund_amount' => 'integer',
            'requested_at'  => 'datetime',
            'approved_at'   => 'datetime',
            'rejected_at'   => 'datetime',
            'received_at'   => 'datetime',
            'refunded_at'   => 'datetime',
            'return_tracking_updated_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(ReturnStatusHistory::class)->orderBy('created_at');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ReturnRequestItem::class);
    }
}
