<?php

namespace App\Http\Requests;

use App\Models\SocialLink;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SocialLinkRequest extends FormRequest
{
    // La autorización real la hace el middleware 'admin' de la ruta.
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // 'sometimes' en edición permite PUT parciales; en alta todo es obligatorio.
        $req = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'platform'  => [$req, 'string', Rule::in(array_keys(SocialLink::PLATFORMS))],
            'url'       => [$req, 'string', 'max:255', 'url:http,https', function ($attr, $value, $fail) {
                // 'url:' ya filtra el esquema; aquí cerramos lo que deja pasar:
                // credenciales en la URL, espacios/control y hosts vacíos.
                $parts = parse_url($value);
                if (
                    $parts === false
                    || ! in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true)
                    || empty($parts['host'])
                    || isset($parts['user']) || isset($parts['pass'])
                    || preg_match('/[\x00-\x20\x7F]/', $value)
                ) {
                    $fail('La URL no es válida (solo http/https, sin credenciales).');
                }
            }],
            'label'     => ['nullable', 'string', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->isMethod('POST') && SocialLink::count() >= SocialLink::MAX_LINKS) {
                    $validator->errors()->add('platform', 'Se ha alcanzado el máximo de '.SocialLink::MAX_LINKS.' redes sociales.');
                }
            },
        ];
    }
}
