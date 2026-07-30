<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;

class StripeSyncPaymentIntentsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stripe:sync-payment-intents';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recupera de Stripe el payment_intent_id de pedidos que no lo tienen guardado (pedidos anteriores a la Feature 014)';

    public function handle(): int
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        // No se filtra por status: un pedido con payment_intent_id ausente puede
        // haber avanzado más allá de "paid" (shipped, return_approved, refunded...)
        // por el propio flujo de devoluciones/cancelaciones, y seguiría necesitando
        // el payment_intent para poder reembolsarse.
        $candidates = Order::whereNull('stripe_payment_intent_id')->get();

        $withSession    = $candidates->whereNotNull('stripe_session_id');
        $withoutSession = $candidates->whereNull('stripe_session_id');

        $this->info("Pedidos sin payment_intent_id: {$candidates->count()} "
            . "(con session_id: {$withSession->count()}, sin session_id: {$withoutSession->count()})");

        $updated = 0;
        $failed  = 0;

        foreach ($withSession as $order) {
            try {
                $session = Session::retrieve($order->stripe_session_id);

                if (! $session->payment_intent) {
                    $this->warn("Order #{$order->id} (status={$order->status}): la sesión {$order->stripe_session_id} "
                        . 'no tiene payment_intent (el pago no llegó a completarse en Stripe).');
                    Log::warning('stripe:sync-payment-intents: sesión sin payment_intent.', [
                        'order_id'          => $order->id,
                        'order_status'      => $order->status,
                        'stripe_session_id' => $order->stripe_session_id,
                        'session_status'    => $session->status ?? null,
                        'payment_status'    => $session->payment_status ?? null,
                    ]);
                    $failed++;
                    continue;
                }

                $order->update(['stripe_payment_intent_id' => $session->payment_intent]);
                $this->line("Order #{$order->id} (status={$order->status}): actualizado con payment_intent {$session->payment_intent}");
                $updated++;
            } catch (ApiErrorException $e) {
                $stripeError = $e->getError();
                $this->error("Order #{$order->id}: error de la API de Stripe — {$e->getMessage()}");
                Log::error('stripe:sync-payment-intents: error de la API de Stripe al recuperar la sesión.', [
                    'order_id'          => $order->id,
                    'order_status'      => $order->status,
                    'stripe_session_id' => $order->stripe_session_id,
                    'http_status'       => $e->getHttpStatus(),
                    'stripe_error_type' => $stripeError->type ?? null,
                    'stripe_error_code' => $stripeError->code ?? null,
                    'message'           => $e->getMessage(),
                ]);
                $failed++;
            } catch (\Throwable $e) {
                $this->error("Order #{$order->id}: error inesperado — {$e->getMessage()}");
                Log::error('stripe:sync-payment-intents: error inesperado al sincronizar el pedido.', [
                    'order_id'          => $order->id,
                    'order_status'      => $order->status,
                    'stripe_session_id' => $order->stripe_session_id,
                    'error'             => $e->getMessage(),
                    'trace'             => $e->getTraceAsString(),
                ]);
                $failed++;
            }
        }

        if ($withoutSession->isNotEmpty()) {
            $this->newLine();
            $this->warn('Pedidos SIN stripe_session_id — irrecuperables automáticamente, requieren gestión manual en Stripe:');
            foreach ($withoutSession as $order) {
                $this->warn("  Order #{$order->id} (status={$order->status})");
            }
            Log::warning('stripe:sync-payment-intents: pedidos sin stripe_session_id (irrecuperables automáticamente).', [
                'order_ids' => $withoutSession->pluck('id')->all(),
            ]);
        }

        $this->newLine();
        $this->info("Sincronización terminada. Actualizados: {$updated}. Fallidos/pendientes: {$failed}. "
            . "Sin session_id: {$withoutSession->count()}.");
        Log::info('stripe:sync-payment-intents: sincronización terminada.', [
            'updated'         => $updated,
            'failed'          => $failed,
            'without_session' => $withoutSession->count(),
        ]);

        return self::SUCCESS;
    }
}
