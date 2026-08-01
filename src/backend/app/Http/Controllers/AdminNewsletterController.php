<?php

namespace App\Http\Controllers;

use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminNewsletterController extends Controller
{
    // GET /api/admin/newsletter/subscribers
    public function index(): JsonResponse
    {
        $subscribers = NewsletterSubscriber::orderByDesc('created_at')->paginate(20);

        return response()->json($subscribers);
    }

    // GET /api/admin/newsletter/export
    public function export(): StreamedResponse
    {
        $filename = 'newsletter_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['ID', 'Email', 'Nombre', 'Fecha de alta']);

            NewsletterSubscriber::orderByDesc('created_at')
                ->chunk(200, function ($rows) use ($handle) {
                    foreach ($rows as $s) {
                        fputcsv($handle, [
                            $s->id,
                            $s->email,
                            $s->name ?? '—',
                            $s->created_at->format('Y-m-d H:i'),
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
