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
            'shipping_address.name'          => ['required', 'string', 'max:255'],
            'shipping_address.phone'         => ['required', 'string', 'max:50'],
            'shipping_address.address_line1' => ['required', 'string', 'max:255'],
            'shipping_address.address_line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.postal_code'   => ['required', 'string', 'max:20'],
            'shipping_address.city'          => ['required', 'string', 'max:255'],
            'shipping_address.state'         => ['required', 'string', 'max:255'],
            'shipping_address.country'       => ['required', 'string', 'size:2'],
        ]);

        $user            = $request->user();
        $incoming        = collect($request->input('items'));
        $shippingAddress = $request->input('shipping_address');
        $productIds      = $incoming->pluck('product_id')->unique()->values();

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

        // Coste de envío real según el país ya conocido
        $shippingCost = self::resolveShippingCost($shippingAddress['country'], $total);

        // Añade envío como line item si tiene coste
        if ($shippingCost > 0) {
            $lineItems[] = [
                'price_data' => [
                    'currency'     => 'eur',
                    'unit_amount'  => $shippingCost,
                    'product_data' => ['name' => 'Gastos de envío'],
                ],
                'quantity' => 1,
            ];
        }

        // Crea el Order con dirección y coste reales desde el inicio
        $order = DB::transaction(function () use ($user, $incoming, $products, $total, $shippingCost, $shippingAddress) {
            $order = Order::create([
                'user_id'          => $user->id,
                'total'            => $total,
                'shipping_cost'    => $shippingCost,
                'shipping_address' => $shippingAddress,
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
            'payment_method_types' => ['card'],
            'line_items'           => $lineItems,
            'mode'                 => 'payment',
            'success_url'          => "{$baseUrl}/checkout/exito?order={$order->id}",
            'cancel_url'           => "{$baseUrl}/checkout/cancelado?order={$order->id}",
            'metadata'             => ['order_id' => $order->id],
            'client_reference_id'  => (string) $order->id,
        ]);

        // Guarda el session_id para identificar el pedido en el webhook
        $order->update(['stripe_session_id' => $session->id]);

        return response()->json(['checkout_url' => $session->url], 201);
    }

    // Resuelve la tarifa aplicable para el país y total del pedido
    public static function resolveShippingCost(string $countryCode, int $orderTotal): int
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
