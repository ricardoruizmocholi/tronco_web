<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token'    => ['required', 'string'],
            'email'    => ['required', 'string', 'email'],
            // Mismas reglas que el registro (Feature 027, B2): mínimo 8 y
            // rechaza contraseñas filtradas conocidas.
            'password' => ['required', 'string', 'confirmed', Password::min(8)->uncompromised()],
        ];
    }
}
