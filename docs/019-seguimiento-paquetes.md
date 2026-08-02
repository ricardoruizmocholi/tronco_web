# 019 — Seguimiento de Paquetes

## Resumen

Añade seguimiento manual de paquetes a pedidos y devoluciones. No hay integración con
transportistas: el admin introduce a mano el número de seguimiento y, opcionalmente, la URL de
rastreo (que se puede autogenerar según el transportista elegido). El cliente lo ve en `/perfil`,
tanto en el historial de pedidos (seguimiento del envío) como en el estado de sus devoluciones
(seguimiento del paquete que él mismo envía de vuelta).

---

## Archivos creados

**Backend**

| Archivo | Descripción |
|---------|-------------|
| `database/migrations/2026_08_02_090000_add_tracking_to_orders_table.php` | `tracking_number`, `tracking_url`, `carrier`, `tracking_updated_at` en `orders` |
| `database/migrations/2026_08_02_090001_add_tracking_to_return_requests_table.php` | `return_tracking_number`, `return_tracking_url`, `return_carrier`, `return_tracking_updated_at` en `return_requests` |

**Frontend**

| Archivo | Descripción |
|---------|-------------|
| `src/lib/trackingCarriers.ts` | Lista de transportistas soportados + `buildTrackingUrl(carrier, number)` |
| `src/components/TrackingPanel.tsx` | Formulario/vista de seguimiento reutilizado en los modales de `AdminOrdersPage` y `AdminReturnsPage` (prop `variant: 'rounded' \| 'flat'` para encajar en el estilo de cada página) |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/Models/Order.php` | Los 4 campos de tracking en `$fillable`; `tracking_updated_at` en `casts()` |
| `app/Models/ReturnRequest.php` | Los 4 campos `return_tracking_*` en `$fillable`; `return_tracking_updated_at` en `casts()` |
| `app/Http/Controllers/AdminOrderController.php` | `updateTracking()`; los 4 campos añadidos al array `$data` de `show()` |
| `app/Http/Controllers/AdminReturnController.php` | `updateTracking()` |
| `routes/api.php` | `PUT /api/admin/orders/{order}/tracking`, `PUT /api/admin/returns/{return}/tracking` |
| `src/types/order.ts` | 4 campos de tracking en `Order` |
| `src/types/adminOrder.ts` | 4 campos de tracking en `AdminOrderDetail` |
| `src/types/returnRequest.ts` | 4 campos `return_tracking_*` en `ReturnRequest` |
| `src/api/adminOrders.ts` | `updateOrderTracking(id, payload)` |
| `src/api/returns.ts` | `updateReturnTracking(id, payload)` |
| `src/pages/admin/AdminOrdersPage.tsx` | `TrackingPanel` al final del modal de detalle de pedido |
| `src/pages/admin/AdminReturnsPage.tsx` | `TrackingPanel` al final del modal de detalle de devolución, condicionado al estado |
| `src/components/ProfileOrdersSection.tsx` | Bloque de seguimiento de envío por pedido + bloque de seguimiento de vuelta junto al estado de la devolución |

---

## URLs de tracking por transportista

Definidas en `src/lib/trackingCarriers.ts`. `{number}` se sustituye por el número de seguimiento
(`encodeURIComponent`):

| Transportista | Plantilla de URL |
|---|---|
| Correos | `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?referencia={number}` |
| MRW | `https://www.mrw.es/seguimiento_envios/MRWenvio.asp?Expedicion={number}` |
| SEUR | `https://www.seur.com/livetracking/?segOnlineIdentificador={number}` |
| DHL | `https://www.dhl.com/es-es/home/tracking.html?tracking-id={number}` |
| GLS | `https://gls-group.eu/ES/es/seguimiento-envio?match={number}` |
| Otro | Sin plantilla — el admin debe rellenar la URL a mano si quiere ofrecer un link |

La URL solo se autogenera si el admin deja el campo "URL de seguimiento" vacío al guardar; si
escribe algo, esa URL manual tiene prioridad y se guarda tal cual (permite sobreescribir incluso
para transportistas con plantilla conocida).

### Cómo añadir un nuevo transportista

