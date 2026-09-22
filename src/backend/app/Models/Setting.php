<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    // El valor se guarda como JSON para poder almacenar cualquier tipo
    // (bool, número, array...) sin tener que añadir columnas nuevas cada vez
    // que haga falta otro flag — ver spec/features/025-modo-mantenimiento.
    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);

        return $row ? json_decode($row->value, true) : $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => json_encode($value)]);
    }
}
