<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProductVariantController extends Controller
{
    // POST /api/admin/products/{product}/variants
    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'size'                   => ['nullable', 'string', 'max:50'],
            'stock'                  => ['required', 'integer', 'min:0'],
            'is_active'              => ['boolean'],
            'price_override'         => ['nullable', 'integer', 'min:0'],
            'image_url'              => ['nullable', 'string', 'max:2048'],
            'attribute_value_ids'    => ['nullable', 'array'],
            'attribute_value_ids.*'  => ['integer'],
        ]);

        $valueIds = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);

        $this->validateValuesBelongToProduct($product, $valueIds);
        $this->validateComboUnique($product, $valueIds);

        $variant = $product->variants()->create($data);

        if (! empty($valueIds)) {
            $variant->variantAttributes()->createMany(
                collect($valueIds)->map(fn ($id) => ['attribute_value_id' => $id])->all()
            );
        }

        return response()->json($variant->load('variantAttributes.attributeValue'), 201);
    }

    // PUT /api/admin/products/{product}/variants/{variant}
    public function update(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        if ($variant->product_id !== $product->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'size'                   => ['nullable', 'string', 'max:50'],
            'stock'                  => ['sometimes', 'integer', 'min:0'],
            'is_active'              => ['sometimes', 'boolean'],
            'price_override'         => ['nullable', 'integer', 'min:0'],
            'image_url'              => ['nullable', 'string', 'max:2048'],
            'attribute_value_ids'    => ['sometimes', 'array'],
            'attribute_value_ids.*'  => ['integer'],
        ]);

        $updatesCombo = array_key_exists('attribute_value_ids', $data);
        $valueIds     = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);

        if ($updatesCombo) {
            $this->validateValuesBelongToProduct($product, $valueIds);
            $this->validateComboUnique($product, $valueIds, excludeVariantId: $variant->id);
        }

        $variant->update($data);

        if ($updatesCombo) {
            $variant->variantAttributes()->delete();
            if (! empty($valueIds)) {
                $variant->variantAttributes()->createMany(
                    collect($valueIds)->map(fn ($id) => ['attribute_value_id' => $id])->all()
                );
            }
        }

        return response()->json($variant->load('variantAttributes.attributeValue'));
    }

    // DELETE /api/admin/products/{product}/variants/{variant}
    public function destroy(Product $product, ProductVariant $variant): JsonResponse
    {
        if ($variant->product_id !== $product->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $variant->delete();

        return response()->json(['message' => 'Variante eliminada.']);
    }

    /**
     * Todos los attribute_value_ids deben pertenecer a un atributo de este producto —
     * nunca confiar en que el frontend solo envía IDs válidos.
     */
    private function validateValuesBelongToProduct(Product $product, array $valueIds): void
    {
        if (empty($valueIds)) {
            return;
        }

        $uniqueIds  = array_values(array_unique($valueIds));
        $attributeIds = $product->attributes()->pluck('id');

        $validCount = ProductAttributeValue::whereIn('id', $uniqueIds)
            ->whereIn('attribute_id', $attributeIds)
            ->count();

        if ($validCount !== count($uniqueIds)) {
            throw ValidationException::withMessages([
                'attribute_value_ids' => ['Uno o más valores de atributo no pertenecen a este producto.'],
            ]);
        }
    }

    /**
     * No puede haber dos variantes del mismo producto con exactamente la misma
     * combinación de atributos (incluyendo la combinación vacía).
     */
    private function validateComboUnique(Product $product, array $valueIds, ?int $excludeVariantId = null): void
    {
        $target = collect($valueIds)->unique()->sort()->values()->all();

        $variants = $product->variants()
            ->with('variantAttributes')
            ->when($excludeVariantId, fn ($q) => $q->where('id', '!=', $excludeVariantId))
            ->get();

        foreach ($variants as $existing) {
            $existingIds = $existing->variantAttributes->pluck('attribute_value_id')->sort()->values()->all();
            if ($existingIds === $target) {
                throw ValidationException::withMessages([
                    'attribute_value_ids' => ['Ya existe una variante de este producto con esta misma combinación de atributos.'],
                ]);
            }
        }
    }
}
