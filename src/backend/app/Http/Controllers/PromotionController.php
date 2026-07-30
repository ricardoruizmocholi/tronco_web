<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;

class PromotionController extends Controller
{
    // GET /api/promotions/active — productos con promoción vigente, para el carrusel de la landing
    public function active(): JsonResponse
    {
        $products = Product::with([
            'category', 'images', 'variants', 'promotion',
            ...Product::colorAttributesEagerLoad(),
        ])
            ->where('is_active', true)
            ->whereHas('promotion')
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }
}
