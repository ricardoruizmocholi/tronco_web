import { useEffect, useRef } from 'react'

interface Star {
  baseX:         number
  baseY:         number
  radius:        number
  opacity:       number
  twinkleSpeed:  number
  twinkleDir:    1 | -1
}

interface Props {
  azimuth?: number
}

const N              = 200
const PARALLAX_PX    = 30   // px offset per radian of azimuth
const OPACITY_MIN    = 0.2
const OPACITY_MAX    = 1.0

export default function StarField({ azimuth = 0 }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const starsRef     = useRef<Star[]>([])
  const rafRef       = useRef<number>(0)
  const azimuthRef   = useRef(azimuth)

  // Keep azimuthRef in sync with prop — RAF reads it without re-running the effect
  useEffect(() => {
    azimuthRef.current = azimuth
  }, [azimuth])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ── Initialise canvas dimensions ─────────────────────────────────────────
    canvas.width  = parent.offsetWidth  || window.innerWidth
    canvas.height = parent.offsetHeight || window.innerHeight

    // ── Generate stars ────────────────────────────────────────────────────────
    starsRef.current = Array.from({ length: N }, () => ({
      baseX:        Math.random() * canvas.width,
      baseY:        Math.random() * canvas.height,
      radius:       0.5 + Math.random() * 1.5,
      opacity:      OPACITY_MIN + Math.random() * (OPACITY_MAX - OPACITY_MIN),
      twinkleSpeed: 0.005 + Math.random() * 0.015,
      twinkleDir:   Math.random() > 0.5 ? 1 : -1,
    }))

    // ── Draw frame ────────────────────────────────────────────────────────────
    function drawFrame() {
      const w   = canvas.width
      const h   = canvas.height
      const off = azimuthRef.current * PARALLAX_PX

      ctx.clearRect(0, 0, w, h)

      for (const s of starsRef.current) {
        if (!reduced) {
          s.opacity += s.twinkleSpeed * s.twinkleDir
          if (s.opacity >= OPACITY_MAX) { s.opacity = OPACITY_MAX; s.twinkleDir = -1 }
          if (s.opacity <= OPACITY_MIN) { s.opacity = OPACITY_MIN; s.twinkleDir =  1 }
        }

        ctx.beginPath()
        ctx.arc(s.baseX + off, s.baseY, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.opacity.toFixed(3)})`
        ctx.fill()
      }
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    function loop() {
      drawFrame()
      rafRef.current = requestAnimationFrame(loop)
    }

    if (reduced) {
      drawFrame() // single static frame
    } else {
      rafRef.current = requestAnimationFrame(loop)
    }

    // ── ResizeObserver ────────────────────────────────────────────────────────
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (!width || !height) return

      // Re-scale existing star positions proportionally
      const scaleX = width  / canvas.width
      const scaleY = height / canvas.height
      for (const s of starsRef.current) {
        s.baseX *= scaleX
        s.baseY *= scaleY
      }

      canvas.width  = width
      canvas.height = height

      if (reduced) drawFrame()
    })
    obs.observe(parent)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current)
      obs.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentional single-mount

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'absolute',
        inset:         0,
        zIndex:        0,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  )
}
