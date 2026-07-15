<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite (used in tests) doesn't support MODIFY COLUMN and doesn't enforce ENUMs
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // MySQL requires full enum redeclaration — Schema::table()->enum() doesn't add values reliably
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM(
            'pending','paid','failed','shipped','cancelled',
            'delivered','return_requested','return_approved',
            'return_rejected','return_received','refunded'
        ) NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM(
            'pending','paid','failed','shipped','cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }
};
