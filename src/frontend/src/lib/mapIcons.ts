import L from 'leaflet'

// className: '' anula la clase por defecto de Leaflet (leaflet-div-icon), que pinta un
// recuadro blanco con borde detrás de cualquier divIcon si no se sobreescribe.
export function buildFanficMarkerIcon(): L.DivIcon {
  return L.divIcon({
    html: '<div style="width:12px;height:12px;border-radius:50%;background:#5BBB2A;border:2px solid #FAFAF8"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// Tamaño proporcional a la cantidad de fanfics agrupados.
export function clusterIconCreateFunction(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 30 : count < 50 ? 40 : 50
  const fontSize = size <= 30 ? 11 : size <= 40 ? 13 : 15

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:#1C1F1A;border:2px solid #5BBB2A;
      display:flex;align-items:center;justify-content:center;
      color:#FAFAF8;font-weight:700;font-size:${fontSize}px;
      font-family:inherit;
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
