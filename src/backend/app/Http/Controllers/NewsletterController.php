<?php

namespace App\Http\Controllers;

use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    // POST /api/newsletter/subscribe
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:255|unique:newsletter_subscribers,email',
            'name'  => 'nullable|string|max:255',
        ], [
            'email.unique' => 'Ya estás suscrito.',
        ]);

        $subscriber = NewsletterSubscriber::create([
            'email'      => $data['email'],
            'name'       => $data['name'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message'    => '¡Bienvenido a la comunidad!',
            'subscriber' => $subscriber,
        ], 201);
    }
}
