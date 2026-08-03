<?php

namespace App\Exports;

use App\Models\NewsletterSubscriber;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class NewsletterExport implements WithMultipleSheets
{
    public function sheets(): array
    {
        $subscribers = NewsletterSubscriber::orderByDesc('created_at')->get();

        return [
            new NewsletterDataSheet($subscribers),
            new NewsletterSummarySheet($subscribers),
        ];
    }
}
