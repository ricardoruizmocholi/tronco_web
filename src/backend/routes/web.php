<?php

use App\Http\Controllers\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Google OAuth — deliberadamente en web.php, no en api.php: el callback lo
// invoca el navegador como una navegación GET normal (redirect de Google), sin
// el header Origin/Referer de localhost que Sanctum's EnsureFrontendRequestsAreStateful
// necesita para inyectar sesión en el grupo "api". Las rutas "web" tienen sesión
// disponible siempre, sin esa condición — necesario porque Auth::login() y la
// regeneración de sesión requieren un session store real. Ver docs/023-auth-modal-google.md.
Route::get('/auth/google',          [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
