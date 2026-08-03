# 020 — Cambio de Divisa

## Resumen

Selector de divisa visual en el header (escritorio) y en `MobileDrawer.tsx` (móvil). El usuario
elige entre 7 divisas con tasas fijas hardcodeadas — sin API externa — y todos los precios visibles
en la tienda, ficha de producto, carrito, historial de pedidos y confirmación de compra se muestran
convertidos. El cobro real en Stripe **siempre** es en EUR: la conversión es puramente visual, no
toca el backend en ningún punto de esta feature.

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/lib/currencies.ts` | `Currency`, `CURRENCIES` (7 divisas), `DEFAULT_CURRENCY`, `convertCents()`, `formatPrice()` |
| `src/context/CurrencyContext.tsx` | `CurrencyProvider`, persistencia en `localStorage` |
| `src/hooks/useCurrency.ts` | Re-export del hook (mismo patrón que `useAuth.ts`) |
| `src/components/CurrencySelector.tsx` | Botón (código + chevron) + dropdown de 7 divisas, reutilizado en header y drawer |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | `<CurrencyProvider>` envolviendo `<AuthProvider>` |
| `src/components/Layout.tsx` | `CurrencySelector` en el bloque de auth (`hidden md:flex`) |
| `src/components/MobileDrawer.tsx` | `CurrencySelector` en fila propia bajo la cabecera del drawer |
| `src/components/LandingProductCard.tsx` | Precio (normal y promocional) vía `formatPrice()` |
| `src/components/ProductCard.tsx` | Precio (normal y promocional) vía `formatPrice()` |
| `src/pages/ProductPage.tsx` | Precio (normal y promocional) vía `formatPrice()` |
| `src/components/CartDrawer.tsx` | Precio de items, subtotal, envío, recomendaciones vía `formatPrice()`; aviso de cobro en EUR bajo el total |
| `src/components/ProfileOrdersSection.tsx` | Precio de items y total del pedido vía `formatPrice()`; nota de aproximación |
| `src/pages/checkout/CheckoutSuccessPage.tsx` | Precio de items y total vía `formatPrice()` |

**Sin cambios**: `CollaboratorCard.tsx` (no tiene precio), ningún archivo del panel admin, backend
completo (`CheckoutController`, rutas, modelos).

---

## Cómo actualizar las tasas de conversión

Editar el array `CURRENCIES` en `src/lib/currencies.ts` y cambiar el campo `rate` de la divisa que
corresponda:

```ts
{
  code: 'USD',
  symbol: '$',
  name: 'Dólar estadounidense',
  rate: 1.09,   // ← EUR → USD. Cambiar aquí y desplegar.
  decimals: 2,
  symbolPosition: 'before',
  showCode: false,
},
```

No hace falta tocar ningún otro archivo — todos los componentes leen la tasa a través del contexto,
nunca la hardcodean. No hay caché ni build step adicional: el cambio se aplica en el siguiente
despliegue del frontend.

## Cómo añadir una nueva divisa

1. Añadir una entrada al array `CURRENCIES` en `src/lib/currencies.ts`:
   ```ts
   {
     code: 'BRL',
     symbol: 'R$',
     name: 'Real brasileño',
     rate: 5.9,             // EUR → BRL
     decimals: 2,           // 0 si es una moneda de baja denominación
     symbolPosition: 'before',
     showCode: true,        // true si el símbolo por sí solo es ambiguo
   },
   ```
2. Nada más. `CurrencySelector` (dropdown), `CurrencyContext` (persistencia/validación) y
   `formatPrice()` leen `CURRENCIES` dinámicamente — ningún componente tiene la lista de divisas
   hardcodeada aparte de este archivo.

## Formato de precio por divisa

`formatPrice()` combina tres cosas por divisa: posición del símbolo (`before`/`after`), número de
decimales, y si añade el código como sufijo (necesario cuando el símbolo `$` es compartido por
varias divisas). El número en sí siempre usa separadores `es-ES` (coma decimal, punto de millar),
solo cambia el resto:

| Divisa | Ejemplo | Config |
|---|---|---|
| EUR | `29,99 €` | símbolo detrás, 2 decimales, sin código |
| USD | `$32,68` | símbolo delante, 2 decimales, sin código |
| GBP | `£25,49` | símbolo delante, 2 decimales, sin código |
| MXN | `$584,55 MXN` | símbolo delante, 2 decimales, con código |
| ARS | `$31.499 ARS` | símbolo delante, **0 decimales**, con código |
| COP | `$134.550 COP` | símbolo delante, **0 decimales**, con código |
| CLP | `$30.596 CLP` | símbolo delante, **0 decimales**, con código |

## Dónde se usa `formatPrice`

Vía `const { formatPrice } = useCurrency()`:

- `LandingProductCard.tsx` — precio normal y promocional
- `ProductCard.tsx` — precio normal y promocional
- `ProductPage.tsx` — precio normal y promocional (ficha de producto)
- `CartDrawer.tsx` — precio unitario y subtotal de cada item, subtotal del carrito, tarifas de
  envío, precio de las recomendaciones
- `ProfileOrdersSection.tsx` — total del pedido y precio unitario de cada item en el historial
- `CheckoutSuccessPage.tsx` — resumen del pedido recién pagado

`CartDrawer.tsx` además mantiene un `eurFormatter` **fijo** (no ligado a `useCurrency`) usado
exclusivamente en el aviso de cobro real — nunca se usa para mostrar precios normales.

## Aviso sobre precios históricos aproximados

Los importes en `ProfileOrdersSection.tsx` (historial de pedidos) fueron cobrados en EUR en el
momento de la compra — un pedido de hace un mes no se "recobra" al tipo de cambio actual, solo se
muestra convertido con la tasa hardcodeada de hoy. Por eso, cuando la divisa seleccionada no es
EUR, cada pedido expandido muestra: *"Los precios históricos son aproximados en [divisa]."* Esto
evita que un usuario piense que el importe mostrado es lo que realmente se le cobró en su divisa.

El mismo razonamiento aplica en teoría a `CheckoutSuccessPage.tsx` (un pedido recién pagado, precio
ya fijado en EUR), pero al tratarse de la confirmación inmediata tras el pago no lleva la nota — el
usuario acaba de ver el importe real en la pasarela de Stripe.

---

## Decisiones técnicas

### 1. `formatPrice` del contexto toma un solo argumento (`cents`), no `(cents, currency)`
El encargo original tenía una contradicción entre la Tarea 1 ("`formatPrice` bound a
`selectedCurrency`") y el pseudocódigo de la Tarea 3 (`formatPrice(price, selectedCurrency)`). Se
resolvió a favor de la Tarea 1: el hook ya conoce la divisa seleccionada, así que cada punto de uso
solo pasa los céntimos en EUR. `src/lib/currencies.ts` sí exporta una versión de dos argumentos
(`formatPrice(cents, currency)`) para uso interno del contexto y para tests unitarios futuros, pero
ningún componente la importa directamente.

### 2. Selector de divisa: header en escritorio, `MobileDrawer` en móvil — nunca los dos a la vez
El header ya reservaba la fila de iconos móvil solo para carrito + hamburguesa, y escondía el
bloque de auth con `hidden md:flex`. `CurrencySelector` sigue ese mismo patrón en vez de forzar un
tercer icono en una barra ya ajustada. En el drawer se colocó en una fila propia justo bajo la
cabecera (logo + cerrar), fuera de la `<nav>` con `overflow-y-auto`, para que el desplegable tenga
sitio de sobra para abrirse sin quedar recortado por el scroll del contenedor.

### 3. `carrier`/divisas como lista abierta en un único archivo, no un enum disperso
Igual que `carrier` en la Feature 019, `CURRENCIES` vive en un solo sitio
(`src/lib/currencies.ts`). Añadir o modificar una divisa es una edición de un archivo, sin tocar
`CurrencyContext`, `CurrencySelector` ni ningún componente que consuma `formatPrice`.

### 4. `convertCents` trabaja en "céntimos", no en unidad mayor
`convertCents(cents, rate) = cents * rate` — devuelve céntimos de la divisa destino, que pueden ser
fraccionarios (la tasa no garantiza un entero). `formatPrice` es quien divide entre 100 al final,
justo antes de formatear. Mantiene la unidad de trabajo ("céntimos EUR de entrada") consistente con
el resto de la app, donde todos los precios se manejan en céntimos hasta el último paso de
renderizado.

### 5. El aviso de cobro en EUR usa un formateador fijo, no `formatPrice`
`eurFormatter` en `CartDrawer.tsx` es un `Intl.NumberFormat` con `currency: 'EUR'` fijo,
deliberadamente independiente del contexto de divisa. El importe que muestra ese aviso es siempre
el que Stripe va a cobrar de verdad — si se hubiera usado `formatPrice`, cambiar de divisa habría
cambiado también el número dentro del propio aviso de "esto es lo que se cobra en EUR", lo cual
sería incorrecto.

### 6. Cero cambios en backend — verificado, no solo asumido
Tras completar la feature se comprobó con `git status` que ningún archivo bajo `src/backend` había
sido tocado. `initiateCheckout()` (`src/api/orders.ts`) sigue enviando los mismos `items` y
`shipping_address` de siempre — el precio que ve Stripe lo recalcula `CheckoutController` en el
backend a partir del producto, exactamente igual que antes de esta feature.

---

## Cómo probar manualmente

1. **Selector visible**: en escritorio, el header muestra "EUR" + chevron junto a los enlaces de
   cuenta. En móvil, abrir el menú hamburguesa → debe verse "Divisa" con el mismo selector bajo el
   logo.
2. **Cambiar a USD**: seleccionar USD en el dropdown → recorrer `/tienda`, la ficha de un producto
   y el carrito — todos los precios deben verse en formato `$XX,XX` (símbolo delante, sin espacio,
   sin código).
3. **Cambiar a MXN**: mismo recorrido → precios en formato `$XXX,XX MXN`.
4. **Cambiar a ARS/COP/CLP**: precios sin decimales y con código de divisa, p. ej. `$31.499 ARS`.
5. **Aviso de cobro en EUR**: con cualquier divisa distinta de EUR y al menos un producto en el
   carrito, abrir el drawer → debe verse "El cobro se realizará en EUR (X,XX €). La conversión es
   orientativa." bajo el subtotal. Volver a EUR → el aviso desaparece.
6. **Persistencia**: elegir GBP, recargar la página (F5) → el selector debe seguir mostrando GBP y
   los precios en libras.
7. **Historial de pedidos**: con una divisa distinta de EUR, ir a `/perfil` → "Mis pedidos",
   desplegar un pedido → los precios se ven convertidos y aparece la nota "Los precios históricos
   son aproximados en [divisa]".
8. **Checkout real**: con cualquier divisa seleccionada, completar un checkout de prueba con
   Stripe (modo test) → el importe cobrado en Stripe debe ser el precio en EUR original, no el
   convertido — la divisa del selector nunca debe llegar a Stripe.
