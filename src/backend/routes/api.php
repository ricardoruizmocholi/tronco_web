<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user',    [AuthController::class, 'user']);
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'troncodrilo-backend']);
});

// Catálogo público
Route::get('/products',        [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/categories',      [ProductController::class, 'categories']);

// Gestión de productos (solo admin)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/products',                        [ProductController::class, 'adminIndex']);
    Route::post('/products',                       [ProductController::class, 'store']);
    Route::put('/products/{product}',              [ProductController::class, 'update']);
    Route::patch('/products/{product}/toggle',     [ProductController::class, 'toggle']);
    Route::delete('/products/{product}',           [ProductController::class, 'destroy']);
});