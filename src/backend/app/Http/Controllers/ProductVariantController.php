<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    // POST /api/admin/products/{product}/variants
    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'size'      => 'required|string|max:50',
            'stock'     => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $variant = $product->variants()->create($data);

        return response()->json($variant, 201);
    }

    // PUT /api/admin/products/{product}/variants/{variant}
    public function update(Request $request, Product $product, ProductVariant $variant): JsonResponse
    {
        if ($variant->product_id !== $product->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'size'      => 'sometimes|string|max:50',
            'stock'     => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $variant->update($data);

        return response()->json($variant);
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
}
