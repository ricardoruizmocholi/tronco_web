<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('reason', ['defectuoso', 'no_corresponde', 'desistimiento', 'otro']);
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'received', 'refunded'])
                  ->default('pending');
            $table->text('admin_notes')->nullable();
            $table->string('stripe_refund_id')->nullable();
            $table->unsignedInteger('refund_amount')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};
