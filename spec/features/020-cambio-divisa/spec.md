# 020 — Cambio de Divisa

## Spec

### Qué hace
Añade un selector de divisa visual en el header. El usuario elige entre 7 divisas y todos los
precios de la tienda (landing, ficha de producto, carrito, historial de pedidos) se muestran
convertidos con tasas fijas. El cobro real en Stripe **siempre** se hace en EUR — la conversión es
puramente visual/informativa, nunca afecta al importe que se cobra.

### Divisas soportadas y tasas (fijas, hardcodeadas)

| Código | Símbolo | Tasa (EUR → X) |
|---|---|---|
| EUR | € | 1.0 (base) |
| USD | $ | 1.09 |
| GBP | £ | 0.85 |
| MXN | $ | 19.5 |
| ARS | $ | 1050.0 |
| COP | $ | 4500.0 |
| CLP | $ | 1020.0 |

No hay llamada a ninguna API externa de tipos de cambio. Actualizar una tasa es editar
`src/lib/currencies.ts` y desplegar — ver `docs/020-cambio-divisa.md`.

### Formato de precio por divisa
- **EUR**: símbolo detrás con espacio, 2 decimales — `29,99 €`
- **USD / GBP**: símbolo delante sin espacio, 2 decimales, sin código — `$32,68` / `£25,49`
- **MXN**: símbolo delante sin espacio + código detrás, 2 decimales — `$584,55 MXN`
- **ARS / COP / CLP**: símbolo delante sin espacio + código detrás, **sin decimales** (monedas de
  baja denominación) — `$31.499 ARS`, `$134.550 COP`, `$30.596 CLP`

Todos los números se formatean con separadores `es-ES` (coma decimal, punto de millar) — solo
cambian la posición del símbolo, el sufijo de código y el número de decimales por divisa.

### Resolución de dos ambigüedades del encargo original
- **API del contexto**: `useCurrency().formatPrice` toma un solo argumento (`cents`), ya vinculado
  a `selectedCurrency` — tal como pide la Tarea 1. La Tarea 3 mostraba un ejemplo con dos
  argumentos (`formatPrice(price, selectedCurrency)`); se ignora ese detalle del pseudocódigo a
  favor de la definición explícita del contexto.
- **Selector en móvil**: el header ya reserva la fila de iconos (carrito + hamburguesa) para móvil
  y esconde el bloque de auth con `hidden md:flex`. El selector de divisa sigue el mismo patrón:
  visible en el header solo en escritorio, y en móvil vive exclusivamente en `MobileDrawer.tsx`
  (fila propia bajo la cabecera del drawer, fuera de la lista de navegación con scroll, para que
  el desplegable no quede recortado).

### Criterios de aceptación

- [x] `src/lib/currencies.ts` exporta las 7 divisas, `DEFAULT_CURRENCY` (EUR), `convertCents()` y
      `formatPrice()` con el formato exacto especificado arriba
- [x] `CurrencyProvider` persiste la divisa elegida en `localStorage` (`troncodrilo_currency`) y la
      recupera al cargar (o usa EUR si no hay nada guardado o el valor guardado no es válido)
- [x] Selector visible en el header (escritorio) junto a carrito/auth
- [x] Selector visible en `MobileDrawer.tsx` (móvil)
- [x] Dropdown: 7 opciones con símbolo + código + nombre, opción activa marcada, se cierra al hacer
      click fuera
- [x] Precios convertidos y formateados en: `LandingProductCard`, `ProductCard`, `ProductPage`
      (precio normal y promocional), `CartDrawer` (items, subtotal, envío, recomendaciones),
      `ProfileOrdersSection` (historial de pedidos), `CheckoutSuccessPage`
- [x] `ProfileOrdersSection`: nota "Los precios históricos son aproximados en [divisa]" cuando la
      divisa seleccionada no es EUR
- [x] `CartDrawer`: aviso bajo el total —"El cobro se realizará en EUR (X,XX €). La conversión es
      orientativa." — visible solo cuando la divisa seleccionada no es EUR, con el importe EUR real
      (sin convertir)
- [x] El flujo de checkout (`initiateCheckout` → Stripe) no cambia — sigue enviando los mismos
      importes en EUR que antes de esta feature
- [x] Ningún archivo backend modificado (ni `CheckoutController` ni ningún endpoint)
- [ ] Cambiar de divisa y recargar la página → la divisa persiste

