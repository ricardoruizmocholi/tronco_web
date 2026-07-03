<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Stripe;

class CheckoutController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $user       = $request->user();
        $incoming   = collect($request->input('items'));
        $productIds = $incoming->pluck('product_id')->unique()->values();

        // Carga productos activos de una sola query
        $products = Product::whereIn('id', $productIds)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        // Valida que todos los product_id existen y están activos
        foreach ($incoming as $line) {
            if (! $products->has($line['product_id'])) {
                return response()->json([
                    'message' => "El producto #{$line['product_id']} no está disponible.",
                ], 422);
            }
        }

        // Valida stock suficiente para cada item — falla rápido antes de tocar BD
        $stockErrors = [];
        foreach ($incoming as $line) {
            $product = $products->get($line['product_id']);
            if ($product->stock < $line['quantity']) {
                $stockErrors[] = "«{$product->name}»: stock disponible {$product->stock}, solicitado {$line['quantity']}.";
            }
        }
        if (! empty($stockErrors)) {
            return response()->json([
                'message' => 'Stock insuficiente para algunos productos.',
                'errors'  => $stockErrors,
            ], 422);
        }

        // Recalcula total en backend — nunca se acepta del frontend
        $total     = 0;
        $lineItems = [];
        foreach ($incoming as $line) {
            $product    = $products->get($line['product_id']);
            $total     += $product->price * $line['quantity'];

            $lineItems[] = [
                'price_data' => [
                    'currency'     => 'eur',
                    'unit_amount'  => $product->price,
                    'product_data' => [
                        'name'   => $product->name,
                        'images' => $product->image_url ? [$product->image_url] : [],
                    ],
                ],
                'quantity' => $line['quantity'],
            ];
        }

        // Tarifas activas: estimación conservadora (la más alta) y países permitidos
        $activeRates      = ShippingRate::active()->get();
        $hasInternational = $activeRates->whereNull('country_code')->isNotEmpty();
        $allowedCountries = $hasInternational
            ? ['ZZ']
            : ($activeRates->pluck('country_code')->filter()->sort()->values()->toArray() ?: ['ES']);
        $estimatedShipping = (int) ($activeRates->max('rate') ?? 0);

        // Crea el Order y sus OrderItems en una transacción
        $order = DB::transaction(function () use ($user, $incoming, $products, $total, $estimatedShipping) {
            $order = Order::create([
                'user_id'       => $user->id,
                'total'         => $total,
                'shipping_cost' => $estimatedShipping,
            ]);

            foreach ($incoming as $line) {
                $product = $products->get($line['product_id']);
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity'   => $line['quantity'],
                    'unit_price' => $product->price,
                ]);
            }

            return $order;
        });

        // Crea la Stripe Checkout Session fuera de la transacción (latencia de red)
        Stripe::setApiKey(config('services.stripe.secret'));

        $baseUrl = rtrim(config('app.frontend_url'), '/');

        $session = StripeSession::create([
            'payment_method_types'        => ['card'],
            'line_items'                  => $lineItems,
            'mode'                        => 'payment',
            'shipping_address_collection' => ['allowed_countries' => $allowedCountries],
            'success_url'                 => "{$baseUrl}/checkout/exito?order={$order->id}",
            'cancel_url'                  => "{$baseUrl}/checkout/cancelado?order={$order->id}",
            'metadata'                    => ['order_id' => $order->id],
            'client_reference_id'         => (string) $order->id,
        ]);

        // Guarda el session_id para identificar el pedido en el webhook
        $order->update(['stripe_session_id' => $session->id]);

        return response()->json(['checkout_url' => $session->url], 201);
    }
}
