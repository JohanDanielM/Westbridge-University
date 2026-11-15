import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import useMagnetic from '../hooks/useMagnetic'
import { studentAPI } from '../services/api'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeOffer, setActiveOffer] = useState(null)
  const [offerCountdown, setOfferCountdown] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [seatOfferAccepted, setSeatOfferAccepted] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('this-week')
  const [selectedDeadlineFilter, setSelectedDeadlineFilter] = useState('fall-2026')
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  const loadOffers = async () => {
    try {
      const waitlist = await studentAPI.getWaitlist()
      const firstOffer = waitlist?.find((e) => e.status === 'offered')
      setActiveOffer(firstOffer || null)
    } catch (err) {
      console.warn('Failed to fetch waitlist offers:', err)
    }
  }

  const [liveRegistrationsCount, setLiveRegistrationsCount] = useState(null)

  useEffect(() => {
    loadOffers()
    studentAPI
      .getRegistrations()
      .then((res) => {
        if (Array.isArray(res)) setLiveRegistrationsCount(res.length)
        else if (res?.registrations && Array.isArray(res.registrations)) {
          setLiveRegistrationsCount(res.registrations.length)
        }
      })
      .catch(() => {})
    const interval = setInterval(loadOffers, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!activeOffer?.offer_expires_at) return
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(activeOffer.offer_expires_at).getTime() - Date.now()) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setOfferCountdown(`${h}h ${m}m ${s}s`)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [activeOffer])

  const handleAcceptOffer = async () => {
    if (!activeOffer) return
    try {
      setActionLoading(true)
      await studentAPI.acceptOffer(activeOffer.course_code)
      setSeatOfferAccepted(true)
      await loadOffers()
      navigate('/dashboard')
    } catch (err) {
      alert(err.message || 'Failed to accept offer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineOffer = async () => {
    if (!activeOffer) return
    try {
      setActionLoading(true)
      await studentAPI.declineOffer(activeOffer.course_code)
      await loadOffers()
    } catch (err) {
      alert(err.message || 'Failed to decline offer')
    } finally {
      setActionLoading(false)
    }
  }

  const displayName = user?.full_name || user?.name || 'Student'
  const firstName = displayName.split(' ')[0]
  const studentId = user?.student_id || user?.roll_number || ''
  const stream = user?.stream || 'Computer Science'
  const semester = user?.semester || user?.current_semester || 1
  const program = `${stream} · Semester ${semester}`
  const registeredCount = liveRegistrationsCount ?? user?.registered_count ?? 3

  const registeredCourses = [
    {
      code: 'CS301',
      sec: 'SEC A',
      title: 'Data Structures & Algorithms',
      instructor: 'Dr. Sharma',
      time: 'Mon, Wed 10:00 – 11:30 AM',
      room: 'Turing Hall 102',
      credits: 4,
    },
    {
      code: 'CS304',
      sec: 'SEC B',
      title: 'Database Management Systems',
      instructor: 'Prof. Vance',
      time: 'Tue, Thu 02:00 – 03:30 PM',
      room: 'Ada Lab 4',
      credits: 4,
    },
    {
      code: 'SE319',
      sec: 'SEC A',
      title: 'Software Engineering',
      instructor: 'Dr. Al-Mansoor',
      time: 'Mon, Fri 01:00 – 02:30 PM',
      room: 'Hall 204',
      credits: 4,
    },
    {
      code: 'MATH302',
      sec: 'SEC C',
      title: 'Probability & Statistics',
      instructor: 'Dr. Eileen Wu',
      time: 'Wed, Fri 08:30 – 10:00 AM',
      room: 'Gauss 11',
      credits: 3,
    },
  ]

  const scheduleAgenda = {
    'this-week': {
      subtitle: 'Oct 27 – Nov 02',
      days: [
        {
          label: 'Today (Monday)',
          badge: '2 Sessions',
          activeDot: true,
          items: [
            {
              code: 'CS301 · Data Structures',
              time: '10:00 AM',
              room: 'Turing 102',
              duration: '90 mins',
              color: 'bg-teal-400',
              textColor: 'text-teal-400',
            },
            {
              code: 'SE319 · Software Eng.',
              time: '01:00 PM',
              room: 'Hall 204',
              duration: '90 mins',
              color: 'bg-sky-400',
              textColor: 'text-sky-400',
            },
          ],
        },
        {
          label: 'Tomorrow (Tuesday)',
          badge: '1 Session',
          activeDot: false,
          items: [
            {
              code: 'CS304 · Database Systems',
              time: '02:00 PM',
              room: 'Ada Lab 4',
              duration: '90 mins',
              color: 'bg-cyan-400',
              textColor: 'text-cyan-400',
            },
          ],
        },
      ],
    },
    'next-week': {
      subtitle: 'Nov 03 – Nov 09',
      days: [
        {
          label: 'Monday, Nov 03',
          badge: '2 Sessions',
          activeDot: false,
          items: [
            {
              code: 'CS301 · Data Structures',
              time: '10:00 AM',
              room: 'Turing 102',
              duration: 'Midterm Review',
              color: 'bg-teal-400',
              textColor: 'text-teal-400',
            },
            {
              code: 'SE319 · Software Eng.',
              time: '01:00 PM',
              room: 'Hall 204',
              duration: 'Sprint Demo',
              color: 'bg-sky-400',
              textColor: 'text-sky-400',
            },
          ],
        },
      ],
    },
    'oct-20': {
      subtitle: 'Oct 20 – Oct 26',
      days: [
        {
          label: 'Past Week Summary',
          badge: '8 Attended',
          activeDot: false,
          items: [
            {
              code: 'Completed Lectures',
              time: '100% Attendance',
              room: 'All 4 courses attended normally',
              duration: 'Completed',
              color: 'bg-slate-500',
              textColor: 'text-slate-400',
            },
          ],
        },
      ],
    },
    'nov-03': {
      subtitle: 'Nov 03 – Nov 09',
      days: [
        {
          label: 'Upcoming Week',
          badge: '5 Sessions',
          activeDot: false,
          items: [
            {
              code: 'CS301 · Midterm Exam',
              time: '10:00 AM',
              room: 'Turing 102',
              duration: 'Nov 03',
              color: 'bg-teal-400',
              textColor: 'text-teal-400',
            },
          ],
        },
      ],
    },
  }

  const deadlines = [
    {
      title: 'Add/Drop Deadline',
      time: 'Nov 20, 2026 · 11:59 PM',
      badge: 'In 14 days',
      badgeColor: 'badge-info',
      dotColor: 'bg-sky-400',
      term: 'fall-2026',
    },
    {
      title: 'Tuition Payment Due',
      time: 'Dec 01, 2026 · 05:00 PM',
      badge: 'Dec 1',
      badgeColor: 'badge-warn',
      dotColor: 'bg-amber-400',
      term: 'fall-2026',
    },
    {
      title: 'Scholarship Application',
      time: 'Dec 15, 2026 · Priority round',
      badge: 'Dec 15',
      badgeColor: 'badge-teal',
      dotColor: 'bg-teal-400',
      term: 'fall-2026',
    },
    {
      title: 'Final Exam Schedule Release',
      time: 'Dec 20, 2026 · Registrar Portal',
      badge: 'Dec 20',
      badgeColor: 'badge-neutral',
      dotColor: 'bg-slate-400',
      term: 'fall-2026',
    },
  ]

  const currentAgenda = scheduleAgenda[selectedWeek] || scheduleAgenda['this-week']

  return (
    <AppLayout title="Dashboard">
      <div className="relative w-full mb-6">
        {/* Top greeting & user summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 pb-1">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Student Registration Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              {studentId && (
                <>
                  <span className="font-mono text-xs text-sky-400 font-semibold">
                    {studentId}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
                </>
              )}
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                {program}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Welcome back, {firstName}{' '}
              <span className="inline-block animate-pulse text-2xl md:text-3xl">👋</span>
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              You have <span className="text-white font-semibold">{registeredCount} courses</span> registered and{' '}
              <span className="text-teal-300 font-semibold">
                {activeOffer && !seatOfferAccepted ? '1 seat offer' : '0 seat offers'}
              </span>{' '}
              waiting for your response.
            </p>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/catalog')}
              className="btn-secondary-neo inline-flex items-center gap-2 px-3.5 py-2 text-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-sky-400">search</span>
              <span>Browse Catalog</span>
            </button>
            <button
              onClick={() => navigate('/academic-record')}
              className="btn-secondary-neo inline-flex items-center gap-2 px-3.5 py-2 text-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-400">analytics</span>
              <span>Degree Audit</span>
            </button>
          </div>
        </div>

        {/* ACTION REQUIRED BANNER (Wired to First Offer) */}
        {activeOffer && (
          <div className="mt-5 relative overflow-hidden premium-card p-5 md:p-6 border border-teal-500/40 bg-[#0D1B2E]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px] text-teal-400">
                    assignment_turned_in
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="badge badge-teal">
                      <span className="material-symbols-outlined text-[13px]">notifications_active</span> Action Required
                    </span>
                    <span className="badge badge-info">
                      <span className="material-symbols-outlined text-[13px]">schedule</span> Expires in {offerCountdown || '24h'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Seat offer available — {activeOffer.course_code} {activeOffer.course_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-teal-400">school</span>
                      <span>4 Academic Credits</span>
                    </span>
                    <span className="font-mono text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                      Offered Seat Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeclineOffer}
                  className="btn-secondary-neo px-4 py-2 text-xs"
                >
                  Decline
                </button>
                <span ref={magneticBtnRef} className="inline-flex">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleAcceptOffer}
                    className="btn-primary-neo px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Accept Seat</span>
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STAT CARDS ROW (4 Equal Width) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          title="Registered Courses"
          value="4"
          icon="menu_book"
          iconBg="bg-teal-500/10"
          iconColor="text-teal-400"
          footerText="Fall 2026 Semester Active"
          footerIcon="check_circle"
        />

        <StatCard
          title="Credits Used"
          value="15"
          valueSuffix="/ 24 max"
          icon="credit_card"
          iconBg="bg-sky-500/10"
          iconColor="text-sky-400"
          progress={62.5}
          footerText="9 credits remaining"
        />

        <StatCard
          title="Waiting List"
          value="1 course"
          icon="hourglass_top"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-400"
          footerText="Position #1 · CS-401"
          footerIcon="priority_high"
        />

        <StatCard
          title="Current CGPA"
          value="3.45"
          valueSuffix="/ 4.00"
          icon="school"
          iconBg="bg-teal-500/10"
          iconColor="text-teal-400"
          footerText="Good Standing · Top 10%"
          footerIcon="workspace_premium"
        />
      </div>

      {/* MAIN CONTENT AREA (Left 8 cols ~66%, Right 4 cols ~33%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Registered Courses */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                My Registered Courses
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#12243A] text-[#94A3B8] border border-[#1E344D]">
                Fall 2026
              </span>
            </div>
            <button
              onClick={() => navigate('/catalog')}
              className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors font-semibold focus:outline-none"
            >
              <span>View full schedule</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Course Cards Container */}
          <div className="flex flex-col gap-3 stagger">
            {registeredCourses.map((c) => (
              <div
                key={c.code}
                className="premium-card p-4 hover:border-teal-500/40 transition-all border border-[#1E344D]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#12243A] border border-[#1E344D] text-teal-400 shrink-0">
                      <span className="font-mono text-xs font-bold">
                        {c.code}
                      </span>
                      <span className="font-mono text-[9px] text-[#64748B] font-medium">
                        {c.sec}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate hover:text-teal-300 transition-colors">
                        {c.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#94A3B8]">
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-teal-400">person</span>
                          {c.instructor}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-sky-400">schedule</span>
                          {c.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-[#64748B]">meeting_room</span>
                          {c.room}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0 pt-2 sm:pt-0">
                    <span className="badge badge-teal">
                      <span className="material-symbols-outlined text-[13px]">check</span> Enrolled
                    </span>
                    <span className="font-mono text-xs text-[#64748B] mt-1 font-medium">
                      {c.credits} Credits
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Semester Overview Bar */}
          <div className="premium-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#1E344D] bg-[#071426]/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#12243A] border border-[#1E344D] flex items-center justify-center text-sky-400">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Need to swap or drop a lecture?
                </div>
                <div className="text-xs text-[#94A3B8]">
                  Add/drop period remains unrestricted until Nov 20, 2026.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate('/selected-courses')}
                className="w-full sm:w-auto btn-secondary-neo px-3.5 py-2 text-xs"
              >
                Selected Courses
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="w-full sm:w-auto btn-primary-neo px-3.5 py-2 text-xs"
              >
                Register New Course
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Side Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* 1. "This Week" Mini Schedule Card */}
          <div className="premium-card p-5 flex flex-col gap-4 border border-[#1E344D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">
                    This Week's Schedule
                  </span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">
                    {currentAgenda.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="appearance-none bg-[#071426] text-slate-200 font-mono text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-lg cursor-pointer transition-colors focus:outline-none border border-[#1E344D]"
                  >
                    <option value="this-week">This Week</option>
                    <option value="next-week">Next Week</option>
                    <option value="oct-20">Oct 20 – Oct 26</option>
                    <option value="nov-03">Nov 03 – Nov 09</option>
                  </select>
                  <span className="material-symbols-outlined text-[#64748B] text-[15px] pointer-events-none absolute right-1.5">
                    expand_more
                  </span>
                </div>

                <button
                  className="w-7 h-7 rounded-lg bg-[#12243A] hover:bg-[#1E344D] text-sky-400 flex items-center justify-center transition-colors"
                  title="Export calendar ICS file"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">file_download</span>
                </button>
              </div>
            </div>

            {/* Agenda Timeline */}
            <div className="flex flex-col gap-3 pt-1">
              {currentAgenda.days.map((day, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-teal-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      {day.activeDot && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>}
                      {day.label}
                    </span>
                    <span className="font-mono text-[11px] text-[#94A3B8]">
                      {day.badge}
                    </span>
                  </div>

                  {day.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="rounded-xl bg-[#071426]/70 border border-[#1E344D]/50 p-2.5 flex items-start gap-2.5 hover:bg-[#12243A] transition-colors"
                    >
                      <div className={`w-1 self-stretch rounded-full ${item.color} shrink-0`}></div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">
                            {item.code}
                          </span>
                          <span className={`font-mono text-[11px] ${item.textColor} font-medium`}>
                            {item.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[#94A3B8] text-[11px]">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px]">location_on</span>
                            {item.room}
                          </span>
                          <span>·</span>
                          <span>{item.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/catalog')}
              className="w-full py-2 btn-secondary-neo text-xs flex items-center justify-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">view_timeline</span>
              <span>View Weekly Time Grid</span>
            </button>
          </div>

          {/* 2. "Upcoming Deadlines" Card */}
          <div className="premium-card p-5 flex flex-col gap-4 border border-[#1E344D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <span className="material-symbols-outlined text-[18px]">alarm</span>
                </div>
                <span className="text-sm font-bold text-white">
                  Upcoming Deadlines
                </span>
              </div>
              <div className="relative inline-flex items-center">
                <select
                  value={selectedDeadlineFilter}
                  onChange={(e) => setSelectedDeadlineFilter(e.target.value)}
                  className="appearance-none bg-[#071426] text-slate-200 font-mono text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-lg cursor-pointer transition-colors focus:outline-none border border-[#1E344D]"
                >
                  <option value="fall-2026">Fall 2026</option>
                  <option value="spring-2027">Spring 2027</option>
                  <option value="all">All Deadlines</option>
                </select>
                <span className="material-symbols-outlined text-[#64748B] text-[15px] pointer-events-none absolute right-1.5">
                  expand_more
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {deadlines.map((dl, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-[#12243A] transition-colors"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${dl.dotColor} mt-1.5 shrink-0`}></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">
                        {dl.title}
                      </span>
                      <span className="font-mono text-[11px] text-[#94A3B8]">
                        {dl.time}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${dl.badgeColor} shrink-0`}>
                    {dl.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Academic Advisor Quick Link Card */}
            <div className="mt-1 p-3 rounded-xl bg-[#071426]/70 flex items-center justify-between gap-2 border border-[#1E344D]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#12243A] border border-[#1E344D] flex items-center justify-center text-teal-400 shrink-0">
                  <span className="material-symbols-outlined text-[16px]">support_agent</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    Assigned Advisor
                  </span>
                  <span className="text-[11px] text-[#94A3B8] truncate">
                    Dr. Helena Vance
                  </span>
                </div>
              </div>
              <button
                className="text-teal-400 hover:text-teal-300 font-mono text-xs font-semibold px-2 py-1 rounded hover:bg-[#12243A] transition-colors shrink-0 focus:outline-none"
                type="button"
              >
                Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
