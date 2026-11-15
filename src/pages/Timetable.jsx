import React, { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { studentAPI, facultyAPI } from '../services/api'

// Deterministic color palette with glassmorphism and subtle glowing borders
const PALETTES = [
  {
    bg: 'bg-teal-500/10 backdrop-blur-md',
    border: 'border border-teal-500/30',
    hover: 'hover:border-teal-400/80 hover:shadow-glow-teal hover:scale-[1.02] transition-all',
    text: 'text-teal-300',
    badge: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    dot: 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)]',
  },
  {
    bg: 'bg-cyan-500/10 backdrop-blur-md',
    border: 'border border-cyan-500/30',
    hover: 'hover:border-cyan-400/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:scale-[1.02] transition-all',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]',
  },
  {
    bg: 'bg-sky-500/10 backdrop-blur-md',
    border: 'border border-sky-500/30',
    hover: 'hover:border-sky-400/80 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:scale-[1.02] transition-all',
    text: 'text-sky-300',
    badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    dot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
  },
  {
    bg: 'bg-violet-500/10 backdrop-blur-md',
    border: 'border border-violet-500/30',
    hover: 'hover:border-violet-400/80 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:scale-[1.02] transition-all',
    text: 'text-violet-300',
    badge: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    dot: 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]',
  },
  {
    bg: 'bg-emerald-500/10 backdrop-blur-md',
    border: 'border border-emerald-500/30',
    hover: 'hover:border-emerald-400/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  },
  {
    bg: 'bg-amber-500/10 backdrop-blur-md',
    border: 'border border-amber-500/30',
    hover: 'hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:scale-[1.02] transition-all',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  },
]

