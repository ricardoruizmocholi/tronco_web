import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// React Router no restablece el scroll al cambiar de ruta: la página nueva
// se abría en la posición de la anterior (sobre todo visible en móvil).
// Sube al inicio en cada navegación nueva (PUSH/REPLACE), salvo:
//  - POP (atrás/adelante): se deja al navegador restaurar la posición
//  - URLs con #ancla: el navegador se encarga de ir al ancla
// Solo depende de pathname: cambiar filtros (?query) no debe saltar arriba.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType === 'POP' || hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reaccionar al cambio de ruta
  }, [pathname])

  return null
}
