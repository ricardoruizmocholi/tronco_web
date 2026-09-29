<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->string('series');
            $table->unsignedInteger('year');
            $table->unsignedInteger('number');
            $table->string('full_number'); // "A-2026-000123" — desnormalizado, fijo una vez emitida
            $table->timestamp('issued_at');
            $table->boolean('is_simplified')->default(false); // sin NIF del comprador (RD 1619/2012)

            // Snapshot del receptor en el momento de emitir — nunca referencia viva al user,
            // una factura no puede cambiar si el cliente edita su perfil después.
            $table->string('buyer_name');
            $table->string('buyer_tax_id')->nullable();
            $table->json('buyer_address');

            $table->unsignedInteger('subtotal');   // céntimos, base imponible
            $table->decimal('tax_rate', 5, 2);      // ej. 21.00
            $table->unsignedInteger('tax_amount');  // céntimos, cuota IVA
            $table->unsignedInteger('total');       // céntimos, subtotal + tax_amount

            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->unique(['series', 'year', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