1. Añadir una entrada al array `CARRIERS` en `src/lib/trackingCarriers.ts`:
   ```ts
   { value: 'Nacex', label: 'Nacex', urlTemplate: 'https://.../{number}' }
   ```
2. Nada más — `TrackingPanel` (usado en ambos paneles admin) lee `CARRIERS` dinámicamente para el
   `<select>` y para `buildTrackingUrl()`. No hace falta tocar backend: `carrier`/`return_carrier`
   son `string` libre en BD, no un enum.

---

## Flujo completo desde el punto de vista del usuario

**Seguimiento de un pedido enviado**
1. El admin marca un pedido como `shipped` desde `/admin/pedidos` (Feature 011).
2. En el mismo modal de detalle, en la sección "Seguimiento", el admin elige transportista,
   escribe el número de seguimiento y guarda (la URL se autogenera si la deja vacía).
3. El cliente entra a `/perfil` → "Mis pedidos", despliega el pedido y ve el bloque "Seguimiento"
   con el transportista, el número y el botón "Rastrear paquete →", que abre la URL en una pestaña
   nueva. Si el admin no puso URL (o el transportista es "Otro" sin URL), solo ve el número.
4. Si el pedido no tiene tracking todavía, no se muestra nada en esa zona del acordeón — nunca un
   "sin seguimiento" que distraiga.

**Seguimiento de un paquete de vuelta (devolución)**
1. El cliente solicita una devolución (Feature 014) y el admin la aprueba desde
   `/admin/devoluciones` (`return_approved`).
2. A partir de ese momento, el modal de detalle de la devolución muestra la sección "Seguimiento
   del paquete de vuelta" (antes de `approved` no tiene sentido: el cliente aún no ha enviado
   nada). El admin la rellena si el cliente le pasa el número por otro canal (email, etc.).
3. El cliente ve en `/perfil` → "Mis pedidos", bajo el estado de la devolución, el texto "Tu número
   de seguimiento del envío de vuelta: XXXX" y un link "Rastrear →" si hay URL.

---

## Decisiones técnicas

### 1. Un solo `TrackingPanel` compartido entre pedidos y devoluciones
Ambos paneles admin necesitan exactamente el mismo comportamiento (formulario si no hay datos,
vista + "Editar" si ya hay, autogeneración de URL, copiar número). En vez de duplicarlo, el
componente recibe un `onSave` normalizado (`{ number, url, carrier }`) y cada página lo traduce a
los nombres de campo reales de su API (`tracking_number` vs `return_tracking_number`, etc.) dentro
del callback. El componente no sabe si está mostrando un pedido o una devolución.

### 2. `variant: 'rounded' | 'flat'` en vez de imponer un estilo único
`AdminOrdersPage` usa esquinas redondeadas (`rounded-xl`/`rounded-2xl`) en todo su modal;
`AdminReturnsPage` usa el sistema editorial de esquinas rectas. Como son dos lenguajes visuales ya
existentes en el repo (no introducidos por esta feature), `TrackingPanel` acepta una variante que
solo cambia el radio de borde de inputs/botones, para no desentonar en ninguna de las dos páginas.

