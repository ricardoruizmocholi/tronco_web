<?php

namespace App\Http\Controllers;

use App\Models\ShippingRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingRateController extends Controller
{
    // GET /api/shipping-rates — público, sólo activas
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            ShippingRate::active()->orderBy('country_code')->orderBy('min_order_amount')->get()
        );
    }

    // GET /api/admin/shipping-rates
    public function index(): JsonResponse
    {
        return response()->json(
            ShippingRate::orderBy('country_code')->orderBy('min_order_amount')->get()
        );
    }

    // POST /api/admin/shipping-rates
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'country_code'     => ['nullable', 'string', 'size:2'],
            'min_order_amount' => ['required', 'integer', 'min:0'],
            'free_above'       => ['nullable', 'integer', 'min:0'],
            'rate'             => ['required', 'integer', 'min:0'],
            'is_active'        => ['boolean'],
        ]);

        return response()->json(ShippingRate::create($data), 201);
    }

    // PUT /api/admin/shipping-rates/{rate}
    public function update(Request $request, ShippingRate $rate): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'country_code'     => ['nullable', 'string', 'size:2'],
            'min_order_amount' => ['required', 'integer', 'min:0'],
            'free_above'       => ['nullable', 'integer', 'min:0'],
            'rate'             => ['required', 'integer', 'min:0'],
            'is_active'        => ['boolean'],
        ]);

        $rate->update($data);

        return response()->json($rate);
    }

    // DELETE /api/admin/shipping-rates/{rate}
    public function destroy(ShippingRate $rate): JsonResponse
    {
        $rate->delete();

        return response()->json(null, 204);
    }
}
