<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Models\ArtistImage;
use Illuminate\Database\Seeder;

class ArtistSeeder extends Seeder
{
    public function run(): void
    {
        $artists = [
            [
                'name'        => 'Verdina Moss',
                'bio'         => 'Ilustradora barcelonesa especializada en arte de personajes y merchandise. Verdina lleva colaborando con Troncodrilo desde los primeros días del proyecto, firmando los pósters oficiales, las portadas de las colecciones de camisetas y varios fanzines de edición limitada. Su estilo mezcla línea clara con paletas saturadas que dan vida al mundo pantanoso del personaje.',
                'avatar_url'  => 'https://placehold.co/400x400/5BBB2A/FAFAF8?text=VM',
                'website_url' => 'https://verdinamoss.art',
                'video_urls'  => [
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                ],
                'social_links' => [
                    'instagram' => 'https://instagram.com/verdinamoss',
                    'twitter'   => 'https://twitter.com/verdinamoss',
                    'tiktok'    => 'https://tiktok.com/@verdinamoss',
                ],
                'is_active' => true,
                'images'    => [
                    ['url' => 'https://placehold.co/800x600/5BBB2A/FAFAF8?text=Póster+Troncodrilo', 'caption' => 'Póster oficial colección verano', 'position' => 1],
                    ['url' => 'https://placehold.co/800x600/1C1F1A/5BBB2A?text=Fanzine+Vol.1',      'caption' => 'Fanzine Vol. 1 — edición limitada',  'position' => 2],
                    ['url' => 'https://placehold.co/800x600/8B4A2A/FAFAF8?text=Bocetos',            'caption' => 'Proceso: bocetos de personaje',        'position' => 3],
                ],
            ],
            [
                'name'        => 'Los Caimanes del Pantano',
                'bio'         => 'Banda de indie-rock murciana que adoptó a Troncodrilo como mascota oficial en su álbum debut "Barro y Neón" (2023). Mezclan guitarras de reverb empapado con letras sobre la vida en los márgenes del asfalto. Han colaborado en la banda sonora del corto animado de Troncodrilo y diseñado dos camisetas exclusivas de la tienda.',
                'avatar_url'  => 'https://placehold.co/400x400/1C1F1A/5BBB2A?text=LCP',
                'website_url' => 'https://caimalespantano.bandcamp.com',
                'video_urls'  => [
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    'https://www.youtube.com/embed/dQw4w9WgXcQ',
                ],
                'social_links' => [
                    'instagram' => 'https://instagram.com/caimalespantano',
                    'youtube'   => 'https://youtube.com/@caimalespantano',
                    'twitch'    => 'https://twitch.tv/caimalespantano',
                    'bandcamp'  => 'https://caimalespantano.bandcamp.com',
                ],
                'is_active' => true,
                'images'    => [
                    ['url' => 'https://placehold.co/800x600/1C1F1A/FAFAF8?text=Concierto+2024',   'caption' => 'Directo Primavera Sound 2024',          'position' => 1],
                    ['url' => 'https://placehold.co/800x600/5BBB2A/1C1F1A?text=Barro+y+Neón',     'caption' => 'Portada álbum Barro y Neón',            'position' => 2],
                ],
            ],
            [
                'name'        => 'Óscar Tronco',
                'bio'         => 'Diseñador gráfico valenciano y creador del logo original de Troncodrilo. Óscar es el responsable de la identidad visual del proyecto desde sus inicios: el logotipo, la tipografía corporativa y el sistema de color que define toda la marca. Actualmente trabaja en el rediseño de la bola del mundo del universo Troncodrilo.',
                'avatar_url'  => 'https://placehold.co/400x400/8B4A2A/FAFAF8?text=ÓT',
                'website_url' => 'https://oscartronco.es',
                'video_urls'  => [],
                'social_links' => [
                    'instagram' => 'https://instagram.com/oscartronco',
                    'twitter'   => 'https://twitter.com/oscartronco',
                    'tiktok'    => 'https://tiktok.com/@oscartronco',
                    'youtube'   => 'https://youtube.com/@oscartronco',
                ],
                'is_active' => true,
                'images'    => [
                    ['url' => 'https://placehold.co/800x600/8B4A2A/FAFAF8?text=Logo+Original',    'caption' => 'Logo original de Troncodrilo (2021)',   'position' => 1],
                    ['url' => 'https://placehold.co/800x600/FAFAF8/1C1F1A?text=Sistema+de+Color', 'caption' => 'Sistema de color de la marca',          'position' => 2],
                    ['url' => 'https://placehold.co/800x600/5BBB2A/FAFAF8?text=Bola+Troncodrilo', 'caption' => 'WIP: Bola Troncodrilo rediseño',        'position' => 3],
                ],
            ],
        ];

        foreach ($artists as $data) {
            $images = $data['images'];
            unset($data['images']);

            $artist = Artist::firstOrCreate(
                ['name' => $data['name']],
                $data
            );

            foreach ($images as $img) {
                ArtistImage::firstOrCreate(
                    ['artist_id' => $artist->id, 'position' => $img['position']],
                    ['url' => $img['url'], 'caption' => $img['caption']]
                );
            }
        }
    }
}
