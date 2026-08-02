<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    // GET /api/products  (?category=slug)
    public function index(): JsonResponse
    {
        $query = Product::with([
            'category', 'images', 'promotion',
            'variants' => fn($q) => $q->where('is_active', true),
            ...Product::colorAttributesEagerLoad(),
        ])->where('is_active', true);

        if ($slug = request()->query('category')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $slug));
        }

        return response()->json($query->orderBy('name')->paginate(12));
    }

    // GET /api/products/{slug}
    public function show(string $slug): JsonResponse
    {
        $product = Product::with([
            'category', 'images', 'promotion',
            'attributes.values',
            'variants.variantAttributes.attributeValue',
        ])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($product);
    }

    // GET /api/products/new — productos más recientes, para la landing.
    // Prioriza los creados en los últimos 90 días (scopeNewArrivals); si el catálogo no
    // tiene altas recientes (p.ej. datos de desarrollo antiguos), cae a mostrar los últimos
    // N por fecha de creación sin filtro, para que la sección nunca quede vacía sin motivo.
    public function newArrivals(): JsonResponse
    {
        $baseQuery = fn () => Product::with([
            'category', 'images', 'promotion',
            'variants' => fn($q) => $q->where('is_active', true),
            ...Product::colorAttributesEagerLoad(),
        ])->where('is_active', true);

        $products = $baseQuery()
            ->newArrivals()
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        if ($products->isEmpty()) {
            $products = $baseQuery()
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
        }

        return response()->json($products);
    }

    // GET /api/categories
    public function categories(): JsonResponse
    {
        return response()->json(Category::orderBy('name')->get());
    }

    // POST /api/admin/products
    public function store(ProductRequest $request): JsonResponse
    {
        $product = Product::create([
            ...$request->validated(),
            'slug' => Str::slug($request->name),
        ]);

        return response()->json($product->load(['category', 'variants.variantAttributes.attributeValue', 'attributes.values']), 201);
    }

    // PUT /api/admin/products/{product}
    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $product->update($data);

        return response()->json($product->load(['category', 'variants.variantAttributes.attributeValue', 'attributes.values']));
    }

    // DELETE /api/admin/products/{product}  →  soft-delete semántico
    public function destroy(Product $product): JsonResponse
    {
        $product->update(['is_active' => false]);

        return response()->json(['message' => 'Producto desactivado.']);
    }

    // GET /api/admin/products  →  todos los productos sin filtrar is_active
    public function adminIndex(): JsonResponse
    {
        $products = Product::with([
            'category', 'images',
            'attributes.values',
            'variants.variantAttributes.attributeValue',
        ])
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }

    // PATCH /api/admin/products/{product}/toggle  →  invierte is_active
    public function toggle(Product $product): JsonResponse
    {
        $product->update(['is_active' => !$product->is_active]);

        return response()->json($product->load(['category', 'images', 'variants.variantAttributes.attributeValue', 'attributes.values']));
    }

    // POST /api/admin/products/{product}/images
    public function storeImage(Request $request, Product $product): JsonResponse
    {
        $request->validate(['url' => 'required|url|max:2048']);

        $position = ($product->images()->max('position') ?? 0) + 1;

        $image = $product->images()->create([
            'url'      => $request->url,
            'position' => $request->input('position', $position),
        ]);

        return response()->json($image, 201);
    }

    // DELETE /api/admin/products/{product}/images/{image}
    public function destroyImage(Product $product, ProductImage $image): JsonResponse
    {
        if ($image->product_id !== $product->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $image->delete();

        return response()->json(['message' => 'Imagen eliminada.']);
    }

    // DELETE /api/admin/products/{product}/permanent
    public function permanentDestroy(Product $product): JsonResponse
    {
        $product->delete();
        return response()->json(['message' => 'Producto eliminado permanentemente.']);
    }

    // PATCH /api/admin/products/{product}/toggle-preorder
    public function togglePreorder(Product $product): JsonResponse
    {
        $product->update(['allow_preorder' => !$product->allow_preorder]);

        return response()->json($product->load(['category', 'images', 'variants.variantAttributes.attributeValue', 'attributes.values']));
    }
}
