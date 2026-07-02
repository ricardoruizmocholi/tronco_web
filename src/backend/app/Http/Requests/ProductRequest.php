<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // el middleware 'admin' ya garantiza la autorización
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price'       => ['required', 'integer', 'min:1'],
            'stock'       => ['sometimes', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'artist_id'   => ['nullable', 'integer'],
            'image_url'   => ['nullable', 'string', 'url', 'max:2048'],
            'is_active'   => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'price.min'          => 'El precio debe ser al menos 1 céntimo.',
            'stock.min'          => 'El stock no puede ser negativo.',
            'category_id.exists' => 'La categoría seleccionada no existe.',
        ];
    }
}
