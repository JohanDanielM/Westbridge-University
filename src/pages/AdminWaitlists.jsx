import React, { useState, useEffect, useMemo } from 'react'
import AppLayout from '../components/AppLayout'
import { adminAPI } from '../services/api'

export default function AdminWaitlists() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCourses, setExpandedCourses] = useState({})
  const [confirmModal, setConfirmModal] = useState(null) // { type: 'release' | 'remove', courseCode, studentId, studentName }
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'offers' | 'waiting' | 'full'

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getWaitlists()
      setCourses(data || [])
      // Expand courses that have active waiting or offered entries by default
      const initialExpanded = {}
      ;(data || []).forEach((c) => {
        if ((c.waiting_count > 0 || c.offered_count > 0) && expandedCourses[c.course_code] === undefined) {
          initialExpanded[c.course_code] = true
        }
      })
      setExpandedCourses((prev) => ({ ...initialExpanded, ...prev }))
    } catch (err) {
      console.warn('Failed to fetch admin waitlists:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
    const interval = setInterval(fetchOverview, 30000)
    const handleFocus = () => fetchOverview()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(clock)
  }, [])

  const toggleExpand = (courseCode) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode],
    }))
  }

  const handleAction = async () => {
    if (!confirmModal) return
    const { type, courseCode, studentId } = confirmModal
    try {
      setActionLoading(true)
      setMessage('')

      if (type === 'release') {
        await adminAPI.releaseWaitlistSeat(courseCode)
        setMessage(`Manual seat released for ${courseCode}. Next waiting student offered seat.`)
      } else if (type === 'remove') {
        await adminAPI.removeWaitlistEntry(courseCode, studentId)
        setMessage(`Removed ${studentId} from ${courseCode} waitlist.`)
      }

      setConfirmModal(null)
      await fetchOverview()
    } catch (err) {
      alert(err.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCountdown = (expiresAt) => {
    if (!expiresAt) return 'Expired'
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
    if (diff <= 0) return 'Expired'
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${h}h ${m}m ${s}s left`
  }

  const totalWaiting = courses.reduce((acc, curr) => acc + (curr.waiting_count || 0), 0)
  const totalOffered = courses.reduce((acc, curr) => acc + (curr.offered_count || 0), 0)

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        (c.course_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.course_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.department || '').toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false
      if (filterType === 'offers') return (c.offered_count || 0) > 0
      if (filterType === 'waiting') return (c.waiting_count || 0) > 0
      if (filterType === 'full') return (c.seats_left || 0) === 0
      return true
    })
  }, [courses, searchQuery, filterType])

  return (
    <AppLayout title="Waitlist Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold uppercase tracking-wider">
                Administrator Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Course Waitlist Oversight &amp; Seat Releases
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Manage student queues, inspect 24-hour seat reservations, and manually release seats to the next eligible student.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOverview}
            className="btn-secondary-neo px-4 py-2 text-xs flex items-center gap-1.5 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[16px] text-teal-400">refresh</span>
            <span>Refresh All Queues</span>
          </button>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0A192B] border border-[#1E344D] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-[#64748B] uppercase">Total In Queues</span>
              <div className="text-2xl font-bold text-white mt-0.5">{totalWaiting} Students</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A192B] border border-[#1E344D] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-[#64748B] uppercase">Pending Offers (24h Window)</span>
              <div className="text-2xl font-bold text-teal-300 mt-0.5">{totalOffered} Active Offers</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A192B] border border-[#1E344D] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-[#64748B] uppercase">Monitored Courses</span>
              <div className="text-2xl font-bold text-sky-300 mt-0.5">{courses.length} Courses</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{message}</span>
            </span>
            <button type="button" onClick={() => setMessage('')} className="text-teal-300/60 hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Search & Quick Filter Controls */}
        <div className="p-4 rounded-2xl bg-[#0A192B] border border-[#1E344D] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#64748B]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course code, name, department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-teal-400/60 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs text-[#94A3B8] font-mono shrink-0">Filter By:</label>
            <div className="relative w-full sm:w-60">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-xs text-white focus:outline-none focus:border-teal-400/60 cursor-pointer pr-10"
              >
                <option value="all">All Courses ({courses.length})</option>
                <option value="offers">Active Seat Offers (24h)</option>
                <option value="waiting">Students Waiting</option>
                <option value="full">100% Full</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[#64748B] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Course Panels */}
        <div className="space-y-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center rounded-2xl bg-[#0A192B]/50 border border-[#1E344D]">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0A192B] border border-[#1E344D] text-[#64748B]">
              <span className="material-symbols-outlined text-4xl mb-2 text-[#64748B]">filter_alt_off</span>
              <p className="text-sm font-medium text-white">No courses match the current filter or search query</p>
              <p className="text-xs text-[#64748B] mt-1">Try resetting the search terms or selecting 'All Courses'</p>
            </div>
          ) : (
            filteredCourses.map((course) => {
              const isExpanded = !!expandedCourses[course.course_code]
              const hasActivity = course.waiting_count > 0 || course.offered_count > 0

              return (
                <div
                  key={course.course_code}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    hasActivity
                      ? 'bg-[#0A192B] border-[#1E344D]'
                      : 'bg-[#071426]/60 border-[#1E344D]/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Panel Header */}
                  <div
                    onClick={() => toggleExpand(course.course_code)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#12243A]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        aria-label="Toggle details"
                        className="w-8 h-8 rounded-lg bg-[#12243A] text-[#94A3B8] flex items-center justify-center shrink-0"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            {course.course_code}
                          </span>
                          <span className="text-xs text-[#64748B] font-mono">{course.department}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{course.course_name}</h3>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      <div className="px-3 py-1.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                        <span className="text-[#64748B] mr-2">Enrolled:</span>
                        <span className="font-semibold text-white">
                          {course.enrolled} / {course.capacity}
                        </span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-[#071426] border border-[#1E344D]">
                        <span className="text-[#64748B] mr-2">Seats Left:</span>
                        <span className={`font-semibold ${course.seats_left > 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                          {course.seats_left}
                        </span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        {course.waiting_count} Waiting
                      </div>

                      {course.offered_count > 0 && (
                        <div className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold animate-pulse">
                          {course.offered_count} Offered
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmModal({
                            type: 'release',
                            courseCode: course.course_code,
                            studentName: '',
                          })
                        }}
                        className="btn-primary-neo px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/10"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        <span>Release Seat</span>
                      </button>
                    </div>
                  </div>

                  {/* Panel Content (Entries Table) */}
                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-[#1E344D]/60 bg-[#071426]/50">
                      {course.entries.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#64748B] font-mono">
                          No active waiting or offered entries for this course.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-[#1E344D] mt-4">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#0A192B] border-b border-[#1E344D] text-[#64748B] uppercase font-mono text-[10px]">
                              <tr>
                                <th className="py-3.5 px-4">Pos</th>
                                <th className="py-3.5 px-4">Student ID</th>
                                <th className="py-3.5 px-4">Name</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Details / Offer Expiry</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E344D]/50 text-slate-300">
                              {course.entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-[#12243A]/30 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-white">#{entry.position}</td>
                                  <td className="py-3.5 px-4 font-mono text-sky-400">{entry.student_id}</td>
                                  <td className="py-3.5 px-4 font-medium text-white">{entry.student_name}</td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                                        entry.status === 'offered'
                                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#94A3B8]">
                                    {entry.status === 'offered' ? (
                                      <span className="text-teal-300 flex items-center gap-1 font-semibold">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        {formatCountdown(entry.offer_expires_at)}
                                      </span>
                                    ) : (
                                      <span>Waiting in queue</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    {entry.status === 'waiting' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmModal({
                                            type: 'remove',
                                            courseCode: course.course_code,
                                            studentId: entry.student_id,
                                            studentName: entry.student_name,
                                          })
                                        }
                                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">delete</span>
                                        <span>Remove</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-white">
                  {confirmModal.type === 'release' ? 'Confirm Manual Seat Release' : 'Remove Student from Waitlist'}
                </h3>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="w-8 h-8 rounded-lg bg-[#12243A] text-[#94A3B8] hover:text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {confirmModal.type === 'release'
                  ? `Release 1 seat for ${confirmModal.courseCode}? This will immediately promote the next student in the queue and grant them a 24-hour seat reservation.`
                  : `Are you sure you want to remove ${confirmModal.studentName} (${confirmModal.studentId}) from the ${confirmModal.courseCode} waiting list?`}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmModal(null)}
                  className="btn-secondary-neo px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    confirmModal.type === 'release'
                      ? 'bg-teal-500 hover:bg-teal-400 text-[#071426] shadow-lg shadow-teal-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20'
                  }`}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{confirmModal.type === 'release' ? 'Release Seat' : 'Remove Entry'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
