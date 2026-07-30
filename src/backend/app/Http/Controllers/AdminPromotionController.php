<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminPromotionController extends Controller
{
    // GET /api/admin/promotions
    public function index(): JsonResponse
    {
        $promotions = Promotion::with('product:id,name,slug,price,image_url')
            ->latest()
            ->get();

        return response()->json($promotions);
    }

    // POST /api/admin/promotions
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        $promotion = Promotion::create($data);

        return response()->json($promotion->load('product:id,name,slug,price,image_url'), 201);
    }

    // PUT /api/admin/promotions/{promotion}
    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        $data = $this->validateData($request, $promotion->id);

        $promotion->update($data);

        return response()->json($promotion->load('product:id,name,slug,price,image_url'));
    }

    // DELETE /api/admin/promotions/{promotion}
    public function destroy(Promotion $promotion): JsonResponse
    {
        $promotion->delete();

        return response()->json(['message' => 'Promoción eliminada.']);
    }

    private function validateData(Request $request, ?int $excludeId = null): array
    {
        $data = $request->validate([
            'product_id'     => ['required', 'integer', 'exists:products,id'],
            'discount_type'  => ['required', 'in:percent,fixed'],
            'discount_value' => ['required', 'integer', 'min:1'],
            'starts_at'      => ['nullable', 'date'],
            'ends_at'        => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        if ($data['discount_type'] === 'percent' && $data['discount_value'] > 100) {
            throw ValidationException::withMessages([
                'discount_value' => ['El porcentaje de descuento no puede superar 100.'],
            ]);
        }

        if ($data['discount_type'] === 'fixed') {
            $product = Product::findOrFail($data['product_id']);
            if ($data['discount_value'] >= $product->price) {
                throw ValidationException::withMessages([
                    'discount_value' => ['El descuento fijo debe ser menor que el precio del producto.'],
                ]);
            }
        }

        if (Promotion::overlapsExisting($data['product_id'], $data['starts_at'] ?? null, $data['ends_at'] ?? null, $excludeId)) {
            throw ValidationException::withMessages([
                'product_id' => ['Ya existe una promoción activa para este producto que se solapa con estas fechas.'],
            ]);
        }

        return $data;
    }
}
