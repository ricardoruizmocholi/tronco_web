<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country_code', 2)->nullable();       // null = aplica a cualquier país
            $table->unsignedInteger('min_order_amount')->default(0); // céntimos; 0 = siempre aplica
            $table->unsignedInteger('free_above')->nullable();   // céntimos; null = nunca gratis
            $table->unsignedInteger('rate');                     // coste en céntimos
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_rates');
    }
};
