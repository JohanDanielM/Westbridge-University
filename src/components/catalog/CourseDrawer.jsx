import React, { useEffect, useRef, useState } from 'react'
import { studentAPI } from '../../services/api'

export default function CourseDrawer({
  course,
  isOpen = false,
  onClose,
  isSelected = false,
  onToggleSelect,
  onJoinWaitlist,
  isWaitlisted = false,
  waitlistRank = null,
}) {
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousActiveElement = useRef(null)

  const [previewData, setPreviewData] = useState({ sessions: [], conflicts: [] })
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)

  const code = course?.course_code || course?.code || ''

  useEffect(() => {
    if (isOpen && code) {
      setLoadingPreview(true)
      studentAPI
        .getPreviewSlot(code)
        .then((data) => {
          setPreviewData(data || { sessions: [], conflicts: [] })
        })
        .catch((err) => {
          console.warn('Failed to load schedule preview:', err)
        })
        .finally(() => {
          setLoadingPreview(false)
        })
    } else {
      setPreviewData({ sessions: [], conflicts: [] })
      setWaitlistSuccess(false)
    }
  }, [isOpen, code])

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      closeButtonRef.current?.focus()
      document.body.style.overflow = 'hidden'

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose && onClose()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !course) return null

  const title = course.course_name || course.title || ''
  const credits = course.credits ?? 4
  const section = course.section || 'SEC A'
  const department = course.department || 'Computer Science'
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

  const capacityPct = Math.min(100, Math.round((enrolled / (capacity || 1)) * 100))

  const prereqs = Array.isArray(course.prerequisites)
    ? course.prerequisites
    : typeof course.prerequisites === 'string' && course.prerequisites.trim().length > 0
    ? course.prerequisites.split(',').map((p) => p.trim())
    : []

  const missingPrereqs = course.missing_prereqs || []

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#071426]/70 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-drawer-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl h-full bg-[#0D1B2E] border-l border-[#1E344D] shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-right p-6 sm:p-8"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E344D]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                  {code}
                </span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
                  {credits} Academic Credits
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#12243A] text-[#94A3B8] border border-[#1E344D]">
                  {section}
                </span>
              </div>
              <h2
                id="course-drawer-title"
                className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight pt-1"
              >
                {title}
              </h2>
              <p className="font-mono text-xs text-[#94A3B8]">
                Department of {department}
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#12243A] border border-transparent hover:border-[#1E344D] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]">
              <span className="text-[#64748B] text-[10px] block font-mono uppercase tracking-wider mb-1">
                Faculty Instructor
              </span>
              <span className="text-white font-semibold flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[16px] text-teal-400">person</span>
                {instructor}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]">
              <span className="text-[#64748B] text-[10px] block font-mono uppercase tracking-wider mb-1">
                Room Location
              </span>
              <span className="text-white font-semibold flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[16px] text-sky-400">location_on</span>
                {room}
              </span>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]">
              <span className="text-[#64748B] text-[10px] block font-mono uppercase tracking-wider mb-1">
                Schedule &amp; Meeting Times
              </span>
              <span className="text-white font-semibold flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[16px] text-sky-400">calendar_today</span>
                {schedule}
              </span>
            </div>
          </div>

          {/* Seating Capacity Meter */}
          <div className="p-4 rounded-xl bg-[#071426] border border-[#1E344D] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#94A3B8] uppercase tracking-wider text-[11px]">Seating Capacity</span>
              <span className="font-semibold text-white">
                {enrolled} / {capacity} seats ({capacityPct}% filled)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#12243A] overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isFull ? 'bg-amber-400' : isClosed ? 'bg-[#64748B]' : 'bg-teal-400'
                }`}
                style={{ width: `${capacityPct}%` }}
              ></div>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#94A3B8] font-semibold">
              Course Prerequisites
            </h3>
            {prereqs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prereqs.map((prereq, idx) => {
                  const isMissing = missingPrereqs.includes(prereq.toUpperCase())
                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 border ${
                        isMissing
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {isMissing ? 'warning' : 'check_circle'}
                      </span>
                      <span>{prereq}</span>
                      {isMissing && <span className="text-[10px] opacity-75 font-sans">(Missing)</span>}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8] font-mono bg-[#071426] p-3 rounded-xl border border-[#1E344D]">
                None required for this course.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#94A3B8] font-semibold">
              Course Overview &amp; Syllabus
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-[#071426] p-4 rounded-xl border border-[#1E344D]">
              {course.description || 'Comprehensive curriculum covering theoretical foundations, empirical methods, and laboratory projects.'}
            </p>
          </div>

          {/* Schedule Preview Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#94A3B8] font-semibold">
                Schedule Preview
              </h3>
              {loadingPreview && (
                <span className="text-[10px] text-teal-400 font-mono animate-pulse">Checking conflicts...</span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D] space-y-2.5">
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => {
                  const hasSession = (previewData.sessions || []).some((s) => s.day === day)
                  return (
                    <div
                      key={day}
                      className={`py-1.5 px-1 rounded-lg text-xs font-mono transition-all ${
                        hasSession
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold shadow-[0_0_8px_rgba(20,184,166,0.2)]'
                          : 'bg-[#12243A]/40 text-[#64748B] border border-[#1E344D]/30'
                      }`}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>

              {/* Conflict Alert in Rose Tokens */}
              {previewData.conflicts && previewData.conflicts.length > 0 ? (
                <div className="space-y-1.5 pt-1 border-t border-[#1E344D]/50">
                  {previewData.conflicts.map((conf, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
                    >
                      <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0 mt-0.5">warning</span>
                      <span>{conf.message || `Conflicts with ${conf.course_code} on ${conf.day} ${conf.start}.`}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-teal-400/90 font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>No schedule conflicts with your current registrations.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="pt-6 mt-6 border-t border-[#1E344D]">
          {isFull ? (
            isWaitlisted || waitlistSuccess ? (
              <div className="w-full py-3.5 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                <span>On waitlist{waitlistRank ? ` (#${waitlistRank})` : ''}</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={joiningWaitlist}
                onClick={async () => {
                  try {
                    setJoiningWaitlist(true)
                    if (onJoinWaitlist) {
                      await onJoinWaitlist(course)
                    } else {
                      await studentAPI.joinWaitlist(code)
                    }
                    setWaitlistSuccess(true)
                  } catch (err) {
                    alert(err.message || 'Failed to join waitlist')
                  } finally {
                    setJoiningWaitlist(false)
                  }
                }}
                className="w-full py-3.5 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                <span>{joiningWaitlist ? 'Joining waitlist...' : 'Join waitlist'}</span>
              </button>
            )
          ) : isClosed ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 bg-[#12243A] text-[#64748B] cursor-not-allowed border border-[#1E344D]"
            >
              <span>Course Closed</span>
            </button>
          ) : isSelected ? (
            <button
              type="button"
              onClick={() => {
                onToggleSelect && onToggleSelect(course)
              }}
              className="w-full py-3.5 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 btn-secondary-neo text-rose-300 hover:text-rose-200 border border-rose-500/30"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              <span>Remove course from Selected Courses</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onToggleSelect && onToggleSelect(course)
              }}
              className="w-full py-3.5 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 btn-primary-neo shadow-lg shadow-teal-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Select course</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
