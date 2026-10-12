<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Password::uncompromised() (Feature 027, B2) consulta la API de
        // HaveIBeenPwned por red — sin este fake por defecto, cualquier
        // test que registre un usuario haría una llamada real a un
        // tercero. Por defecto se simula "no comprometida"; un test que
        // quiera probar el rechazo puede sobreescribir esto con su propio
        // Http::fake([...]).
        Http::fake([
            'api.pwnedpasswords.com/*' => Http::response('', 200),
        ]);
    }
}
