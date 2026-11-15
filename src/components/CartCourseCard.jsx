import React from 'react'

export default function CartCourseCard({
  code,
  section = 'Sec A',
  credits = 4,
  title,
  instructor,
  schedule,
  room,
  hasConflict = false,
  conflictMessage,
  onRemove,
  onSectionChange,
  availableSections = ['Sec A', 'Sec B'],
  seatsLeft,
  isFull = false,
  isWaitlisted = false,
  waitlistRank = null,
  onJoinWaitlist,
}) {
  return (
    <article className="premium-card group p-5 transition-all duration-200 border border-[#1E344D]">
      <div className="flex flex-col gap-3.5">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
              {code}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#12243A] text-[#94A3B8] border border-[#1E344D] font-medium">
              {section}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              {credits} CR
            </span>
            {seatsLeft !== undefined && (
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                seatsLeft <= 0
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-[#12243A] text-slate-300 border-[#1E344D]'
              }`}>
                {seatsLeft <= 0 ? 'Full (0 seats)' : `${seatsLeft} seats left`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isFull && (
              isWaitlisted ? (
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                  <span>On waitlist {waitlistRank ? `(#${waitlistRank})` : ''}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onJoinWaitlist}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-semibold flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                  <span>Join waitlist</span>
                </button>
              )
            )}

            <button
              onClick={onRemove}
              aria-label={`Remove ${code}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 transition-all focus:outline-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        {/* Title and details */}
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-2 text-xs text-[#94A3B8]">
            {schedule && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-sky-400">calendar_today</span>
                <span>{schedule}</span>
              </span>
            )}
            {room && (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#64748B]">location_on</span>
                <span>{room}</span>
              </span>
            )}
            {instructor && (
              <span className="font-mono text-[11px] text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                {instructor}
              </span>
            )}
          </div>
        </div>

        {/* Conflict / Warning Box if any */}
        {hasConflict && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <span className="material-symbols-outlined text-[17px] text-amber-400 shrink-0 mt-0.5">
              warning
            </span>
            <span className="leading-relaxed">
              {conflictMessage || 'Prerequisite requirement or schedule conflict detected.'}
            </span>
          </div>
        )}

        {/* Bottom Section Picker */}
        <div className="pt-2 flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#1E344D]">
          <span className="font-medium">Change section:</span>
          <select
            value={section}
            onChange={(e) => onSectionChange && onSectionChange(e.target.value)}
            className="bg-[#071426] border border-[#1E344D] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-teal-500 focus:outline-none"
          >
            {availableSections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  )
}
