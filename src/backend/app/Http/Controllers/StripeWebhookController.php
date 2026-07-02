<?php

namespace App\Http\Controllers;

use App\Models\Order;
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

            // Marca el pedido como pagado
            $order->update([
                'status'            => 'paid',
                'stripe_session_id' => $session->id,
            ]);

            Log::info("Stripe webhook: order #{$orderId} marcado como paid.");
        });

        return response('OK', 200);
    }
}
