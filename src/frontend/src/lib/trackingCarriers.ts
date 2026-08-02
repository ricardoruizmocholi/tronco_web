export interface Carrier {
  value: string
  label: string
  urlTemplate: string | null
}

// urlTemplate usa {number} como marcador de posición del número de seguimiento.
// "Otro" no tiene plantilla — el admin debe rellenar la URL a mano si quiere ofrecer un link.
export const CARRIERS: Carrier[] = [
  {
    value: 'Correos',
    label: 'Correos',
    urlTemplate: 'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?referencia={number}',
  },
  {
    value: 'MRW',
    label: 'MRW',
    urlTemplate: 'https://www.mrw.es/seguimiento_envios/MRWenvio.asp?Expedicion={number}',
  },
  {
    value: 'SEUR',
    label: 'SEUR',
    urlTemplate: 'https://www.seur.com/livetracking/?segOnlineIdentificador={number}',
  },
  {
    value: 'DHL',
    label: 'DHL',
    urlTemplate: 'https://www.dhl.com/es-es/home/tracking.html?tracking-id={number}',
  },
  {
    value: 'GLS',
    label: 'GLS',
    urlTemplate: 'https://gls-group.eu/ES/es/seguimiento-envio?match={number}',
  },
  {
    value: 'Otro',
    label: 'Otro',
    urlTemplate: null,
  },
]

export function buildTrackingUrl(carrier: string, trackingNumber: string): string {
  const found = CARRIERS.find(c => c.value === carrier)
  if (!found?.urlTemplate || !trackingNumber) return ''
  return found.urlTemplate.replace('{number}', encodeURIComponent(trackingNumber))
}
