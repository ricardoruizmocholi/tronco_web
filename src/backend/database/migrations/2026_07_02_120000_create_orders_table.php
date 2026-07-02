<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['pending', 'paid', 'failed', 'shipped', 'cancelled'])->default('pending');
            $table->unsignedInteger('total'); // céntimos — recalculado en backend, nunca aceptado del frontend
            $table->string('stripe_session_id')->nullable()->unique(); // cs_xxx de Stripe Checkout Session
            $table->json('shipping_address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
