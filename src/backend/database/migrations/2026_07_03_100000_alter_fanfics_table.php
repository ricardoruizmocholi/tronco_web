<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Separar drop y add en dos bloques — MySQL no permite mezclarlos de forma fiable
        Schema::table('fanfics', function (Blueprint $table) {
            $table->dropColumn(['title', 'content']);
        });

        Schema::table('fanfics', function (Blueprint $table) {
            $table->string('image_url')->after('user_id');
            $table->string('caption', 500)->nullable()->after('image_url');
            $table->string('city_name')->after('caption');
            $table->boolean('is_featured')->default(false)->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('fanfics', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'caption', 'city_name', 'is_featured']);
        });

        Schema::table('fanfics', function (Blueprint $table) {
            $table->string('title')->after('user_id');
            $table->text('content')->after('title');
        });
    }
};
