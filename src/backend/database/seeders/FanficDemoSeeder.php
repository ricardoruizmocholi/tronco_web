<?php

namespace Database\Seeders;

use App\Models\Fanfic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

// Solo para desarrollo: puebla la Bola Troncodrilo con fanfics APROBADOS de
// prueba (usuarios @demo.troncodrilo.test + imágenes PNG generadas con GD).
// NO está en DatabaseSeeder. Es idempotente: se puede ejecutar varias veces.
//   php artisan db:seed --class=FanficDemoSeeder
class FanficDemoSeeder extends Seeder
{
    private const CITIES = [
        ['Madrid', 40.4168, -3.7038], ['Barcelona', 41.3874, 2.1686],
        ['París', 48.8566, 2.3522], ['Londres', 51.5072, -0.1276],
        ['Roma', 41.9028, 12.4964], ['Berlín', 52.5200, 13.4050],
        ['Lisboa', 38.7223, -9.1393], ['Nueva York', 40.7128, -74.0060],
        ['Buenos Aires', -34.6037, -58.3816], ['Tokio', 35.6762, 139.6503],
        ['Sídney', -33.8688, 151.2093], ['El Cairo', 30.0444, 31.2357],
        ['Ciudad del Cabo', -33.9249, 18.4241], ['Bogotá', 4.7110, -74.0721],
        ['Seúl', 37.5665, 126.9780], ['Reikiavik', 64.1466, -21.9426],
    ];

    private const CAPTIONS = [
        'Troncodrilo vigilando el horizonte', 'Mi Troncodrilo en el mercado',
        'Troncodrilo de excursión', 'Selfie con Troncodrilo', 'Troncodrilo al atardecer',
        'Troncodrilo descubre la ciudad', 'Un día más con Troncodrilo',
    ];

    public function run(): void
    {
        Storage::disk('public')->makeDirectory('images');
        $admin = User::where('role', 'admin')->first();

        foreach (self::CITIES as $i => [$city, $lat, $lng]) {
            $user = User::firstOrCreate(
                ['email' => 'demo'.($i + 1).'@demo.troncodrilo.test'],
                ['name' => 'Demo '.($i + 1), 'password' => Hash::make(bin2hex(random_bytes(16))), 'role' => 'user'],
            );

            if (Fanfic::where('user_id', $user->id)->exists()) {
                continue;
            }

            $file = "images/demo-fanfic-".($i + 1).".png";
            Storage::disk('public')->put($file, $this->image($i, $city));

            Fanfic::create([
                'user_id'     => $user->id,
                'image_url'   => config('app.url').'/storage/'.$file,
                'caption'     => self::CAPTIONS[$i % count(self::CAPTIONS)],
                'city_name'   => $city,
                // pequeño desplazamiento para que no caigan en el mismo punto exacto
                'latitude'    => $lat + (mt_rand(-30, 30) / 100),
                'longitude'   => $lng + (mt_rand(-30, 30) / 100),
                'status'      => 'approved',
                'is_featured' => $i % 5 === 0,
                'reviewed_by' => $admin?->id,
                'reviewed_at' => now(),
            ]);
        }
    }

    // PNG 640×480 con degradado de color distinto por fanfic y el nombre de la ciudad
    private function image(int $i, string $city): string
    {
        $w = 640; $h = 480;
        $img = imagecreatetruecolor($w, $h);
        $hue = ($i * 47) % 360;
        [$r1, $g1, $b1] = $this->hsv($hue, 0.55, 0.85);
        [$r2, $g2, $b2] = $this->hsv(($hue + 40) % 360, 0.75, 0.45);

        for ($y = 0; $y < $h; $y++) {
            $t = $y / $h;
            $c = imagecolorallocate($img,
                (int) ($r1 + ($r2 - $r1) * $t), (int) ($g1 + ($g2 - $g1) * $t), (int) ($b1 + ($b2 - $b1) * $t));
            imageline($img, 0, $y, $w, $y, $c);
        }

        $white = imagecolorallocate($img, 255, 255, 255);
        imagefilledellipse($img, $w / 2, $h / 2 - 30, 160, 160, imagecolorallocatealpha($img, 255, 255, 255, 90));
        // fuente GD integrada (5 = la más grande); texto ASCII para no depender de TTF
        $text = 'Fanfic demo #'.($i + 1);
        imagestring($img, 5, (int) (($w - imagefontwidth(5) * strlen($text)) / 2), $h - 90, $text, $white);
        $label = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $city) ?: 'Ciudad';
        imagestring($img, 5, (int) (($w - imagefontwidth(5) * strlen($label)) / 2), $h - 65, $label, $white);

        ob_start();
        imagepng($img);
        $png = ob_get_clean();
        imagedestroy($img);

        return $png;
    }

    private function hsv(int $h, float $s, float $v): array
    {
        $c = $v * $s;
        $x = $c * (1 - abs(fmod($h / 60, 2) - 1));
        $m = $v - $c;
        [$r, $g, $b] = match (intdiv($h, 60)) {
            0 => [$c, $x, 0], 1 => [$x, $c, 0], 2 => [0, $c, $x],
            3 => [0, $x, $c], 4 => [$x, 0, $c], default => [$c, 0, $x],
        };

        return [(int) (($r + $m) * 255), (int) (($g + $m) * 255), (int) (($b + $m) * 255)];
    }
}
