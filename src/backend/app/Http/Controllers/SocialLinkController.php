<?php

namespace App\Http\Controllers;

use App\Models\SocialLink;
use Illuminate\Http\JsonResponse;

class SocialLinkController extends Controller
{
    // GET /api/social-links — público, solo activas y solo campos necesarios
    public function publicIndex(): JsonResponse
    {
        return response()->json(
            SocialLink::active()->ordered()->get(['id', 'platform', 'label', 'url'])
        );
    }
}
