<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBillingSettingsController extends Controller
{
    private const KEY = 'company_billing_info';

    // GET /api/admin/billing-settings — datos fiscales del emisor
    public function show(): JsonResponse
    {
        return response()->json(Setting::get(self::KEY, [
            'legal_name'    => '',
            'tax_id'        => '',
            'address_line1' => '',
            'address_line2' => '',
            'postal_code'   => '',
            'city'          => '',
            'province'      => '',
            'country'       => 'ES',
            'tax_rate'      => 21.0,
        ]));
    }

    // PUT /api/admin/billing-settings
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'legal_name'    => ['required', 'string', 'max:255'],
            'tax_id'        => ['required', 'string', 'max:20'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'postal_code'   => ['required', 'string', 'max:20'],
            'city'          => ['required', 'string', 'max:255'],
            'province'      => ['required', 'string', 'max:255'],
            'country'       => ['required', 'string', 'size:2'],
            'tax_rate'      => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        Setting::set(self::KEY, $validated);

        return response()->json($validated);
    }
}
