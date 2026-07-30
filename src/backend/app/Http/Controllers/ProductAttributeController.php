<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductAttributeController extends Controller
{
    // POST /api/admin/products/{product}/attributes
    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:text,color'],
        ]);

        $position = ($product->attributes()->max('position') ?? -1) + 1;

        $attribute = $product->attributes()->create([...$data, 'position' => $position]);

        return response()->json($attribute->load('values'), 201);
    }

    // PUT /api/admin/attributes/{attribute}
    public function update(Request $request, ProductAttribute $attribute): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'type' => ['sometimes', 'in:text,color'],
        ]);

        $attribute->update($data);

        return response()->json($attribute->load('values'));
    }

    // DELETE /api/admin/attributes/{attribute}
    public function destroy(ProductAttribute $attribute): JsonResponse
    {
        // Cascada por FK: elimina también sus values y los variant_attributes que los referencian
        $attribute->delete();

        return response()->json(['message' => 'Atributo eliminado.']);
    }

    // POST /api/admin/attributes/{attribute}/values
    public function storeValue(Request $request, ProductAttribute $attribute): JsonResponse
    {
        $rules = [
            'value' => ['required', 'string', 'max:100'],
            'label' => ['required', 'string', 'max:100'],
        ];

        if ($attribute->type === 'color') {
            $rules['value'][] = 'regex:/^#[0-9A-Fa-f]{6}$/';
        }

        $data = $request->validate($rules);

        $position = ($attribute->values()->max('position') ?? -1) + 1;

        $value = $attribute->values()->create([...$data, 'position' => $position]);

        return response()->json($value, 201);
    }

    // PUT /api/admin/attribute-values/{value}
    public function updateValue(Request $request, ProductAttributeValue $value): JsonResponse
    {
        $rules = [
            'value' => ['sometimes', 'string', 'max:100'],
            'label' => ['sometimes', 'string', 'max:100'],
        ];

        if ($value->attribute->type === 'color' && $request->has('value')) {
            $rules['value'][] = 'regex:/^#[0-9A-Fa-f]{6}$/';
        }

        $data = $request->validate($rules);

        $value->update($data);

        return response()->json($value);
    }

    // DELETE /api/admin/attribute-values/{value}
    public function destroyValue(ProductAttributeValue $value): JsonResponse
    {
        // Cascada por FK: elimina también los variant_attributes que lo referencian
        $value->delete();

        return response()->json(['message' => 'Valor eliminado.']);
    }
}
