<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('website_url')->nullable();
            $table->json('video_urls')->nullable();   // array de URLs YouTube/Vimeo
            $table->json('social_links')->nullable(); // {instagram, twitter, tiktok, youtube, twitch, bandcamp}
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artists');
    }
};
