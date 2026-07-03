import { useCallback, useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { getFanfics } from '../api/fanfics'
import type { Fanfic } from '../types/fanfic'

const GLOBE_IMG = '//unpkg.com/three-globe/example/img/earth-dark.jpg'

export default function BolaTroncodriloPage() {
  const containerRef            = useRef<HTMLDivElement>(null)
  const [size, setSize]         = useState({ w: 0, h: 0 })
  const [fanfics, setFanfics]   = useState<Fanfic[]>([])
  const [selected, setSelected] = useState<Fanfic | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getFanfics()
      .then(setFanfics)
      .finally(() => setLoading(false))
  }, [])

  // Dimensiones exactas para el canvas WebGL — ResizeObserver evita que el globo
  // colapse cuando el panel lateral reduce el espacio disponible
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handlePointClick = useCallback((point: object) => {
    setSelected(point as Fanfic)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-dark overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* ── Globo 3D ── */}
      {size.w > 0 && (
        <Globe
          width={size.w}
          height={size.h}
          globeImageUrl={GLOBE_IMG}
          backgroundColor="#1C1F1A"
          atmosphereColor="#5BBB2A"
          atmosphereAltitude={0.15}
          pointsData={fanfics}
          pointLat={(d) => (d as Fanfic).latitude}
          pointLng={(d) => (d as Fanfic).longitude}
          pointColor={() => '#5BBB2A'}
          pointRadius={0.5}
          pointAltitude={0.01}
          pointResolution={6}
          onPointClick={handlePointClick}
          onGlobeClick={() => setSelected(null)}
        />
      )}

      {/* ── Spinner de carga ── */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Leyenda inferior ── */}
      {!loading && (
        <div className="absolute bottom-6 left-6 bg-dark/70 backdrop-blur-sm rounded-xl
          px-4 py-2.5 text-white/50 text-xs pointer-events-none select-none">
          {fanfics.length > 0
            ? `${fanfics.length} fanfic${fanfics.length !== 1 ? 's' : ''} en el mapa · Haz clic en un punto`
            : 'Aún no hay fanfics aprobados'}
        </div>
      )}

      {/* ── Panel lateral ── */}
      {selected && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 flex flex-col
          bg-dark/95 backdrop-blur-sm border-l border-white/10 shadow-2xl z-10">

          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
            <h2 className="text-white font-semibold leading-snug line-clamp-3">
              {selected.title}
            </h2>
            <button
              onClick={() => setSelected(null)}
              aria-label="Cerrar panel"
              className="flex-shrink-0 mt-0.5 text-white/40 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Autor */}
          <div className="px-5 pt-4 pb-1">
            <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a8.38 8.38 0 0113 0" />
              </svg>
              {selected.author?.name ?? 'Anónimo'}
            </span>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
              {selected.content}
            </p>
          </div>

          {/* Coordenadas */}
          <div className="px-5 py-3 border-t border-white/10">
            <p className="text-white/25 text-xs font-mono">
              {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
