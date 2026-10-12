<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Config;
use Tests\TestCase;

// Feature 027 (M1) — checklist de despliegue automatizada en vez de solo
// documentada, para que no dependa de que alguien se acuerde de mirarla.
class CheckDeployReadinessCommandTest extends TestCase
{
    public function test_fails_with_dev_appropriate_settings(): void
    {
        // La config de este entorno de test ya es "insegura para producción"
        // a propósito (igual que el .env de desarrollo) — el comando debe
        // detectarlo y devolver código de salida distinto de cero.
        $this->artisan('app:check-deploy-readiness')->assertExitCode(1);
    }

    public function test_passes_with_production_appropriate_settings(): void
    {
        Config::set('app.env', 'production');
        Config::set('app.debug', false);
        Config::set('app.key', 'base64:' . base64_encode(random_bytes(32)));
        Config::set('session.secure', true);
        Config::set('sanctum.stateful', ['troncodrilo.example']);
        Config::set('cors.allowed_origins', ['https://troncodrilo.example']);

        $this->artisan('app:check-deploy-readiness')->assertExitCode(0);
    }

    public function test_fails_when_cors_allows_wildcard(): void
    {
        Config::set('app.env', 'production');
        Config::set('app.debug', false);
        Config::set('session.secure', true);
        Config::set('sanctum.stateful', ['troncodrilo.example']);
        Config::set('cors.allowed_origins', ['*']);

        $this->artisan('app:check-deploy-readiness')->assertExitCode(1);
    }
}
