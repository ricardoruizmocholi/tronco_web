# 010 — Perfil de usuario

## Spec

### Qué hace
Página `/perfil` donde el usuario autenticado puede ver y editar sus datos
personales, cambiar su contraseña, consultar su historial de compras y
acceder directamente a su fanfic.

### Criterios de aceptación
- [ ] El usuario autenticado accede a `/perfil` desde un link en el header
- [ ] La página muestra nombre y email actuales del usuario
- [ ] El usuario puede actualizar su nombre
- [ ] El usuario puede cambiar su contraseña (requiere contraseña actual + nueva + confirmación)
- [ ] Si la contraseña actual es incorrecta, el backend devuelve error claro
- [ ] El perfil muestra el historial de compras con fecha, estado e importe de cada pedido
- [ ] Al hacer click en un pedido, se muestra el detalle (productos, cantidades, dirección, envío)
- [ ] Hay un acceso directo a `/mi-fanfic` desde el perfil
- [ ] Un usuario no autenticado que accede a `/perfil` es redirigido al login

### Fuera de alcance
- Subida de avatar/foto de perfil (post-MVP)
- Notificaciones de email desde el perfil (feature 010)

---

## Plan

### Backend
- Endpoint `PUT /api/user/profile`: actualiza `name`; valida `current_password` antes de cambiar contraseña
- Endpoint `GET /api/orders` ya existe; asegurar que devuelve `shipping_address` y `shipping_cost`
- Endpoint `GET /api/orders/{id}` ya existe; asegurar que devuelve items con nombre y precio

### Frontend
- `ProfilePage.tsx`: formulario de datos personales + sección cambio de contraseña
- `ProfileOrdersSection.tsx`: lista de pedidos con acordeón para ver detalle
- Link "Mi perfil" en `Header.tsx` (menú de usuario autenticado)
- Ruta `/perfil` protegida con `ProtectedRoute`
- `api/user.ts`: función `updateProfile({ name?, current_password?, password?, password_confirmation? })`

### Dependencia
Requiere `001-autenticacion` y `004-checkout-stripe` (para el historial de pedidos).

---

## Tasks

1. [ ] Endpoint `PUT /api/user/profile` con validación de contraseña actual
2. [ ] `api/user.ts`: función `updateProfile`
3. [ ] `ProfilePage.tsx`: sección datos personales con feedback de éxito/error
4. [ ] `ProfilePage.tsx`: sección cambio de contraseña
5. [ ] `ProfilePage.tsx`: historial de pedidos con detalle en acordeón
6. [ ] `ProfilePage.tsx`: acceso directo a `/mi-fanfic`
7. [ ] Link "Mi perfil" en Header para usuario autenticado
8. [ ] Ruta `/perfil` en `App.tsx` con `ProtectedRoute`
9. [ ] Verificar los 9 criterios de aceptación
