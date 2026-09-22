<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class MaintenanceController extends Controller
{
    // GET /api/maintenance-status — público, lo consulta el frontend para decidir
    // si muestra la tienda o la pantalla de mantenimiento.
    public function status(): JsonResponse
    {
        return response()->json([
            'active' => (bool) Setting::get('maintenance_mode', false),
        ]);
    }
}
