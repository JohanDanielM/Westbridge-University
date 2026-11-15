import React from 'react'
import useMagnetic from '../hooks/useMagnetic'

export default function GlassCard({ children, className = '', hover = false, ...props }) {
  const magneticRef = useMagnetic({ strength: 0.12, maxShift: 2, disabled: !hover })

  return (
    <div
      ref={magneticRef}
      className={`premium-card ${
        hover ? 'premium-card--interactive cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
