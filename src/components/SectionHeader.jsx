import React from 'react'

export default function SectionHeader({
  categoryTag,
  title,
  subtitle,
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 ${className}`}>
      <div className="flex flex-col min-w-0">
        {categoryTag && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
              {categoryTag}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#94A3B8] mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  )
}
