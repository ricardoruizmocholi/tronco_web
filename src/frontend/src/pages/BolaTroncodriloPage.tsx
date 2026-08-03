import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Globe from 'react-globe.gl'
import { getAllFanfics } from '../api/fanfics'
import StarField from '../components/StarField'
import type { Fanfic } from '../types/fanfic'

const GLOBE_IMG = '//unpkg.com/three-globe/example/img/earth-dark.jpg'

// Fanfics con lat/lng a menos de este umbral (en grados) se consideran de la misma zona.
const PROXIMITY_THRESHOLD = 0.5

interface FanficCluster {
  id:        string
  lat:       number
  lng:       number
  cityLabel: string
  fanfics:   Fanfic[]
}

// Agrupación greedy por proximidad — fija, no depende del zoom (a diferencia del
// Supercluster que usaba esta página antes). Con el volumen de fanfics de este
// proyecto (decenas, no miles) el coste O(n²) es irrelevante.
function groupByProximity(fanfics: Fanfic[]): FanficCluster[] {
  const remaining = [...fanfics]
  const clusters: FanficCluster[] = []

  while (remaining.length > 0) {
    const seed = remaining.shift()!
    const group = [seed]

    for (let i = remaining.length - 1; i >= 0; i--) {
      const candidate = remaining[i]
      if (
        Math.abs(candidate.latitude - seed.latitude) < PROXIMITY_THRESHOLD &&
        Math.abs(candidate.longitude - seed.longitude) < PROXIMITY_THRESHOLD
      ) {
        group.push(candidate)
        remaining.splice(i, 1)
      }
    }

    clusters.push({
      id:        `cluster-${seed.id}`,
      lat:       group.reduce((sum, f) => sum + f.latitude, 0) / group.length,
      lng:       group.reduce((sum, f) => sum + f.longitude, 0) / group.length,
      cityLabel: seed.city_name,
      fanfics:   group,
    })
  }

  return clusters
}

function pointRadiusFor(count: number): number {
  if (count <= 1) return 0.3
  if (count < 10) return 0.5
  return 0.7
}

function labelSizeFor(count: number): number {
  return count < 10 ? 22 : 26
}

