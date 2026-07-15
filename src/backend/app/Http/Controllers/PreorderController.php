<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePreorderRequest;
use App\Models\Preorder;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class PreorderController extends Controller
{
    public function store(StorePreorderRequest $request): JsonResponse
    {
        $product = Product::findOrFail($request->product_id);

        if (! $product->allow_preorder) {
            return response()->json(['message' => 'Este producto no admite reservas.'], 422);
        }

        if ($product->stock > 0) {
            return response()->json(['message' => 'El producto tiene stock disponible.'], 422);
        }

        $variantId = $request->variant_id;

        $exists = Preorder::where('email', $request->email)
            ->where('product_id', $request->product_id)
            ->where('variant_id', $variantId)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Ya tienes una reserva para este producto.'], 422);
        }

        $preorder = Preorder::create([
            'user_id'    => $request->user()?->id,
            'product_id' => $request->product_id,
            'variant_id' => $variantId,
            'email'      => $request->email,
            'name'       => $request->name ?? $request->user()?->name,
            'status'     => 'pending',
        ]);

        return response()->json($preorder, 201);
    }
}
