# 011 — Panel de pedidos admin

## Spec

### Qué hace
Panel de administración de pedidos en `/admin/pedidos` con tabla filtrable,
detalle de cada pedido, cambio de estado, badge de nuevos pedidos y
sección de métricas mensuales. Incluye exportación a Excel.

### Criterios de aceptación
- [ ] El admin ve una tabla paginada de todos los pedidos
- [ ] La tabla es filtrable por estado, rango de fechas, usuario e importe mínimo/máximo
- [ ] Al hacer click en un pedido, se muestra el detalle completo (productos, cantidades, precios, dirección de envío, coste de envío, total)
- [ ] El admin puede cambiar el estado del pedido (pending → paid → shipped → cancelled)
- [ ] Aparece un badge con el número de pedidos nuevos (pagados en las últimas 24h) en la card del dashboard y en el menú
- [ ] Se puede exportar la lista actual de pedidos a Excel (.xlsx) respetando los filtros activos
- [ ] La sección de métricas muestra: ingresos totales del mes, número de pedidos, producto más vendido
- [ ] Los cambios de estado se reflejan en tiempo real sin recargar la página

### Fuera de alcance
- Notificaciones push/email al admin cuando llega un pedido (feature separada)
- Devoluciones y reembolsos desde el panel (requiere integración adicional con Stripe)

---

## Plan

### Backend
- Endpoint `GET /api/admin/orders`: listado con filtros (status, date_from, date_to, user_search, min_total, max_total), paginación con cursor
- Endpoint `PATCH /api/admin/orders/{order}/status`: cambio de estado con validación de transiciones válidas
- Endpoint `GET /api/admin/orders/metrics`: ingresos del mes, número de pedidos, producto más vendido
- Endpoint `GET /api/admin/orders/export`: devuelve CSV/Excel con los filtros activos
- Nuevo `AdminOrderController`

### Frontend
- `AdminOrdersPage.tsx`: tabla con filtros, paginación y click para ver detalle
- `AdminOrderDetailModal.tsx`: modal con detalle completo del pedido
- `AdminOrderMetrics.tsx`: cards de ingresos, pedidos y producto top
- Badge en `AdminDashboardPage` y en el menú lateral mostrando pedidos nuevos
- `api/adminOrders.ts`: funciones de listado, detalle, cambio de estado, métricas y exportación
- Librería para exportar Excel: `xlsx` (SheetJS)

### Dependencia
Requiere `004-checkout-stripe` (modelo `Order` y webhook funcionando).

---

## Tasks

1. [ ] `AdminOrderController@index` con filtros y paginación
2. [ ] `AdminOrderController@updateStatus` con validación de transiciones
3. [ ] `AdminOrderController@metrics`
4. [ ] `AdminOrderController@export` (CSV o XLSX)
5. [ ] Rutas admin para pedidos en `api.php`
6. [ ] `api/adminOrders.ts`: funciones de API
7. [ ] `AdminOrdersPage.tsx`: tabla con filtros
8. [ ] `AdminOrderDetailModal.tsx`: detalle de pedido
9. [ ] `AdminOrderMetrics.tsx`: sección de métricas
10. [ ] Badge de pedidos nuevos en dashboard y menú
11. [ ] Exportación a Excel desde el panel
12. [ ] Verificar los 8 criterios de aceptación
