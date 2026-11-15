import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import useMagnetic from '../hooks/useMagnetic'
import { adminAPI } from '../services/api'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedRows, setSelectedRows] = useState([])
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Active course for Edit/Delete
  const [activeCourse, setActiveCourse] = useState(null)
  const [editFormData, setEditFormData] = useState({
    course_name: '',
    credits: 4,
    faculty_name: '',
    department: 'Computer Science',
    capacity: 40,
    prerequisites: '',
    status: 'open',
  })
  
  // Status feedback
  const [modalError, setModalError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Load courses from backend
  const loadCourses = async () => {
    setIsLoading(true)
    try {
      const data = await adminAPI.getCourses()
      if (Array.isArray(data) && data.length > 0) {
        setCourses(data.map((c) => ({
          code: c.course_code,
          name: c.course_name,
          credits: c.credits,
          instructor: c.faculty_name,
          department: c.department || 'Computer Science',
          prereq: (c.prerequisites || []).join(', '),
          enrolled: c.enrolled !== undefined ? c.enrolled : (c.enrolled_count || 0),
          capacity: c.capacity || 40,
          waitlist: c.waitlist_count || 0,
          status: c.status === 'full' ? 'Full' : c.status === 'closed' ? 'Closed' : 'Active',
          statusType: c.status === 'full' ? 'waitlist' : c.status === 'closed' ? 'closed' : 'active',
          rawStatus: c.status || 'open'
        })))
      }
    } catch (err) {
      console.warn('Backend courses load failed, keeping existing state:', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    credits: 4,
    instructor: '',
    department: 'Computer Science',
    prereq: '',
    capacity: 40,
  })

  const toggleSelectRow = (code) => {
    if (selectedRows.includes(code)) {
      setSelectedRows(selectedRows.filter((r) => r !== code))
    } else {
      setSelectedRows([...selectedRows, code])
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.code || !newCourse.name) return
    setIsSubmitting(true)
    setModalError(null)

    try {
      const prereqsArray = newCourse.prereq
        ? newCourse.prereq.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean)
        : []

      await adminAPI.createCourse({
        course_code: newCourse.code.toUpperCase(),
        course_name: newCourse.name,
        credits: parseInt(newCourse.credits) || 4,
        faculty_name: newCourse.instructor || 'TBA',
        department: newCourse.department,
        capacity: parseInt(newCourse.capacity) || 40,
        prerequisites: prereqsArray,
        status: 'open'
      })

      showToast(`Course ${newCourse.code.toUpperCase()} successfully created.`)
      setShowAddModal(false)
      setNewCourse({
        code: '',
        name: '',
        credits: 4,
        instructor: '',
        department: 'Computer Science',
        prereq: '',
        capacity: 40,
      })
      await loadCourses()
    } catch (err) {
      setModalError(err.message || 'Failed to create course.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (c) => {
    setActiveCourse(c)
    setEditFormData({
      course_name: c.name,
      credits: c.credits,
      faculty_name: c.instructor,
      department: c.department,
      capacity: c.capacity,
      prerequisites: c.prereq,
      status: c.rawStatus === 'closed' ? 'closed' : 'open',
    })
    setModalError(null)
    setShowEditModal(true)
  }

  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    if (!activeCourse) return
    setIsSubmitting(true)
    setModalError(null)

    const newCredits = parseInt(editFormData.credits)
    if (newCredits < 1 || newCredits > 6) {
      setModalError('Course credits must be between 1 and 6.')
      setIsSubmitting(false)
      return
    }

    const newCap = parseInt(editFormData.capacity)
    if (newCap < activeCourse.enrolled) {
      setModalError(`Capacity (${newCap}) cannot be less than currently enrolled students (${activeCourse.enrolled}).`)
      setIsSubmitting(false)
      return
    }

    try {
      const prereqsArray = editFormData.prerequisites
        ? editFormData.prerequisites.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean)
        : []

      await adminAPI.updateCourse(activeCourse.code, {
        course_name: editFormData.course_name,
        credits: newCredits,
        faculty_name: editFormData.faculty_name,
        department: editFormData.department,
        capacity: newCap,
        prerequisites: prereqsArray,
        status: editFormData.status,
      })

      showToast(`Course ${activeCourse.code} updated successfully.`)
      setShowEditModal(false)
      await loadCourses()
    } catch (err) {
      setModalError(err.message || 'Failed to update course.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteModal = (c) => {
    setActiveCourse(c)
    setModalError(null)
    setShowDeleteModal(true)
  }

  const handleDeleteCourse = async () => {
    if (!activeCourse) return
    setIsSubmitting(true)
    setModalError(null)

    try {
      await adminAPI.deleteCourse(activeCourse.code)
      showToast(`Course ${activeCourse.code} deleted successfully.`)
      setShowDeleteModal(false)
      await loadCourses()
    } catch (err) {
      setModalError(err.message || `Course has enrolled students. Close enrollment instead of deleting.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredCourses = courses.filter((c) => {
    const matchesDept = selectedDept === 'All' || c.department.toLowerCase().includes(selectedDept.toLowerCase())
    const matchesQuery =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDept && matchesQuery
  })

  return (
    <AppLayout title="Manage Courses">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-teal-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Curriculum Administration
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                Fall 2026 Active Term
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Course Catalog &amp; Section Inventory
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Add new offerings, adjust seat caps, reallocate faculty leads, and manage prerequisite dependency trees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span ref={magneticBtnRef} className="inline-flex">
              <button
                onClick={() => {
                  setModalError(null)
                  setShowAddModal(true)
                }}
                className="btn-primary-neo px-4 py-2.5 text-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Create New Course</span>
              </button>
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['All', 'Computer Science', 'Software Engineering', 'Mathematics', 'Data Science', 'Cybersecurity'].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus:outline-none ${
                  selectedDept === dept
                    ? 'bg-teal-500 text-[#04211D] font-bold shadow-sm shadow-teal-500/20'
                    : 'bg-[#12243A] text-[#94A3B8] hover:bg-[#1E344D] hover:text-white border border-[#1E344D]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by code or title..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#071426] text-white placeholder:text-[#64748B] text-xs border border-[#1E344D] focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="premium-card border border-[#1E344D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E344D] bg-[#0A192B] text-[#64748B] font-mono text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">check_box_outline_blank</span>
                </th>
                <th className="py-3.5 px-4">Course Code &amp; Name</th>
                <th className="py-3.5 px-4">Credits</th>
                <th className="py-3.5 px-4">Faculty Lead</th>
                <th className="py-3.5 px-4">Prerequisites</th>
                <th className="py-3.5 px-4">Capacity Meter</th>
                <th className="py-3.5 px-4">Waitlist</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E344D]/50">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-mono">
                    Loading courses from database...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-mono">
                    No courses found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const isSelected = selectedRows.includes(c.code)
                  const fillPercent = Math.min(100, Math.round((c.enrolled / c.capacity) * 100))

                  return (
                    <tr
                      key={c.code}
                      className={`hover:bg-[#12243A] transition-colors ${
                        isSelected ? 'bg-[#12243A]/60' : 'bg-transparent'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(c.code)}
                          className={`w-4 h-4 rounded mx-auto flex items-center justify-center transition-all ${
                            isSelected ? 'bg-teal-500 text-[#04211D] shadow-sm' : 'border border-[#1E344D]'
                          }`}
                        >
                          {isSelected && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                        </button>
                      </td>

                      {/* Course Code & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-bold text-xs shrink-0">
                            {c.code}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white truncate text-xs hover:text-teal-300 transition-colors cursor-pointer">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">{c.department}</span>
                          </div>
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {Number(c.credits).toFixed(1)} CR
                      </td>

                      {/* Faculty Lead */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-teal-400">person</span>
                          {c.instructor}
                        </span>
                      </td>

                      {/* Prerequisites */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#94A3B8]">
                        {c.prereq || 'None'}
                      </td>

                      {/* Capacity Meter */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 w-28">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-white font-semibold">{c.enrolled} / {c.capacity}</span>
                            <span className={fillPercent >= 100 ? 'text-amber-400 font-bold' : 'text-teal-400'}>
                              {fillPercent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden">
                            <div
                              className={`h-full ${fillPercent >= 100 ? 'bg-amber-400' : 'bg-teal-400'}`}
                              style={{ width: `${fillPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Waitlist */}
                      <td className="py-3 px-4">
                        {c.waitlist > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                            +{c.waitlist}
                          </span>
                        ) : (
                          <span className="text-[#64748B] font-mono text-[11px]">0</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            c.statusType === 'waitlist'
                              ? 'badge-info'
                              : c.statusType === 'closed'
                              ? 'badge-neutral'
                              : 'badge-teal'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Edit course"
                            className="w-7 h-7 rounded-lg hover:bg-[#12243A] flex items-center justify-center text-[#94A3B8] hover:text-teal-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(c)}
                            title="Delete course"
                            className="w-7 h-7 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-[#94A3B8] hover:text-rose-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Course */}
      {showEditModal && activeCourse && (
        <div className="modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg modal-panel p-6 space-y-4 bg-[#0A192B] border border-[#1E344D] rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">edit</span>
                <h3 className="text-base font-bold text-white">
                  Edit Course: <span className="font-mono text-teal-300">{activeCourse.code}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-[#64748B] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0">error</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCourse} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Course Code</label>
                  <input
                    type="text"
                    disabled
                    value={activeCourse.code}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426]/50 border border-[#1E344D] text-[#64748B] font-mono cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Credits (1–6)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    step="1"
                    required
                    value={editFormData.credits}
                    onChange={(e) => setEditFormData({ ...editFormData, credits: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Course Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.course_name}
                  onChange={(e) => setEditFormData({ ...editFormData, course_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Department</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[#94A3B8] font-semibold uppercase">Capacity</label>
                    <span className="text-[10px] text-teal-400 font-mono">Enrolled: {activeCourse.enrolled}</span>
                  </div>
                  <input
                    type="number"
                    min={activeCourse.enrolled}
                    required
                    value={editFormData.capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Faculty Lead / Instructor</label>
                <input
                  type="text"
                  required
                  value={editFormData.faculty_name}
                  onChange={(e) => setEditFormData({ ...editFormData, faculty_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Prerequisites (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. CS101, MATH101"
                  value={editFormData.prerequisites}
                  onChange={(e) => setEditFormData({ ...editFormData, prerequisites: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Status / Close Enrollment Toggle */}
              <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white font-semibold">Course Enrollment Status</span>
                  <span className="text-[11px] text-[#94A3B8]">
                    {editFormData.status === 'closed' ? 'Enrollment is manually closed by administrator.' : 'Enrollment is open for students.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData({
                    ...editFormData,
                    status: editFormData.status === 'closed' ? 'open' : 'closed'
                  })}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
                    editFormData.status === 'closed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}
                >
                  {editFormData.status === 'closed' ? 'Closed' : 'Open'}
                </button>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#1E344D]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary-neo px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-neo px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && activeCourse && (
        <div className="modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md modal-panel p-6 space-y-4 bg-[#0A192B] border border-rose-500/30 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E344D]">
              <div className="flex items-center gap-2 text-rose-400">
                <span className="material-symbols-outlined text-[22px]">warning</span>
                <h3 className="text-base font-bold text-white">Delete Course</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-[#64748B] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                Are you sure you want to permanently delete course <span className="font-mono font-bold text-white">{activeCourse.code}</span> — {activeCourse.name}?
              </p>
              
              <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D] flex items-center justify-between font-mono">
                <span className="text-[#94A3B8]">Enrolled Students:</span>
                <span className={`font-bold ${activeCourse.enrolled > 0 ? 'text-amber-400' : 'text-teal-400'}`}>
                  {activeCourse.enrolled}
                </span>
              </div>

              {activeCourse.enrolled > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0">lock</span>
                  <span>
                    This course has {activeCourse.enrolled} enrolled student(s). To maintain academic records, courses with active enrollments cannot be deleted. Please close enrollment instead.
                  </span>
                </div>
              )}

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0">error</span>
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#1E344D]">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary-neo px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || activeCourse.enrolled > 0}
                onClick={handleDeleteCourse}
                className={`px-4 py-2 text-xs rounded-xl font-bold transition-all ${
                  activeCourse.enrolled > 0
                    ? 'bg-[#12243A] text-[#64748B] cursor-not-allowed border border-[#1E344D]'
                    : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
                }`}
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Course */}
      {showAddModal && (
        <div className="modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg modal-panel p-6 space-y-4 bg-[#0A192B] border border-[#1E344D] rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E344D]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">add_circle</span>
                Create New Course Offering
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0">error</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS490"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Credits (1–6)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    step="1"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) || 4 })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Capstone Project"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Department</label>
                  <select
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold uppercase">Initial Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newCourse.capacity}
                    onChange={(e) => setNewCourse({ ...newCourse, capacity: parseInt(e.target.value) || 40 })}
                    className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Faculty Lead / Instructor</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ada Lovelace"
                  value={newCourse.instructor}
                  onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold uppercase">Prerequisites (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. CS301, MATH201"
                  value={newCourse.prereq}
                  onChange={(e) => setNewCourse({ ...newCourse, prereq: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#071426] border border-[#1E344D] text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#1E344D]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary-neo px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-neo px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Save &amp; Publish Offering</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
