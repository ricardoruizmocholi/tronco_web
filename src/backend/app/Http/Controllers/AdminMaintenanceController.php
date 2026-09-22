<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMaintenanceController extends Controller
{
    // PUT /api/admin/maintenance — togglea el modo mantenimiento
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        Setting::set('maintenance_mode', $validated['active']);

        return response()->json(['active' => $validated['active']]);
    }
}
