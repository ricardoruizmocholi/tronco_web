<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ShippingRate;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        $payload   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret    = config('services.stripe.webhook');

        // Verifica la firma de Stripe — rechaza cualquier petición sin firma válida
        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $secret);
        } catch (SignatureVerificationException $e) {
            Log::warning('Stripe webhook: firma inválida', ['error' => $e->getMessage()]);
            return response('Invalid signature.', 400);
        } catch (\UnexpectedValueException $e) {
            Log::warning('Stripe webhook: payload inválido', ['error' => $e->getMessage()]);
            return response('Invalid payload.', 400);
        }

        // Solo procesamos checkout.session.completed; el resto se ignora con 200
        if ($event->type !== 'checkout.session.completed') {
            return response('Event ignored.', 200);
        }

        $session = $event->data->object;
        $orderId = $session->client_reference_id;

        if (! $orderId) {
            Log::error('Stripe webhook: checkout.session.completed sin client_reference_id', [
                'session_id' => $session->id,
            ]);
            return response('Missing order reference.', 400);
        }

        DB::transaction(function () use ($session, $orderId) {
            // lockForUpdate: si Stripe reenvía el evento en paralelo, solo un proceso avanza
            $order = Order::with('items.product')
                ->lockForUpdate()
                ->find($orderId);

            if (! $order) {
                Log::error("Stripe webhook: order #{$orderId} no encontrado.");
                return;
            }

            // Idempotencia: si ya está pagado, ignorar el reenvío sin descontar stock
            if ($order->status === 'paid') {
                Log::info("Stripe webhook: order #{$orderId} ya estaba pagado, ignorando reenvío.");
                return;
            }

            // Descuenta stock de cada item — decrement() es atómico en MySQL
            foreach ($order->items as $item) {
                $product = $item->product;

                if (! $product) {
                    Log::error("Stripe webhook: producto #{$item->product_id} no encontrado para order #{$orderId}.");
                    continue;
                }

                $product->decrement('stock', $item->quantity);
            }

            // Extrae shipping_details y recalcula el coste real con el país confirmado
            $shippingDetails = $session->shipping_details ?? null;
            $shippingAddress = null;
            $shippingCost    = $order->shipping_cost; // mantiene la estimación si no hay dirección

            if ($shippingDetails?->address) {
                $addr = $shippingDetails->address;
                $shippingAddress = [
                    'line1'       => $addr->line1,
                    'line2'       => $addr->line2,
                    'city'        => $addr->city,
                    'postal_code' => $addr->postal_code,
                    'state'       => $addr->state,
                    'country'     => $addr->country,
                ];

                if ($addr->country) {
                    $shippingCost = self::resolveShippingCost($addr->country, $order->total);
                }
            }

            $order->update([
                'status'           => 'paid',
                'stripe_session_id'=> $session->id,
                'shipping_address' => $shippingAddress,
                'shipping_cost'    => $shippingCost,
            ]);

            Log::info("Stripe webhook: order #{$orderId} marcado como paid.", [
                'shipping_country' => $shippingAddress['country'] ?? null,
                'shipping_cost'    => $shippingCost,
            ]);
        });

        return response('OK', 200);
    }

    // Resuelve la tarifa aplicable para el país y total del pedido
    private static function resolveShippingCost(string $countryCode, int $orderTotal): int
    {
        // Tarifa específica del país tiene prioridad sobre la internacional (null)
        $rate = ShippingRate::active()
            ->where(fn($q) => $q->where('country_code', $countryCode)->orWhereNull('country_code'))
            ->where('min_order_amount', '<=', $orderTotal)
            ->orderByRaw('(country_code IS NULL) ASC')  // específica antes que internacional
            ->orderByDesc('min_order_amount')            // umbral más alto que cumpla
            ->first();

        if (! $rate) return 0;

        // Envío gratis si el pedido supera el umbral free_above
        if ($rate->free_above !== null && $orderTotal >= $rate->free_above) return 0;

        return $rate->rate;
    }
}
