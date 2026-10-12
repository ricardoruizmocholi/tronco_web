<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ImageUploadController extends Controller
{
    // POST /api/upload-image — cualquier usuario autenticado (lo usan los
    // fanfics), no solo admin pese al nombre.
    public function store(Request $request): JsonResponse
    {
        // mimes explícito en vez de la regla genérica "image" — esa acepta SVG,
        // que puede llevar <script> embebido (Feature 027, hallazgo H3).
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,png,gif,webp', 'max:5120'], // máx 5 MB
        ]);

        $file = $request->file('image');
        // extension() usa el MIME real detectado del contenido, no el nombre
        // que mande el cliente — getClientOriginalExtension() es del cliente.
        $extension = $file->extension();
        $filename  = Str::uuid() . '.' . $extension;

        $file->storeAs('images', $filename, 'public');

        $url = config('app.url') . '/storage/images/' . $filename;

        return response()->json(['url' => $url], 201);
    }
}
