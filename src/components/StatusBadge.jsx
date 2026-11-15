import React from 'react'

export default function StatusBadge({ variant = 'neutral', children, icon, className = '' }) {
  const variantMap = {
    open: 'badge-teal',
    success: 'badge-teal',
    waitlist: 'badge-info',
    warning: 'badge-warn',
    closed: 'badge-neutral',
    error: 'badge-danger',
    action: 'badge-info font-semibold uppercase tracking-wider',
    tertiary: 'badge-info',
    neutral: 'badge-neutral',
    info: 'badge-info',
  }

  const badgeClass = variantMap[variant] || 'badge-neutral'

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}
      {children}
    </span>
  )
}
