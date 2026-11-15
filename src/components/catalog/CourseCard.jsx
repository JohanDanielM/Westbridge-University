import React from 'react'

export default function CourseCard({
  course,
  isSelected = false,
  onSelect,
  onToggleSelect,
}) {
  const code = course.course_code || course.code || ''
  const title = course.course_name || course.title || ''
  const credits = course.credits ?? 4
  const section = course.section || 'SEC A'
  const instructor = course.faculty_name || course.instructor || 'TBA'
  const room = course.room || 'TBA'
  
  const schedule = course.schedule || (
    course.days && course.days.length > 0
      ? `${course.days.join(', ')} ${course.start_time || ''} – ${course.end_time || ''}`
      : 'TBA'
  )

  const capacity = course.capacity ?? 40
  const enrolled = course.enrolled ?? 0
  const rawStatus = (course.status || 'open').toLowerCase()
  const isFull = rawStatus === 'full' || rawStatus === 'waitlist' || enrolled >= capacity
  const isClosed = rawStatus === 'closed'

  const statusLabel = isClosed ? 'Closed' : isFull ? 'Waitlist' : 'Open'
  const badgeClass = isClosed
    ? 'badge-neutral'
    : isFull
    ? 'badge-info'
    : 'badge-teal'

  return (
    <article
      onClick={() => onSelect && onSelect(course)}
      className={`premium-card premium-card--interactive group relative flex flex-col justify-between p-5 transition-all cursor-pointer border ${
        isSelected
          ? 'border-teal-500/80 shadow-[0_0_25px_rgba(20,184,166,0.2)] ring-1 ring-teal-500/50 card-lift'
          : 'border-[#1E344D] hover:border-teal-500/40'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {code}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#12243A] text-[#94A3B8] border border-[#1E344D]">
              {section}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              {credits} CR
            </span>
          </div>

          <span className={`badge ${badgeClass}`}>
            {statusLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors leading-snug mb-2.5">
          {title}
        </h3>

        {/* Metadata Details */}
        <div className="space-y-1.5 text-xs text-[#94A3B8] mb-4">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#64748B]">person</span>
            <span>{instructor}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-sky-400">calendar_today</span>
            <span>{schedule}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#64748B]">location_on</span>
            <span>{room}</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Capacity & Action Button */}
      <div className="pt-3 border-t border-[#1E344D] flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#64748B] font-mono uppercase tracking-wider">Capacity</span>
          <span className="font-mono text-xs font-semibold text-slate-200">
            {enrolled} / {capacity} seats
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isFull ? (
            <button
              type="button"
              disabled
              title="Waitlist opens in the next release"
              className="px-3 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 bg-sky-500/10 text-sky-400/60 border border-sky-500/20 cursor-not-allowed opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
              <span>Join waitlist</span>
            </button>
          ) : isClosed ? (
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-xl font-mono text-xs font-semibold bg-[#12243A] text-[#64748B] cursor-not-allowed border border-[#1E344D]"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Closed</span>
            </button>
          ) : isSelected ? (
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded-xl font-mono text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">check</span>
                <span>Selected</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect && onToggleSelect(course)
                }}
                className="px-2 py-1 rounded-xl font-mono text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title="Remove course"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect && onToggleSelect(course)
              }}
              className="btn-primary-neo px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Select course</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
