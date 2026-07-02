<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;

class ProductCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Camisetas',      'slug' => 'camisetas'],
            ['name' => 'Accesorios',     'slug' => 'accesorios'],
            ['name' => 'Pósters',        'slug' => 'posters'],
            ['name' => 'Coleccionables', 'slug' => 'coleccionables'],
        ];

        foreach ($categories as $data) {
            Category::firstOrCreate(['slug' => $data['slug']], ['name' => $data['name']]);
        }

        $camisetas      = Category::where('slug', 'camisetas')->first();
        $accesorios     = Category::where('slug', 'accesorios')->first();
        $posters        = Category::where('slug', 'posters')->first();
        $coleccionables = Category::where('slug', 'coleccionables')->first();

        $products = [
            // Camisetas
            [
                'category_id' => $camisetas->id,
                'name'        => 'Camiseta Troncodrilo Classic',
                'slug'        => 'camiseta-troncodrilo-classic',
                'description' => 'La camiseta original de Troncodrilo. Diseño minimalista con el logo del cocodrilo en el pecho. 100% algodón orgánico.',
                'price'       => 2499,
                'stock'       => 50,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $camisetas->id,
                'name'        => 'Camiseta "Soy del Pantano"',
                'slug'        => 'camiseta-soy-del-pantano',
                'description' => 'Para los que llevan el pantano en el corazón. Estampado oversized en la espalda con ilustración completa de Troncodrilo.',
                'price'       => 2999,
                'stock'       => 30,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $camisetas->id,
                'name'        => 'Camiseta Edición Limitada Verano',
                'slug'        => 'camiseta-edicion-limitada-verano',
                'description' => 'Colores vibrantes, tirada de 100 unidades. Diseño colaborativo con artista invitado. Firmada en la etiqueta interior.',
                'price'       => 3999,
                'stock'       => 0,
                'image_url'   => null,
                'is_active'   => true,
            ],
            // Accesorios
            [
                'category_id' => $accesorios->id,
                'name'        => 'Taza Troncodrilo Mañanera',
                'slug'        => 'taza-troncodrilo-maňanera',
                'description' => 'Empieza el día con Troncodrilo. Taza de cerámica 350 ml, apta para lavavajillas. "Buenos días desde el pantano" en el interior.',
                'price'       => 1499,
                'stock'       => 80,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $accesorios->id,
                'name'        => 'Gorra Troncodrilo Snapback',
                'slug'        => 'gorra-troncodrilo-snapback',
                'description' => 'Gorra de 6 paneles con bordado del logo. Talla única ajustable. Disponible en verde pantano y negro.',
                'price'       => 2199,
                'stock'       => 40,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $accesorios->id,
                'name'        => 'Bolsa Tote "El Pantano Llama"',
                'slug'        => 'bolsa-tote-el-pantano-llama',
                'description' => 'Bolsa de tela 100% algodón. Resistente y reutilizable. Ilustración de Troncodrilo asomando desde las cañas.',
                'price'       => 1299,
                'stock'       => 60,
                'image_url'   => null,
                'is_active'   => true,
            ],
            // Pósters
            [
                'category_id' => $posters->id,
                'name'        => 'Póster "Troncodrilo en Concierto"',
                'slug'        => 'poster-troncodrilo-en-concierto',
                'description' => 'Impresión de alta calidad en papel 250 g/m². Formato A2 (42 × 59,4 cm). Diseño retro inspirado en carteles de gira de los años 70.',
                'price'       => 1899,
                'stock'       => 25,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $posters->id,
                'name'        => 'Lámina "El Pantano de Noche"',
                'slug'        => 'lamina-el-pantano-de-noche',
                'description' => 'Ilustración de autor en edición numerada (50 copias). Impresión giclée sobre papel de algodón. Firmada a mano.',
                'price'       => 4900,
                'stock'       => 12,
                'image_url'   => null,
                'is_active'   => true,
            ],
            // Coleccionables
            [
                'category_id' => $coleccionables->id,
                'name'        => 'Pin Esmaltado Troncodrilo',
                'slug'        => 'pin-esmaltado-troncodrilo',
                'description' => 'Pin metálico con esmalte duro. 3 cm de diámetro, cierre de mariposa. Perfecto para mochilas y chaquetas.',
                'price'       =>  899,
                'stock'       => 120,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $coleccionables->id,
                'name'        => 'Pack Pegatinas "El Pantano"',
                'slug'        => 'pack-pegatinas-el-pantano',
                'description' => 'Set de 8 pegatinas de vinilo resistente al agua. Incluye personajes del universo Troncodrilo y frases icónicas.',
                'price'       =>  599,
                'stock'       => 200,
                'image_url'   => null,
                'is_active'   => true,
            ],
            [
                'category_id' => $coleccionables->id,
                'name'        => 'Figura Troncodrilo Edición Coleccionista',
                'slug'        => 'figura-troncodrilo-edicion-coleccionista',
                'description' => 'Figura de PVC 15 cm, pintada a mano. Tirada de 200 unidades con certificado de autenticidad. Viene en caja de coleccionista.',
                'price'       => 5999,
                'stock'       => 8,
                'image_url'   => null,
                'is_active'   => false,
            ],
        ];

        foreach ($products as $data) {
            $product = Product::firstOrCreate(['slug' => $data['slug']], $data);

            ProductImage::firstOrCreate(
                ['product_id' => $product->id, 'position' => 1],
                ['url' => 'https://placehold.co/600x800/5BBB2A/FAFAF8?text=Troncodrilo']
            );
            ProductImage::firstOrCreate(
                ['product_id' => $product->id, 'position' => 2],
                ['url' => 'https://placehold.co/600x800/8B4A2A/FAFAF8?text=Troncodrilo']
            );
        }
    }
}
