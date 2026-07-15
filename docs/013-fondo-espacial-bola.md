# 013 — Fondo espacial Bola Troncodrilo

## Resumen

Campo de 200 estrellas animado en `<canvas>` que sustituye el fondo sólido de `/bola-troncodrilo`.
Las estrellas parpadean de forma independiente con velocidades aleatorias y se desplazan ligeramente
en horizontal (parallax) al rotar el globo, reforzando la estética espacial sin afectar al
rendimiento del globo Three.js ni al panel lateral de fanfics.

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/frontend/src/components/StarField.tsx` | Componente Canvas con generación de estrellas, loop RAF con twinkle, ResizeObserver, soporte `prefers-reduced-motion` y cleanup completo |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/frontend/src/pages/BolaTroncodriloPage.tsx` | Import + mount de `<StarField azimuth={azimuth} />`; captura de azimuth vía `getAzimuthalAngle()` en listener de OrbitControls; Globe envuelto en `<div style={{ zIndex: 1 }}>` para garantizar capas; `backgroundColor` del Globe cambiado a `rgba(0,0,0,0)` (transparente); corrección de z-indices del spinner y leyenda a `z-[2]` |

---

## Decisiones técnicas

### 1. Canvas API nativa — sin dependencias
El parpadeo y el parallax son efectos 2D simples: `clearRect` + `arc` + `fillStyle`. No se
necesita ninguna librería de animación. Canvas2D dibuja 200 círculos por frame en ≪1ms, muy por
debajo del budget de 16ms para 60fps.

### 2. Cómo se evita interferir con Three.js
- El canvas del StarField tiene `position: absolute; inset: 0; z-index: 0; pointer-events: none`.
- El Globe (Three.js) se envuelve en `<div style={{ position: 'relative', zIndex: 1 }}>`.
- El Globe usa `backgroundColor="rgba(0,0,0,0)"` para que su WebGL canvas sea transparente,
  permitiendo que las estrellas sean visibles alrededor y detrás del globo.
- `pointer-events: none` garantiza que el canvas nunca intercepta eventos del globo.

### 3. Stars como refs — no como state React
El array de estrellas (`starsRef`) y el RAF ID (`rafRef`) viven en `useRef`. El loop RAF lee y
escribe directamente en el ref sin pasar por React. Esto evita re-renders innecesarios y mantiene
el loop de animación completamente independiente del ciclo React.

### 4. Factor de parallax: 30px/rad (desviación documentada del spec)
El spec proponía `azimuth * 0.05`. `getAzimuthalAngle()` devuelve radianes (rango ±π), por lo que
`π * 0.05 ≈ 0.157 px` — imperceptible. El factor real usado es **30px por radián**, dando un
desplazamiento máximo de `π * 30 ≈ 94px` sobre un viewport de ~1200px (7.8%). Sutil pero presente;
se nota al comparar, no al mirarlo fijo. `azimuthRef` actualiza el valor en el RAF sin re-crear
el efecto de useEffect.

### 5. Mapa de z-indices (escala de 5 niveles)
```
z-0   StarField canvas       — fondo de estrellas
z-1   Globe wrapper          — canvas Three.js transparente
z-2   Spinner / Leyenda      — UI de carga y conteo (necesita superar al Globe)
z-10  Panel lateral fanfics  — overlay con info del fanfic
z-20  CTA flotante           — botón "Sé parte de la comunidad"
z-50  Lightbox               — imagen a pantalla completa (fixed)
```

### 6. `prefers-reduced-motion`
Si el sistema tiene reducción de movimiento activa: las estrellas se generan y dibujan una sola
vez (estáticas), sin RAF. No se cancela el frame ni se vacia el canvas — simplemente no se
re-anima.

---

## Cómo probar manualmente

1. Ir a `/bola-troncodrilo` → fondo oscuro con campo de estrellas parpadeando
2. Observar durante 5-10s → las estrellas parpadean de forma independiente (no sincronizada)
3. Arrastrar el globo en horizontal → las estrellas se desplazan ligeramente en la misma dirección
4. Hacer click en un marcador del globo → panel lateral se abre sin problemas; clics funcionan
5. Hacer click en "Cerrar panel" → panel se cierra; globo sigue siendo interactivo
6. Navegar a `/tienda` y volver a `/bola-troncodrilo` → sin acumulación de loops (DevTools Memory)
7. Redimensionar la ventana → estrellas se redistribuyen proporcionalmente
8. En móvil: verificar que no hay scroll horizontal y que el globo responde a touch

---

## Gotchas y notas futuras

- **`backgroundColor="rgba(0,0,0,0)"` en Globe**: Three.js soporta WebGL alpha cuando la instancia
  del renderer tiene `alpha: true`. react-globe.gl crea el renderer con alpha por defecto. Si en
  alguna versión futura de react-globe.gl cambia este comportamiento, el Globe mostraría un fondo
  negro (opaco) tapando las estrellas en el área del globo — pero las estrellas fuera del disco
  del globo seguirían siendo visibles.

- **Azimuth solo horizontal**: el parallax actualmente solo desplaza las estrellas en X (azimuth =
  rotación horizontal del globo). Si en el futuro se quisiera añadir parallax vertical (polar
  angle), se puede capturar `getPolarAngle()` de OrbitControls y añadir offset en Y.

- **200 estrellas**: probado sin caída de FPS en móviles modernos. Si se detectara lag en
  dispositivos muy limitados, reducir `N` en `StarField.tsx` (constante exportable). No se usa
  throttle del RAF porque 200 `ctx.arc` calls son triviales.

- **Sin wrapping de estrellas en los bordes**: las estrellas que salen fuera del canvas por
  efecto del parallax simplemente no se dibujan (el canvas clipea automáticamente). Esto es
  intencional — crea un efecto de "campo infinito" en lugar de un loop visible.

- **Spinner z-index**: el z-index del spinner se elevó a `z-[2]` como efecto secundario de dar
  `z-[1]` al Globe wrapper. Antes funcionaba por DOM order (spinner después de Globe en el DOM),
  ahora funciona por z-index explícito — más robusto.
