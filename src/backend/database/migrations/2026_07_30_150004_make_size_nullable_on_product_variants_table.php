<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Relaja la constraint NOT NULL de `size` — las variantes nuevas se definen por
     * atributos (attribute_value_ids), no por este campo de texto libre. No se toca
     * ningún dato existente; las variantes ya creadas conservan su `size` intacto.
     *
     * Usa el Schema Builder (change()) en vez de SQL crudo para que funcione tanto en
     * MySQL como en SQLite (motor de los tests) sin depender de doctrine/dbal.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size')->nullable(false)->change();
        });
    }
};
