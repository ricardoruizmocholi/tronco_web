<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;
    private Product  $active;
    private Product  $inactive;
    private Product  $soldOut;

    protected function setUp(): void
    {
        parent::setUp();

        $this->category = Category::create(['name' => 'Camisetas', 'slug' => 'camisetas']);

        $this->active = Product::create([
            'category_id' => $this->category->id,
            'name'        => 'Camiseta Classic',
            'slug'        => 'camiseta-classic',
            'description' => 'La camiseta clásica de Troncodrilo.',
            'price'       => 2499,
            'stock'       => 10,
            'is_active'   => true,
        ]);

        $this->soldOut = Product::create([
            'category_id' => $this->category->id,
            'name'        => 'Camiseta Agotada',
            'slug'        => 'camiseta-agotada',
            'description' => 'Edición limitada agotada.',
            'price'       => 3999,
            'stock'       => 0,
            'is_active'   => true,
        ]);

        $this->inactive = Product::create([
            'category_id' => $this->category->id,
            'name'        => 'Producto Inactivo',
            'slug'        => 'producto-inactivo',
            'description' => 'No debe aparecer en el catálogo.',
            'price'       => 999,
            'stock'       => 5,
            'is_active'   => false,
        ]);
    }

    // --- Listado público ---

    public function test_anyone_can_list_active_products(): void
    {
        $response = $this->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['slug' => 'camiseta-classic'])
            ->assertJsonFragment(['slug' => 'camiseta-agotada'])
            ->assertJsonMissing(['slug' => 'producto-inactivo']);
    }

    public function test_inactive_products_are_excluded_from_listing(): void
    {
        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonMissing(['slug' => 'producto-inactivo']);
    }

    // --- Ficha de producto ---

    public function test_anyone_can_view_a_product_by_slug(): void
    {
        $this->getJson('/api/products/camiseta-classic')
            ->assertOk()
            ->assertJsonFragment([
                'slug'  => 'camiseta-classic',
                'price' => 2499,
                'stock' => 10,
            ]);
    }

    public function test_inactive_product_returns_404_on_show(): void
    {
        $this->getJson('/api/products/producto-inactivo')
            ->assertNotFound();
    }

    public function test_unknown_slug_returns_404(): void
    {
        $this->getJson('/api/products/no-existe')
            ->assertNotFound();
    }

    // --- Producto agotado ---

    public function test_sold_out_product_appears_in_listing_with_stock_zero(): void
    {
        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'camiseta-agotada', 'stock' => 0]);
    }

    public function test_sold_out_product_is_visible_on_show(): void
    {
        $this->getJson('/api/products/camiseta-agotada')
            ->assertOk()
            ->assertJsonFragment(['stock' => 0]);
    }

    // --- Filtro por categoría ---

    public function test_products_can_be_filtered_by_category_slug(): void
    {
        $other = Category::create(['name' => 'Accesorios', 'slug' => 'accesorios']);
        Product::create([
            'category_id' => $other->id,
            'name'        => 'Taza Mañanera',
            'slug'        => 'taza-maňanera',
            'description' => 'Taza de cerámica.',
            'price'       => 1499,
            'stock'       => 20,
            'is_active'   => true,
        ]);

        $this->getJson('/api/products?category=camisetas')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['slug' => 'taza-maňanera']);
    }

    public function test_filter_by_nonexistent_category_returns_empty_list(): void
    {
        $this->getJson('/api/products?category=no-existe')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    // --- Categorías ---

    public function test_anyone_can_list_categories(): void
    {
        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'camisetas']);
    }

    // --- Endpoints de admin: acceso bloqueado sin rol ---

    public function test_guest_cannot_create_product(): void
    {
        $this->postJson('/api/admin/products', [
            'name'        => 'Nuevo producto',
            'description' => 'Descripción.',
            'price'       => 1000,
        ])->assertUnauthorized();
    }

    public function test_non_admin_user_cannot_create_product(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/admin/products', [
                'name'        => 'Nuevo producto',
                'description' => 'Descripción.',
                'price'       => 1000,
            ])->assertForbidden();
    }

    public function test_admin_can_create_product(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/products', [
                'name'        => 'Nuevo producto admin',
                'description' => 'Creado por admin en test.',
                'price'       => 1999,
                'category_id' => $this->category->id,
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'name'  => 'Nuevo producto admin',
                'price' => 1999,
                'slug'  => 'nuevo-producto-admin',
            ]);
    }

    public function test_admin_can_deactivate_product(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/products/{$this->active->id}")
            ->assertOk()
            ->assertJsonFragment(['message' => 'Producto desactivado.']);

        $this->assertDatabaseHas('products', [
            'id'        => $this->active->id,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_update_product(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/products/{$this->active->id}", [
                'name'        => 'Camiseta Classic Actualizada',
                'description' => 'Nueva descripción.',
                'price'       => 2799,
            ])
            ->assertOk()
            ->assertJsonFragment([
                'price' => 2799,
                'slug'  => 'camiseta-classic-actualizada',
            ]);
    }

    public function test_product_store_validates_price_must_be_positive(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/products', [
                'name'        => 'Producto gratis',
                'description' => 'Precio inválido.',
                'price'       => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['price']);
    }
}
