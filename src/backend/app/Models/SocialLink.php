<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class SocialLink extends Model
{
    // Fuente única de plataformas permitidas; la clave es también la clave
    // de icono del frontend. El admin las recibe vía GET /admin/social-links.
    public const PLATFORMS = [
        'instagram' => 'Instagram',
        'tiktok'    => 'TikTok',
        'x'         => 'X',
        'twitter'   => 'Twitter',
        'youtube'   => 'YouTube',
        'facebook'  => 'Facebook',
        'twitch'    => 'Twitch',
        'discord'   => 'Discord',
        'pinterest' => 'Pinterest',
        'linkedin'  => 'LinkedIn',
        'github'    => 'GitHub',
        'website'   => 'Web',
    ];

    public const MAX_LINKS = 12;

    protected $fillable = ['platform', 'label', 'url', 'position', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'position'  => 'integer',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('position')->orderBy('id');
    }
}
