<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fanfic extends Model
{
    protected $fillable = [
        'user_id',
        'image_url',
        'caption',
        'city_name',
        'latitude',
        'longitude',
        'is_featured',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'latitude'    => 'float',
            'longitude'   => 'float',
            'is_featured' => 'bool',
            'reviewed_at' => 'datetime',
        ];
    }

    // ── Relaciones ────────────────────────────────────────────

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // ── Scopes ───────────────────────────────────────────────

    public function scopeApproved(Builder $query): void
    {
        $query->where('status', 'approved');
    }

    public function scopePending(Builder $query): void
    {
        $query->where('status', 'pending');
    }

    public function scopeRejected(Builder $query): void
    {
        $query->where('status', 'rejected');
    }

    public function scopeFeatured(Builder $query): void
    {
        $query->where('is_featured', true);
    }
}
