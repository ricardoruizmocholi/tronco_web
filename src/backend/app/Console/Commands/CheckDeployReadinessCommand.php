<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckDeployReadinessCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-deploy-readiness';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Comprueba la configuración de producción antes de desplegar a IONOS (Feature 027, hallazgo M1)';

    public function handle(): int
    {
        $checks = [
            $this->checkAppEnv(),
            $this->checkAppDebug(),
            $this->checkAppKey(),
            $this->checkSessionSecureCookie(),
            $this->checkSanctumStatefulDomains(),
            $this->checkCorsOrigins(),
        ];

        $this->newLine();

        $failed = count(array_filter($checks, fn ($ok) => ! $ok));

        if ($failed > 0) {
            $this->error("{$failed} comprobación(es) fallida(s). No desplegar hasta resolverlas.");
            return self::FAILURE;
        }

        $this->info('Todo listo para desplegar.');
        return self::SUCCESS;
    }

    private function reportOk(string $message): bool
    {
        $this->line("  <fg=green>✓</> {$message}");
        return true;
    }

    private function reportFail(string $message): bool
    {
        $this->line("  <fg=red>✗</> {$message}");
        return false;
    }

    private function checkAppEnv(): bool
    {
        $env = config('app.env');

        return $env === 'production'
            ? $this->reportOk("APP_ENV=production")
            : $this->reportFail("APP_ENV={$env} — debe ser 'production' antes de desplegar");
    }

    private function checkAppDebug(): bool
    {
        // El más grave de los seis: con APP_DEBUG=true en producción, cualquier
        // excepción no capturada muestra la traza completa (rutas del servidor,
        // consultas SQL, y potencialmente valores de .env) a cualquier visitante.
        return config('app.debug') === false
            ? $this->reportOk('APP_DEBUG=false')
            : $this->reportFail('APP_DEBUG=true — NUNCA en producción, filtra información interna a cualquier visitante');
    }

    private function checkAppKey(): bool
    {
        return ! empty(config('app.key'))
            ? $this->reportOk('APP_KEY está definida')
            : $this->reportFail('APP_KEY vacía — las cookies de sesión y los datos cifrados no funcionarán');
    }

    private function checkSessionSecureCookie(): bool
    {
        return config('session.secure') === true
            ? $this->reportOk('SESSION_SECURE_COOKIE=true')
            : $this->reportFail('SESSION_SECURE_COOKIE no está a true — la cookie de sesión viajaría también por HTTP sin cifrar');
    }

    private function checkSanctumStatefulDomains(): bool
    {
        $domains = config('sanctum.stateful', []);
        $hasLocalhost = collect($domains)->contains(fn ($d) => str_contains($d, 'localhost') || str_contains($d, '127.0.0.1'));

        return ! $hasLocalhost
            ? $this->reportOk('SANCTUM_STATEFUL_DOMAINS no incluye localhost')
            : $this->reportFail('SANCTUM_STATEFUL_DOMAINS todavía incluye localhost/127.0.0.1 — añade el dominio real de producción');
    }

    private function checkCorsOrigins(): bool
    {
        $origins = config('cors.allowed_origins', []);
        $hasLocalhost = collect($origins)->contains(fn ($o) => str_contains($o, 'localhost'));
        $hasWildcard = in_array('*', $origins, true);

        if ($hasWildcard) {
            return $this->reportFail("cors.allowed_origins contiene '*' — nunca en producción con supports_credentials=true");
        }

        return ! $hasLocalhost
            ? $this->reportOk('cors.allowed_origins no incluye localhost')
            : $this->reportFail('cors.allowed_origins todavía apunta a localhost — añade el dominio real de producción');
    }
}
