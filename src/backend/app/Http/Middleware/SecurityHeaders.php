<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Cabeceras de seguridad en las respuestas de la API (Feature 027, B1).
// Laravel no las trae por defecto. Esto protege /api/* — la propia página
// HTML del frontend (React, servida por nginx/Vite en local, pendiente de
// decidir qué la sirve en producción en IONOS) necesita las mismas
// cabeceras en su propio servidor, Laravel nunca la sirve y no puede
// añadirlas. Ver docker/nginx.conf para el equivalente en desarrollo local.
class SecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Una respuesta JSON no ejecuta CSS/JS/frames, pero por si algún
        // endpoint llegara a servir HTML por error (debug, vista no API),
        // una CSP mínima no hace daño como segunda capa.
        $response->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
