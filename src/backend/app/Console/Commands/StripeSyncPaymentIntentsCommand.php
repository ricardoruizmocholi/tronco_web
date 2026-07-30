<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
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
    protected $description = 'Recupera de Stripe el payment_intent_id de pedidos pagados que no lo tienen guardado (pedidos anteriores a la Feature 014)';

    public function handle(): int
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $orders = Order::where('status', 'paid')
            ->whereNull('stripe_payment_intent_id')
            ->whereNotNull('stripe_session_id')
            ->get();

        $this->info("Pedidos a sincronizar: {$orders->count()}");

        $updated = 0;
        $failed  = 0;

        foreach ($orders as $order) {
            try {
                $session = Session::retrieve($order->stripe_session_id);

                if (! $session->payment_intent) {
                    $this->warn("Order #{$order->id}: la sesión {$order->stripe_session_id} no tiene payment_intent (¿pago no completado en Stripe?).");
                    Log::warning("stripe:sync-payment-intents: order #{$order->id} sin payment_intent en la sesión.", [
                        'stripe_session_id' => $order->stripe_session_id,
                    ]);
                    $failed++;
                    continue;
                }

                $order->update(['stripe_payment_intent_id' => $session->payment_intent]);
                $this->line("Order #{$order->id}: actualizado con payment_intent {$session->payment_intent}");
                $updated++;
            } catch (\Throwable $e) {
                $this->error("Order #{$order->id}: error al recuperar la sesión de Stripe — {$e->getMessage()}");
                Log::error("stripe:sync-payment-intents: fallo al sincronizar order #{$order->id}.", [
                    'stripe_session_id' => $order->stripe_session_id,
                    'error'             => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        $this->info("Sincronización terminada. Actualizados: {$updated}. Fallidos: {$failed}.");
        Log::info("stripe:sync-payment-intents: sincronización terminada.", ['updated' => $updated, 'failed' => $failed]);

        return self::SUCCESS;
    }
}
