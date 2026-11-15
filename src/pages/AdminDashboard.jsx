import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import StatCard from '../components/StatCard'
import useMagnetic from '../hooks/useMagnetic'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })
  const [capacityOverrides, setCapacityOverrides] = useState({
    CS301: 45,
    CS401: 30,
    SE319: 50,
  })

  const increaseCapacity = (code) => {
    setCapacityOverrides((prev) => ({
      ...prev,
      [code]: (prev[code] || 40) + 5,
    }))
  }

  const highDemandCourses = [
    {
      code: 'CS301',
      title: 'Data Structures & Algorithms',
      department: 'Computer Science',
      enrolled: 45,
      capacity: capacityOverrides.CS301,
      waitlist: 24,
      instructor: 'Dr. Sharma',
    },
    {
      code: 'CS401',
      title: 'Advanced Algorithms & Complexity',
      department: 'Computer Science',
      enrolled: 30,
      capacity: capacityOverrides.CS401,
      waitlist: 18,
      instructor: 'Prof. Alan Turing',
    },
    {
      code: 'SE319',
      title: 'Software Engineering Architecture',
      department: 'Software Eng',
      enrolled: 50,
      capacity: capacityOverrides.SE319,
      waitlist: 15,
      instructor: 'Dr. Al-Mansoor',
    },
  ]

  const auditLogs = [
    {
      id: 1,
      user: 'Dr. Melissa Carter',
      action: 'Expanded section capacity (+10 seats)',
      target: 'CS301 SEC A',
      time: '12 mins ago',
      type: 'success',
    },
    {
      id: 2,
      user: 'System Automated Engine',
      action: 'Auto-cleared 8 students from waitlist to enrolled',
      target: 'MA201 SEC A',
      time: '45 mins ago',
      type: 'info',
    },
    {
      id: 3,
      user: 'Prof. Alan Turing',
      action: 'Updated syllabus and prerequisite rules',
      target: 'CS401 SEC A',
      time: '2 hours ago',
      type: 'neutral',
    },
    {
      id: 4,
      user: 'Registrar Office',
      action: 'Opened Fall 2026 priority enrollment window',
      target: 'Senior Priority Group',
      time: '5 hours ago',
      type: 'success',
    },
  ]

  return (
    <AppLayout title="Overview">
      {/* Top Admin Summary Banner */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Enterprise Command Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                Westbridge Registrar Admin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Registration Overview &amp; Analytics
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Live course registration metrics, faculty section velocity, waitlist thresholds, and enrollment health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span ref={magneticBtnRef} className="inline-flex">
              <button
                onClick={() => navigate('/admin/courses')}
                className="btn-primary-neo px-4 py-2.5 text-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Manage Courses Console</span>
              </button>
            </span>
          </div>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
          <StatCard
            title="Total Enrollments"
            value="3,842"
            icon="group"
            iconBg="bg-teal-500/10"
            iconColor="text-teal-400"
            footerText="+384 today (Peak enrollment)"
            footerIcon="trending_up"
          />

          <StatCard
            title="Capacity Fill Rate"
            value="82.4%"
            icon="donut_large"
            iconBg="bg-sky-500/10"
            iconColor="text-sky-400"
            progress={82.4}
            footerText="3,842 / 4,660 seats filled"
          />

          <StatCard
            title="Active Waitlists"
            value="124"
            valueSuffix="students"
            icon="hourglass_top"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-400"
            footerText="3 sections at >90% waitlist cap"
            footerIcon="warning"
          />

          <StatCard
            title="Registration Blocks"
            value="58 today"
            icon="shield"
            iconBg="bg-rose-500/10"
            iconColor="text-rose-400"
            footerText="Missing prereq / limit holds"
            footerIcon="block"
          />
        </div>
      </div>

      {/* CHARTS SECTION (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Chart: Registrations Over Last 14 Days */}
        <div className="premium-card p-5 md:p-6 border border-[#1E344D] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-col">
              <span className="text-base font-bold text-white">
                Registrations Over Last 14 Days
              </span>
              <span className="text-xs text-[#94A3B8]">
                Daily student enrollments spanning Oct 1 – Oct 14
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12243A] border border-[#1E344D] text-teal-400 text-xs">
              <span className="material-symbols-outlined text-[16px]">insights</span>
              <span className="font-mono font-semibold">Peak: 384 on Oct 12</span>
            </div>
          </div>

          {/* Line Graph SVG */}
          <div className="w-full relative mt-2">
            <svg className="w-full h-56 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 600 220">
              <defs>
                <linearGradient id="regAreaGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.32" />
                  <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#071426" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="regStrokeGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="50%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <line stroke="#1E344D" strokeDasharray="4 4" x1="40" x2="590" y1="20" y2="20" />
              <line stroke="#1E344D" strokeDasharray="4 4" x1="40" x2="590" y1="70" y2="70" />
              <line stroke="#1E344D" strokeDasharray="4 4" x1="40" x2="590" y1="120" y2="120" />
              <line stroke="#1E344D" strokeDasharray="4 4" x1="40" x2="590" y1="170" y2="170" />

              <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="24">400</text>
              <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="74">300</text>
              <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="124">200</text>
              <text fill="#64748B" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="174">100</text>

              <path
                d="M 50 170 L 90 156 L 130 148 L 170 135 L 210 120 L 250 128 L 290 110 L 330 92 L 370 78 L 410 82 L 450 60 L 490 38 L 530 28 L 570 42 L 570 190 L 50 190 Z"
                fill="url(#regAreaGrad)"
              />
              <path
                className="chart-line"
                d="M 50 170 L 90 156 L 130 148 L 170 135 L 210 120 L 250 128 L 290 110 L 330 92 L 370 78 L 410 82 L 450 60 L 490 38 L 530 28 L 570 42"
                stroke="url(#regStrokeGrad)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              <circle cx="50" cy="170" fill="#14b8a6" r="3.5" />
              <circle cx="130" cy="148" fill="#14b8a6" r="3.5" />
              <circle cx="210" cy="120" fill="#2dd4bf" r="3.5" />
              <circle cx="290" cy="110" fill="#2dd4bf" r="3.5" />
              <circle cx="370" cy="78" fill="#2dd4bf" r="3.5" />
              <circle cx="450" cy="60" fill="#38bdf8" r="3.5" />
              <circle className="animate-pulse" cx="530" cy="28" fill="#71f8e4" r="5" />
              <circle cx="570" cy="42" fill="#38bdf8" r="3.5" />

              <rect fill="#071426" stroke="#1E344D" height="18" rx="4" width="70" x="495" y="6" />
              <text fill="#2dd4bf" fontFamily="JetBrains Mono" fontSize="10" fontWeight="bold" textAnchor="middle" x="530" y="19">
                384 PEAK
              </text>
            </svg>

            <div className="flex justify-between pl-8 pr-4 mt-2 font-mono text-[11px] text-[#64748B]">
              <span>Oct 01</span>
              <span>Oct 03</span>
              <span>Oct 05</span>
              <span>Oct 07</span>
              <span>Oct 09</span>
              <span>Oct 11</span>
              <span className="text-teal-400 font-bold">Oct 12</span>
              <span>Oct 14</span>
            </div>
          </div>
        </div>

        {/* Right Chart: Enrollment by Department */}
        <div className="premium-card p-5 md:p-6 border border-[#1E344D] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-base font-bold text-white">
                Enrollment by Department
              </span>
              <span className="text-xs text-[#94A3B8]">
                Real-time seat allocation against total capacity caps
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <span className="material-symbols-outlined text-[18px]">domain</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 my-auto">
            {/* CS */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Computer Science</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">
                    1,240 <span className="text-[#64748B]">/ 1,410</span>
                  </span>
                  <span className="font-mono text-teal-400 font-bold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                    88%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-[#12243A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>

            {/* Engineering */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Engineering</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">
                    980 <span className="text-[#64748B]">/ 1,240</span>
                  </span>
                  <span className="font-mono text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    79%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-[#12243A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" style={{ width: '79%' }}></div>
              </div>
            </div>

            {/* Business */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Business &amp; Finance</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">
                    760 <span className="text-[#64748B]">/ 1,050</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    72%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-[#12243A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>

            {/* Mathematics */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Mathematics</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white">
                    640 <span className="text-[#64748B]">/ 940</span>
                  </span>
                  <span className="font-mono text-teal-300 font-bold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                    68%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-[#12243A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM 2-COLUMN SECTION: Waitlist Management & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: High Waitlist Demand Courses (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="premium-card p-5 md:p-6 border border-[#1E344D] space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">emergency_home</span>
                <h3 className="text-sm font-bold text-white">
                  High Waitlist Pressure Sections
                </h3>
              </div>
              <span className="text-xs text-amber-300 font-mono">Real-time Seat Controls</span>
            </div>

            <div className="flex flex-col gap-3">
              {highDemandCourses.map((c) => (
                <div
                  key={c.code}
                  className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                      {c.code}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {c.title}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">
                        {c.instructor} · {c.department}
                      </span>
                      <span className="text-[11px] text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                        {c.waitlist} students in waitlist queue
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="flex flex-col text-right font-mono text-xs">
                      <span className="text-white font-bold">
                        {c.enrolled} / {c.capacity}
                      </span>
                      <span className="text-[10px] text-[#64748B]">Cap Limit</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => increaseCapacity(c.code)}
                      className="btn-secondary-neo px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px] text-teal-400">add_circle</span>
                      <span>+5 Seats</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Administrative Audit Log (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="premium-card p-5 md:p-6 border border-[#1E344D] space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">history</span>
                <h3 className="text-sm font-bold text-white">
                  Administrative Audit Log
                </h3>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">Today</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#071426] border border-[#1E344D] flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{log.user}</span>
                    <span className="text-[10px] text-[#64748B] font-mono">{log.time}</span>
                  </div>
                  <span className="text-[#94A3B8] text-[11px] leading-relaxed">
                    {log.action} on <strong className="text-teal-400 font-mono">{log.target}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
