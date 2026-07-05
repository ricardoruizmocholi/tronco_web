<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->name = $request->name;

        if ($request->filled('password')) {
            $user->password = $request->password;
        }

        $user->save();

        return response()->json($user);
    }
}
