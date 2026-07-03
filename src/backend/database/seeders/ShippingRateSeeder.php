<?php

namespace Database\Seeders;

use App\Models\ShippingRate;
use Illuminate\Database\Seeder;

class ShippingRateSeeder extends Seeder
{
    public function run(): void
    {
        ShippingRate::truncate();

        ShippingRate::insert([
            [
                'name'             => 'España estándar',
                'country_code'     => 'ES',
                'min_order_amount' => 0,
                'free_above'       => 5000,
                'rate'             => 499,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'name'             => 'España express',
                'country_code'     => 'ES',
                'min_order_amount' => 0,
                'free_above'       => null,
                'rate'             => 999,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'name'             => 'Internacional',
                'country_code'     => null,
                'min_order_amount' => 0,
                'free_above'       => 10000,
                'rate'             => 1499,
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ]);
    }
}
