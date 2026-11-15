import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { adminAPI } from '../services/api'

const PERMISSION_LABELS = {
  view_roster: 'View student rosters',
  enter_grades: 'Enter grades',
  manage_course: 'Edit own course details',
}

const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Mathematics',
  'Humanities',
]

export default function AdminAccessControl() {
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState(null)

  // Add Faculty Form State
  const [addFullName, setAddFullName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addDepartment, setAddDepartment] = useState('Computer Science')
  const [addPermissions, setAddPermissions] = useState(['view_roster', 'manage_course'])

  // Edit Permissions Form State
  const [editPermissions, setEditPermissions] = useState([])

  const fetchFaculty = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.listFaculty()
      if (Array.isArray(data)) {
        setFacultyList(data)
      } else {
        setFacultyList([])
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load faculty accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaculty()
  }, [])

  const handleOpenAddModal = () => {
    setAddFullName('')
    setAddEmail('')
    setAddDepartment('Computer Science')
    setAddPermissions(['view_roster', 'manage_course'])
    setErrorMessage('')
    setSuccessMessage('')
    setIsAddModalOpen(true)
  }

  const handleCreateFaculty = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      const payload = {
        full_name: addFullName.trim(),
        email: addEmail.trim().toLowerCase(),
        department: addDepartment,
        permissions: addPermissions,
      }
      const res = await adminAPI.createFaculty(payload)
      setSuccessMessage(
        res.email_sent
          ? `Faculty account created for ${addFullName}. Temporary credentials dispatched via email.`
          : `Faculty account created with ID ${res.faculty_id}.`
      )
      setIsAddModalOpen(false)
      await fetchFaculty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create faculty account.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenEditModal = (faculty) => {
    setSelectedFaculty(faculty)
    setEditPermissions(faculty.permissions || [])
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditModalOpen(true)
  }

  const handleUpdatePermissions = async (e) => {
    e.preventDefault()
    if (!selectedFaculty) return

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      await adminAPI.updateFaculty(selectedFaculty.faculty_id, {
        permissions: editPermissions,
      })
      setSuccessMessage(`Permissions updated for ${selectedFaculty.name || selectedFaculty.full_name}.`)
      setIsEditModalOpen(false)
      await fetchFaculty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update permissions.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenConfirmModal = (faculty) => {
    setSelectedFaculty(faculty)
    setErrorMessage('')
    setSuccessMessage('')
    setIsConfirmModalOpen(true)
  }

  const handleToggleStatus = async () => {
    if (!selectedFaculty) return

    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      const newStatus = !selectedFaculty.is_active
      await adminAPI.updateFaculty(selectedFaculty.faculty_id, {
        is_active: newStatus,
      })
      setSuccessMessage(
        `Faculty account ${selectedFaculty.faculty_id} has been ${newStatus ? 'activated' : 'disabled'}.`
      )
      setIsConfirmModalOpen(false)
      await fetchFaculty()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update account status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResendCredentials = async (faculty) => {
    setErrorMessage('')
    setSuccessMessage('')
    setActionLoading(true)

    try {
      const res = await adminAPI.resendFacultyCredentials(faculty.faculty_id)
      setSuccessMessage(res.message || `Credentials resent to ${faculty.email}.`)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend credentials.')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleAddPermission = (permKey) => {
    if (addPermissions.includes(permKey)) {
      setAddPermissions(addPermissions.filter((p) => p !== permKey))
    } else {
      setAddPermissions([...addPermissions, permKey])
    }
  }

  const toggleEditPermission = (permKey) => {
    if (editPermissions.includes(permKey)) {
      setEditPermissions(editPermissions.filter((p) => p !== permKey))
    } else {
      setEditPermissions([...editPermissions, permKey])
    }
  }

  return (
    <AppLayout title="Access Control">
      <div className="space-y-6 pb-20">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Administrative Security
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">Role Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Access Control &amp; Faculty Permissions
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Provision faculty accounts, manage role permissions, and control administrative access.
            </p>
          </div>

          <div>
            <button
              onClick={handleOpenAddModal}
              className="btn-primary-neo px-4 py-2.5 text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add faculty</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Faculty Table Card */}
        <div className="premium-card p-0 border border-[#1E344D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1E344D] bg-[#071426]/70 text-[#94A3B8] font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Faculty ID</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Permissions</th>
                  <th className="py-3.5 px-4 text-center">Courses</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E344D]">
                {loading ? (
                  [1, 2, 3, 4].map((idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-32 bg-[#12243A] rounded mb-1"></div>
                        <div className="h-3 w-40 bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-24 bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 w-48 bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-8 mx-auto bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-5 w-16 mx-auto bg-[#12243A] rounded"></div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="h-6 w-24 ml-auto bg-[#12243A] rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : facultyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                      <span className="material-symbols-outlined text-4xl block text-[#64748B] mb-2">
                        group_off
                      </span>
                      <span>No faculty accounts found. Click &quot;Add faculty&quot; to provision one.</span>
                    </td>
                  </tr>
                ) : (
                  facultyList.map((f) => (
                    <tr key={f.id || f.faculty_id} className="hover:bg-[#12243A]/40 transition-colors">
                      {/* Faculty ID */}
                      <td className="py-4 px-4 font-mono font-bold text-sky-400">
                        {f.faculty_id}
                      </td>

                      {/* Name & Email */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white text-sm">
                          {f.name || f.full_name}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] font-mono">
                          {f.email}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-4 text-slate-300">
                        {f.department}
                      </td>

                      {/* Permissions Chips */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(f.permissions || []).map((permKey) => (
                            <span
                              key={permKey}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20"
                            >
                              {PERMISSION_LABELS[permKey] || permKey}
                            </span>
                          ))}
                          {(!f.permissions || f.permissions.length === 0) && (
                            <span className="text-[11px] text-[#64748B] italic">No permissions</span>
                          )}
                        </div>
                      </td>

                      {/* Courses Taught */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-200">
                        {f.courses_taught ?? 0}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`badge ${
                            f.is_active ? 'badge-teal' : 'badge-neutral'
                          }`}
                        >
                          {f.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(f)}
                            className="px-2.5 py-1 rounded-lg bg-[#12243A] text-[#94A3B8] hover:text-white hover:bg-[#1E344D] border border-[#1E344D] text-[11px] font-medium transition"
                            title="Edit permissions"
                          >
                            Permissions
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResendCredentials(f)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-[#12243A] text-sky-400 hover:text-sky-300 hover:bg-[#1E344D] border border-[#1E344D] text-[11px] font-medium transition"
                            title="Reset and email password"
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenConfirmModal(f)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                              f.is_active
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                                : 'bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20'
                            }`}
                          >
                            {f.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add Faculty Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg premium-card p-6 border border-[#1E344D] shadow-2xl space-y-5 animate-drop-in">
            <div className="flex items-start justify-between pb-3 border-b border-[#1E344D]">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Faculty</h3>
                <p className="text-xs text-[#94A3B8]">
                  Provision a new instructor account with custom access privileges.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="fac_name">
                  Full Name <span className="text-teal-400">*</span>
                </label>
                <input
                  id="fac_name"
                  type="text"
                  required
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="e.g. Dr. Alan Turing"
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="fac_email">
                  University Email <span className="text-teal-400">*</span>
                </label>
                <input
                  id="fac_email"
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. a.turing@westbridge.edu"
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="fac_dept">
                  Department <span className="text-teal-400">*</span>
                </label>
                <select
                  id="fac_dept"
                  required
                  value={addDepartment}
                  onChange={(e) => setAddDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Assigned Privileges
                </label>
                <div className="space-y-2 p-3 rounded-xl bg-[#071426] border border-[#1E344D]">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200 select-none">
                      <input
                        type="checkbox"
                        checked={addPermissions.includes(key)}
                        onChange={() => toggleAddPermission(key)}
                        className="w-4 h-4 rounded border-[#1E344D] bg-[#0D1B2E] text-teal-500 focus:ring-0 transition"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E344D]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary-neo px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Permissions Modal */}
      {isEditModalOpen && selectedFaculty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md premium-card p-6 border border-[#1E344D] shadow-2xl space-y-5 animate-drop-in">
            <div className="flex items-start justify-between pb-3 border-b border-[#1E344D]">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Permissions</h3>
                <p className="text-xs text-[#94A3B8]">
                  Modify access roles for {selectedFaculty.name || selectedFaculty.full_name} ({selectedFaculty.faculty_id}).
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

            <form onSubmit={handleUpdatePermissions} className="space-y-4">
              <div className="space-y-2 p-3 rounded-xl bg-[#071426] border border-[#1E344D]">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(key)}
                      onChange={() => toggleEditPermission(key)}
                      className="w-4 h-4 rounded border-[#1E344D] bg-[#0D1B2E] text-teal-500 focus:ring-0 transition"
                    />
                    <span>{label}</span>
                  </label>
                ))}
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
                  disabled={actionLoading}
                  className="btn-primary-neo px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Enable / Disable Confirmation */}
      {isConfirmModalOpen && selectedFaculty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071426]/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm premium-card p-6 border border-[#1E344D] shadow-2xl space-y-4 animate-drop-in">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedFaculty.is_active
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {selectedFaculty.is_active ? 'block' : 'check_circle'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedFaculty.is_active ? 'Disable Faculty Account?' : 'Enable Faculty Account?'}
                </h3>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {selectedFaculty.faculty_id}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedFaculty.is_active
                ? `Disabling ${selectedFaculty.name || selectedFaculty.full_name}'s account will prevent them from signing in and managing student rosters or courses.`
                : `Enabling ${selectedFaculty.name || selectedFaculty.full_name}'s account will restore their access to the faculty console.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1E344D]">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition ${
                  selectedFaculty.is_active
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'btn-primary-neo'
                }`}
              >
                {actionLoading ? 'Updating...' : selectedFaculty.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
