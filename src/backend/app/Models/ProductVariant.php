<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'size',
        'stock',
        'price_override',
        'image_url',
        'is_active',
    ];

    protected $appends = [
        'effective_price',
        'effective_image',
        'attribute_values',
    ];

    // Oculta las relaciones crudas del JSON — $hidden filtra por el nombre camelCase
    // del método de relación (antes de la conversión a snake_case para el output),
    // no por la clave ya convertida. 'variantAttributes' se expone aplanada como
    // 'attribute_values'; 'product' se carga de forma perezosa dentro de los propios
    // accessors (effective_price/effective_image) y no debe filtrarse al JSON.
    protected $hidden = [
        'variantAttributes',
        'product',
    ];

    protected function casts(): array
    {
        return [
            'stock'          => 'integer',
            'price_override' => 'integer',
            'is_active'      => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variantAttributes(): HasMany
    {
        return $this->hasMany(ProductVariantAttribute::class, 'variant_id');
    }

    protected function effectivePrice(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->price_override ?? $this->product->price,
        );
    }

    protected function effectiveImage(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->image_url ?? $this->product->firstImage?->url ?? null,
        );
    }

    protected function attributeValues(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->variantAttributes->map(fn (ProductVariantAttribute $va) => [
                'attribute_id'       => $va->attributeValue->attribute_id,
                'attribute_value_id' => $va->attribute_value_id,
                'value'              => $va->attributeValue->value,
                'label'              => $va->attributeValue->label,
            ])->values(),
        );
    }
}
