import { useEffect, useState } from 'react'

export type HeaderState = 'transparent' | 'solid'

// solid: en el top (scrollY < threshold) o al detectar scroll hacia arriba
// transparent: solo mientras el usuario baja y ya no está en el top
export function useHeaderState(threshold = 10): HeaderState {
  const [state, setState] = useState<HeaderState>('solid')

  useEffect(() => {
    let lastY = window.scrollY

    function onScroll() {
      const currentY = window.scrollY

      if (currentY < threshold) {
        setState('solid')
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
