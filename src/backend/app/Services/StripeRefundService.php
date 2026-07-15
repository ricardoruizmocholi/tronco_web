<?php

namespace App\Services;

use Stripe\Refund;
use Stripe\Stripe;

class StripeRefundService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Create a Stripe Refund for a payment intent.
     *
     * @param  string  $paymentIntentId  Stripe payment_intent ID (pi_xxx)
     * @param  int|null  $amount  Amount in cents; null = full refund
     * @return Refund
     * @throws \Stripe\Exception\ApiErrorException
     */
    public function refund(string $paymentIntentId, ?int $amount = null): Refund
    {
        $params = ['payment_intent' => $paymentIntentId];

        if ($amount !== null) {
            $params['amount'] = $amount;
        }

        return Refund::create($params);
    }
}
