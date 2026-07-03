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

## Fase 3 — Mejoras UX y negocio
- 007-navegacion-responsive: header hide/show en scroll, menú hamburguesa, drawer lateral en móvil
- 008-tallas-productos: variantes de talla con stock independiente, selector en ficha y carrito
- 009-home-banners-colaboradores: hero banner editable desde admin, sección colaboradores con logos
- 010-perfil-usuario: página /perfil con datos, cambio de contraseña e historial de pedidos
- 011-panel-pedidos-admin: tabla filtrable, detalle, cambio de estado, métricas mensuales y exportación Excel
- 012-preorder-lista-espera: reserva de productos agotados, lista de espera gestionable desde admin
- 013-fondo-espacial-bola: StarField canvas con parpadeo y parallax en /bola-troncodrilo

## Criterio de avance
No se empieza una feature de Fase 1+ sin que la Fase 0 esté verificada
(los servicios levantan y se comunican correctamente, incluida la
conexión Laravel↔MySQL). No se empieza Fase 2 sin que el checkout con
Stripe funcione end-to-end en modo test.