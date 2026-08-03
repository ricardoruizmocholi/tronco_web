<?php

namespace App\Http\Controllers;

use App\Exports\NewsletterExport;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;

class AdminNewsletterController extends Controller
{
    // GET /api/admin/newsletter/subscribers
    public function index(): JsonResponse
    {
        $subscribers = NewsletterSubscriber::orderByDesc('created_at')->paginate(20);

        return response()->json($subscribers);
    }

    // GET /api/admin/newsletter/export
    public function export()
    {
        $filename = 'newsletter_' . now()->format('Y-m-d') . '.xlsx';

        return Excel::download(new NewsletterExport(), $filename);
    }
}
