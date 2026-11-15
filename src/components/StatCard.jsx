import React from 'react'
import useMagnetic from '../hooks/useMagnetic'

export default function StatCard({
  title,
  value,
  valueSuffix,
  icon,
  iconColor = 'text-teal-400',
  iconBg = 'bg-teal-500/10',
  footerText,
  footerIcon,
  progress,
  progressColor = 'from-teal-400 to-cyan-400',
  className = '',
}) {
  const magneticRef = useMagnetic({ strength: 0.15, maxShift: 3 })

  return (
    <div ref={magneticRef} className={`premium-card p-5 flex flex-col justify-between border border-[#1E344D] ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
          {title}
        </span>
        {icon && (
          <div className={`w-9 h-9 rounded-xl ${iconBg} border border-[#1E344D]/50 flex items-center justify-center ${iconColor}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
        )}
      </div>

      <div className="my-3">
        <div className="flex items-baseline gap-1.5 text-3xl font-extrabold text-white tracking-tight">
          {value}
          {valueSuffix && (
            <span className="text-sm font-normal text-[#64748B]">
              {valueSuffix}
            </span>
          )}
        </div>

        {typeof progress === 'number' && (
          <div className="w-full h-1.5 rounded-full bg-[#12243A] mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            ></div>
          </div>
        )}
      </div>

      {footerText && (
        <div className="flex items-center justify-between text-xs pt-1 text-[#94A3B8] border-t border-[#1E344D]/40">
          <div className="flex items-center gap-1.5 truncate">
            {footerIcon && (
              <span className={`material-symbols-outlined text-[15px] ${iconColor} shrink-0`}>
                {footerIcon}
              </span>
            )}
            <span className="truncate">{footerText}</span>
          </div>
          {typeof progress === 'number' && (
            <span className="font-mono text-[11px] text-[#64748B] shrink-0 ml-2">
              {progress}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
