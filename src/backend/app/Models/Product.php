<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'artist_id',
        'name',
        'slug',
        'description',
        'price',
        'stock',
        'image_url',
        'is_active',
        'allow_preorder',
    ];

    protected $attributes = [
        'stock'          => 0,
        'is_active'      => true,
        'allow_preorder' => false,
    ];

    protected function casts(): array
    {
        return [
            'price'          => 'integer',
            'stock'          => 'integer',
            'is_active'      => 'boolean',
            'allow_preorder' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('position');
    }

    public function firstImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->orderBy('position');
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(ProductAttribute::class)->orderBy('position');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('id');
    }

    public function preorders(): HasMany
    {
        return $this->hasMany(Preorder::class);
    }

    public function promotion(): HasOne
    {
        return $this->hasOne(Promotion::class)->active();
    }

    public function scopeNewArrivals(Builder $query): Builder
    {
        return $query->where('created_at', '>=', now()->subDays(30));
    }

    /**
     * Eager load ligero para listados (índice, novedades, promociones activas):
     * solo atributos tipo color, para pintar swatches en ProductCard sin cargar
     * variantes/combinaciones completas. Centralizado aquí para que cualquier
     * endpoint que devuelva productos a un listado lo incluya de forma consistente
     * — olvidarlo en un controlador deja `attributes` undefined en el frontend.
     */
    public static function colorAttributesEagerLoad(): array
    {
        return [
            'attributes' => fn ($q) => $q->where('type', 'color')->with('values'),
        ];
    }
}
