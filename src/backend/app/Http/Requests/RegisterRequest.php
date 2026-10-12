<?php

namespace App\Http\Requests;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', $this->emailNotTaken()],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    // Closure en vez de la regla unique:users,email de Laravel — esa
    // produce el mensaje "The email has already been taken", que confirma
    // directamente si un email está registrado (enumeración de cuentas,
    // Feature 027 hallazgo M2). Mismo campo/forma de respuesta (422,
    // errors.email) para que el frontend no necesite ningún cambio, solo
    // un mensaje que no lo confirme explícitamente. No es una eliminación
    // completa del problema — sin un paso de verificación por email, un
    // atacante aún puede inferir la existencia por la propia aparición del
    // error — pero ya no lo dice con todas las letras.
    private function emailNotTaken(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) {
            if (User::where('email', $value)->exists()) {
                $fail('No se pudo completar el registro con ese email. Si ya tienes cuenta, inicia sesión en su lugar.');
            }
        };
    }
}
