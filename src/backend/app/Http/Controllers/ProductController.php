<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    // GET /api/products  (?category=slug)
    public function index(): JsonResponse
    {
        $query = Product::with(['category', 'images'])
            ->where('is_active', true);

        if ($slug = request()->query('category')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $slug));
        }

        return response()->json($query->orderBy('name')->paginate(12));
    }

    // GET /api/products/{slug}
    public function show(string $slug): JsonResponse
    {
        $product = Product::with(['category', 'images'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($product);
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

        return response()->json($product->load('category'), 201);
    }

    // PUT /api/admin/products/{product}
    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $product->update($data);

        return response()->json($product->load('category'));
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
        $products = Product::with(['category', 'images'])
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }

    // PATCH /api/admin/products/{product}/toggle  →  invierte is_active
    public function toggle(Product $product): JsonResponse
    {
        $product->update(['is_active' => !$product->is_active]);

        return response()->json($product->load(['category', 'images']));
    }
}
