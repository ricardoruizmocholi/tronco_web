<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preorders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->enum('status', ['pending', 'notified', 'converted'])->default('pending');
            $table->timestamps();

            $table->unique(['email', 'product_id', 'variant_id'], 'preorders_email_product_variant_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preorders');
    }
};
