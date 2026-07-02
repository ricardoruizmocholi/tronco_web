<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // La columna artist_id ya existe (nullable integer sin FK).
            // Añadimos el constraint ahora que la tabla artists existe.
            $table->foreign('artist_id')->references('id')->on('artists')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['artist_id']);
        });
    }
};
