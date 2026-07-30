<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Promotion extends Model
{
    protected $fillable = [
        'product_id',
        'discount_type',
        'discount_value',
        'starts_at',
        'ends_at',
        'is_active',
    ];

    protected $appends = [
        'original_price',
        'discounted_price',
        'status',
    ];

    // Oculta la relación 'product' en JSON — evita el anidado circular
    // product.promotion.product cuando se embebe en la respuesta del producto.
    protected $hidden = [
        'product',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'integer',
            'starts_at'      => 'datetime',
            'ends_at'        => 'datetime',
            'is_active'      => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }

    /**
     * Comprueba si una promoción con estas fechas (para product_id) solaparía con otra
     * promoción activa ya existente del mismo producto — incluyendo solapamientos futuros,
     * no solo "hay una vigente ahora mismo". NULL en starts_at/ends_at se trata como
     * "sin límite" en ese extremo.
     */
    public static function overlapsExisting(int $productId, ?string $startsAt, ?string $endsAt, ?int $excludeId = null): bool
    {
        $query = static::where('product_id', $productId)->where('is_active', true);

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        // existing.starts_at <= new.ends_at (si new.ends_at es null, no hay límite superior que comprobar)
        if ($endsAt !== null) {
            $query->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $endsAt));
        }

        // existing.ends_at >= new.starts_at (si new.starts_at es null, no hay límite inferior que comprobar)
        if ($startsAt !== null) {
            $query->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $startsAt));
        }

        return $query->exists();
    }

    protected function originalPrice(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->product->price,
        );
    }

    protected function discountedPrice(): Attribute
    {
        return Attribute::make(
            get: function () {
                $price = $this->product->price;

                $discounted = $this->discount_type === 'percent'
                    ? $price * (1 - $this->discount_value / 100)
                    : $price - $this->discount_value;

                return max(0, (int) round($discounted));
            },
        );
    }

    protected function status(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->is_active) return 'inactive';
                if ($this->starts_at && $this->starts_at->isFuture()) return 'scheduled';
                if ($this->ends_at && $this->ends_at->isPast()) return 'expired';
                return 'active';
            },
        );
    }
}
