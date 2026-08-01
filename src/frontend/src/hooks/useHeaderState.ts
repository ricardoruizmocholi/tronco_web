import { useEffect, useState } from 'react'

export type HeaderState = 'transparent' | 'solid'

// transparent: al cargar (scrollY < threshold) o mientras el usuario baja
// solid: al detectar scroll hacia arriba
export function useHeaderState(threshold = 10): HeaderState {
  const [state, setState] = useState<HeaderState>('transparent')

  useEffect(() => {
    let lastY = window.scrollY

    function onScroll() {
      const currentY = window.scrollY

      if (currentY < threshold) {
        setState('transparent')
        lastY = currentY
        return
      }

      const delta = currentY - lastY
      if (Math.abs(delta) < threshold) return

      setState(delta > 0 ? 'transparent' : 'solid')
      lastY = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return state
}