function getCoursePalette(code = '') {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

function timeToMinutes(tStr) {
  if (!tStr) return 0
  const [h, m] = tStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

const START_HOUR = 8 // 08:00
const END_HOUR = 20  // 20:00
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60
const ROW_HEIGHT_PX = 80 // Substantial row height
const GRID_HEIGHT_PX = (END_HOUR - START_HOUR) * ROW_HEIGHT_PX // 960px

export default function Timetable() {
  const location = useLocation()
  const { user } = useAuth()
  const { cart } = useApp()

  const isFaculty = location.pathname.startsWith('/faculty') || user?.role === 'faculty'

  const [loading, setLoading] = useState(true)
  const [timetableData, setTimetableData] = useState({
    enrolled: [],
    selected: [],
    conflicts: [],
  })
  const [activeSessionModal, setActiveSessionModal] = useState(null)
  const [activeMobileDay, setActiveMobileDay] = useState('Mon')
  const [currentTimePercent, setCurrentTimePercent] = useState(null)

  // Real-time current time indicator (updates every 60s)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      const startMins = START_HOUR * 60
      const endMins = END_HOUR * 60
      if (mins >= startMins && mins <= endMins) {
        setCurrentTimePercent(((mins - startMins) / TOTAL_MINUTES) * 100)
      } else {
        setCurrentTimePercent(null)
      }
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchTimetable = async () => {
    try {
      setLoading(true)
      if (isFaculty) {
        const res = await facultyAPI.getTimetable()
        setTimetableData({
          enrolled: res.sessions || res.enrolled || [],
          selected: [],
          conflicts: [],
        })
      } else {
        const selectedCodes = cart ? cart.map((c) => (typeof c === 'string' ? c : c.course_code)) : []
        const res = await studentAPI.getTimetable(selectedCodes)
        setTimetableData(res || { enrolled: [], selected: [], conflicts: [] })
      }
    } catch (err) {
      console.error('Failed to load timetable data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimetable()
  }, [isFaculty, cart])

  const allSessions = useMemo(() => {
    const list = []
    const conflictSet = new Set()
    for (const conf of timetableData.conflicts || []) {
      if (conf.course_a) conflictSet.add(`${conf.course_a}-${conf.day}`)
      if (conf.course_b) conflictSet.add(`${conf.course_b}-${conf.day}`)
    }

    for (const s of timetableData.enrolled || []) {
      const isConf = conflictSet.has(`${s.course_code}-${s.day}`)
      list.push({ ...s, isSelected: false, isConflict: isConf })
    }
    for (const s of timetableData.selected || []) {
      const isConf = conflictSet.has(`${s.course_code}-${s.day}`)
      list.push({ ...s, isSelected: true, isConflict: isConf })
    }
    return list
  }, [timetableData])

  const hasSaturday = useMemo(() => {
    return allSessions.some((s) => s.day === 'Sat')
  }, [allSessions])

  const days = useMemo(() => {
    return hasSaturday ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  }, [hasSaturday])

  const dayNames = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
  }

  // Today's classes or next upcoming widget
  const todayCode = useMemo(() => {
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const d = map[new Date().getDay()]
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(d) ? d : 'Mon'
  }, [])

  const todaysSessions = useMemo(() => {
    return allSessions
      .filter((s) => s.day === todayCode)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
  }, [allSessions, todayCode])

  return (
    <AppLayout pageTitle="Timetable">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-[#0A192B]/85 border border-[#1E344D] backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                {isFaculty ? 'Faculty Teaching Schedule' : 'Student Academic Calendar'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8]">Fall 2026 Term</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span className="material-symbols-outlined text-teal-400 text-3xl">calendar_month</span>
              {isFaculty ? 'Teaching Schedule & Lecture Matrix' : 'Weekly Course Timetable'}
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              {isFaculty
                ? 'Assigned lectures, laboratories, and student classroom locations.'
                : 'Fall 2026 registered class hours with live conflict detection.'}
            </p>
          </div>

          {/* Conflict Alert Banner if any conflicts exist */}
          {timetableData.conflicts && timetableData.conflicts.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse shrink-0">
              <span className="material-symbols-outlined text-rose-400 text-[20px]">warning</span>
              <div>
                <span className="font-semibold">{timetableData.conflicts.length} Schedule Conflict(s) Detected!</span>
                <span className="hidden sm:inline text-rose-300/80 ml-2">Review overlapping time slots below.</span>
              </div>
            </div>
          )}
        </div>

        {/* Today's Classes & Quick Schedule Overview Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Today's Classes */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-[#1E344D]/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Today's Classes ({dayNames[todayCode]})
                </span>
              </div>
              <span className="font-mono text-xs text-teal-400 font-medium">
                {todaysSessions.length} {todaysSessions.length === 1 ? 'Session' : 'Sessions'} Scheduled
              </span>
            </div>

            {todaysSessions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-teal-400/60 text-[18px]">event_available</span>
                <span>No lecture sessions scheduled for today ({dayNames[todayCode]}). Enjoy your study day!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {todaysSessions.map((s, idx) => {
                  const pal = getCoursePalette(s.course_code)
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveSessionModal(s)}
                      className={`p-3 rounded-xl border backdrop-blur-md cursor-pointer transition-all hover:scale-[1.01] ${pal.bg} ${pal.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-white">{s.course_code}</span>
                        <span className="font-mono text-[11px] text-teal-300">{s.start} – {s.end}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 mt-1 truncate">{s.course_name}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono mt-2 pt-1 border-t border-white/5">
                        <span>{s.room || 'TBA'}</span>
                        <span>{s.faculty_name || 'Assigned Instructor'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Quick Legend & Metrics */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1E344D]/60 pb-2.5 block">
              Schedule Legend & Indicator
            </span>

            <div className="space-y-2 text-xs text-[#94A3B8]">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-md bg-teal-500/15 border border-teal-500/40 shadow-[0_0_8px_rgba(20,184,166,0.3)] inline-block"></span>
                <span className="text-slate-200 font-medium">Enrolled Course</span>
              </div>

              {!isFaculty && (
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-sky-500/15 border-2 border-dashed border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)] inline-block"></span>
                  <span className="text-sky-300 font-medium">Selected in Cart (Preview)</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500/20 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.35)] flex items-center justify-center text-[10px] text-rose-400 font-bold">
                  !
                </span>
                <span className="text-rose-300 font-medium">Schedule Time Conflict</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-[2px] bg-teal-400 shadow-[0_0_8px_#14B8A6]"></div>
                <span className="text-teal-300 font-mono text-[11px]">Real-Time Current Time Marker</span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW TOGGLE: Days Pill Selector */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setActiveMobileDay(d)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeMobileDay === d
                  ? 'bg-teal-500 text-[#071426] shadow-glow-teal font-bold'
                  : 'bg-[#0A192B] border border-[#1E344D] text-[#94A3B8] hover:text-white'
              }`}
            >
              {dayNames[d]}
            </button>
          ))}
        </div>

        {/* TIMETABLE GRID */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#0A192B]/50 border border-[#1E344D]">
            <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#94A3B8]">Loading schedule sessions...</p>
          </div>
        ) : (
          <>
            {/* Desktop Week Grid with Glassmorphic Blocks, Substantial 80px Rows & Subtle Hover */}
            <div className="hidden md:block rounded-2xl bg-[#0A192B]/85 border border-[#1E344D] overflow-hidden shadow-2xl backdrop-blur-2xl">
              <div className="overflow-x-auto">
                <div className="min-w-[850px] relative">
                  {/* Grid Header */}
                  <div
                    className="grid border-b border-[#1E344D] bg-[#071426]/95 sticky top-0 z-30 backdrop-blur-md"
                    style={{ gridTemplateColumns: `85px repeat(${days.length}, 1fr)` }}
                  >
                    <div className="p-3.5 text-center text-xs font-mono font-semibold text-[#64748B] border-r border-[#1E344D]/50">
                      TIME
                    </div>
                    {days.map((d) => (
                      <div
                        key={d}
                        className={`p-3.5 text-center font-bold text-xs uppercase tracking-wider border-r border-[#1E344D]/40 last:border-r-0 ${
                          d === todayCode ? 'text-teal-300 bg-teal-500/5' : 'text-slate-200'
                        }`}
                      >
                        {dayNames[d]} {d === todayCode && <span className="text-[10px] text-teal-400 ml-1">(Today)</span>}
                      </div>
                    ))}
                  </div>

                  {/* Grid Body */}
                  <div
                    className="relative grid select-none"
                    style={{
                      gridTemplateColumns: `85px repeat(${days.length}, 1fr)`,
                      height: `${GRID_HEIGHT_PX}px`,
                    }}
                  >
                    {/* Glowing Current Time Indicator Line across Grid */}
                    {currentTimePercent !== null && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${currentTimePercent}%` }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_12px_#14B8A6] ml-2 animate-ping"></span>
                        <span className="w-2 h-2 rounded-full bg-teal-300 shadow-[0_0_8px_#14B8A6] -ml-2"></span>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-teal-400 via-teal-400/90 to-teal-400/20 shadow-[0_0_10px_rgba(20,184,166,0.8)]"></div>
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm mr-2 backdrop-blur-md">
                          NOW
                        </span>
                      </div>
                    )}

                    {/* Time Column */}
                    <div className="flex flex-col border-r border-[#1E344D]/50 bg-[#071426]/60">
                      {Array.from({ length: END_HOUR - START_HOUR }).map((_, idx) => {
                        const h = START_HOUR + idx
                        const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
                        const mer = h >= 12 ? 'PM' : 'AM'
                        return (
                          <div
                            key={h}
                            style={{ height: `${ROW_HEIGHT_PX}px` }}
                            className="border-b border-[#1E344D]/40 px-2.5 py-1.5 text-[11px] font-mono text-[#64748B] flex items-start justify-center"
                          >
                            {`${h12}:00 ${mer}`}
                          </div>
                        )
                      })}
                    </div>

                    {/* Day Columns with Subtle Grid Pattern & Hoverable Slots */}
                    {days.map((d) => {
                      const daySessions = allSessions.filter((s) => s.day === d)
                      return (
                        <div key={d} className="relative border-r border-[#1E344D]/40 last:border-r-0 h-full">
                          {/* 1-hour and 30-min subtle grid rows with soft pattern */}
                          {Array.from({ length: END_HOUR - START_HOUR }).map((_, idx) => (
                            <div
                              key={idx}
                              style={{ height: `${ROW_HEIGHT_PX}px` }}
                              className="border-b border-[#1E344D]/35 relative bg-[#071426]/30 hover:bg-[#0A192B]/60 transition-colors"
                            >
                              <div
                                style={{ top: `${ROW_HEIGHT_PX / 2}px` }}
                                className="absolute left-0 right-0 border-b border-[#1E344D]/15 pointer-events-none"
                              ></div>
                            </div>
                          ))}

                          {/* Render Sessions positioned by time */}
                          {daySessions.map((session, sIdx) => {
                            const startMin = timeToMinutes(session.start) - START_HOUR * 60
                            const endMin = timeToMinutes(session.end) - START_HOUR * 60
                            const duration = Math.max(endMin - startMin, 30)

                            const topPercent = Math.max(0, Math.min(100, (startMin / TOTAL_MINUTES) * 100))
                            const heightPercent = Math.max(4, Math.min(100, (duration / TOTAL_MINUTES) * 100))

                            const pal = getCoursePalette(session.course_code)

                            let cardStyle = `${pal.bg} ${pal.border} ${pal.hover}`
                            if (session.isSelected) {
                              cardStyle = 'bg-sky-500/10 backdrop-blur-md border-2 border-dashed border-sky-400 hover:border-sky-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:scale-[1.02] transition-all'
                            }
                            if (session.isConflict) {
                              cardStyle = 'bg-rose-500/20 backdrop-blur-md border-2 border-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.45)] animate-pulse'
                            }

                            return (
                              <div
                                key={`${session.course_code}-${sIdx}`}
                                onClick={() => setActiveSessionModal(session)}
                                style={{
                                  top: `${topPercent}%`,
                                  height: `${heightPercent}%`,
                                }}
                                className={`absolute left-1.5 right-1.5 rounded-xl p-3 overflow-hidden cursor-pointer shadow-md flex flex-col justify-between group select-none ${cardStyle}`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold text-xs text-white tracking-wide truncate">
                                      {session.course_code}
                                    </span>
                                    {session.isConflict ? (
                                      <span className="material-symbols-outlined text-[15px] text-rose-400">warning</span>
                                    ) : session.isSelected ? (
                                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/40">
                                        Cart
                                      </span>
                                    ) : (
                                      <span className={`w-1.5 h-1.5 rounded-full ${pal.dot}`}></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-medium text-slate-200/95 leading-tight truncate">
                                    {session.course_name}
                                  </p>
                                </div>

                                {/* Typography: smaller text-secondary for time and room */}
                                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono pt-1.5 border-t border-white/5">
                                  <span>{session.start}–{session.end}</span>
                                  <span className="truncate max-w-[95px]">{session.room || 'TBA'}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Day-by-Day View with Glassmorphism */}
            <div className="md:hidden space-y-3">
              <h2 className="text-sm font-bold text-white px-1">
                {dayNames[activeMobileDay]} Schedule
              </h2>

              {allSessions.filter((s) => s.day === activeMobileDay).length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0A192B]/60 border border-[#1E344D] text-[#94A3B8] text-xs">
                  No classes scheduled for {dayNames[activeMobileDay]}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allSessions
                    .filter((s) => s.day === activeMobileDay)
                    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
                    .map((s, idx) => {
                      const pal = getCoursePalette(s.course_code)
                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveSessionModal(s)}
                          className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
                            s.isConflict
                              ? 'border-rose-500/80 bg-rose-500/20 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                              : s.isSelected
                              ? 'border-2 border-dashed border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                              : `${pal.border} ${pal.bg} hover:border-teal-400 hover:shadow-glow-teal`
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-white">
                              {s.course_code}
                            </span>
                            <span className="font-mono text-xs text-[#94A3B8]">
                              {s.start} – {s.end}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-200 mt-1">{s.course_name}</p>
                          <div className="flex items-center justify-between mt-3 text-xs text-[#94A3B8] font-mono">
                            <span>Room: {s.room || 'TBA'}</span>
                            {s.faculty_name && <span className="text-slate-300">{s.faculty_name}</span>}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Conflict Details Panel if conflicts exist */}
        {timetableData.conflicts && timetableData.conflicts.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#0A192B]/90 border border-rose-500/40 space-y-3 backdrop-blur-xl shadow-lg">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              Detected Time Conflicts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {timetableData.conflicts.map((conf, cIdx) => (
                <div key={cIdx} className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-400 text-[18px] shrink-0 mt-0.5">warning</span>
                  <div>
                    <div className="font-semibold text-white">
                      {conf.course_a} & {conf.course_b} on {conf.day}
                    </div>
                    <div className="text-rose-300/80 mt-0.5">{conf.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal on Block Click */}
        {activeSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {activeSessionModal.course_code}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1.5">{activeSessionModal.course_name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSessionModal(null)}
                  className="w-8 h-8 rounded-lg bg-[#12243A] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50">
                  <div className="text-[#64748B] uppercase font-mono text-[10px]">Day & Time</div>
                  <div className="text-white font-medium mt-1">
                    {dayNames[activeSessionModal.day]} {activeSessionModal.start}–{activeSessionModal.end}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50">
                  <div className="text-[#64748B] uppercase font-mono text-[10px]">Location</div>
                  <div className="text-white font-medium mt-1">{activeSessionModal.room || 'TBA'}</div>
                </div>

                {activeSessionModal.faculty_name && (
                  <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 col-span-2">
                    <div className="text-[#64748B] uppercase font-mono text-[10px]">Instructor</div>
                    <div className="text-white font-medium mt-1">{activeSessionModal.faculty_name}</div>
                  </div>
                )}

                {activeSessionModal.credits && (
                  <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50">
                    <div className="text-[#64748B] uppercase font-mono text-[10px]">Credits</div>
                    <div className="text-teal-400 font-bold mt-1">{activeSessionModal.credits} Academic Credits</div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50">
                  <div className="text-[#64748B] uppercase font-mono text-[10px]">Enrollment State</div>
                  <div className="text-white font-medium mt-1">
                    {activeSessionModal.isSelected ? 'Selected (In Cart)' : 'Registered / Enrolled'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSessionModal(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold transition-all shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
