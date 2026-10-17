<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // Feature 027 (B3): antes hardcodeado a 'http://localhost' en este
    // archivo versionado — cambiarlo para producción exigía editar y
    // commitear config/cors.php con el dominio real. Ahora se lee de
    // CORS_ALLOWED_ORIGINS (.env, no versionado), con el localhost de
    // desarrollo como valor por defecto si no se define.
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
