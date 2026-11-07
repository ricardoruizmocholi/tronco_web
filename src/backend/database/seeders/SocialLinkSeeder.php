<?php

namespace Database\Seeders;

use App\Models\SocialLink;
use Illuminate\Database\Seeder;

// Solo para desarrollo: NO está en DatabaseSeeder para que no lleguen URLs
// de relleno a producción. Ejecutar con:
//   php artisan db:seed --class=SocialLinkSeeder
class SocialLinkSeeder extends Seeder
{
    public function run(): void
    {
        SocialLink::truncate();

        foreach ([
            ['instagram', 'https://www.instagram.com/'],
            ['tiktok',    'https://www.tiktok.com/'],
            ['youtube',   'https://www.youtube.com/'],
            ['x',         'https://x.com/'],
            ['facebook',  'https://www.facebook.com/'],
            ['discord',   'https://discord.com/'],
            ['twitch',    'https://www.twitch.tv/'],
            ['website',   'https://example.com/'],
        ] as $i => [$platform, $url]) {
            SocialLink::create(['platform' => $platform, 'url' => $url, 'position' => $i, 'is_active' => true]);
        }
    }
}
