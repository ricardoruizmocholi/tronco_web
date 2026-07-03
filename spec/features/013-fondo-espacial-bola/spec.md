# 013 — Fondo espacial Bola Troncodrilo

## Spec

### Qué hace
Sustituye el fondo sólido de la página `/bola-troncodrilo` por un campo
de estrellas animado en canvas con efecto de parpadeo y parallax ligero
que acompaña la rotación del globo, reforzando la estética espacial.

### Criterios de aceptación
- [ ] El fondo de `/bola-troncodrilo` muestra estrellas distribuidas aleatoriamente sobre fondo oscuro
- [ ] Las estrellas parpadean de forma independiente y aleatoria (variación de opacidad)
- [ ] El canvas ocupa exactamente el 100% del viewport y se redimensiona correctamente
- [ ] El efecto de parallax es sutil: las estrellas se desplazan ligeramente cuando el globo rota
- [ ] El componente `StarField` no afecta al rendimiento del globo (sin bloquear el hilo principal)
- [ ] El canvas se limpia correctamente al desmontar el componente (sin memory leaks)
- [ ] El efecto funciona correctamente en móvil y en escritorio

### Fuera de alcance
- Estrellas fugaces o cometas (post-MVP)
- Nebulosas o gradientes de color de fondo (post-MVP)
- Interacción de las estrellas con el cursor del usuario

---

## Plan

### Frontend
- `StarField.tsx`: componente con `<canvas>` que genera N estrellas (posición, radio, opacidad, velocidad de parpadeo) en `useEffect` y las anima con `requestAnimationFrame`
- Cada estrella tiene: `x`, `y`, `radius` (0.5–2px), `opacity` (0.2–1), `twinkleSpeed` (variación aleatoria)
- Parallax: exponer `azimuth` del globo vía `globeRef.current.controls()` y aplicar un offset `x = baseX + azimuth * factor` donde `factor` es pequeño (0.05–0.1) para suavidad
- El canvas se posiciona `absolute inset-0 z-0` dentro del contenedor del globo
- `BolaTroncodriloPage.tsx`: montar `<StarField />` debajo del globo, pasar `azimuth` como prop si el parallax está activo

### Dependencia
Requiere `006-bola-troncodrilo` completa.

---

## Tasks

1. [ ] `StarField.tsx`: generación de estrellas en canvas con `useEffect`
2. [ ] Loop de animación con `requestAnimationFrame` y efecto de parpadeo
3. [ ] Redimensionado reactivo del canvas con `ResizeObserver`
4. [ ] Limpieza correcta en `return () => cancelAnimationFrame(rafId)`
5. [ ] Integrar `StarField` en `BolaTroncodriloPage.tsx` sustituyendo el fondo sólido
6. [ ] Implementar parallax ligero vinculado a la rotación del globo
7. [ ] Verificar rendimiento (sin caídas de FPS perceptibles) en móvil y escritorio
8. [ ] Verificar los 7 criterios de aceptación
