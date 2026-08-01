<?php

namespace App\Http\Controllers;

use App\Models\HeroSlide;
use Illuminate\Http\JsonResponse;

class HeroSlideController extends Controller
{
    // GET /api/hero-slides — slides activos para el hero de la home
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            HeroSlide::active()->orderBy('position')->orderBy('id')->get()
        );
    }
}
