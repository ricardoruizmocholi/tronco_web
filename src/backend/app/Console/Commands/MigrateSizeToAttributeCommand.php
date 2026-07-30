<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariantAttribute;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class MigrateSizeToAttributeCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'variants:migrate-size-to-attribute';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migra el campo size de las variantes existentes a un atributo "Talla" (idempotente — seguro de ejecutar varias veces). No elimina ni modifica el campo size.';

    public function handle(): int
    {
        $products = Product::whereHas('variants', fn ($q) => $q->whereNotNull('size')->where('size', '!=', ''))
            ->with(['variants' => fn ($q) => $q->whereNotNull('size')->where('size', '!=', '')])
            ->get();

        $this->info("Productos con variantes con size: {$products->count()}");

        $productCount   = 0;
        $attributeCount = 0;
        $valueCount     = 0;
        $variantCount   = 0;

        foreach ($products as $product) {
            $variantsWithSize = $product->variants;
            if ($variantsWithSize->isEmpty()) {
                continue;
            }

            $attribute = ProductAttribute::firstOrCreate(
                ['product_id' => $product->id, 'name' => 'Talla'],
                ['type' => 'text', 'position' => 0]
            );
            if ($attribute->wasRecentlyCreated) {
                $attributeCount++;
            }

            $valuesBySize = [];
            foreach ($variantsWithSize->pluck('size')->unique()->values() as $index => $size) {
                $value = ProductAttributeValue::firstOrCreate(
                    ['attribute_id' => $attribute->id, 'value' => $size],
                    ['label' => $size, 'position' => $index]
                );
                if ($value->wasRecentlyCreated) {
                    $valueCount++;
                }
                $valuesBySize[$size] = $value;
            }

            foreach ($variantsWithSize as $variant) {
                $value = $valuesBySize[$variant->size];
                $link  = ProductVariantAttribute::firstOrCreate([
                    'variant_id'         => $variant->id,
                    'attribute_value_id' => $value->id,
                ]);
                if ($link->wasRecentlyCreated) {
                    $variantCount++;
                }
            }

            $productCount++;
            $this->line("Producto #{$product->id} '{$product->name}': {$variantsWithSize->count()} variantes procesadas.");
        }

        $this->newLine();
        $this->info("Productos procesados: {$productCount}");
        $this->info("Atributos 'Talla' creados: {$attributeCount}");
        $this->info("Valores de atributo creados: {$valueCount}");
        $this->info("Vínculos variante-atributo creados: {$variantCount}");

        Log::info('variants:migrate-size-to-attribute completado.', [
            'products'   => $productCount,
            'attributes' => $attributeCount,
            'values'     => $valueCount,
            'links'      => $variantCount,
        ]);

        return self::SUCCESS;
    }
}
