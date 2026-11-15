import React from 'react'
import useMagnetic from '../hooks/useMagnetic'

export default function CourseCard({
  code,
  section,
  title,
  credits,
  department,
  instructor,
  schedule,
  room,
  seatsAvailable,
  seatsTotal,
  status = 'Open', // 'Open' | 'Waitlist' | 'Closed'
  selected = false,
  onSelect,
  onAddToCart,
  isInCart = false,
}) {
  const isWaitlist = status === 'Waitlist'
  const isClosed = status === 'Closed'
  const magneticRef = useMagnetic({ strength: 0.12, maxShift: 2.5 })

  return (
    <article
      ref={magneticRef}
      onClick={onSelect}
      className={`premium-card premium-card--interactive group relative flex flex-col justify-between p-5 transition-all cursor-pointer border ${
        selected
          ? 'border-teal-500/80 shadow-[0_0_25px_rgba(20,184,166,0.2)] ring-1 ring-teal-500/50'
          : 'border-[#1E344D] hover:border-teal-500/40'
      }`}
    >
      {selected && (
        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-teal-500 text-[#04211D] font-mono text-[11px] font-bold flex items-center gap-1 shadow-md">
          <span className="material-symbols-outlined text-[13px]">visibility</span>
          <span>Inspecting</span>
        </div>
      )}

      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {code}
            </span>
            {section && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#12243A] text-[#94A3B8] border border-[#1E344D]">
                {section}
              </span>
            )}
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              {credits} CR
            </span>
          </div>

          <span
            className={`badge ${
              isClosed
                ? 'badge-neutral'
                : isWaitlist
                ? 'badge-info'
                : 'badge-teal'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors leading-snug mb-2.5">
          {title}
        </h3>

        {/* Metadata Details */}
        <div className="space-y-1.5 text-xs text-[#94A3B8] mb-4">
          {instructor && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#64748B]">person</span>
              <span>{instructor}</span>
            </div>
          )}
          {schedule && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-sky-400">calendar_today</span>
              <span>{schedule}</span>
            </div>
          )}
          {room && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#64748B]">location_on</span>
              <span>{room}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Seats & Action */}
      <div className="pt-3 border-t border-[#1E344D] flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#64748B] font-mono uppercase tracking-wider">Capacity</span>
          <span className="font-mono text-xs font-semibold text-slate-200">
            {seatsAvailable} / {seatsTotal} seats
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart && onAddToCart()
          }}
          disabled={isClosed || isInCart}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isInCart
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 cursor-default'
              : isClosed
              ? 'bg-[#12243A] text-[#64748B] cursor-not-allowed border border-[#1E344D]'
              : isWaitlist
              ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30'
              : 'btn-primary-neo'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isInCart ? 'check' : isWaitlist ? 'hourglass_top' : 'add'}
          </span>
          <span>{isInCart ? 'Selected' : isWaitlist ? 'Waitlist' : 'Select course'}</span>
        </button>
      </div>
    </article>
  )
}
