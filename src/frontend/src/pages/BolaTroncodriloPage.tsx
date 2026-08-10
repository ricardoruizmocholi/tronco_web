import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Globe from 'react-globe.gl'
import { getAllFanfics } from '../api/fanfics'
import StarField from '../components/StarField'
import { useAuth } from '../hooks/useAuth'
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

const scrollbarStyle: React.CSSProperties = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#5BBB2A #1C1F1A',
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
      <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

// Header del panel: botón "← volver" (si hay una lista a la que volver) a la
// izquierda, X para cerrar a la derecha. Sin título — el contexto (ciudad,
// cantidad) vive en el propio contenido de cada vista.
function PanelTopBar({
  onBack, onClose,
}: { onBack: (() => void) | null; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-canvas/10 flex-shrink-0">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Volver a la lista"
          className="p-1.5 -ml-1.5 text-canvas/70 hover:text-canvas transition-colors"
        >
          <BackArrowIcon />
        </button>
      ) : <span />}
      <button
        onClick={onClose}
        aria-label="Cerrar panel"
        className="p-1.5 -mr-1.5 text-canvas hover:opacity-60 transition-opacity"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

export default function BolaTroncodriloPage() {
  const navigate                    = useNavigate()
  const { user }                    = useAuth()
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

  // ── Bloquea el scroll del body mientras el panel está abierto — sin esto,
  //    el scroll dentro del panel se propaga al documento y mueve la página. ──
  useEffect(() => {
    document.body.style.overflow = panel.mode !== 'closed' ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [panel.mode])

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

  const panelOpen      = panel.mode !== 'closed'
  const selectedFanfic = panel.mode === 'detail' ? panel.fanfic : null

  // Cambia en cada vista/selección distinta — usado como `key` para remontar
  // el contenido (dispara el fade de 150ms y resetea el scroll al top).
  const contentKey =
    panel.mode === 'list'   ? `list-${panel.cluster.id}` :
    panel.mode === 'detail' ? `detail-${panel.fanfic.id}` :
    'closed'

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

      {/* ── Contador de fanfics — fijo arriba a la izquierda, bajo el header ── */}
      {!loading && (
        <div
          className="fixed z-[5] label-caps pointer-events-none select-none"
          style={{
            top: '80px', left: '24px',
            background: 'rgba(28,31,26,0.8)', color: '#FAFAF8',
            padding: '8px 12px', borderRadius: '2px',
          }}
        >
          {fanfics.length} fanfic{fanfics.length !== 1 ? 's' : ''} en el mapa
        </div>
      )}

      {/* ── Panel lateral ── */}
      <div
        className={`fixed top-0 right-0 z-10 h-screen w-full sm:w-[320px]
          text-canvas flex flex-col p-4
          transform transition-transform duration-300 ease-out
          ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: '#111411', borderLeft: '1px solid rgba(91,187,42,0.3)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-hidden={!panelOpen}
        aria-label="Detalle de fanfics"
      >
        {panel.mode === 'list' && (
          <>
            <PanelTopBar onBack={null} onClose={closePanel} />
            <div key={contentKey} className="pt-4 flex-1 min-h-0 flex flex-col animate-[fade-in_150ms_ease-in-out]">
              <div className="flex-shrink-0 mb-1">
                <p className="label-caps text-canvas/70">{panel.cluster.cityLabel}</p>
                <p className="text-xs text-canvas/50 mt-0.5">
                  {panel.cluster.fanfics.length} fanfics
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-canvas/10" style={scrollbarStyle}>
                {panel.cluster.fanfics.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setPanel({ mode: 'detail', cluster: panel.cluster, fanfic: f })}
                    className="w-full h-[80px] flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <img
                      src={f.image_url}
                      alt=""
                      className="w-16 h-16 object-cover flex-shrink-0 rounded-[2px]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-canvas truncate">
                        {f.author?.name ?? 'Anónimo'}
                      </p>
                      <p className="text-xs text-primary mt-0.5">{f.city_name}</p>
                      <p className="text-xs text-canvas/50 mt-0.5">
                        {formatDate(f.reviewed_at ?? f.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {panel.mode === 'detail' && (
          <>
            <PanelTopBar
              onBack={panel.cluster.fanfics.length > 1 ? () => setPanel({ mode: 'list', cluster: panel.cluster }) : null}
              onClose={closePanel}
            />
            <div
              key={contentKey}
              className="pt-4 flex-1 min-h-0 flex flex-col animate-[fade-in_150ms_ease-in-out]"
            >
              <div className="flex-1 min-h-0 overflow-y-auto" style={scrollbarStyle}>
                <img
                  src={panel.fanfic.image_url}
                  alt={panel.fanfic.city_name}
                  className="w-full h-[200px] object-cover"
                />

                <div className="pt-4 space-y-2">
                  <p className="font-editorial text-base text-canvas">
                    {panel.fanfic.author?.name ?? 'Anónimo'}
                  </p>
                  <p className="label-caps text-xs text-primary flex items-center gap-1.5">
                    <PinIcon />
                    {panel.fanfic.city_name}
                  </p>
                  <p className="text-xs text-canvas/50">
                    {formatDate(panel.fanfic.reviewed_at ?? panel.fanfic.created_at)}
                  </p>

                  {panel.fanfic.caption && (
                    <p className="text-sm text-canvas/70 leading-relaxed italic border-l-2 border-primary/40 pl-3">
                      {panel.fanfic.caption}
                    </p>
                  )}

                  <button
                    onClick={() => setFullscreen(true)}
                    className="block text-xs uppercase tracking-wide pb-0.5 text-primary border-b border-primary transition-colors"
                  >
                    Ver imagen completa
                  </button>
                </div>
              </div>

              <div className="flex-shrink-0 mt-4 pt-4 border-t border-canvas/20">
                <p className="font-editorial text-base text-canvas mb-1">¿Tienes tu propio Troncodrilo?</p>
                <p className="text-xs text-canvas/60 mb-3">Comparte tu fanfic en el mapa</p>

                {user ? (
                  <button
                    onClick={() => navigate('/mi-fanfic')}
                    className="bg-primary text-white px-8 py-2 uppercase tracking-wide text-sm
                      text-center transition-colors hover:bg-primary/90 rounded-[2px]"
                  >
                    Subir fanfic
                  </button>
                ) : (
                  <p className="text-xs text-canvas/60">
                    <Link to="/login" className="text-primary transition-colors hover:text-primary/70">
                      Inicia sesión
                    </Link>
                    {' '}para participar
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

      {/* ── CTA flotante — fijo abajo a la izquierda, oculto con el panel abierto ── */}
      {!panelOpen && (
        <button
          onClick={() => navigate('/mi-fanfic')}
          className="btn-primary fixed z-[5] flex items-center gap-2 !px-5 !py-2.5"
          style={{ bottom: '24px', left: '24px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Sé parte de la comunidad
        </button>
      )}
    </div>
  )
}
