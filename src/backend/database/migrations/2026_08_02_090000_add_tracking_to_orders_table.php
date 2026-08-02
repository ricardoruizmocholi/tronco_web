<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('tracking_number')->nullable()->after('shipping_cost');
            $table->string('tracking_url')->nullable()->after('tracking_number');
            $table->string('carrier')->nullable()->after('tracking_url');
            $table->timestamp('tracking_updated_at')->nullable()->after('carrier');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'tracking_url', 'carrier', 'tracking_updated_at']);
        });
    }
};
