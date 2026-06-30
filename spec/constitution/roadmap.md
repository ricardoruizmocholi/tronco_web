# Roadmap de Features

Orden recomendado de implementación. Cada feature tiene su carpeta en
`spec/features/NNN-nombre/` con `spec.md` (incluye Specify + Plan + Tasks).

## Fase 0 — Infraestructura base
- 000-infraestructura-docker: Docker Compose, Nginx, conexión React-Laravel-MySQL funcionando
  - Estado: backend, frontend y db levantados y comunicándose por red Docker.
    Pendiente: Nginx, conexión Laravel↔MySQL verificada con migración, Axios apuntando al backend.

## Fase 1 — MVP Tienda
- 001-autenticacion: registro/login con Sanctum, roles (user/admin)
- 002-catalogo-productos: modelo de productos, categorías, listado y ficha de producto
- 003-carrito: carrito de compra (frontend + persistencia backend)
- 004-checkout-stripe: checkout, integración Stripe Checkout + webhooks, pedidos

## Fase 2 — Comunidad
- 005-artistas-colaboradores: CRUD de artistas, apartado público de perfiles
- 006-bola-troncodrilo: mapa interactivo, subida de fanfic (1 por usuario), flujo de moderación admin

## Fase 3 — Mejoras post-MVP (no incluidas en el MVP inicial)
- 007-panel-admin-completo: dashboard de ventas, gestión de stock
- 008-cupones-descuentos
- 009-reviews-productos
- 010-notificaciones-email (pedido confirmado, fanfic aprobado/rechazado)

## Criterio de avance
No se empieza una feature de Fase 1+ sin que la Fase 0 esté verificada
(los servicios levantan y se comunican correctamente, incluida la
conexión Laravel↔MySQL). No se empieza Fase 2 sin que el checkout con
Stripe funcione end-to-end en modo test.