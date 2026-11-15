import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CartCourseCard from '../components/CartCourseCard'
import useMagnetic from '../hooks/useMagnetic'
import { useApp } from '../context/AppContext'
import { studentAPI } from '../services/api'

export default function SelectedCourses() {
  const navigate = useNavigate()
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })
  const { cart, removeFromCart } = useApp()

  const [cartItems, setCartItems] = useState([
    {
      code: 'CS301',
      section: 'Sec A',
      credits: 4,
      title: 'Data Structures & Algorithms',
      instructor: 'Dr. Helena Vance',
      schedule: 'Mon, Wed 10:00 – 11:30 AM',
      room: 'Turing Hall 102',
      hasConflict: false,
      seatsLeft: 0,
      isFull: true,
    },
    {
      code: 'SE319',
      section: 'Sec A',
      credits: 4,
      title: 'Software Engineering Architecture',
      instructor: 'Dr. Marcus Reed',
      schedule: 'Mon, Fri 01:00 – 02:30 PM',
      room: 'Hall 204',
      hasConflict: false,
      seatsLeft: 2,
      isFull: false,
    },
    {
      code: 'MATH302',
      section: 'Sec C',
      credits: 3,
      title: 'Probability & Statistics',
      instructor: 'Dr. Sarah Jenkins',
      schedule: 'Wed, Fri 08:30 – 10:00 AM',
      room: 'Gauss 11',
      hasConflict: false,
      seatsLeft: 18,
      isFull: false,
    },
    {
      code: 'CS401',
      section: 'Sec A',
      credits: 4,
      title: 'Advanced Algorithms & Complexity',
      instructor: 'Dr. Alan Turing',
      schedule: 'Mon, Wed 03:30 – 05:00 PM',
      room: 'Von Neumann 201',
      hasConflict: true,
      conflictMessage: 'Prerequisite requirement: You cannot register until MATH101 (Calculus I) is verified.',
      seatsLeft: 0,
      isFull: true,
    },
  ])

  const [waitlistEntries, setWaitlistEntries] = useState([])

  const fetchLiveStatus = async () => {
    try {
      const [wlData, coursesData] = await Promise.all([
        studentAPI.getWaitlist().catch(() => []),
        studentAPI.getCourses().catch(() => [])
      ])
      setWaitlistEntries(wlData || [])

      if (coursesData && coursesData.length > 0) {
        setCartItems((prev) =>
          prev.map((item) => {
            const matched = coursesData.find(
              (c) => c.course_code?.toUpperCase() === item.code?.toUpperCase()
            )
            if (matched) {
              const seatsLeft = matched.seats_left !== undefined ? matched.seats_left : Math.max(0, (matched.capacity || 40) - (matched.enrolled || 0))
              return {
                ...item,
                title: matched.course_name || item.title,
                instructor: matched.faculty_name || item.instructor,
                room: matched.room || item.room,
                seatsLeft: seatsLeft,
                isFull: seatsLeft <= 0 || matched.status === 'full',
              }
            }
            return item
          })
        )
      }
    } catch (err) {
      console.warn('Failed to fetch live waitlist status:', err)
    }
  }

  useEffect(() => {
    fetchLiveStatus()
  }, [])

  const handleJoinWaitlist = async (courseCode) => {
    try {
      await studentAPI.joinWaitlist(courseCode)
      await fetchLiveStatus()
    } catch (err) {
      alert(err.message || 'Failed to join waitlist')
    }
  }

  const registeredBaseCredits = 15
  const maxCreditLimit = 24

  const totalCartCredits = cartItems.reduce((acc, curr) => acc + curr.credits, 0)
  const totalProjectedCredits = registeredBaseCredits + totalCartCredits
  const hasBlockingIssues = cartItems.some((item) => item.hasConflict) || totalProjectedCredits > maxCreditLimit

  const removeItem = (code) => {
    setCartItems(cartItems.filter((item) => item.code !== code))
  }

  const resolveAllIssues = () => {
    // Remove conflicting CS401
    setCartItems(cartItems.filter((item) => !item.hasConflict))
  }

  const handleCheckout = () => {
    navigate('/confirmation')
  }

  return (
    <AppLayout title="Selected Courses">
      {/* Page Header */}
      <div className="mb-6 space-y-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Staging Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                Fall 2026 Term
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Selected Courses &amp; Validation
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Review your selected courses, resolve prerequisite dependencies, and balance credit caps prior to final confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/catalog')}
              className="btn-secondary-neo px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add More Courses</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Selected Items (8 cols), Right Summary & Validation (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Staged Courses & Schedule Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Selected Courses ({cartItems.length})
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                {totalCartCredits} Selected Credits
              </span>
            </div>

            {hasBlockingIssues && (
              <button
                onClick={resolveAllIssues}
                className="text-xs text-teal-400 font-mono hover:underline flex items-center gap-1 focus:outline-none"
              >
                <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                <span>Auto-resolve blocking conflicts</span>
              </button>
            )}
          </div>

          {/* List of Selected Course Cards */}
          <div className="flex flex-col gap-3 stagger">
            {cartItems.map((c) => {
              const wlMatch = waitlistEntries.find(
                (w) => w.course_code?.toUpperCase() === c.code?.toUpperCase() && ['waiting', 'offered'].includes(w.status)
              )
              const isWaitlisted = !!wlMatch
              const waitlistRank = wlMatch?.rank || wlMatch?.position

              return (
                <CartCourseCard
                  key={c.code}
                  code={c.code}
                  section={c.section}
                  credits={c.credits}
                  title={c.title}
                  instructor={c.instructor}
                  schedule={c.schedule}
                  room={c.room}
                  hasConflict={c.hasConflict}
                  conflictMessage={c.conflictMessage}
                  seatsLeft={c.seatsLeft}
                  isFull={c.isFull}
                  isWaitlisted={isWaitlisted}
                  waitlistRank={waitlistRank}
                  onJoinWaitlist={() => handleJoinWaitlist(c.code)}
                  onRemove={() => removeItem(c.code)}
                />
              )
            })}

            {cartItems.length === 0 && (
              <div className="p-12 text-center rounded-2xl bg-[#0D1B2E]/60 border border-dashed border-[#1E344D]">
                <span className="material-symbols-outlined text-4xl text-[#64748B] mb-2">check_circle</span>
                <p className="text-sm font-semibold text-slate-200">No courses currently selected.</p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-3 btn-primary-neo px-4 py-2 text-xs"
                >
                  Explore Course Catalog
                </button>
              </div>
            )}
          </div>

          {/* Conflict Analysis & Weekly Schedule Visualizer Box */}
          <div className="premium-card p-5 border border-[#1E344D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">calendar_view_week</span>
                <span className="text-sm font-bold text-white">
                  Schedule Overlap &amp; Conflict Matrix
                </span>
              </div>
              <span className="text-xs font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                Live Timetable Sync
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              No overlapping time slots detected among the current selections. All Monday–Friday lectures have at least 30 minutes transit buffer between campus halls.
            </p>

            <div className="grid grid-cols-5 gap-2 pt-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                <span className="text-[#64748B] block text-[10px]">MON</span>
                <span className="text-teal-400 font-bold">10:00 · 13:00</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                <span className="text-[#64748B] block text-[10px]">TUE</span>
                <span className="text-sky-400 font-bold">14:00</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                <span className="text-[#64748B] block text-[10px]">WED</span>
                <span className="text-teal-400 font-bold">08:30 · 10:00</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                <span className="text-[#64748B] block text-[10px]">THU</span>
                <span className="text-sky-400 font-bold">14:00</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                <span className="text-[#64748B] block text-[10px]">FRI</span>
                <span className="text-cyan-400 font-bold">08:30 · 13:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Credit Summary & Validation Gate */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="premium-card p-5 border border-[#1E344D] space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E344D]">
              <span className="text-sm font-bold text-white">
                Registration Summary
              </span>
              <span className="font-mono text-xs text-teal-400 uppercase">
                Fall 2026
              </span>
            </div>

            {/* Credit Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Already Registered Base:</span>
                <span className="font-mono font-semibold text-white">{registeredBaseCredits} CR</span>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Selected Courses:</span>
                <span className="font-mono font-semibold text-sky-400">+{totalCartCredits} CR</span>
              </div>
              <div className="h-px bg-[#1E344D] my-1"></div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-white">Projected Total:</span>
                <span className={`font-mono text-sm ${totalProjectedCredits > maxCreditLimit ? 'text-rose-400' : 'text-teal-400'}`}>
                  {totalProjectedCredits} / {maxCreditLimit} CR Max
                </span>
              </div>
            </div>

            {/* Credit Progress Meter */}
            <div>
              <div className="w-full h-2 rounded-full bg-[#12243A] overflow-hidden flex">
                <div
                  className="h-full bg-teal-400"
                  style={{ width: `${(registeredBaseCredits / maxCreditLimit) * 100}%` }}
                  title="Registered 15 CR"
                ></div>
                <div
                  className={`h-full ${totalProjectedCredits > maxCreditLimit ? 'bg-rose-400' : 'bg-sky-400'}`}
                  style={{ width: `${(totalCartCredits / maxCreditLimit) * 100}%` }}
                  title="Selected Courses"
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-[#64748B] font-mono mt-1">
                <span>0 CR</span>
                <span>Limit: 24 CR</span>
              </div>
            </div>

            {/* Validation Feedback Box */}
            {hasBlockingIssues ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-rose-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[18px] text-rose-400">error</span>
                  <span>Validation Incomplete (Blocking Issues)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-rose-300/90">
                  {cartItems.some((i) => i.hasConflict) && (
                    <li>CS401 has an unresolved prerequisite (MATH101).</li>
                  )}
                  {totalProjectedCredits > maxCreditLimit && (
                    <li>Projected credits ({totalProjectedCredits}) exceed semester cap of 24 credits.</li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-1 text-xs text-teal-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[18px] text-teal-400">verified</span>
                  <span>All Prerequisites &amp; Caps Validated</span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  Your proposed schedule is conflict-free and within all academic credit limits.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <span ref={magneticBtnRef} className="inline-flex w-full">
                <button
                  type="button"
                  disabled={hasBlockingIssues || cartItems.length === 0}
                  onClick={handleCheckout}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    hasBlockingIssues || cartItems.length === 0
                      ? 'bg-[#12243A] text-[#64748B] cursor-not-allowed border border-[#1E344D]'
                      : 'btn-primary-neo'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {hasBlockingIssues ? 'lock' : 'check_circle'}
                  </span>
                  <span>Confirm Registration</span>
                </button>
              </span>

              {hasBlockingIssues && (
                <button
                  type="button"
                  onClick={resolveAllIssues}
                  className="w-full py-2 text-xs text-teal-400 hover:text-teal-300 font-mono transition-colors"
                >
                  Click to Auto-Resolve &amp; Unlock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
