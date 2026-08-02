<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VideoUploadController extends Controller
{
    // POST /api/admin/upload-video
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'video' => ['required', 'file', 'mimes:mp4,webm,ogg', 'max:100000'], // máx 100 MB
        ]);

        $file      = $request->file('video');
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;

        $file->storeAs('videos', $filename, 'public');

        $url = config('app.url') . '/storage/videos/' . $filename;

        return response()->json(['url' => $url], 201);
    }
}
