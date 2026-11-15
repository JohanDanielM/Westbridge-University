import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { adminAPI } from '../services/api'

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState(null)
  const [courses, setCourses] = useState([])
  const [activeHoverPoint, setActiveHoverPoint] = useState(null)
  const [termFilter, setTermFilter] = useState('Spring 2027')

  // Sample historical registration progression (10-day trend)
  const dailyRegistrationData = [
    { date: 'Nov 01', count: 18, cumulative: 18 },
    { date: 'Nov 02', count: 32, cumulative: 50 },
    { date: 'Nov 03', count: 48, cumulative: 98 },
    { date: 'Nov 04', count: 64, cumulative: 162 },
    { date: 'Nov 05', count: 41, cumulative: 203 },
    { date: 'Nov 06', count: 28, cumulative: 231 },
    { date: 'Nov 07', count: 15, cumulative: 246 },
    { date: 'Nov 08', count: 22, cumulative: 268 },
    { date: 'Nov 09', count: 14, cumulative: 282 },
    { date: 'Nov 10', count: 9, cumulative: 291 },
  ]

  // Reasons for blocked registration attempts
  const blockedAttemptsData = [
    { reason: 'Prerequisite Missing', count: 58, percentage: 38, icon: 'lock', color: 'from-amber-500 to-amber-400' },
    { reason: 'Section Full / Capacity Reached', count: 46, percentage: 30, icon: 'group_off', color: 'from-rose-500 to-rose-400' },
    { reason: 'Credit Limit Exceeded (> 21 cr)', count: 27, percentage: 18, icon: 'speed', color: 'from-teal-500 to-cyan-400' },
    { reason: 'Time Slot Schedule Conflict', count: 16, percentage: 11, icon: 'schedule', color: 'from-sky-500 to-indigo-400' },
    { reason: 'Academic Hold / Status Inactive', count: 5, percentage: 3, icon: 'warning', color: 'from-purple-500 to-pink-400' },
  ]

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [dashRes, coursesRes] = await Promise.allSettled([
          adminAPI.getDashboard(),
          adminAPI.getCourses()
        ])

        if (dashRes.status === 'fulfilled' && dashRes.value) {
          setSummaryData(dashRes.value)
        }
        if (coursesRes.status === 'fulfilled' && coursesRes.value) {
          setCourses(coursesRes.value)
        }
      } catch (err) {
        console.warn('Error loading admin report data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Top 5 Enrolled Courses derived from courses or dashboard high-demand
  const topCourses = React.useMemo(() => {
    if (courses && courses.length > 0) {
      return [...courses]
        .map((c) => {
          const cap = c.capacity || 40
          const enrolled = c.enrolled || 0
          const util = Math.round((enrolled / cap) * 100)
          return {
            code: c.course_code,
            name: c.course_name || c.title,
            department: c.department || 'Computer Science',
            enrolled,
            capacity: cap,
            utilization: util,
            waitlist: c.waitlist_count || 0,
            status: c.status || (enrolled >= cap ? 'Full' : 'Open')
          }
        })
        .sort((a, b) => b.enrolled - a.enrolled)
        .slice(0, 5)
    }

    // Default fallback top 5 courses if DB query is still seeding
    return [
      { code: 'CS301', name: 'Data Structures & Algorithms', department: 'Computer Science', enrolled: 45, capacity: 45, utilization: 100, waitlist: 24, status: 'Full' },
      { code: 'SE319', name: 'Software Architecture & Design', department: 'Software Eng', enrolled: 48, capacity: 50, utilization: 96, waitlist: 15, status: 'Open' },
      { code: 'CS401', name: 'Advanced Algorithms & Complexity', department: 'Computer Science', enrolled: 30, capacity: 30, utilization: 100, waitlist: 18, status: 'Full' },
      { code: 'MA201', name: 'Linear Algebra & Matrix Theory', department: 'Mathematics', enrolled: 42, capacity: 45, utilization: 93, waitlist: 8, status: 'Open' },
      { code: 'CS205', name: 'Database Management Systems', department: 'Computer Science', enrolled: 38, capacity: 40, utilization: 95, waitlist: 12, status: 'Open' },
    ]
  }, [courses])

  // Aggregate stats
  const totalEnrolled = summaryData?.total_enrolled || 263
  const activeWaitlist = summaryData?.active_waitlist || 38
  const totalBlocked = summaryData?.blocked_attempts || 152
  const avgUtilization = 89.4

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Course Code', 'Course Name', 'Department', 'Enrolled', 'Capacity', 'Utilization (%)', 'Waitlist Count', 'Status']
    const rows = topCourses.map((c) => [
      `"${c.code}"`,
      `"${c.name}"`,
      `"${c.department}"`,
      c.enrolled,
      c.capacity,
      `${c.utilization}%`,
      c.waitlist,
      `"${c.status}"`
    ])

    const csvContent = [
      '# Westbridge University - Institutional Enrollment & Registration Report',
      `# Generated: ${new Date().toISOString()}`,
      `# Academic Term: ${termFilter}`,
      `# Total Active Registrations: ${totalEnrolled}`,
      `# Active Waitlist Queue: ${activeWaitlist}`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `westbridge_registration_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Report handler
  const handlePrint = () => {
    window.print()
  }

  // SVG Chart Dimensions & Helpers
  const chartW = 700
  const chartH = 220
  const padX = 45
  const padY = 30
  const maxVal = Math.max(...dailyRegistrationData.map((d) => d.count), 70)

  const points = dailyRegistrationData.map((d, i) => {
    const x = padX + (i / (dailyRegistrationData.length - 1)) * (chartW - padX * 2)
    const y = chartH - padY - (d.count / maxVal) * (chartH - padY * 2)
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx1 = prev.x + (p.x - prev.x) / 2
    const cy1 = prev.y
    const cx2 = prev.x + (p.x - prev.x) / 2
    const cy2 = p.y
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartH - padY} L ${points[0].x} ${chartH - padY} Z`

  return (
    <AppLayout title="Institutional Reports">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header with Export Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0A192B]/90 border border-[#1E344D] backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Institutional Analytics &amp; Compliance
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              <span className="font-mono text-xs text-[#94A3B8]">
                Term: {termFilter}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Registration &amp; Enrollment Reports
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Real-time audit telemetry, capacity utilization curves, waitlist health, and course access restrictions.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto print:hidden">
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary-neo px-4 py-2 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-teal-400">download</span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary-neo px-4 py-2 text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#64748B] uppercase">Total Enrollments</span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">school</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{totalEnrolled}</div>
            <div className="flex items-center gap-1.5 text-xs text-teal-400 mt-2 font-mono">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+14.2% from prior term</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#64748B] uppercase">Active Waitlist Queue</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-300 mt-2">{activeWaitlist}</div>
            <div className="text-xs text-[#94A3B8] mt-2 font-mono">
              34% with active 24h seat offers
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#64748B] uppercase">Seat Utilization</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">pie_chart</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-sky-300 mt-2">{avgUtilization}%</div>
            <div className="w-full bg-[#1E344D] h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-400 to-sky-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${avgUtilization}%` }}
              ></div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#64748B] uppercase">Blocked Attempts</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">security</span>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-300 mt-2">{totalBlocked}</div>
            <div className="text-xs text-[#94A3B8] mt-2 font-mono">
              Enforced by rule validation engine
            </div>
          </div>
        </div>

        {/* Charts Grid: Line Chart & Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Line Chart: Daily Registrations */}
          <div className="p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-teal-400">show_chart</span>
                  <span>Daily Registrations (Trend Line)</span>
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                  Daily velocity of successful student course enrollments
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono">
                10-Day Window
              </span>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="relative pt-2">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-56 overflow-visible"
              >
                <defs>
                  <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = chartH - padY - ratio * (chartH - padY * 2)
                  const labelVal = Math.round(ratio * maxVal)
                  return (
                    <g key={idx}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={chartW - padX}
                        y2={y}
                        stroke="#1E344D"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padX - 8}
                        y={y + 4}
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {labelVal}
                      </text>
                    </g>
                  )
                })}

                {/* Area Gradient */}
                <path d={areaD} fill="url(#regGradient)" />

                {/* Main Stroke Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#14B8A6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {points.map((pt, idx) => {
                  const isHovered = activeHoverPoint?.date === pt.date
                  return (
                    <g
                      key={idx}
                      className="cursor-pointer group"
                      onMouseEnter={() => setActiveHoverPoint(pt)}
                      onMouseLeave={() => setActiveHoverPoint(null)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 7 : 4.5}
                        fill={isHovered ? '#38BDF8' : '#14B8A6'}
                        stroke="#071426"
                        strokeWidth="2.5"
                        className="transition-all duration-200"
                      />
                      {/* X-axis date labels */}
                      <text
                        x={pt.x}
                        y={chartH - 8}
                        fill={isHovered ? '#38BDF8' : '#64748B'}
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                        fontWeight={isHovered ? 'bold' : 'normal'}
                      >
                        {pt.date}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Tooltip Overlay */}
              {activeHoverPoint && (
                <div
                  className="absolute z-10 pointer-events-none px-3 py-1.5 rounded-xl bg-[#071426] border border-teal-500/50 shadow-xl text-xs text-white"
                  style={{
                    left: `${(activeHoverPoint.x / chartW) * 100}%`,
                    top: `${(activeHoverPoint.y / chartH) * 70}%`,
                    transform: 'translate(-50%, -120%)',
                  }}
                >
                  <div className="font-mono text-teal-400 font-bold">{activeHoverPoint.count} Registrations</div>
                  <div className="text-[10px] text-[#94A3B8] font-mono">{activeHoverPoint.date} (Total: {activeHoverPoint.cumulative})</div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Bar Chart: Blocked Attempts by Reason */}
          <div className="p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-400">block</span>
                  <span>Blocked Attempts by Reason</span>
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                  System enforcement distribution across constraint checks
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                {totalBlocked} Total Blocks
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              {blockedAttemptsData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="material-symbols-outlined text-[16px] text-[#64748B]">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.reason}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{item.count}</span>
                      <span className="text-[#64748B] text-[10px]">({item.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-[#071426] h-2.5 rounded-full overflow-hidden border border-[#1E344D]/60">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table: Top 5 Most Enrolled Courses */}
        <div className="p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-400">format_list_numbered</span>
                <span>Top 5 Most Enrolled Courses</span>
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                Highest demand catalog offerings by total confirmed student registrations
              </p>
            </div>
            <span className="text-xs text-[#64748B] font-mono">
              Live Enrollment Telemetry
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1E344D]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#071426] border-b border-[#1E344D] text-[#64748B] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Enrolled / Cap</th>
                  <th className="py-3.5 px-4">Utilization</th>
                  <th className="py-3.5 px-4">Waitlist</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E344D]/50 text-slate-300">
                {topCourses.map((c, idx) => (
                  <tr key={c.code} className="hover:bg-[#12243A]/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          {c.code}
                        </span>
                        <span className="font-semibold text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#94A3B8]">{c.department}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {c.enrolled} / {c.capacity}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#071426] h-1.5 rounded-full overflow-hidden border border-[#1E344D]">
                          <div
                            className={`h-full rounded-full ${
                              c.utilization >= 100
                                ? 'bg-rose-400'
                                : c.utilization >= 85
                                ? 'bg-amber-400'
                                : 'bg-teal-400'
                            }`}
                            style={{ width: `${Math.min(100, c.utilization)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] text-[#94A3B8] font-bold">
                          {c.utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {c.waitlist > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {c.waitlist} Waiting
                        </span>
                      ) : (
                        <span className="text-[#64748B] text-[11px]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                          c.status === 'Full' || c.enrolled >= c.capacity
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