### 3. `carrier` / `return_carrier` como `string` libre, no `enum`
La lista de transportistas vive solo en el frontend (`trackingCarriers.ts`). El backend no valida
contra una lista cerrada — solo exige `string|max:255`. Esto es intencional: añadir un
transportista nuevo no requiere migración ni tocar el backend (ver "Cómo añadir un nuevo
transportista" arriba), y el campo "Otro" no necesita un valor especial.

### 4. La URL se resuelve en el frontend antes de guardar, no en el backend
`buildTrackingUrl()` corre en `TrackingPanel` al pulsar "Guardar seguimiento": si el campo URL está
vacío, calcula la URL a partir del transportista y el número, y esa es la URL que viaja al backend
y se persiste. El backend solo guarda lo que recibe — no conoce las plantillas por transportista.
Ventaja: si el admin cambia de idea y quiere ver qué URL se generaría antes de guardar, el
placeholder del campo ya se lo muestra en vivo.

### 5. `GET /api/orders`, `GET /api/orders/{order}` y `GET /api/user/returns` sin cambios
`OrderController` y `ReturnRequestController` serializan los modelos Eloquent directamente
(`response()->json($model)` / `->get()`), y ni `Order` ni `ReturnRequest` tienen `$hidden`. En
cuanto los 4 campos de tracking se añadieron a `$fillable` (y existen en la tabla), aparecen solos
en la respuesta JSON — no hizo falta tocar esos dos controladores.

### 6. Visibilidad del panel de devoluciones: `approved`, `received`, `refunded`
El encargo original hablaba de los estados `return_approved`/`return_received`/`refunded` del
**pedido**, pero el modal de `AdminReturnsPage` trabaja sobre `ReturnRequest.status`, cuyo enum real
es `pending/approved/rejected/received/refunded` (sin prefijo `return_`). Se usó el equivalente
directo sobre ese campo — son los mismos tres estados semánticos, aplicados al campo que el
componente realmente tiene disponible.

---

## Cómo probar manualmente

1. **Pedido sin tracking**: abrir cualquier pedido en `/admin/pedidos` → la sección "Seguimiento"
   muestra el formulario vacío.
2. **Guardar tracking con URL autogenerada**: elegir "Correos", escribir un número, dejar la URL
   vacía, guardar → recargar el modal (cerrar y volver a abrir) y comprobar que la URL guardada
   sigue la plantilla de Correos con el número correcto.
3. **Guardar tracking con URL manual**: elegir "Otro", escribir número y una URL cualquiera →
   guardar → la URL guardada es exactamente la escrita.
4. **Editar tracking existente**: con un pedido que ya tiene tracking, pulsar "Editar", cambiar el
   número, guardar → los datos mostrados (número, fecha de actualización) se actualizan sin recargar
   la página.
5. **Copiar número**: pulsar el icono de copiar junto al número — debe copiarse al portapapeles
   (aparece brevemente "Copiado").
6. **`/perfil` con tracking**: como usuario dueño del pedido, entrar a `/perfil` → "Mis pedidos",
   desplegar el pedido con tracking → debe verse transportista + número + "Rastrear paquete →" que
   abre la URL en pestaña nueva.
7. **`/perfil` sin tracking**: un pedido sin tracking no debe mostrar ningún bloque de seguimiento
   en su acordeón.
8. **Devolución — visibilidad condicionada**: abrir una devolución en `pending` en
   `/admin/devoluciones` → la sección "Seguimiento del paquete de vuelta" NO debe aparecer.
   Aprobarla → al reabrir el detalle, la sección sí aparece.
9. **Devolución — tracking visible en perfil**: guardar un `return_tracking_number` en una
   devolución aprobada → el usuario dueño del pedido debe ver en `/perfil` el texto "Tu número de
   seguimiento del envío de vuelta: …" bajo el estado de la devolución.
10. **`php artisan test`**: sin fallos nuevos respecto al estado previo a esta feature.

---

## Gotchas y notas futuras

- **Sin validación de formato por transportista**: el backend acepta cualquier string como número
  de seguimiento; no se comprueba que tenga el formato esperado por Correos/SEUR/etc. (fuera de
  alcance, ver spec).
- **Sin notificación al cliente**: añadir o actualizar un tracking no dispara ningún email — el
  cliente solo lo ve si entra a `/perfil`. Post-MVP razonable si se necesita avisar activamente.
- **`return_tracking_*` no se limpia si se rechaza una devolución después de tener tracking**: en la
  práctica no debería ocurrir (el tracking de vuelta solo se añade a partir de `approved`, y un
  rechazo posterior a eso no está contemplado en el flujo de `AdminReturnController`), pero si algún
  día se permite rechazar una devolución ya aprobada, los campos de tracking quedarían huérfanos en
  el registro — no afecta a nada visible porque la sección deja de mostrarse fuera de
  `approved/received/refunded`.
- **`carrier` libre invita a inconsistencias de nombre** (p. ej. "correos" vs "Correos") si en el
  futuro se quisiera filtrar/agrupar pedidos por transportista — hoy no hay ningún filtro de ese
  tipo, así que no es un problema real todavía, pero si se añade habría que normalizar el valor
  guardado (o migrar a un `select` estricto en vez de aceptar cualquier string).
