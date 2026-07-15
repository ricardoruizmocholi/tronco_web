# Bug 001 — Click en punto del globo no abre el panel lateral de fanfic

## Descripción

Al hacer click en un marker (imagen de fanfic) o en un cluster (burbuja verde con número)
del globo interactivo en `/bola-troncodrilo`, no ocurre ninguna interacción visible:
el panel lateral con el detalle del fanfic no se abre.

## Comportamiento esperado

Click en un marker de fanfic → panel lateral desliza desde la derecha mostrando:
- Imagen del fanfic
- Ciudad y nombre del autor
- Caption (si existe)
- Coordenadas
- Botón de lightbox

Click en un cluster → el globo hace zoom hacia esa zona.

## Comportamiento actual

Ninguna interacción. El click no produce respuesta visual ni funcional.

## Estado

- **Pre-existente**: sí — no introducido por feature 013 (StarField).
  Confirmado: el bug existía antes de añadir el canvas de estrellas.
- **Introducido en**: desconocido (posiblemente desde el montaje inicial de react-globe.gl).

## Prioridad

**Media** — afecta a la funcionalidad principal de comunidad (ver fanfics en el mapa),
pero no bloquea el resto del ecommerce.

## Posible causa

Varias hipótesis, en orden de probabilidad:

1. **Canvas de Three.js interceptando eventos**: el canvas de react-globe.gl puede estar
   capturando todos los eventos de puntero antes de que lleguen a los elementos HTML
   superpuestos (los markers). El Globe renderiza sus `htmlElements` como divs flotantes,
   pero el canvas Three.js podría estar encima en el hit-testing.

2. **`stopPropagation` en conflicto**: los listeners de click en los markers llaman a
   `e.stopPropagation()` para evitar que el click propague al `onGlobeClick`. Si el evento
   no llega al marker en primer lugar (por el punto anterior), el handler nunca se ejecuta.

3. **z-index del wrapper de Globe (z-[1])**: introducido en feature 013 para garantizar
   que el Globe esté encima del StarField. Si esto afecta al hit-testing de los markers HTML
   dentro del wrapper, podría bloquear los eventos. Sin embargo, el bug es pre-existente,
   por lo que este cambio no es la causa raíz — aunque podría haberlo agravado.

4. **Versión de react-globe.gl / Three.js incompatible con Vite 5**: el proyecto hizo
   downgrade de Vite por incompatibilidades con react-globe.gl. Podría haber un bug conocido
   en la versión instalada relacionado con el manejo de eventos en `htmlElements`.

## Pasos para reproducir

1. Ir a `/bola-troncodrilo` (como usuario autenticado con fanfics aprobados en el mapa)
2. Esperar a que carguen los markers
3. Hacer click en cualquier imagen circular del globo
4. Observar: el panel lateral no aparece

## Archivos relevantes

- [src/frontend/src/pages/BolaTroncodriloPage.tsx](../../../src/frontend/src/pages/BolaTroncodriloPage.tsx) — lógica de click en `makeHtmlElement` (líneas ~111–154)
- `makeHtmlElement`: los event listeners se añaden vía `el.addEventListener('click', ...)` en elementos HTML creados dinámicamente

## Investigación sugerida

```bash
# 1. Verificar qué elemento recibe el evento en DevTools:
# Abrir DevTools → Elements → inspeccionar el canvas de Three.js
# Comprobar si tiene pointer-events: auto (debería ser none para los htmlElements)

# 2. Probar en consola del navegador:
# globeRef.current?.controls()  → ver si OrbitControls está activo
# globeRef.current?.htmlElementsData()  → ver si los datos llegan correctamente

# 3. Verificar version de react-globe.gl:
docker exec troncodrilo_frontend cat node_modules/react-globe.gl/package.json | grep '"version"'
```

## Notas

- El wrapper `<div style={{ position: 'relative', zIndex: 1 }}>` añadido en feature 013
  no debería afectar al comportamiento interno del Globe (los markers HTML son relativos
  al canvas de Three.js, no al wrapper externo). Pero si al investigar se confirma que
  agravó el bug, se puede eliminar el wrapper y usar otro método de z-ordering para el StarField.
- El bug afecta tanto a markers individuales como a clusters.
