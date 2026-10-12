<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Limitadores nombrados, siempre por IP explícitamente — el string
        // "throttle:N,1" por defecto de Laravel prioriza el usuario
        // autenticado sobre la IP cuando hay uno disponible. En /register
        // eso es un problema real: AuthController::register() hace login
        // automático tras crear la cuenta, así que cada registro con éxito
        // le da al siguiente intento una "cuenta" de límite nueva (la del
        // usuario recién creado) en vez de seguir acumulando sobre la
        // misma IP — el límite por defecto no protege contra registro
        // masivo. Ver spec/features/027-security-hardening/ (H1).
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('newsletter', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });
    }
}
