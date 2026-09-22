<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Setting::get('maintenance_mode', false)) {
            return response()->json([
                'maintenance' => true,
                'message'     => 'La tienda está en mantenimiento.',
            ], 503);
        }

        return $next($request);
    }
}
