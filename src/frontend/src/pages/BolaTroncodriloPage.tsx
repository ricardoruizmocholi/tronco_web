import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Globe from 'react-globe.gl'
import Supercluster from 'supercluster'
import { getFanfics } from '../api/fanfics'
import StarField from '../components/StarField'
import type { Fanfic } from '../types/fanfic'

const GLOBE_IMG = '//unpkg.com/three-globe/example/img/earth-dark.jpg'

type GeoFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    fanfic?:      Fanfic
    cluster?:     boolean
    point_count?: number
    cluster_id?:  number
  }
}

// altitude 2.5 (muy lejos) → zoom 0 | altitude 0.1 (ciudades) → zoom ~9
function altitudeToZoom(alt: number): number {
  return Math.min(16, Math.max(0, Math.round(Math.log(2.5 / alt) * 3.5)))
}

export default function BolaTroncodriloPage() {
  const navigate                      = useNavigate()
  const containerRef                  = useRef<HTMLDivElement>(null)
  const globeRef                      = useRef<any>(null)  // react-globe.gl instance — no typed export
  const [size, setSize]               = useState({ w: 0, h: 0 })
  const [fanfics, setFanfics]         = useState<Fanfic[]>([])
  const [nextCursor, setNextCursor]   = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [altitude, setAltitude]       = useState(2.5)
  const [azimuth, setAzimuth]         = useState(0)
  const [selected, setSelected]       = useState<Fanfic | null>(null)
  const [fullscreen, setFullscreen]   = useState(false)

  // ── Escape cierra el lightbox ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Dimensiones del contenedor ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    getFanfics().then(page => {
      setFanfics(page.data)
      const url = page.next_page_url
      setNextCursor(url ? new URL(url).searchParams.get('cursor') : null)
    }).finally(() => setLoading(false))
  }, [])

  // ── Carga progresiva ───────────────────────────────────────────────────────
  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await getFanfics(nextCursor)
      setFanfics(prev => [...prev, ...page.data])
      const url = page.next_page_url
      setNextCursor(url ? new URL(url).searchParams.get('cursor') : null)
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Zoom listener via OrbitControls ───────────────────────────────────────
  // Se re-adjunta cuando size.w cambia porque el globo puede haberse remontado
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    const onMove = () => {
      const pov = globeRef.current?.pointOfView()
      if (pov?.altitude !== undefined) setAltitude(pov.altitude)
      const az = globeRef.current?.controls()?.getAzimuthalAngle?.()
      if (az !== undefined) setAzimuth(az)
    }
    controls.addEventListener('change', onMove)
    return () => controls.removeEventListener('change', onMove)
  }, [size.w])

  // ── Supercluster ───────────────────────────────────────────────────────────
  const clusterIndex = useMemo(() => {
    const sc = new Supercluster<{ fanfic: Fanfic }>({ radius: 60, maxZoom: 16 })
    sc.load(fanfics.map(f => ({
      type:       'Feature' as const,
      geometry:   { type: 'Point' as const, coordinates: [f.longitude, f.latitude] as [number, number] },
      properties: { fanfic: f },
    })))
    return sc
  }, [fanfics])

  const clusters = useMemo<GeoFeature[]>(() => {
    const zoom = altitudeToZoom(altitude)
    return clusterIndex.getClusters([-180, -90, 180, 90], zoom) as GeoFeature[]
  }, [clusterIndex, altitude])

  // ── Elementos HTML del globo ───────────────────────────────────────────────
  // altitude en deps: click de cluster necesita el valor actual para calcular zoom in
  const makeHtmlElement = useCallback((d: object): HTMLElement => {
    const feature = d as GeoFeature
    const el = document.createElement('div')

    if (feature.properties.cluster) {
      const count = feature.properties.point_count ?? 0
      el.innerHTML = `
        <div style="
          width:44px;height:44px;border-radius:50%;
          background:#5BBB2A;border:2px solid white;
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:13px;
          box-shadow:0 2px 10px rgba(0,0,0,0.4);cursor:pointer;
          user-select:none;
        ">${count > 99 ? '99+' : count}</div>
      `
      el.addEventListener('click', e => {
        e.stopPropagation()
        const [lng, lat] = feature.geometry.coordinates
        globeRef.current?.pointOfView({ lat, lng, altitude: altitude * 0.35 }, 600)
      })
    } else {
      const fanfic = feature.properties.fanfic!
      const sz     = fanfic.is_featured ? 52 : 38
      const border = fanfic.is_featured ? '3px solid #5BBB2A' : '2px solid white'
      el.innerHTML = `
        <div style="
          width:${sz}px;height:${sz}px;border-radius:50%;
          overflow:hidden;border:${border};
          box-shadow:0 2px 10px rgba(0,0,0,0.5);cursor:pointer;
          transition:transform 0.15s;
        ">
          <img src="${fanfic.image_url}"
            style="width:100%;height:100%;object-fit:cover;"
            loading="lazy" />
        </div>
      `
      const inner = el.querySelector<HTMLElement>('div')!
      inner.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.15)' })
      inner.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)' })
      el.addEventListener('click', e => { e.stopPropagation(); setSelected(fanfic) })
    }
    return el
  }, [altitude])

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-dark overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* ── Fondo de estrellas — detrás del globo ── */}
      <StarField azimuth={azimuth} />

      {/* ── Globo 3D — encima del StarField ── */}
      {size.w > 0 && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Globe
            ref={globeRef}
            width={size.w}
            height={size.h}
            globeImageUrl={GLOBE_IMG}
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#5BBB2A"
            atmosphereAltitude={0.15}
            htmlElementsData={clusters}
            htmlLat={d => (d as GeoFeature).geometry.coordinates[1]}
            htmlLng={d => (d as GeoFeature).geometry.coordinates[0]}
            htmlElement={makeHtmlElement}
            onGlobeClick={() => setSelected(null)}
          />
        </div>
      )}

      {/* ── Spinner carga inicial ── */}
      {loading && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Leyenda + Cargar más ── */}
      {!loading && (
        <div className="absolute bottom-6 left-6 z-[2] flex flex-col items-start gap-2">
          <div className="bg-dark/70 backdrop-blur-sm rounded-xl px-4 py-2.5
            text-white/50 text-xs pointer-events-none select-none">
            {fanfics.length} imagen{fanfics.length !== 1 ? 'es' : ''} en el mapa
            {nextCursor && ' · carga parcial'}
          </div>
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-dark/80 backdrop-blur-sm text-white/80 text-xs px-4 py-2
                rounded-xl hover:bg-dark/90 transition-colors disabled:opacity-50
                flex items-center gap-2"
            >
              {loadingMore
                ? <><div className="w-3 h-3 border border-white/50 border-t-transparent
                      rounded-full animate-spin" /> Cargando...</>
                : 'Cargar más imágenes'
              }
            </button>
          )}
        </div>
      )}

      {/* ── Panel lateral ── */}
      {selected && (
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-96 flex flex-col
            bg-dark/95 backdrop-blur-sm border-l border-white/10 shadow-2xl z-10"
          onClick={e => e.stopPropagation()}
        >

          {/* Imagen */}
          <div className="relative flex-shrink-0">
            <img
              src={selected.image_url}
              alt={selected.city_name}
              className="w-full h-56 object-cover"
            />
            {selected.is_featured && (
              <span className="absolute top-3 left-3 bg-primary text-white text-xs
                font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Destacado
              </span>
            )}
            <button
              onClick={() => setSelected(null)}
              aria-label="Cerrar panel"
              className="absolute top-3 right-3 w-8 h-8 bg-dark/60 backdrop-blur-sm
                rounded-full flex items-center justify-center text-white/70
                hover:text-white hover:bg-dark/80 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Botón lightbox */}
          <button
            onClick={() => setFullscreen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5
              bg-white/5 hover:bg-white/10 text-white/60 hover:text-white
              text-xs transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M15 3h6m0 0v6m0-6-7 7M9 21H3m0 0v-6m0 6 7-7" />
            </svg>
            Ver imagen completa
          </button>

          {/* Info */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <p className="text-white font-semibold text-lg leading-tight">
                {selected.city_name}
              </p>
              <p className="text-primary text-sm mt-1 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21a8.38 8.38 0 0113 0" />
                </svg>
                {selected.author?.name ?? 'Anónimo'}
              </p>
            </div>
            {selected.caption && (
              <p className="text-white/70 text-sm leading-relaxed italic
                border-l-2 border-primary/40 pl-3">
                {selected.caption}
              </p>
            )}
          </div>

          {/* Coordenadas */}
          <div className="px-5 py-3 border-t border-white/10">
            <p className="text-white/25 text-xs font-mono">
              {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      )}
      {/* ── Lightbox ── */}
      {fullscreen && selected?.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={selected.image_url}
            alt={selected.city_name}
            className="max-h-screen max-w-screen object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── CTA flotante ── */}
      <button
        onClick={() => navigate('/mi-fanfic')}
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2
          bg-primary text-white font-medium text-sm px-5 py-3 rounded-full
          shadow-lg hover:bg-primary/90 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Sé parte de la comunidad
      </button>
    </div>
  )
}
