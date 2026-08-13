import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// Solo transiciones de animación (fusión/separación de clusters, patas de spiderfy) — no
// trae el círculo de color por defecto, que se sustituye por completo con iconCreateFunction.
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { getAllFanfics } from '../api/fanfics'
import { buildFanficMarkerIcon, clusterIconCreateFunction } from '../lib/mapIcons'
import { useAuth } from '../hooks/useAuth'
import { useAuthModal } from '../context/AuthModalContext'
import MapSidePanel, { type PanelState } from '../components/MapSidePanel'
import FanficUploadModal from '../components/FanficUploadModal'
import type { Fanfic } from '../types/fanfic'

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

// Leaflet no tipa fanficData en L.Marker — se adjunta en el ref del marker para poder
// recuperar el Fanfic original desde MarkerCluster.getAllChildMarkers() al hacer click
// en un cluster (esa API solo devuelve L.Marker[], sin metadatos propios).
interface FanficMarkerInstance extends L.Marker {
  fanficData?: Fanfic
}

export default function MapaTroncodriloPage() {
  const { user } = useAuth()
  const { openModal } = useAuthModal()
  const [fanfics, setFanfics] = useState<Fanfic[]>([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel]     = useState<PanelState>({ mode: 'closed' })
  const [showUpload, setShowUpload]           = useState(false)

  const clusterGroupRef = useRef<L.MarkerClusterGroup>(null)
  const markerIcon = useMemo(() => buildFanficMarkerIcon(), [])

  useEffect(() => {
    getAllFanfics()
      .then(setFanfics)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Click en cluster: además del zoom nativo de Leaflet.markercluster
  // (zoomToBoundsOnClick, activado por defecto), abre el panel con la lista de fanfics
  // del cluster. Se adjunta una vez — cada marker lleva su propio Fanfic en fanficData.
  useEffect(() => {
    const group = clusterGroupRef.current
    if (!group) return

    function handleClusterClick(e: L.LeafletEvent) {
      const cluster = (e as unknown as { layer: L.MarkerCluster }).layer
      const clusterFanfics = cluster
        .getAllChildMarkers()
        .map(m => (m as FanficMarkerInstance).fanficData)
        .filter((f): f is Fanfic => Boolean(f))

      setPanel({ mode: 'cluster', fanfics: clusterFanfics })
    }

    group.on('clusterclick', handleClusterClick)
    return () => { group.off('clusterclick', handleClusterClick) }
  }, [])

  function handleUploadClick() {
    if (user) {
      setShowUpload(true)
    } else {
      openModal('login')
    }
  }

  function handleUploadSuccess(fanfic: Fanfic) {
    setShowUpload(false)
    setPanel({ mode: 'success', fanfic })
  }

  const panelClosed = panel.mode === 'closed'

  return (
    <div className="relative w-full bg-dark -mt-12 md:-mt-14 overflow-hidden" style={{ height: '100vh' }}>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#1C1F1A' }}
      >
        <TileLayer
          url={DARK_TILE_URL}
          attribution={DARK_TILE_ATTRIBUTION}
          subdomains="abcd"
          detectRetina
        />

        <MarkerClusterGroup
          ref={clusterGroupRef}
          iconCreateFunction={clusterIconCreateFunction}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {fanfics.map(fanfic => (
            <Marker
              key={fanfic.id}
              position={[fanfic.latitude, fanfic.longitude]}
              icon={markerIcon}
              ref={instance => {
                if (instance) (instance as FanficMarkerInstance).fanficData = fanfic
              }}
              eventHandlers={{
                click: () => setPanel({ mode: 'detail', fanfic }),
              }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Overlay circular decorativo — sensación de globo, sin interceptar clicks del mapa */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(150vw, 150vh)',
          height: 'min(150vw, 150vh)',
          borderRadius: '50%',
          border: '2px solid rgba(91,187,42,0.3)',
          zIndex: 30,
        }}
      />

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Leyenda */}
      {!loading && (
        <div className="absolute bottom-6 left-6 z-20 bg-dark/70 backdrop-blur-sm px-4 py-2.5
          text-canvas/50 text-xs pointer-events-none select-none">
          {fanfics.length} fanfic{fanfics.length !== 1 ? 's' : ''} en el mapa
        </div>
      )}

      {/* CTA flotante — oculto mientras el panel está abierto */}
      {panelClosed && (
        <button
          onClick={handleUploadClick}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2
            bg-primary text-white font-medium text-sm px-5 py-3
            hover:bg-primary/90 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Subir mi fanfic
        </button>
      )}

      <MapSidePanel
        state={panel}
        onClose={() => setPanel({ mode: 'closed' })}
        onSelectFanfic={fanfic => setPanel({ mode: 'detail', fanfic })}
        onUploadClick={handleUploadClick}
      />

      {showUpload && (
        <FanficUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

    </div>
  )
}
