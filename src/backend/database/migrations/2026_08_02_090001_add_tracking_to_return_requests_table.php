<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->string('return_tracking_number')->nullable()->after('refund_amount');
            $table->string('return_tracking_url')->nullable()->after('return_tracking_number');
            $table->string('return_carrier')->nullable()->after('return_tracking_url');
            $table->timestamp('return_tracking_updated_at')->nullable()->after('return_carrier');
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->dropColumn([
                'return_tracking_number',
                'return_tracking_url',
                'return_carrier',
                'return_tracking_updated_at',
            ]);
        });
    }
};
