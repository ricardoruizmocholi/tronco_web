<?php

use App\Http\Controllers\AdminFanficController;
use App\Http\Controllers\ArtistController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FanficController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ShippingRateController;
use App\Http\Controllers\StripeWebhookController;
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

// Artistas públicos
Route::get('/artists',          [ArtistController::class, 'index']);
Route::get('/artists/{artist}', [ArtistController::class, 'show']);

// Checkout y pedidos (usuario autenticado)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/checkout',          [CheckoutController::class, 'store']);
    Route::get('/orders',             [OrderController::class, 'index']);
    Route::get('/orders/{order}',     [OrderController::class, 'show']);
});

// Webhook de Stripe — sin auth, Stripe firma el payload con STRIPE_WEBHOOK_SECRET
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

// Tarifas de envío — público
Route::get('/shipping-rates', [ShippingRateController::class, 'publicIndex']);

// Fanfics — globo público
Route::get('/fanfics', [FanficController::class, 'publicIndex']);

// Fanfics — usuario autenticado
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/upload-image',     [ImageUploadController::class, 'store']);
    Route::get('/fanfics/mine',      [FanficController::class, 'mine']);
    Route::post('/fanfics',          [FanficController::class, 'store']);
    Route::put('/fanfics/{fanfic}',  [FanficController::class, 'update']);
});

// Gestión admin (productos + artistas + fanfics)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/products',                        [ProductController::class, 'adminIndex']);
    Route::post('/products',                       [ProductController::class, 'store']);
    Route::put('/products/{product}',              [ProductController::class, 'update']);
    Route::patch('/products/{product}/toggle',     [ProductController::class, 'toggle']);
    Route::delete('/products/{product}',           [ProductController::class, 'destroy']);
    Route::post('/products/{product}/images',            [ProductController::class, 'storeImage']);
    Route::delete('/products/{product}/images/{image}',  [ProductController::class, 'destroyImage']);
    Route::delete('/products/{product}/permanent',       [ProductController::class, 'permanentDestroy']);

    Route::get('/artists',                              [ArtistController::class, 'adminIndex']);
    Route::post('/artists',                             [ArtistController::class, 'store']);
    Route::put('/artists/{artist}',                     [ArtistController::class, 'update']);
    Route::patch('/artists/{artist}/toggle',            [ArtistController::class, 'toggle']);
    Route::delete('/artists/{artist}',                   [ArtistController::class, 'destroy']);
    Route::delete('/artists/{artist}/permanent',         [ArtistController::class, 'permanentDestroy']);
    Route::post('/artists/{artist}/images',              [ArtistController::class, 'storeImage']);
    Route::delete('/artists/{artist}/images/{image}',   [ArtistController::class, 'destroyImage']);

    Route::get('/fanfics',                              [AdminFanficController::class, 'index']);
    Route::patch('/fanfics/{fanfic}/approve',           [AdminFanficController::class, 'approve']);
    Route::patch('/fanfics/{fanfic}/reject',            [AdminFanficController::class, 'reject']);
    Route::patch('/fanfics/{fanfic}/feature',           [AdminFanficController::class, 'feature']);
    Route::patch('/fanfics/{fanfic}/unfeature',         [AdminFanficController::class, 'unfeature']);
    Route::patch('/fanfics/{fanfic}/block-user',        [AdminFanficController::class, 'blockUser']);
    Route::get('/users/blocked',                        [AdminFanficController::class, 'blockedUsers']);
    Route::patch('/users/{user}/unblock',               [AdminFanficController::class, 'unblockUser']);

    Route::get('/shipping-rates',             [ShippingRateController::class, 'index']);
    Route::post('/shipping-rates',            [ShippingRateController::class, 'store']);
    Route::put('/shipping-rates/{rate}',      [ShippingRateController::class, 'update']);
    Route::delete('/shipping-rates/{rate}',   [ShippingRateController::class, 'destroy']);
});