<?php

use App\Http\Controllers\AdminCancellationController;
use App\Http\Controllers\AdminFanficController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminPreorderController;
use App\Http\Controllers\AdminReturnController;
use App\Http\Controllers\CancellationController;
use App\Http\Controllers\PreorderController;
use App\Http\Controllers\ReturnRequestController;
use App\Http\Controllers\ArtistController;
use App\Http\Controllers\BannerController;
use App\Http\Controllers\CollaboratorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\FanficController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ImageUploadController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\ShippingRateController;
use App\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',            [AuthController::class, 'logout']);
    Route::get('/user',               [AuthController::class, 'user']);
    Route::put('/user/profile',       [ProfileController::class, 'update']);
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
    Route::post('/checkout',              [CheckoutController::class,      'store']);
    Route::get('/orders',                 [OrderController::class,          'index']);
    Route::get('/orders/{order}',         [OrderController::class,          'show']);
    Route::post('/orders/{order}/cancel', [CancellationController::class,  'cancel']);
    Route::post('/orders/{order}/return', [ReturnRequestController::class, 'store']);
    Route::get('/user/returns',           [ReturnRequestController::class, 'index']);
});

// Webhook de Stripe — sin auth, Stripe firma el payload con STRIPE_WEBHOOK_SECRET
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);

// Tarifas de envío — público
Route::get('/shipping-rates', [ShippingRateController::class, 'publicIndex']);

// Banners y colaboradores — públicos
Route::get('/banners',       [BannerController::class,       'publicIndex']);
Route::get('/collaborators', [CollaboratorController::class, 'publicIndex']);

// Fanfics — globo público
Route::get('/fanfics', [FanficController::class, 'publicIndex']);

// Preorders — público (auth opcional via Sanctum)
Route::post('/preorders', [PreorderController::class, 'store']);

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
    Route::post('/products/{product}/variants',             [ProductVariantController::class, 'store']);
    Route::put('/products/{product}/variants/{variant}',    [ProductVariantController::class, 'update']);
    Route::delete('/products/{product}/variants/{variant}', [ProductVariantController::class, 'destroy']);

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

    // Pedidos admin — rutas estáticas ANTES que {order} para evitar conflictos
    Route::get('/orders/stats',              [AdminOrderController::class, 'stats']);
    Route::get('/orders/pending-count',      [AdminOrderController::class, 'pendingCount']);
    Route::get('/orders/export',             [AdminOrderController::class, 'export']);
    Route::get('/orders',                    [AdminOrderController::class, 'index']);
    Route::get('/orders/{order}',            [AdminOrderController::class, 'show']);
    Route::put('/orders/{order}/status',     [AdminOrderController::class, 'updateStatus']);

    Route::get('/shipping-rates',             [ShippingRateController::class, 'index']);
    Route::post('/shipping-rates',            [ShippingRateController::class, 'store']);
    Route::put('/shipping-rates/{rate}',      [ShippingRateController::class, 'update']);
    Route::delete('/shipping-rates/{rate}',   [ShippingRateController::class, 'destroy']);

    Route::get('/banners',              [BannerController::class, 'index']);
    Route::post('/banners',             [BannerController::class, 'store']);
    Route::put('/banners/{banner}',     [BannerController::class, 'update']);
    Route::delete('/banners/{banner}',  [BannerController::class, 'destroy']);

    Route::get('/collaborators',                   [CollaboratorController::class, 'index']);
    Route::post('/collaborators',                  [CollaboratorController::class, 'store']);
    Route::put('/collaborators/{collaborator}',    [CollaboratorController::class, 'update']);
    Route::delete('/collaborators/{collaborator}', [CollaboratorController::class, 'destroy']);

    Route::put('/orders/{order}/cancel',   [AdminCancellationController::class, 'cancel']);

    // Devoluciones admin — estáticas ANTES que {return} para evitar conflictos
    Route::get('/returns/pending-count',    [AdminReturnController::class, 'pendingCount']);
    Route::get('/returns',                  [AdminReturnController::class, 'index']);
    Route::get('/returns/{return}',         [AdminReturnController::class, 'show']);
    Route::put('/returns/{return}/approve', [AdminReturnController::class, 'approve']);
    Route::put('/returns/{return}/reject',  [AdminReturnController::class, 'reject']);
    Route::put('/returns/{return}/receive', [AdminReturnController::class, 'receive']);

    // Toggle allow_preorder en producto
    Route::patch('/products/{product}/toggle-preorder', [ProductController::class, 'togglePreorder']);

    // Preorders admin — estáticas antes de {preorder}
    Route::get('/preorders/stats',                 [AdminPreorderController::class, 'stats']);
    Route::get('/preorders/export',                [AdminPreorderController::class, 'export']);
    Route::get('/preorders',                       [AdminPreorderController::class, 'index']);
    Route::patch('/preorders/{preorder}/notify',   [AdminPreorderController::class, 'notify']);
});