function labelTextFor(count: number): string {
  return count < 10 ? String(count) : '9+'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

type PanelState =
  | { mode: 'closed' }
  | { mode: 'list'; cluster: FanficCluster }
  | { mode: 'detail'; cluster: FanficCluster; fanfic: Fanfic }

function PanelHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10 flex-shrink-0">
      <p className="label-caps text-white/70">{label}</p>
      <button
        onClick={onClose}
        aria-label="Cerrar panel"
        className="p-1.5 -mr-1.5 text-white/50 hover:text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="w-5 h-5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function BolaTroncodriloPage() {
  const navigate                    = useNavigate()
  const containerRef                = useRef<HTMLDivElement>(null)
  const globeRef                    = useRef<any>(null)  // react-globe.gl instance — no typed export
  const [size, setSize]             = useState({ w: 0, h: 0 })
  const [fanfics, setFanfics]       = useState<Fanfic[]>([])
  const [loading, setLoading]       = useState(true)
  const [azimuth, setAzimuth]       = useState(0)
  const [panel, setPanel]           = useState<PanelState>({ mode: 'closed' })
  const [fullscreen, setFullscreen] = useState(false)

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

  // ── Carga completa — el clustering por proximidad necesita todos los datos a
  //    la vez (con carga progresiva los clusters cambiarían de tamaño según
  //    cuánto se hubiera cargado ya, algo confuso para el usuario) ────────────
  useEffect(() => {
    getAllFanfics()
      .then(setFanfics)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Azimut del globo — solo para el parallax de StarField ──────────────────
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    const onMove = () => {
      const az = globeRef.current?.controls()?.getAzimuthalAngle?.()
      if (az !== undefined) setAzimuth(az)
    }
    controls.addEventListener('change', onMove)
    return () => controls.removeEventListener('change', onMove)
  }, [size.w])

  // ── Clustering por proximidad (fijo — no recalcula con el zoom) ────────────
  const clusters = useMemo(() => groupByProximity(fanfics), [fanfics])

  // Solo los clusters con 2+ fanfics llevan el contador visible encima.
  const labelData = useMemo(() => clusters.filter(c => c.fanfics.length > 1), [clusters])

  function handlePointClick(point: object) {
    const cluster = point as FanficCluster
    setPanel(
      cluster.fanfics.length === 1
        ? { mode: 'detail', cluster, fanfic: cluster.fanfics[0] }
        : { mode: 'list', cluster }
    )
  }

  function closePanel() {
    setPanel({ mode: 'closed' })
  }

  const panelOpen       = panel.mode !== 'closed'
  const selectedFanfic  = panel.mode === 'detail' ? panel.fanfic : null

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
            pointsData={clusters}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => '#5BBB2A'}
            pointAltitude={0}
            pointRadius={d => pointRadiusFor((d as FanficCluster).fanfics.length)}
            pointLabel={d => {
              const c = d as FanficCluster
              return `${c.cityLabel} — ${c.fanfics.length} fanfic${c.fanfics.length === 1 ? '' : 's'}`
            }}
            onPointClick={handlePointClick}
            htmlElementsData={labelData}
            htmlLat={d => (d as FanficCluster).lat}
            htmlLng={d => (d as FanficCluster).lng}
            htmlElement={d => {
              const cluster   = d as FanficCluster
              const count     = cluster.fanfics.length
              const badgeSize = labelSizeFor(count)

              const el = document.createElement('div')
              el.textContent = labelTextFor(count)
              el.style.cssText = `
                pointer-events: none;
                width: ${badgeSize}px; height: ${badgeSize}px;
                border-radius: 50%;
                background: rgba(28,31,26,0.8);
                color: #FAFAF8;
                display: flex; align-items: center; justify-content: center;
                font-size: ${count < 10 ? 11 : 12}px;
                font-weight: 700;
                transform: translate(-50%, -140%);
                user-select: none;
              `
              return el
            }}
            onGlobeClick={closePanel}
          />
        </div>
      )}

      {/* ── Spinner carga inicial ── */}
      {loading && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Leyenda ── */}
      {!loading && (
        <div className="absolute bottom-6 left-6 z-[2] bg-dark/70 backdrop-blur-sm rounded-xl px-4 py-2.5
          text-white/50 text-xs pointer-events-none select-none">
          {fanfics.length} fanfic{fanfics.length !== 1 ? 's' : ''} en el globo
        </div>
      )}

      {/* ── Panel lateral ── */}
      <div
        className={`fixed top-0 right-0 z-10 h-screen w-full sm:w-[380px]
          bg-dark flex flex-col
          transform transition-transform duration-300 ease-out
          ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-hidden={!panelOpen}
        aria-label="Detalle de fanfics"
      >
        {panel.mode === 'list' && (
          <>
            <PanelHeader label={`Fanfics en ${panel.cluster.cityLabel}`} onClose={closePanel} />
            <div className="flex-1 overflow-y-auto divide-y divide-white/10">
              {panel.cluster.fanfics.map(f => (
                <button
                  key={f.id}
                  onClick={() => setPanel({ mode: 'detail', cluster: panel.cluster, fanfic: f })}
                  className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <img src={f.image_url} alt="" className="w-[60px] h-[60px] object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-editorial text-sm text-white truncate">
                      {f.author?.name ?? 'Anónimo'}
                    </p>
                    <p className="label-caps text-primary text-[10px] mt-0.5">{f.city_name}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {formatDate(f.reviewed_at ?? f.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {panel.mode === 'detail' && (
          <>
            <PanelHeader label={`Fanfic en ${panel.fanfic.city_name}`} onClose={closePanel} />
            <div className="flex-1 overflow-y-auto">
              {panel.cluster.fanfics.length > 1 && (
                <button
                  onClick={() => setPanel({ mode: 'list', cluster: panel.cluster })}
                  className="flex items-center gap-1.5 px-6 py-3 text-xs text-white/50 hover:text-white transition-colors"
                >
                  ← Volver
                </button>
              )}

              <div className="relative">
                <img
                  src={panel.fanfic.image_url}
                  alt={panel.fanfic.city_name}
                  className="w-full aspect-[3/4] object-cover"
                />
                <button
                  onClick={() => setFullscreen(true)}
                  aria-label="Ver imagen completa"
                  className="absolute bottom-3 right-3 w-9 h-9 bg-dark/60 backdrop-blur-sm
                    flex items-center justify-center text-white/70 hover:text-white
                    hover:bg-dark/80 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                    <path d="M15 3h6m0 0v6m0-6-7 7M9 21H3m0 0v-6m0 6 7-7" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-3">
                <p className="font-editorial text-lg text-white">
                  {panel.fanfic.author?.name ?? 'Anónimo'}
                </p>
                <p className="label-caps text-primary">{panel.fanfic.city_name}</p>
                <p className="text-sm text-white/60">
                  {formatDate(panel.fanfic.reviewed_at ?? panel.fanfic.created_at)}
                </p>
                {panel.fanfic.caption && (
                  <p className="text-sm text-white/70 leading-relaxed italic border-l-2 border-primary/40 pl-3">
                    {panel.fanfic.caption}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {fullscreen && selectedFanfic?.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={selectedFanfic.image_url}
            alt={selectedFanfic.city_name}
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
