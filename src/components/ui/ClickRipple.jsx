import { useEffect } from 'react'

/**
 * The page's answer to a click, at the cursor. Press feedback on a control
 * answers for the control; this ring answers for the click itself, wherever it
 * lands. One fixed layer above everything, never taking a pointer event, with
 * each ring removing itself when its animation ends. Reduced-motion readers
 * get nothing, which is the point of asking.
 */
export default function ClickRipple() {
  useEffect(() => {
    const layer = document.createElement('div')
    layer.className = 'click-layer'
    document.body.appendChild(layer)

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onPointerDown = (event) => {
      if (still.matches || event.button !== 0) return
      const ripple = document.createElement('span')
      ripple.className = 'click-ripple'
      ripple.style.left = `${event.clientX}px`
      ripple.style.top = `${event.clientY}px`
      layer.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove())
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      layer.remove()
    }
  }, [])

  return null
}
