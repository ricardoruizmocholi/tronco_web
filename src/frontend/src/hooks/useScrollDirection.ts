import { useEffect, useState } from 'react'

type ScrollDirection = 'up' | 'down'

export function useScrollDirection(threshold = 10): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up')

  useEffect(() => {
    let lastY = window.scrollY

    function onScroll() {
      const currentY = window.scrollY
      const delta = currentY - lastY
      if (Math.abs(delta) < threshold) return
      setDirection(delta > 0 ? 'down' : 'up')
      lastY = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}
