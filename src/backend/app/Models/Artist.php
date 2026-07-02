<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Artist extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'bio',
        'avatar_url',
        'website_url',
        'video_urls',
        'social_links',
        'is_active',
    ];

    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'video_urls'   => 'array',
            'social_links' => 'array',
            'is_active'    => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ArtistImage::class)->orderBy('position');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
