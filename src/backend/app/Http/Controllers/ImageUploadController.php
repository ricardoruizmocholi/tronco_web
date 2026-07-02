<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ImageUploadController extends Controller
{
    // POST /api/admin/upload-image
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:5120'], // máx 5 MB
        ]);

        $file      = $request->file('image');
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;

        $file->storeAs('images', $filename, 'public');

        $url = config('app.url') . '/storage/images/' . $filename;

        return response()->json(['url' => $url], 201);
    }
}
