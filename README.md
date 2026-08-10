# Troncodrilo Shop

Ecommerce oficial de merchandising del personaje **Troncodrilo**. Combina una
tienda con catálogo y checkout real (Stripe), un apartado de **artistas
colaboradores** y **Bola Troncodrilo**: un mapa/globo interactivo del mundo
donde cada usuario registrado puede publicar un fanfic (uno por usuario),
geolocalizado y sujeto a moderación por un administrador antes de hacerse
público.

El proyecto sigue una metodología **Spec-Driven Development (SDD)**: cada
funcionalidad nace como una especificación en `spec/features/` antes de
escribirse una sola línea de código (ver [Metodología de desarrollo](#metodología-de-desarrollo-sdd)).

## Índice

- [Descripción general](#descripción-general)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Flujos de datos principales](#flujos-de-datos-principales)
- [Instalación y arranque local](#instalación-y-arranque-local)
- [Variables de entorno](#variables-de-entorno)
- [Comandos útiles](#comandos-útiles)
- [Usuarios de prueba](#usuarios-de-prueba)
- [API — resumen de endpoints](#api--resumen-de-endpoints)
- [Metodología de desarrollo (SDD)](#metodología-de-desarrollo-sdd)
- [Decisiones técnicas destacadas](#decisiones-técnicas-destacadas)
- [Bugs conocidos](#bugs-conocidos)
- [Roadmap / features futuras](#roadmap--features-futuras)

---

## Descripción general

Troncodrilo Shop tiene tres pilares:

1. **Tienda** — catálogo de productos con variantes (talla, color, material...),
   carrito persistente, checkout real con Stripe, seguimiento de pedidos,
   cancelaciones y devoluciones con reembolso automático.
2. **Artistas colaboradores** — perfiles públicos de artistas que colaboran
   con el proyecto (bio, galería, redes sociales, productos asociados),
   gestionados desde un panel de administración.
3. **Bola Troncodrilo** — un globo 3D interactivo (y una alternativa 2D con
   mapa) donde los usuarios suben un fanfic geolocalizado que se publica tras
   aprobación de un admin.

Todo el backend es una API REST sin vistas server-side; el frontend es una
SPA de React que consume esa API y se autentica mediante cookies de sesión
(Laravel Sanctum, flujo SPA — nunca tokens JWT manuales).

### Stack tecnológico (resumen con versiones exactas)

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Laravel | ^12.0 |
| Backend | PHP | ^8.2 (imagen Docker: `php:8.3-fpm`) |
| Backend | Laravel Sanctum | ^4.0 |
| Backend | Stripe PHP SDK | ^20.3 |
| Backend | maatwebsite/excel (PhpSpreadsheet) | ^3.1 |
| Base de datos | MySQL | 8 (imagen `mysql:8`) |
| Frontend | React | ^19.2.7 |
| Frontend | Vite | ^5.4.21 |
| Frontend | TypeScript | ~6.0.2 |
| Frontend | TailwindCSS | ^4.3.2 |
| Frontend | React Router | ^7.18.1 |
| Frontend | Zustand | ^5.0.14 |
| Frontend | react-globe.gl | ^2.38.0 |
| Frontend | Leaflet / react-leaflet | ^1.9.4 / ^5.0.0 |
| Frontend | Axios | ^1.18.1 |
| Infraestructura | Docker Compose | 4 servicios (`nginx`, `backend`, `frontend`, `db`) |
| Web server | Nginx | `nginx:alpine`, proxy reverso |
| Node runtime (contenedor frontend) | Node | 20-alpine |

---

## Arquitectura del sistema

Cuatro servicios Docker Compose sobre una única red bridge (`troncodrilo`):

```
                                   ┌────────────────────────────┐
                                   │        Navegador            │
                                   │   http://localhost (80)     │
                                   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                   ┌────────────────────────────┐
                                   │   nginx (nginx:alpine)      │
                                   │   puerto host 80 → 80       │
                                   │                              │
                                   │  /api/*, /sanctum/*  ───┐   │
                                   │  /storage/*           ──┼─┐ │
                                   │  /* (todo lo demás)  ──┼─┼─┼──┐
                                   └──────────────┬─────────┘ │ │  │
                                                  │           │ │  │
                        ┌─────────────────────────┘           │ │  │
                        ▼                                     │ │  │
          ┌───────────────────────────┐                        │ │  │
          │  backend (PHP-FPM 9000)    │◄───────────────────────┘ │  │
          │  Laravel 12 API             │  sirve /storage/*         │  │
          │  troncodrilo_backend        │  desde public/storage      │  │
          └──────────────┬───────────────┘                          │  │
                        │                                          │  │
                        ▼                                          │  │
          ┌───────────────────────────┐                            │  │
          │  db (mysql:8)               │                            │  │
          │  puerto host 3307 → 3306    │                            │  │
          │  troncodrilo_db              │                            │  │
          └───────────────────────────┘                             │  │
                                                                      │  │
                        ┌─────────────────────────────────────────────┘  │
                        ▼                                                │
          ┌───────────────────────────┐                                 │
          │  frontend (Vite dev server) │◄────────────────────────────────┘
          │  React 19 SPA + HMR          │  proxy_pass a frontend:5173
          │  puerto host 5175 → 5173     │  (Upgrade/Connection para WS de HMR)
          │  troncodrilo_frontend         │
          └───────────────────────────┘
```

**Comunicación entre servicios:**
- `nginx` es el único punto de entrada público (puerto **80**). Enruta por
  patrón de ruta:
  - `^/(api|sanctum)(/.*)?$` → PHP-FPM del contenedor `backend` (puerto interno **9000**).
  - `/storage` → archivos estáticos servidos directamente desde `public/storage` del backend (symlink de `storage/app/public`).
  - Cualquier otra ruta (`/`, `/tienda`, `/producto/:slug`, ...) → `proxy_pass` al dev server de Vite en el contenedor `frontend` (puerto interno **5173**), con cabeceras `Upgrade`/`Connection` para que el WebSocket de Hot Module Replacement funcione a través del proxy.
- `backend` se conecta a `db` por el hostname interno de Docker `db:3306` (variables `DB_HOST=db`, `DB_DATABASE=troncodrilo`).
- El **frontend nunca llama directamente al backend por su hostname interno**: todas las peticiones Axios usan `baseURL: 'http://localhost'` (ver `src/frontend/src/lib/axios.ts`), es decir, pasan siempre por nginx en el puerto 80 — esto es lo que permite que las cookies de sesión de Sanctum funcionen (mismo origen/dominio raíz para SPA y API).
- `db` también expone el puerto **3307** al host (mapeado al 3306 interno) para poder conectarse con un cliente MySQL externo (DBeaver, TablePlus...) sin pasar por Docker.
- `frontend` expone el puerto **5175** al host (mapeado al 5173 interno de Vite) — acceso directo al dev server sin pasar por nginx, útil para depurar HMR aisladamente.

**Volúmenes:**
- `./src/backend:/var/www/html` (bind mount, código vivo, hot-reload de PHP sin rebuild).
- `./src/frontend:/app` + volumen anónimo `/app/node_modules` (evita que el bind mount del host pise los módulos instalados dentro del contenedor Linux).
- `troncodrilo_db_data` (volumen nombrado, persiste los datos de MySQL entre reinicios).
- `./docker/nginx.conf` montado como configuración de nginx.

**Flujo de una petición HTTP típica (p. ej. `GET /api/products` desde la SPA):**
1. El navegador, ya cargado desde `http://localhost/`, hace `axios.get('/api/products')` con `withCredentials: true`.
2. La petición llega a `nginx:80`, que la matchea contra `^/(api|sanctum)(/.*)?$` y la reenvía por FastCGI a `backend:9000`.
3. Laravel resuelve la ruta en `routes/api.php`, pasa por el middleware `EnsureFrontendRequestsAreStateful` (cookies de sesión), llega al `ProductController@index`.
4. El controlador consulta MySQL a través de Eloquent (`db:3306`).
5. Laravel devuelve JSON; nginx lo reenvía tal cual al navegador.

---

## Stack tecnológico

### Backend

- **Laravel 12** (PHP ^8.2, imagen Docker `php:8.3-fpm`) — API REST pura, sin vistas Blade de negocio.
- **Laravel Sanctum ^4.0** — autenticación SPA basada en cookies de sesión (no tokens Bearer). `EnsureFrontendRequestsAreStateful` se añade manualmente en `bootstrap/app.php` (ver [gotchas](#decisiones-técnicas-destacadas)).
- **MySQL 8** — base de datos relacional; migraciones de Laravel como única fuente de verdad del esquema.
- **Stripe PHP SDK ^20.3** — Checkout Sessions para el pago, Webhooks para confirmar el pago de forma asíncrona y fiable, Refunds API para devoluciones/cancelaciones.
- **maatwebsite/excel ^3.1** (wrapper de PhpSpreadsheet) — exports a `.xlsx` con fórmulas reales de Excel (pedidos, devoluciones, preorders, newsletter).
- **laravel/tinker** — consola interactiva para inspección/depuración de datos.
- Dev dependencies: **Pest/PHPUnit** (`phpunit/phpunit ^11.5`) para tests, **Laravel Pint** para formateo, **fakerphp/faker** para seeders/factories, **laravel/pail** para logs en vivo, **laravel/sail** y **nunomaduro/collision**.

### Frontend

- **React 19.2.7** + **Vite 5.4.21** + **TypeScript ~6.0.2** — SPA sin SSR. Vite se mantiene deliberadamente en la rama 5 (no 8) por compatibilidad con `react-globe.gl` (ver gotchas).
- **TailwindCSS v4.3.2** (`@tailwindcss/vite`) — utilidades atómicas, sin preprocesador aparte; tokens de diseño en `@theme` dentro de `index.css`.
- **Zustand 5.0.14** (con middleware `persist`) — estado global del carrito (`cartStore.ts`), persistido en `localStorage`.
- **React Router 7.18.1** — enrutado de la SPA (`BrowserRouter`), rutas protegidas por rol vía componentes `ProtectedRoute`/`AdminRoute`.
- **Leaflet 1.9.4 + react-leaflet 5.0.0 + react-leaflet-cluster** — mapa 2D de `/mapa-troncodrilo`, tiles oscuros de CartoDB (sin API key), clustering de fanfics.
- **react-globe.gl 2.38.0 + Three.js** (dependencia transitiva) — globo 3D interactivo de `/bola-troncodrilo`.
- **Instrument Serif** (Google Fonts) — tipografía editorial (`.font-editorial`) del rediseño estético (feature 017).
- **Axios 1.18.1** — cliente HTTP único (`lib/axios.ts`), `withCredentials: true` para el flujo de cookies de Sanctum.
- Dev dependencies: **ESLint 10** + `typescript-eslint` + `eslint-plugin-react-hooks`/`react-refresh` para lint; `@types/*` para Leaflet, Node, React.

### Infraestructura

- **Docker Compose** — orquesta 4 servicios: `backend`, `frontend`, `db`, `nginx` (ver diagrama arriba).
- **Nginx** (`nginx:alpine`) — proxy reverso único; enruta `/api`, `/sanctum` y `/storage` al backend PHP-FPM, y todo lo demás al dev server de Vite.
- **Red**: una única red bridge `troncodrilo` compartida por los 4 servicios (resolución DNS interna por nombre de servicio: `db`, `backend`, `frontend`).
- **Volúmenes**: `troncodrilo_db_data` (named volume, persistencia de MySQL) + bind mounts de código para hot-reload en desarrollo.

---

## Estructura del proyecto

```
tronco_web/
├── docker/                      # Dockerfiles + configuración de Nginx/PHP
│   ├── Dockerfile.backend       # php:8.3-fpm + extensiones (pdo_mysql, gd, zip...)
│   ├── Dockerfile.frontend      # node:20-alpine + vite dev server
│   ├── nginx.conf               # proxy reverso (ver arquitectura)
│   ├── php.ini                  # límites de subida de archivos
│   └── entrypoint.sh            # permisos de storage/ antes de arrancar PHP-FPM
├── docker-compose.yml
├── AGENTS.md                    # arnés/instrucciones para agentes de IA sobre este repo
├── spec/
│   ├── constitution/            # misión, stack, roadmap del proyecto
│   └── features/                # specs SDD, una carpeta numerada por feature (000-022)
├── docs/                        # documentación técnica post-implementación por feature
├── src/backend/                 # aplicación Laravel (API)
└── src/frontend/                # aplicación React (SPA)
```

### `src/backend/` — Laravel

```
app/
├── Http/Controllers/     # 29 controladores REST
├── Http/Middleware/      # Authenticate, EnsureUserIsAdmin
├── Models/                # 23 modelos Eloquent
├── Services/               # StripeRefundService
├── Console/Commands/       # comandos artisan a medida
├── Exports/                 # clases *Export de maatwebsite/excel
database/
├── migrations/              # única fuente de verdad del esquema (37 migraciones)
├── seeders/                  # AdminUserSeeder, ProductCatalogSeeder, ArtistSeeder, ShippingRateSeeder
routes/
└── api.php                   # todas las rutas de la API (públicas, auth, admin)
```

**`app/Http/Controllers/` — agrupados por dominio:**

| Grupo | Controladores |
|---|---|
| Auth y perfil | `AuthController`, `ProfileController` |
| Catálogo público | `ProductController`, `ProductVariantController`, `ProductAttributeController`, `PromotionController` |
| Artistas y contenido | `ArtistController`, `FanficController`, `BannerController`, `CollaboratorController`, `HeroSlideController`, `NewsletterController` |
| Carrito/pedidos | `CheckoutController`, `OrderController`, `CancellationController`, `ReturnRequestController`, `StripeWebhookController` |
| Otros públicos/usuario | `ShippingRateController`, `PreorderController`, `ImageUploadController`, `VideoUploadController` |
| Admin — moderación y gestión | `AdminFanficController`, `AdminOrderController`, `AdminReturnController`, `AdminCancellationController`, `AdminPreorderController`, `AdminPromotionController`, `AdminHeroController`, `AdminNewsletterController` |

**`app/Models/` (23 modelos):**

| Modelo | Descripción |
|---|---|
| `User` | Cuenta de usuario; roles `user`/`admin`, flag `is_blocked` (moderación de fanfics) |
| `Category` | Categoría de producto |
| `Product` | Producto del catálogo; precio base en céntimos, stock, relación con artista/promoción |
| `ProductImage` | Imagen de galería de un producto, con `position` |
| `ProductVariant` | SKU/variante concreta de un producto (stock, `price_override`, imagen propia) |
| `ProductAttribute` | Atributo definible por producto (Color, Talla, Material...), tipo `text`/`color` |
| `ProductAttributeValue` | Valor concreto de un atributo (p. ej. "Rojo") |
| `ProductVariantAttribute` | Tabla pivote variante ↔ valor de atributo (una combinación) |
| `Artist` | Artista colaborador; bio, avatar, redes sociales, vídeo |
| `ArtistImage` | Imagen de galería de un artista |
| `Fanfic` | Fanfic geolocalizado de "Bola Troncodrilo"; un único fanfic por usuario, estado `pending/approved/rejected` |
| `Order` | Pedido; total/envío en céntimos, dirección en JSON, tracking, estados de pago/envío/devolución |
| `OrderItem` | Línea de un pedido; precio congelado en el momento de compra |
| `ReturnRequest` | Solicitud de devolución de un pedido; motivo, estado, tracking de vuelta |
| `ReturnRequestItem` | Artículo concreto incluido en una devolución |
| `ReturnStatusHistory` | Historial inmutable de cambios de estado de una devolución (log de auditoría) |
| `Promotion` | Promoción de descuento (%/fijo) sobre un producto, con vigencia por fechas |
| `ShippingRate` | Tarifa de envío por país/umbral de pedido |
| `Banner` | Banner promocional de la home |
| `Collaborator` | Logo de marca colaboradora en la home |
| `HeroSlide` | Slide del hero de la landing (imagen o vídeo) |
| `NewsletterSubscriber` | Suscriptor al newsletter |
| `Preorder` | Reserva de un producto agotado (con o sin cuenta) |

**`app/Services/`:**
- `StripeRefundService` — wrapper mínimo sobre `\Stripe\Refund`; expone `refund(string $paymentIntentId, ?int $amount = null)` (reembolso total si `$amount` es `null`, parcial en caso contrario). Consumido por `AdminReturnController`, `AdminCancellationController` y `CancellationController`.

**`database/migrations/` — las más relevantes:**
- `create_products_table` / `create_product_variants_table` / `create_product_attributes_table` + `..._values_table` + `..._variant_attributes_table` — evolución del catálogo de talla única a variantes multidimensionales (feature 015).
- `create_orders_table` + `add_new_statuses_to_orders_table` (amplía el `ENUM` de estado con SQL crudo) + `add_stripe_payment_intent_to_orders_table` + `add_tracking_to_orders_table`.
- `create_return_requests_table` + `create_return_status_history_table` + `add_items_to_return_requests_table` + `add_tracking_to_return_requests_table`.
- `create_fanfics_table` + `alter_fanfics_table` (pivote de contenido textual a publicación foto/ubicación).
- `create_promotions_table`, `create_preorders_table`, `create_hero_slides_table`, `create_newsletter_subscribers_table`.

**`routes/api.php` — grupos de rutas:**
- **Públicas** (sin middleware): registro/login, catálogo (`/products`, `/categories`), promociones activas, artistas, tarifas de envío, banners, colaboradores, hero slides, newsletter (suscripción), fanfics públicos (globo), preorders (auth opcional), `/health`, webhook de Stripe.
- **Autenticadas** (`auth:sanctum`): logout, perfil, checkout, pedidos propios, cancelación/devolución propia, subida de imágenes, gestión del fanfic propio.
- **Admin** (`auth:sanctum` + `admin`, prefijo `/admin`): CRUD completo de productos/variantes/atributos, artistas, moderación de fanfics, gestión de pedidos (con stats/export), tarifas de envío, banners, colaboradores, hero slides, newsletter (export), cancelaciones, devoluciones (con stats/export), preorders (con stats/export), promociones.

### `src/frontend/src/`

```
pages/            # 27 páginas (públicas + admin)
components/        # componentes reutilizables
context/            # AuthContext, CurrencyContext
store/               # cartStore (Zustand)
api/                  # un módulo por dominio, wrapping de axios
lib/                   # utilidades (axios, currencies, trackingCarriers, mapIcons)
types/                 # tipos TypeScript compartidos
```

**`pages/` (públicas):**

| Página | Ruta | Descripción |
|---|---|---|
| `HomePage` | `/` | Landing: hero 100vh, productos destacados, sección artistas/bola, newsletter |
| `LoginPage` | `/login` | Inicio de sesión |
| `RegisterPage` | `/register` | Registro de cuenta |
| `StorePage` | `/tienda` | Catálogo con filtro por categoría |
| `ProductPage` | `/producto/:slug` | Ficha de producto, selector de variantes/atributos, añadir al carrito |
| `ArtistsPage` | `/artistas` | Listado de artistas colaboradores |
| `ArtistProfilePage` | `/artistas/:id` | Perfil público de un artista (bio, galería, redes, productos) |
| `BolaTroncodriloPage` | `/bola-troncodrilo` | Globo 3D interactivo de fanfics (Three.js) |
| `MapaTroncodriloPage` | `/mapa-troncodrilo` | Mapa 2D (Leaflet) alternativo al globo, con clustering |
| `MiFanficPage` | `/mi-fanfic` | Subir/editar el fanfic propio (requiere sesión) |
| `OrdersPage` | `/mis-pedidos` | Historial de pedidos del usuario |
| `ProfilePage` | `/perfil` | Datos personales, cambio de contraseña, pedidos, tracking |
| `CheckoutSuccessPage` | `/checkout/exito` | Confirmación de pago tras volver de Stripe |
| `CheckoutCancelPage` | `/checkout/cancelado` | Pago cancelado/abandonado en Stripe |
| `PolicyPlaceholderPage` | `/politica-*`, `/terminos-condiciones` | Placeholder reutilizable para páginas legales |

**`pages/admin/`:**

| Página | Ruta | Descripción |
|---|---|---|
| `AdminDashboardPage` | `/admin` | Panel principal, accesos a cada sección |
| `AdminProductsPage` | `/admin/productos` | CRUD de productos, variantes y atributos |
| `AdminArtistsPage` | `/admin/artistas` | CRUD de artistas colaboradores |
| `AdminFanficsPage` | `/admin/fanfics` | Moderación de fanfics (aprobar/rechazar/destacar/bloquear usuario) |
| `AdminShippingPage` | `/admin/envios` | Gestión de tarifas de envío |
| `AdminBannersPage` | `/admin/banners` | Gestión de banners de la home |
| `AdminCollaboratorsPage` | `/admin/colaboradores` | Gestión de logos de colaboradores |
| `AdminOrdersPage` | `/admin/pedidos` | Gestión de pedidos, cambio de estado, tracking, export Excel |
| `AdminPreordersPage` | `/admin/preorders` | Gestión de la lista de espera, notificación manual, export |
| `AdminReturnsPage` | `/admin/devoluciones` | Gestión de devoluciones/reembolsos, tracking, export Excel |
| `AdminPromotionsPage` | `/admin/promociones` | Gestión de promociones por producto |
| `AdminHeroPage` | `/admin/hero` | Gestión de los slides del hero (orden, imagen/vídeo) |
| `AdminNewsletterPage` | `/admin/newsletter` | Listado de suscriptores, export CSV |

**`components/` (más importantes):**
- `Layout.tsx` — header dinámico (transparente/sólido según scroll) + `Outlet` + `Footer`.
- `CartDrawer.tsx` / `MobileDrawer.tsx` — drawers laterales del carrito y del menú móvil.
- `ProtectedRoute.tsx` / `AdminRoute.tsx` — guardas de ruta por sesión/rol.
- `ProductCard.tsx` / `LandingProductCard.tsx` — tarjetas de producto (catálogo / landing).
- `CollaboratorCard.tsx` — tarjeta de colaborador (mismo lenguaje visual que `ProductCard`).
- `AttributeSelector.tsx` / `ColorSwatch.tsx` — selector de variantes por atributo.
- `PromotionCarousel.tsx` / `CarouselSection.tsx` — carruseles de la landing.
- `ShippingAddressModal.tsx` — modal de dirección de envío en el checkout.
- `CancelOrderModal.tsx` / `ReturnRequestModal.tsx` — modales de cancelación/devolución.
- `ReturnStatusBadge.tsx` — badge visual del estado de una devolución.
- `TrackingPanel.tsx` — panel de seguimiento compartido entre pedidos y devoluciones (`variant: 'rounded' | 'flat'`).
- `PreorderModal.tsx` — modal de reserva de producto agotado.
- `FanficUploadModal.tsx` — modal de subida/edición del fanfic propio.
- `MapSidePanel.tsx` — panel lateral de detalle en `/mapa-troncodrilo`.
- `StarField.tsx` — fondo de estrellas animado (canvas 2D) exclusivo de `/bola-troncodrilo`.
- `CurrencySelector.tsx` — selector de divisa del header.

**`context/`:**
- `AuthContext.tsx` — sesión del usuario (`GET /sanctum/csrf-cookie` → `GET /api/user`), login/registro/logout.
- `CurrencyContext.tsx` — divisa seleccionada (persistida en `localStorage`), `formatPrice(cents)`.

**`store/`:**
- `cartStore.ts` — carrito con Zustand + middleware `persist` (`localStorage`, clave `troncodrilo_cart`); solo persiste `items`, no el estado `isOpen` del drawer.

**`api/`:** un módulo por dominio (`products`, `artists`, `banners`, `collaborators`, `fanfics`, `orders`, `adminOrders`, `returns`, `preorders`, `promotions`, `attributes`, `heroSlides`, `newsletter`, `shipping`, `upload`, `user`) — cada uno envuelve las llamadas Axios correspondientes con tipado TypeScript.

**`lib/`:**
- `axios.ts` — instancia única de Axios (`baseURL: 'http://localhost'`, `withCredentials: true`).
- `currencies.ts` — catálogo de 7 divisas con tasas fijas + `formatPrice()`/`convertCents()`.
- `trackingCarriers.ts` — catálogo de transportistas (string libre) + `buildTrackingUrl()`.
- `mapIcons.ts` — iconos de Leaflet para `/mapa-troncodrilo`.

**`types/`:** `product`, `order`, `adminOrder`, `returnRequest`, `artist`, `fanfic`, `promotion`, `heroSlide`, `newsletter` — interfaces TypeScript compartidas entre `api/` y los componentes.

### `spec/features/` y `docs/`

- `spec/features/NNN-nombre/spec.md` — un único archivo por feature con tres secciones (`## Spec`, `## Plan`, `## Tasks`); ver [Metodología de desarrollo](#metodología-de-desarrollo-sdd).
- `docs/` — documentación técnica post-implementación, un archivo por feature relevante (decisiones tomadas, bugs resueltos, verificación); `docs/mcd.md` es el modelo de datos de referencia y `docs/bugs/` recoge bugs conocidos.

---

## Modelo de datos

Todas las cantidades monetarias (`price`, `total`, `shipping_cost`,
`unit_price`, `refund_amount`, `rate`...) se almacenan en **céntimos de euro
como enteros** (p. ej. `1999` = 19,99 €), evitando errores de redondeo.

```
categories       ||--o{ products                 : "clasifica"
artists           ||--o{ products                 : "crea"
artists           ||--o{ artist_images             : "muestra"
users              ||--o|  artists                  : "opera (user_id nullable)"

products           ||--o{ product_images           : "tiene"
products           ||--o{ product_variants          : "tiene"
products           ||--o{ product_attributes        : "define"
products           ||--o|  promotions                : "tiene (vigente)"
products           ||--o{ preorders                  : "reserva"
products           ||--o{ order_items                : "aparece en"

product_attributes  ||--o{ product_attribute_values  : "tiene valores"
product_attribute_values }o--o{ product_variants     : "compone (pivote product_variant_attributes)"
product_variants     ||--o{ order_items                : "aparece en"
product_variants     ||--o{ preorders                   : "reserva"

users               ||--o{ orders                      : "realiza"
orders               ||--o{ order_items                 : "contiene"
orders               ||--o|  return_requests             : "genera"

users               ||--o{ return_requests               : "solicita"
users               ||--o{ return_status_history          : "cambia estado (changed_by)"
return_requests      ||--o{ return_request_items          : "incluye"
return_requests      ||--o{ return_status_history          : "registra historial"
order_items          ||--o{ return_request_items           : "se devuelve en"

users               ||--o|  fanfics                       : "publica (1:1, único)"
users               ||--o{ fanfics                        : "revisa (reviewed_by)"

shipping_rates, banners, collaborators, hero_slides,
newsletter_subscribers                                    : "tablas independientes (sin FKs) — config/CMS"
```

**Notas sobre el esquema:**
- `fanfics.user_id` tiene constraint `UNIQUE` en BD — fuerza la regla "un fanfic por usuario" a nivel de base de datos, no solo de aplicación.
- `Fanfic` tiene **dos** relaciones hacia `User`: `author()` (`user_id`) y `reviewer()` (`reviewed_by`) — moderación de contenido.
- `Product::promotion()` es un `hasOne(Promotion::class)->active()`: el scope de vigencia vive en el modelo, así que una promoción `scheduled`/expirada nunca llega al frontend público.
- La relación N:N entre `product_attribute_values` y `product_variants` está modelada tanto como pivote explícito (`ProductVariantAttribute`, con sus propios `belongsTo`) como `belongsToMany` directa en `ProductAttributeValue::variants()`.
- Claves foráneas con `restrictOnDelete()` (protegen histórico): `orders.user_id`, `order_items.product_id`. El resto de relaciones son `cascadeOnDelete()` o `nullOnDelete()` según si el hijo pierde sentido sin el padre o no.
- `return_status_history` es una tabla de auditoría **inmutable**: modelo con `public $timestamps = false` y solo `created_at` (sin `updated_at`), nombre de tabla explícito (`return_status_history`, singular — no sigue la pluralización automática de Laravel).

---

## Flujos de datos principales

### Flujo de compra

1. El usuario añade un producto (o variante concreta) al carrito → `useCartStore.addItem()` (Zustand), persistido en `localStorage` (`troncodrilo_cart`).
2. Abre el `CartDrawer` → ve subtotal y una estimación de envío.
3. Confirma con un modal de dirección de envío (`ShippingAddressModal`) → `POST /api/checkout` con las líneas del carrito y la dirección.
4. **Backend** (`CheckoutController@store`): valida stock, **recalcula el total desde cero en el servidor** (nunca confía en el precio del frontend) con la precedencia `variant.price_override > promotion.discounted_price > product.price`, crea `Order`+`OrderItem`s dentro de una transacción, y crea una **Stripe Checkout Session** con esos importes ya validados.
5. El usuario es redirigido a Stripe Checkout (`checkout_url` devuelto por el backend) y completa el pago.
6. Stripe llama al **webhook** `POST /api/stripe/webhook` (`checkout.session.completed`): el backend verifica la firma, localiza el pedido por `client_reference_id`, comprueba idempotencia (si ya está `paid`, ignora reenvíos), **descuenta stock** de cada línea de forma atómica (`decrement()`), recalcula el coste de envío con el país confirmado por Stripe y marca el pedido como `paid`.
7. El usuario vuelve a `/checkout/exito?order=ID` (`CheckoutSuccessPage`) o `/checkout/cancelado?order=ID` si abandona el pago.

### Flujo de autenticación (Sanctum SPA)

1. `AuthProvider` monta y hace `GET /sanctum/csrf-cookie` (establece la cookie `XSRF-TOKEN`).
2. Con la cookie ya presente, `GET /api/user` intenta recuperar la sesión activa (si existe).
3. `POST /api/login` (o `/api/register`) autentica y **establece la cookie de sesión** (`AuthenticateSession` de Sanctum).
4. A partir de ahí, **todas** las peticiones Axios (`withCredentials: true`) incluyen automáticamente la cookie de sesión; el middleware `EnsureFrontendRequestsAreStateful` (añadido manualmente en `bootstrap/app.php`) trata esas peticiones como autenticadas por sesión, no por token Bearer.

### Flujo de devolución

Estados de `return_requests.status`: `pending → approved → received → refunded` (o `rejected` en cualquier punto antes de `received`).

1. El usuario solicita devolución de un pedido `shipped`/`delivered` (`POST /api/orders/{order}/return`), eligiendo artículos concretos y motivo (`defectuoso`, `no_corresponde`, `desistimiento`, `otro`).
2. El admin revisa la solicitud (`AdminReturnsPage`) y la **aprueba o rechaza** — cada cambio de estado queda registrado en `return_status_history` (log inmutable, con `changed_by`).
3. El admin marca la devolución como **recibida** cuando llega el paquete de vuelta.
4. El admin ejecuta el **reembolso**: `StripeRefundService::refund($paymentIntentId, $amount)` — reembolso total si no se indica importe, parcial si se calcula sobre los artículos concretos devueltos — y el estado pasa a `refunded`.

### Sistema de precios

**Precedencia del precio unitario** (idéntica en frontend y backend, implementada de forma independiente en cada capa):

```
variant.price_override  >  product.promotion.discounted_price  >  product.price
```

- Un precio propio de variante (`price_override`) es una decisión deliberada del admin y prevalece siempre sobre cualquier descuento de catálogo.
- El backend **recalcula este precio en el momento del checkout**, nunca acepta el precio mostrado por el frontend.
- **Divisa**: el selector de divisa del header (7 divisas) es puramente **cosmético/frontend** — convierte y formatea (`convertCents()`/`formatPrice()`) con tasas fijas hardcodeadas en `lib/currencies.ts`. El cobro real en Stripe **siempre es en EUR**, sin excepción; el resumen final del carrito muestra el importe en EUR de forma fija (independiente de la divisa elegida) para dejarlo explícito antes de pagar.

---

## Instalación y arranque local

### Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con Docker Compose v2)
- Git

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio> tronco_web
cd tronco_web

# 2. Copiar el archivo de entorno del backend y rellenar las claves de Stripe (test mode)
cp src/backend/.env.example src/backend/.env
# Editar src/backend/.env: DB_*, STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET,
# FRONTEND_URL, SANCTUM_STATEFUL_DOMAINS, SESSION_DOMAIN (ver tabla siguiente)

# 3. Levantar todos los servicios (nginx, backend, frontend, db)
docker compose up -d

# 4. Generar la clave de aplicación de Laravel (si .env no trae APP_KEY)
docker compose exec backend php artisan key:generate

# 5. Ejecutar migraciones + seeders (crea el admin de prueba y catálogo demo)
docker compose exec backend php artisan migrate --seed

# 6. Sincronizar payment_intents de pedidos preexistentes (solo relevante si se
#    parte de un dump de datos anterior a la feature 014; en una BD nueva no
#    hay nada que sincronizar, pero es inofensivo ejecutarlo)
docker compose exec backend php artisan stripe:sync-payment-intents

# 7. Enlazar el storage público (imágenes subidas)
docker compose exec backend php artisan storage:link
```

Acceder a **http://localhost** (todo pasa por nginx en el puerto 80 — no usar
directamente el puerto 5175 del frontend salvo para depuración de Vite, ya
que ahí las cookies de sesión de Sanctum no funcionan igual).

---

## Variables de entorno

Backend (`src/backend/.env`):

| Variable | Descripción |
|---|---|
| `APP_KEY` | Clave de cifrado de Laravel — generar con `php artisan key:generate` |
| `APP_URL` | URL base del backend (`http://localhost` en local) |
| `APP_DEBUG` | `true` en local para ver trazas de error completas |
| `DB_CONNECTION` | `mysql` en Docker (el `.env.example` trae `sqlite` por defecto, usado por el test suite) |
| `DB_HOST` | `db` — nombre del servicio Docker, resuelto por DNS interno |
| `DB_PORT` | `3306` (puerto interno del contenedor; el host lo expone en 3307) |
| `DB_DATABASE` | `troncodrilo` |
| `DB_USERNAME` / `DB_PASSWORD` | `troncodrilo` / `secret` (definidos también en `docker-compose.yml`) |
| `STRIPE_KEY` | Clave pública de Stripe (modo test: `pk_test_...`) |
| `STRIPE_SECRET` | Clave secreta de Stripe (modo test: `sk_test_...`) — nunca commitear |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook (`whsec_...`), necesario para validar `POST /api/stripe/webhook` |
| `FRONTEND_URL` | URL pública del frontend — usada para construir `success_url`/`cancel_url` de la Stripe Checkout Session |
| `SANCTUM_STATEFUL_DOMAINS` | Dominios que reciben cookies de sesión con Sanctum (`localhost` en local) |
| `SESSION_DOMAIN` | Dominio de la cookie de sesión (`localhost` en local) |

Frontend: no requiere `.env` propio en desarrollo — `baseURL` está fijado a
`http://localhost` directamente en `lib/axios.ts` (todo pasa por nginx).

> **Nunca subir `.env`, claves de Stripe reales ni credenciales al repositorio** (regla explícita de `AGENTS.md`).

---

## Comandos útiles

```bash
# Levantar / parar el entorno
docker compose up -d
docker compose down

# Migraciones y datos
docker compose exec backend php artisan migrate
docker compose exec backend php artisan migrate:fresh --seed   # reset completo
docker compose exec backend php artisan db:seed

# Tests
docker compose exec backend php artisan test
docker compose exec frontend npm run lint

# Comandos artisan a medida de este proyecto
docker compose exec backend php artisan stripe:sync-payment-intents
docker compose exec backend php artisan variants:migrate-size-to-attribute

# Logs en vivo
docker compose logs backend --tail=50 -f
docker compose logs frontend --tail=50 -f

# Reconstruir un servicio tras cambiar su Dockerfile/dependencias
docker compose up -d --build backend
docker compose up -d --build frontend

# Formateo backend (Pint) / build de producción frontend
docker compose exec backend ./vendor/bin/pint
docker compose exec frontend npm run build
```

---

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@troncodrilo.test` | `password` |

Creado por `AdminUserSeeder` (`firstOrCreate`, seguro de ejecutar varias veces).

**Tarjeta de prueba de Stripe** (modo test, cualquier fecha futura y CVC):

```
4242 4242 4242 4242
```

---

## API — resumen de endpoints

Base: `http://localhost/api` (todo pasa por nginx). Autenticación por cookie
de sesión Sanctum (`withCredentials: true`), no por header `Authorization`.

### Públicos (sin auth)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/register` | Crear cuenta |
| `POST` | `/login` | Iniciar sesión |
| `GET` | `/products` | Catálogo (listado + filtros) |
| `GET` | `/products/new` | Novedades |
| `GET` | `/products/{slug}` | Ficha de producto |
| `GET` | `/categories` | Categorías |
| `GET` | `/promotions/active` | Promociones vigentes |
| `GET` | `/artists`, `/artists/{artist}` | Listado y perfil de artista |
| `GET` | `/shipping-rates` | Tarifas de envío públicas |
| `GET` | `/banners` | Banners activos de la home |
| `GET` | `/collaborators` | Logos de colaboradores activos |
| `GET` | `/hero-slides` | Slides del hero activos |
| `POST` | `/newsletter/subscribe` | Suscripción al newsletter |
| `GET` | `/fanfics` | Fanfics aprobados (globo/mapa), paginado |
| `POST` | `/preorders` | Reservar producto agotado (auth opcional) |
| `POST` | `/stripe/webhook` | Webhook de Stripe (firmado, sin auth de usuario) |
| `GET` | `/health` | Healthcheck |

### Autenticados (`auth:sanctum`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/logout` | Cerrar sesión |
| `GET` | `/user` | Usuario autenticado |
| `PUT` | `/user/profile` | Editar perfil |
| `POST` | `/checkout` | Crear pedido + Stripe Checkout Session |
| `GET` | `/orders`, `/orders/{order}` | Pedidos del usuario |
| `POST` | `/orders/{order}/cancel` | Cancelar pedido propio |
| `POST` | `/orders/{order}/return` | Solicitar devolución |
| `GET` | `/user/returns` | Devoluciones del usuario |
| `POST` | `/upload-image` | Subir imagen (fanfic) |
| `GET` | `/fanfics/mine` | Fanfic propio |
| `POST` `/fanfics`, `PUT /fanfics/{fanfic}` | | Crear/editar el fanfic propio |

### Admin (`auth:sanctum` + `admin`, prefijo `/admin`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST/PUT/PATCH/DELETE` | `/products*`, `/products/{p}/variants*`, `/products/{p}/attributes*` | CRUD completo de catálogo, variantes y atributos |
| `POST/PUT/PATCH/DELETE` | `/artists*` | CRUD de artistas |
| `GET/PATCH` | `/fanfics*`, `/users/blocked`, `/users/{user}/unblock` | Moderación de fanfics y bloqueo de usuarios |
| `GET` | `/orders/stats`, `/orders/pending-count`, `/orders/export` | Métricas y export de pedidos |
| `GET/PUT` | `/orders`, `/orders/{order}`, `/orders/{order}/status`, `/orders/{order}/tracking` | Gestión de pedidos |
| `PUT` | `/orders/{order}/cancel` | Cancelación forzada por admin |
| `GET/PUT` | `/returns*` (`pending-count`, `export`, `approve`, `reject`, `receive`, `tracking`) | Gestión de devoluciones |
| `GET/PATCH` | `/preorders*` (`stats`, `export`, `notify`) | Gestión de la lista de espera |
| `POST/PUT/DELETE` | `/promotions*` | CRUD de promociones |
| `GET/POST/PUT/DELETE` | `/shipping-rates*`, `/banners*`, `/collaborators*`, `/hero-slides*` | Gestión de contenido/config |
| `GET` | `/newsletter/export`, `/newsletter/subscribers` | Suscriptores y export |
| `POST` | `/upload-video` | Subir vídeo (hero slides) |

---

## Metodología de desarrollo (SDD)

Este proyecto se construye con **Spec-Driven Development**: nada se
implementa sin una especificación previa aprobada.

- **`AGENTS.md`** — arnés de instrucciones para agentes de IA que trabajan en
  el repo: stack, comandos, estructura, convenciones de commits, reglas de
  "no hagas" (no instalar dependencias sin avisar, no tocar el esquema fuera
  de migraciones, no exponer endpoints admin sin middleware de rol, etc.) y
  flujo de trabajo (una tarea a la vez, proponer plan antes de tareas no
  triviales, seguir siempre la spec activa).
- **`spec/constitution/`** — misión del producto, stack técnico elegido y
  roadmap por fases (Fase 0 infraestructura, Fase 1 MVP tienda, Fase 2
  comunidad, Fase 3 mejoras UX/negocio).
- **`spec/features/NNN-nombre-feature/spec.md`** — un único archivo por
  feature numerada, con tres secciones:
  - `## Spec` — qué hace, criterios de aceptación (`- [x]`/`- [ ]`), fuera de alcance.
  - `## Plan` — desglose técnico backend/frontend y dependencias de otras features.
  - `## Tasks` — lista de tareas concretas marcadas como hechas o pendientes.

  Las features más recientes añaden además una sección de **notas de
  implementación**, documentando decisiones tomadas cuando el encargo
  original era ambiguo o tenía algún error.
- **`docs/NNN-nombre-feature.md`** — documentación técnica post-implementación:
  decisiones de diseño, *gotchas* de librerías/infra descubiertos, y en el
  caso de bugs, un archivo dedicado en `docs/bugs/`.
- **Convención de commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`,
  `refactor:` + descripción corta en imperativo, un commit por unidad lógica
  de cambio (nunca mezclar features en un commit).

Actualmente hay **23 features documentadas** (000 a 022); el `roadmap.md` de
la constitución solo detalla explícitamente hasta la feature 013 — las
features 014-022 se añadieron después como extensiones del producto, cada
una con su propia carpeta de spec completa.

---

## Decisiones técnicas destacadas

Recopilación de los *gotchas* y decisiones no obvias más relevantes,
extraídos de `docs/` y del propio código:

- **El backend siempre recalcula el total del pedido** — nunca confía en el
  precio/total enviado por el frontend; aplicado de forma consistente al
  precio base, promociones y variantes (`CheckoutController@store`).
- **Precios en céntimos enteros, nunca decimales de euro** — evita errores
  de redondeo con la API de Stripe (aplicado en todo el esquema y en
  `lib/currencies.ts`).
- **El cobro en Stripe siempre es en EUR** — el selector de 7 divisas es
  puramente visual/frontend; verificado que la feature de cambio de divisa
  no tocó ni una línea de backend.
- **`EnsureFrontendRequestsAreStateful` se registra manualmente** en
  `bootstrap/app.php` (`$middleware->prependToGroup('api', ...)`) — en
  Laravel 12 ya no viene aplicado por defecto al grupo `api` como en
  versiones anteriores con `Kernel.php`; sin este `prependToGroup` explícito,
  Sanctum trataría cada petición como no autenticada por cookie.
- **Vite se mantiene en la rama 5 (no 8)** por incompatibilidades conocidas
  de `react-globe.gl`/Three.js con versiones más recientes de Vite.
- **`storage/app` → `storage/app/private`** en Laravel 12: las rutas de
  almacenamiento por defecto cambiaron respecto a Laravel 11; relevante para
  cualquier código que construya paths de storage a mano en vez de usar los
  helpers de `Storage::`.
- **`usePolling: true` en la config de Vite** (`vite.config.ts`, intervalo
  500ms) — necesario para que el hot-reload funcione de forma fiable en
  bind mounts de Docker sobre Windows, donde `inotify` nativo no siempre
  detecta cambios del host.
- **`php artisan stripe:sync-payment-intents`** — comando idempotente para
  recuperar el `payment_intent_id` de pedidos creados antes de la feature
  014 (cancelaciones/devoluciones), que lo necesitan para poder reembolsarse
  vía Stripe.
- **ENUMs de MySQL ampliados con `DB::statement` en vez del Schema Builder**
  — Laravel no permite ampliar de forma fiable los valores de un `ENUM` ya
  existente con `Schema::table()`; `add_new_statuses_to_orders_table.php`
  hace un `ALTER TABLE ... MODIFY COLUMN` crudo, con `return` temprano en
  SQLite (motor de los tests, que no soporta `MODIFY COLUMN`).
- **`$table = 'return_status_history'`** explícito en el modelo — nombre
  singular, no sigue la pluralización automática de Laravel; tabla de
  auditoría inmutable (`$timestamps = false`, solo `created_at`).
- **Precedencia de precio**: `variant.price_override > promotion.discounted_price > product.price`, implementada de forma independiente y consistente en frontend y backend.
- **`pointer-events: none` en el canvas de `StarField`** — el fondo animado
  de estrellas de `/bola-troncodrilo` no debe interceptar clicks del globo
  3D que está por encima en el `z-index`.
- **`backgroundColor="rgba(0,0,0,0)"` en `react-globe.gl`** — necesario para
  que el canvas WebGL del globo sea transparente y se vea el `StarField` de
  fondo; documentado como frágil ante cambios de versión de la librería (si
  dejara de crear el renderer con `alpha: true` por defecto, el fondo del
  globo volvería a taparlo todo).
- **`$hidden` de Eloquent filtra por el nombre camelCase del método de
  relación**, no por la clave JSON snake_case — usar el nombre snake_case en
  `$hidden` no oculta la relación.
- **Instrument Serif como tipografía editorial** (`.font-editorial`) — el
  `@import` de Google Fonts debe preceder siempre a `@import "tailwindcss"`
  en `index.css`, o Vite lanza `[vite:css] @import must precede all other
  statements`.
- **`* { box-shadow: none !important }` global** en `index.css` desde el
  rediseño estético — cualquier `box-shadow` añadido en un componente nuevo
  es código muerto; el sistema de diseño usa `.btn-primary`/`.btn-secondary`/
  `.label-caps` como utilidades canónicas.

---

## Bugs conocidos

- **`docs/bugs/001-globe-fanfic-click.md`** — en `/bola-troncodrilo`, hacer
  click en un marker o cluster del globo 3D no abre el panel lateral de
  detalle del fanfic. **No resuelto**: el documento solo enumera hipótesis
  de causa sin confirmar (el canvas WebGL de Three.js podría interceptar los
  eventos de puntero antes de que lleguen a los `htmlElements` superpuestos,
  posible incompatibilidad de versión con Vite 5...). Prioridad media, no
  bloqueante — `/mapa-troncodrilo` (feature 022, Leaflet 2D) se añadió
  después como alternativa funcional para navegar los fanfics geolocalizados,
  y es la que se promueve en el menú principal; `/bola-troncodrilo` se
  mantiene accesible solo por URL directa, sin arreglar.

---

## Roadmap / features futuras

Pendientes explícitos recogidos en las secciones "Fuera de alcance" de las
specs (post-MVP, no implementados):

- **Notificaciones por email** — mencionado como pendiente en varias
  features (recuperación de contraseña, aviso de nuevo pedido al admin,
  aviso de stock disponible en preorders, notificación de devolución
  aprobada, notificación de promociones nuevas).
- **Integración con transportistas** — el seguimiento de paquetes (feature
  019) es enteramente manual (el admin introduce transportista/número a
  mano); pendiente: rastreo automático vía API de transportista, webhooks de
  estado, validación de formato del número de seguimiento.
- **Generación automática de combinaciones de variantes** — actualmente cada
  combinación de atributos (color × talla...) se crea manualmente; pendiente
  generar automáticamente el producto cartesiano de valores. También
  pendiente: compartir atributos entre productos.
- **Filtros de tienda por atributo/color** — referenciado como una posible
  "feature 015b" en la spec de variantes multidimensionales, nunca llegó a
  crearse como carpeta de spec propia.
- **Códigos de descuento / cupones** — excluidos explícitamente del MVP
  (`mission.md`); también pendiente extender las promociones a categorías
  enteras o a variantes específicas (esto último ya viable ahora que existe
  la feature 015).
- **SEO y metadatos** — no hay ninguna mención a SEO, meta tags, sitemap ni
  `robots.txt` en toda la documentación de `spec/`; vacío total, sin haberse
  planteado todavía.
- **Devoluciones — pendientes puntuales**: integración con transportista
  para generar la etiqueta de devolución, y bloqueo automático de
  solicitudes fuera del plazo legal de 14 días (hoy es una decisión manual
  del admin). Las devoluciones **parciales por artículo** ya están
  implementadas (no es un pendiente).
- **Otros pendientes post-MVP detectados en las specs**: reviews de
  producto, lista de deseos / carrito persistente multi-dispositivo para
  invitados, dashboard propio para que el artista gestione su perfil sin
  pasar por admin, comentarios/votos en fanfics, menú mega-dropdown por
  categorías, barra de búsqueda en el header, subida de avatar de perfil,
  tasas de cambio de divisa en tiempo real vía API externa y detección
  automática de divisa por geolocalización/idioma, gráficos embebidos en los
  exports Excel, botón de exportar devoluciones en el frontend (el endpoint
  ya existe).
