import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useMagnetic from '../hooks/useMagnetic'

export default function RegistrationConfirmation() {
  const navigate = useNavigate()
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  const confirmedCourses = [
    {
      code: 'CS301',
      sec: 'SEC A',
      credits: 4,
      title: 'Data Structures & Algorithms',
      instructor: 'Dr. Sharma',
      time: 'Mon, Wed 10:00 – 11:30 AM',
      room: 'Turing Hall 102',
    },
    {
      code: 'SE319',
      sec: 'SEC A',
      credits: 4,
      title: 'Software Engineering',
      instructor: 'Dr. Al-Mansoor',
      time: 'Mon, Fri 01:00 – 02:30 PM',
      room: 'Hall 204',
    },
    {
      code: 'MATH302',
      sec: 'SEC C',
      credits: 3,
      title: 'Probability & Statistics',
      instructor: 'Dr. Eileen Wu',
      time: 'Wed, Fri 08:30 – 10:00 AM',
      room: 'Gauss 11',
    },
    {
      code: 'CS304',
      sec: 'SEC B',
      credits: 4,
      title: 'Database Management Systems',
      instructor: 'Prof. Vance',
      time: 'Tue, Thu 02:00 – 03:30 PM',
      room: 'Ada Lab 4',
    },
  ]

  const waitlistedCourse = {
    code: 'MA201',
    sec: 'SEC A',
    credits: 4,
    title: 'Linear Algebra',
    instructor: 'Prof. M. Danvers',
    time: 'Mon, Wed 10:00 – 11:30 AM',
    room: 'Hall 302',
    position: '#1 on Waitlist',
  }

  return (
    <AppLayout title="Registration Confirmation">
      <div className="flex flex-col w-full pb-12">
        <div className="relative w-full max-w-[920px] mx-auto flex flex-col gap-6">
          {/* Celebration Hero Section */}
          <section className="relative z-10 flex flex-col items-center text-center pt-4">
            {/* Glow Ring & Checkmark Badge */}
            <div className="relative mb-5 group cursor-default">
              <div className="absolute inset-0 rounded-full bg-teal-500/25 blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-full bg-[#0D1B2E] border border-teal-500/40 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_36px_rgba(20,184,166,0.35)]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-inner">
                  <svg className="w-9 h-9 text-[#04211D]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Ambient Sparkle Dots */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-ping opacity-75"></span>
              <span className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_10px_#14b8a6] opacity-80"></span>
            </div>

            {/* Hero Typography */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-mono text-xs mb-3">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Official Institutional Registration Receipt</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Registration Confirmed!
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-xl mt-2 leading-relaxed">
              Your course registrations for the <strong className="text-white">Fall 2026</strong> academic semester have been processed, scheduled, and recorded with the University Registrar.
            </p>

            {/* Reference Number Pill */}
            <div className="mt-5 p-3 px-5 rounded-2xl premium-card border border-[#1E344D] flex items-center gap-4">
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-mono">Confirmation Reference</span>
                <span className="font-mono font-bold text-sm text-teal-400">REF-2026-F-88412</span>
              </div>
              <div className="h-6 w-px bg-[#1E344D]"></div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-mono">Timestamp</span>
                <span className="font-mono text-xs text-slate-200">Oct 28, 2026 · 14:32 EST</span>
              </div>
            </div>
          </section>

          {/* Registered Courses Card */}
          <div className="premium-card p-5 md:p-6 border border-[#1E344D] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <h2 className="text-sm font-bold text-white">
                  Confirmed Registered Courses (4)
                </h2>
              </div>
              <span className="badge badge-teal">
                15 Enrolled Credits
              </span>
            </div>

            <div className="flex flex-col gap-2 stagger">
              {confirmedCourses.map((c) => (
                <div
                  key={c.code}
                  className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/60 hover:border-teal-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-[#12243A] border border-[#1E344D] flex flex-col items-center justify-center text-teal-400 shrink-0">
                      <span className="font-mono font-bold text-xs">{c.code}</span>
                      <span className="text-[9px] text-[#64748B] font-mono">{c.sec}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {c.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-[#94A3B8] mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-teal-400">person</span>
                          {c.instructor}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-sky-400">schedule</span>
                          {c.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-[#64748B]">location_on</span>
                          {c.room}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs text-teal-400 font-semibold self-end sm:self-center shrink-0">
                    {c.credits} Credits
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Waitlisted Course Box */}
          <div className="premium-card p-5 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Added to Waitlist (1)
                </h3>
              </div>
              <span className="badge badge-info">
                {waitlistedCourse.position}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-[#12243A] border border-[#1E344D] flex flex-col items-center justify-center text-sky-400 shrink-0">
                  <span className="font-mono font-bold text-xs">{waitlistedCourse.code}</span>
                  <span className="text-[9px] text-[#64748B] font-mono">{waitlistedCourse.sec}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {waitlistedCourse.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#94A3B8] mt-0.5">
                    <span>{waitlistedCourse.instructor}</span>
                    <span>·</span>
                    <span>{waitlistedCourse.time}</span>
                    <span>·</span>
                    <span>{waitlistedCourse.room}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-sky-400 font-mono">Estimated seat opening: 94%</span>
            </div>
          </div>

          {/* Next Steps & Calendar Sync Actions */}
          <div className="premium-card p-5 border border-[#1E344D] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#071426]/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#12243A] border border-[#1E344D] flex items-center justify-center text-sky-400">
                <span className="material-symbols-outlined text-[22px]">event_available</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Sync with your calendar
                </div>
                <div className="text-xs text-[#94A3B8]">
                  Add all 4 courses, locations, and lab blocks into Google, Apple, or Outlook.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <span ref={magneticBtnRef} className="inline-flex w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto btn-primary-neo px-4 py-2.5 text-xs"
                >
                  Return to Dashboard
                </button>
              </span>
              <button
                type="button"
                onClick={() => navigate('/academic-record')}
                className="w-full sm:w-auto btn-secondary-neo px-4 py-2.5 text-xs"
              >
                View Academic Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
