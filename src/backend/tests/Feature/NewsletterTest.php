<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewsletterTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscribe_works(): void
    {
        $this->postJson('/api/newsletter/subscribe', ['email' => 'fan@example.com'])
            ->assertStatus(201);

        $this->assertDatabaseHas('newsletter_subscribers', ['email' => 'fan@example.com']);
    }

    // Feature 027 (H1) — sin esto, /newsletter/subscribe aceptaba envíos ilimitados
    public function test_subscribe_is_rate_limited_after_three_attempts(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/newsletter/subscribe', ['email' => "fan{$i}@example.com"])
                ->assertStatus(201);
        }

        $this->postJson('/api/newsletter/subscribe', ['email' => 'fan99@example.com'])
            ->assertStatus(429);
    }
}
