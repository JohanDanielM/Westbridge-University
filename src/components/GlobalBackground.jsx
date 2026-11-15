import React, { useEffect } from 'react'

export default function GlobalBackground() {
  useEffect(() => {
    // Only track mouse for spotlight on devices with a fine pointer (mouse/trackpad),
    // including Windows laptops/desktops with touchscreens enabled.
    if (typeof window === 'undefined') return
    const hasFinePointer = window.matchMedia('(pointer: fine), (any-pointer: fine)').matches
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hasFinePointer || isReducedMotion) return

    let rafId = null
    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const x = `${((e.clientX / window.innerWidth) * 100).toFixed(2)}%`
        const y = `${((e.clientY / window.innerHeight) * 100).toFixed(2)}%`
        document.documentElement.style.setProperty('--spot-x', x)
        document.documentElement.style.setProperty('--spot-y', y)
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="app-bg" aria-hidden="true">
      <div className="app-bg__blob app-bg__blob--teal" />
      <div className="app-bg__blob app-bg__blob--blue" />
      <div className="app-bg__dots" />
      <div className="app-bg__grain" />
      <div className="app-bg__spot" />
    </div>
  )
}

