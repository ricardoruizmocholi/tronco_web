<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:255'],
            'current_password'      => ['nullable', 'string'],
            'password'              => ['nullable', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $wantsPassword = $this->filled('password');

            if ($wantsPassword && ! $this->filled('current_password')) {
                $validator->errors()->add('current_password', 'La contraseña actual es obligatoria para cambiarla.');
                return;
            }

            if ($wantsPassword && ! Hash::check($this->current_password, $this->user()->password)) {
                $validator->errors()->add('current_password', 'La contraseña actual no es correcta.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'name.max'      => 'El nombre no puede superar los 255 caracteres.',
            'password.min'  => 'La nueva contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
        ];
    }
}
