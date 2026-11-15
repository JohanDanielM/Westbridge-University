import { useRef, useEffect } from 'react'

/**
 * useMagnetic – Applies a subtle magnetic attraction effect to a DOM element.
 *
 * The element translates slightly toward the pointer when the cursor is
 * inside its bounds, and springs back smoothly when the cursor leaves.
 *
 * Requirements:
 *   • Fine-pointer device (mouse, trackpad), including Windows laptops with touchscreens.
 *   • prefers-reduced-motion is NOT active.
 *   • Cleans up all listeners and frames on unmount.
 *   • Never interferes with layout, click targets, or keyboard interaction.
 *
 * @param {Object} opts
 * @param {number} opts.strength  – Multiplier applied to pointer offset (default 0.3)
 * @param {number} opts.maxShift  – Maximum pixels the element may move (default 5)
 * @param {number} opts.lerp      – Linear interpolation factor per frame (default 0.16)
 * @param {boolean} opts.disabled – Force-disable the effect
 * @returns {React.RefObject} Attach to the element that should move.
 */
export default function useMagnetic({
  strength = 0.3,
  maxShift = 5,
  lerp = 0.16,
  disabled = false,
} = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || disabled) return

    // Gate: fine pointer (supports mice on Windows touchscreens) + motion OK
    const hasFinePointer = window.matchMedia('(pointer: fine), (any-pointer: fine)').matches
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasFinePointer || isReducedMotion) return

    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let rafId = null
    let animating = false

    const tick = () => {
      const dx = targetX - currentX
      const dy = targetY - currentY

      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        currentX = targetX
        currentY = targetY
        if (currentX === 0 && currentY === 0) {
          el.style.transform = ''
          el.style.willChange = ''
        } else {
          el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`
        }
        animating = false
        return
      }

      currentX += dx * lerp
      currentY += dy * lerp
      el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`
      rafId = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      if (!animating) {
        animating = true
        el.style.willChange = 'transform'
        rafId = requestAnimationFrame(tick)
      }
    }

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const offX = (e.clientX - cx) * strength
      const offY = (e.clientY - cy) * strength

      targetX = Math.max(-maxShift, Math.min(maxShift, offX))
      targetY = Math.max(-maxShift, Math.min(maxShift, offY))
      startLoop()
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
      startLoop()
    }

    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave, { passive: true })

    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
      el.style.transform = ''
      el.style.willChange = ''
    }
  }, [strength, maxShift, lerp, disabled])

  return ref
}
