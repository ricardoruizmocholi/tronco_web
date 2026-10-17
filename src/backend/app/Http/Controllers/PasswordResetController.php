<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    // Siempre responde 200 con el mismo mensaje, exista o no el email —
    // mismo criterio que el registro (Feature 027, M2): no confirmar la
    // existencia de una cuenta a quien no la tiene.
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Si ese email tiene una cuenta, recibirás un enlace para restablecer la contraseña.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'El enlace no es válido o ha caducado. Solicita uno nuevo.',
            ], 422);
        }

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}
