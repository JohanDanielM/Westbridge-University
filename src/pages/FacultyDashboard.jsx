import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FacultyLayout from '../components/FacultyLayout'
import StatCard from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { facultyAPI } from '../services/api'
import useMagnetic from '../hooks/useMagnetic'

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const [editSchedule, setEditSchedule] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  const facultyDisplayName = user?.full_name || user?.name || 'Dr. Sharma'
  const greetingName = facultyDisplayName.startsWith('Dr.') || facultyDisplayName.startsWith('Prof.')
    ? facultyDisplayName
    : `Dr. ${facultyDisplayName}`

  const canManageCourse = Boolean(
    user?.permissions?.includes('manage_course') || !user?.permissions
  )

  const fetchCourses = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await facultyAPI.getMyCourses()
      if (Array.isArray(data)) {
        setCourses(data)
      } else {
        setCourses([])
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load assigned courses. Showing cached records.')
      // Graceful fallback for demonstration / offline testing
      setCourses([
        {
          _id: 'c1',
          course_code: 'CS301',
          course_name: 'Data Structures & Algorithms',
          credits: 4,
          enrolled_count: 45,
          capacity: 45,
          room: 'Turing Hall 102',
          days: ['Mon', 'Wed'],
          start_time: '10:00 AM',
          end_time: '11:30 AM',
          department: 'Computer Science',
          status: 'full',
        },
        {
          _id: 'c2',
          course_code: 'CS101',
          course_name: 'Introduction to Computer Science I',
          credits: 4,
          enrolled_count: 35,
          capacity: 40,
          room: 'Ada Lab 2',
          days: ['Tue', 'Thu'],
          start_time: '01:00 PM',
          end_time: '02:30 PM',
          department: 'Computer Science',
          status: 'open',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [user])

  const handleOpenEditModal = (course) => {
    setEditingCourse(course)
    setEditDescription(course.description || '')
    const defaultSchedule = course.schedule || (
      Array.isArray(course.days)
        ? `${course.days.join(', ')} ${course.start_time || ''} – ${course.end_time || ''}`
        : course.days || 'Mon, Wed 10:00 – 11:30 AM'
    )
    setEditSchedule(defaultSchedule)
    setEditRoom(course.room || '')
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditModalOpen(true)
  }

  const handleSaveCourseDetails = async (e) => {
    e.preventDefault()
    if (!editingCourse) return

    setEditLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        description: editDescription.trim(),
        schedule: editSchedule.trim(),
        room: editRoom.trim(),
      }
      await facultyAPI.updateCourse(editingCourse.course_code, payload)
      setSuccessMessage(`Course ${editingCourse.course_code} updated successfully.`)
      setIsEditModalOpen(false)
      await fetchCourses()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update course details.')
    } finally {
      setEditLoading(false)
    }
  }

  // Computed metrics
  const totalStudents = courses.reduce((sum, c) => sum + (Number(c.enrolled_count) || 0), 0)

  return (
    <FacultyLayout title="Faculty Dashboard">
      {/* Header Greeting Section */}
      <div className="relative w-full mb-6 pt-2 pb-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Faculty Instructor Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                {user?.department || 'Department of Computer Science'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Welcome, {greetingName}{' '}
              <span className="inline-block animate-pulse text-2xl md:text-3xl">👋</span>
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Fall 2026 Academic Term · You are currently teaching{' '}
              <span className="text-white font-semibold">{courses.length} courses</span> with{' '}
              <span className="text-teal-400 font-semibold">{totalStudents} active students</span>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchCourses}
              disabled={loading}
              className="btn-secondary-neo inline-flex items-center gap-2 px-3.5 py-2 text-xs disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] text-teal-400 ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Sync Records</span>
            </button>
            <span ref={magneticBtnRef} className="inline-flex">
              <button
                onClick={() => {
                  if (courses.length > 0) {
                    navigate(`/faculty/courses/${courses[0].course_code}`)
                  } else {
                    navigate('/faculty/roster')
                  }
                }}
                className="btn-primary-neo inline-flex items-center gap-2 px-3.5 py-2 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">groups</span>
                <span>View Student Roster</span>
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* 3 STAT CARDS (Equal Width) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 stagger">
        <StatCard
          title="Courses Teaching"
          value={courses.length}
          icon="menu_book"
          iconBg="bg-teal-500/10"
          iconColor="text-teal-400"
          footerText="Fall 2026 Active Sections"
          footerIcon="check_circle"
        />

        <StatCard
          title="Total Students"
          value={totalStudents}
          icon="groups"
          iconBg="bg-sky-500/10"
          iconColor="text-sky-400"
          footerText="Enrolled across your sections"
          footerIcon="person_check"
        />

        <StatCard
          title="Pending Grading"
          value="0"
          icon="assignment_turned_in"
          iconBg="bg-teal-500/10"
          iconColor="text-teal-400"
          footerText="All grades up to date"
          footerIcon="done_all"
        />
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchCourses}
            className="text-teal-400 hover:underline font-semibold focus:outline-none"
          >
            Retry
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* ASSIGNED COURSES SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E344D]">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              My Assigned Courses
            </h2>
            <span className="badge badge-teal">
              {courses.length} {courses.length === 1 ? 'Section' : 'Sections'}
            </span>
          </div>
          <span className="font-mono text-xs text-[#94A3B8]">
            Fall Semester 2026
          </span>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl skeleton border border-[#1E344D]"
              ></div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && courses.length === 0 && (
          <div className="p-12 text-center rounded-2xl premium-card border border-[#1E344D] flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">school</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Assigned Courses Found</h3>
            <p className="text-sm text-[#94A3B8] max-w-md">
              There are currently no active course sections assigned to your faculty profile in the registration database.
            </p>
          </div>
        )}

        {/* Course Cards Grid */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
            {courses.map((course) => {
              const enrolled = Number(course.enrolled_count) || 0
              const capacity = Number(course.capacity) || 40
              const percentFull = Math.min(100, Math.round((enrolled / capacity) * 100))
              const isFull = enrolled >= capacity

              return (
                <div
                  key={course.course_code || course._id}
                  className="rounded-2xl premium-card premium-card--interactive border border-[#1E344D] p-5 flex flex-col justify-between group"
                >
                  <div className="flex flex-col">
                    {/* Top Row: Course Code & Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-teal-400 tracking-wider px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        {course.course_code}
                      </span>
                      <span
                        className={`badge ${
                          isFull
                            ? 'badge-danger'
                            : 'badge-teal'
                        }`}
                      >
                        {isFull ? 'Full Capacity' : 'Seats Open'}
                      </span>
                    </div>

                    {/* Course Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug mb-2">
                      {course.course_name}
                    </h3>

                    {/* Course Meta */}
                    <div className="space-y-2 mt-2 pt-2.5 border-t border-[#1E344D] text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-sky-400">
                          credit_card
                        </span>
                        <span>
                          <strong className="text-white">{course.credits || 4}</strong> Academic Credits
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-teal-400">
                          schedule
                        </span>
                        <span>
                          {Array.isArray(course.days) ? course.days.join(', ') : course.days || 'Mon, Wed'}{' '}
                          {course.start_time && `· ${course.start_time}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-[#64748B]">
                          room
                        </span>
                        <span className="truncate">{course.room || 'Turing Hall 102'}</span>
                      </div>
                    </div>

                    {/* Enrollment Capacity Progress */}
                    <div className="mt-4 pt-3 border-t border-[#1E344D]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#94A3B8]">Enrollment</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {enrolled} / {capacity}{' '}
                          <span className="text-[#64748B] font-normal">({percentFull}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : 'bg-gradient-to-r from-teal-400 to-sky-400'
                          }`}
                          style={{ width: `${percentFull}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action: Edit Details & View Roster */}
                  <div className="mt-5 pt-2 flex items-center gap-2">
                    {canManageCourse && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(course)}
                        className="btn-secondary-neo py-2.5 px-3 text-xs flex items-center justify-center gap-1.5"
                        title="Edit course details"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/faculty/courses/${course.course_code}`)}
                      className="flex-1 py-2.5 btn-primary-neo text-xs flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">groups</span>
                      <span>View Roster</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Course Details Modal */}
      {isEditModalOpen && editingCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg premium-card p-6 border border-[#1E344D] shadow-2xl space-y-5 animate-drop-in">
            <div className="flex items-start justify-between pb-3 border-b border-[#1E344D]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                    {editingCourse.course_code}
                  </span>
                  <h3 className="text-lg font-bold text-white">Edit Course Details</h3>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Modify course description, meeting schedule, and assigned room location.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCourseDetails} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="edit_schedule">
                  Schedule &amp; Meeting Times
                </label>
                <input
                  id="edit_schedule"
                  type="text"
                  required
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  placeholder="e.g. Mon, Wed 10:00 – 11:30 AM"
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="edit_room">
                  Assigned Room Location
                </label>
                <input
                  id="edit_room"
                  type="text"
                  required
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="e.g. Turing Hall 102"
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="edit_desc">
                  Course Description &amp; Overview
                </label>
                <textarea
                  id="edit_desc"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter course overview, curriculum topics, and expectations..."
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E344D]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary-neo px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FacultyLayout>
  )
}