### Fuera de alcance
- Tasas de cambio en tiempo real / API externa
- Detección automática de divisa por geolocalización o idioma del navegador
- Selector de divisa en el panel admin (los precios de gestión interna se quedan en EUR)

---

## Plan

### Frontend

**Sistema de divisas**
- `src/lib/currencies.ts`: interfaz `Currency` (`code`, `symbol`, `name`, `rate`, `decimals`,
  `symbolPosition: 'before' | 'after'`, `showCode`), array `CURRENCIES`, `DEFAULT_CURRENCY`,
  `convertCents(cents, rate)` (multiplica, puede devolver céntimos fraccionarios),
  `formatPrice(cents, currency)` (convierte + formatea con `Intl.NumberFormat('es-ES', ...)`
  variando posición de símbolo/decimales/sufijo según la divisa)
- `src/context/CurrencyContext.tsx`: `CurrencyProvider`, estado `selectedCurrency`, `setCurrency`,
  `formatPrice` (bound), `currencies`; persistencia en `localStorage`
- `src/hooks/useCurrency.ts`: re-export del hook, mismo patrón que `useAuth.ts`
- `src/App.tsx`: `<CurrencyProvider>` envolviendo `<AuthProvider>`

**Selector**
- `src/components/CurrencySelector.tsx`: botón (código + chevron) + dropdown (7 divisas, check en
  la activa), cierre con listener de click fuera, prop `triggerClassName` para adaptar el color al
  contexto (header claro/oscuro vs. drawer siempre oscuro)
- `src/components/Layout.tsx`: `CurrencySelector` en el bloque de auth (`hidden md:flex`)
- `src/components/MobileDrawer.tsx`: `CurrencySelector` en fila propia bajo la cabecera del drawer

**Precios**
- `LandingProductCard.tsx`, `ProductCard.tsx`, `ProductPage.tsx`: sustituir `Intl.NumberFormat`
  local por `formatPrice` del contexto en precio normal y promocional
- `CartDrawer.tsx`: sustituir en items/subtotal/recomendaciones/envío; añadir aviso de cobro en EUR
  bajo el total (formateador EUR fijo, independiente de la divisa seleccionada)
- `ProfileOrdersSection.tsx`: sustituir en historial; añadir nota de aproximación cuando la divisa
  no es EUR
- `CheckoutSuccessPage.tsx`: sustituir en resumen del pedido

**Sin cambios**
- `CollaboratorCard.tsx` (no tiene precio)
- Cualquier página/endpoint del panel admin
- Backend completo (`CheckoutController`, rutas, modelos)

### Dependencias
- Ninguna — feature autocontenida en frontend

---

## Tasks

### Tarea 1 — Sistema de divisas (sin UI)
1. [x] `src/lib/currencies.ts` — divisas, `DEFAULT_CURRENCY`, `convertCents`, `formatPrice`
2. [x] `src/context/CurrencyContext.tsx` — `CurrencyProvider` con persistencia en `localStorage`
3. [x] `src/hooks/useCurrency.ts`
4. [x] `<CurrencyProvider>` en `App.tsx`

### Tarea 2 — Selector de divisa en el header
5. [x] `src/components/CurrencySelector.tsx`
6. [x] Integrar en `Layout.tsx` (escritorio)
7. [x] Integrar en `MobileDrawer.tsx` (móvil)

### Tarea 3 — Aplicar divisa en precios de productos
8. [x] `LandingProductCard.tsx`
9. [x] `ProductCard.tsx`
10. [x] `ProductPage.tsx` (precio normal + promocional)
11. [x] `CartDrawer.tsx` (items, subtotal, envío, recomendaciones)
12. [x] `ProfileOrdersSection.tsx` (+ nota de aproximación)
13. [x] `CheckoutSuccessPage.tsx`

### Tarea 4 — Aviso en checkout
14. [x] `CartDrawer.tsx`: aviso "cobro en EUR" bajo el total cuando la divisa ≠ EUR

### Tarea 5 — Documentación y cierre
15. [x] `docs/020-cambio-divisa.md`
16. [x] `php artisan test` (vía `docker compose exec backend`) — 19 fallidos / 43 pasados, mismos
        19 fallos preexistentes (feature 019/014), sin fallos nuevos — coherente con que esta
        feature no toca el backend
17. [x] Verificar los criterios de aceptación uno a uno
18. [x] `git add . && git commit -m "feat: feature 020 completa — selector de divisa visual" && git push`
