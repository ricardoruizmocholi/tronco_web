# 028 — Plan

Decisiones de la spec confirmadas con los valores por defecto propuestos:
`platform` único = clave de icono; sin validar dominio; máx. 12 enlaces,
plataforma repetible; throttle 60/min por IP (admin y público).

## Backend
1. Migración `social_links` + modelo `SocialLink` (`PLATFORMS`, `MAX_LINKS`).
2. Form Requests: `SocialLinkRequest` (alta/edición) y `ReorderSocialLinksRequest`.
3. `SocialLinkController::publicIndex` y `AdminSocialLinkController`
   (index, store, update, toggle, destroy, reorder).
4. Limitadores `admin-social` y `public-read` en `AppServiceProvider`;
   rutas en `routes/api.php` (`reorder` antes de `{socialLink}`).
5. `SocialLinkSeeder` (no registrado en `DatabaseSeeder`).
6. `tests/Feature/SocialLinkTest.php`.

## Frontend
1. `types/socialLink.ts` + `api/socialLinks.ts`.
2. `components/SocialIcon.tsx` (mapa platform → SVG inline).
3. `Footer.tsx`: bloque de iconos bajo el tagline, oculto si no hay activas.
4. `pages/admin/AdminSocialLinksPage.tsx`, ruta en `App.tsx`, entrada en `adminNav.tsx`.

## Verificación
`php artisan test` (comparado con el baseline de 19 fallos), `eslint`,
`vite build`, QA manual con Playwright.
