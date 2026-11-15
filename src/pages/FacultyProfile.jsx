import React from 'react'
import FacultyLayout from '../components/FacultyLayout'
import { useAuth } from '../context/AuthContext'

export default function FacultyProfile() {
  const { user } = useAuth()

  const displayName = user?.full_name || user?.name || 'Dr. R. Sharma'
  const email = user?.email || 'sharma@westbridge.edu'
  const department = user?.department || 'Department of Computer Science'
  const facultyId = user?.faculty_id || user?.student_id || 'FAC-100'

  const colleagues = [
    { name: 'Prof. Alan Vance', role: 'Associate Professor', dept: 'Computer Science', email: 'vance@westbridge.edu', avatar: 'AV' },
    { name: 'Dr. Al-Mansoor', role: 'Professor', dept: 'Software Engineering', email: 'al-mansoor@westbridge.edu', avatar: 'AM' },
    { name: 'Dr. Eileen Wu', role: 'Associate Professor', dept: 'Mathematics', email: 'wu@westbridge.edu', avatar: 'EW' },
    { name: 'Dr. Marcus Rivera', role: 'Assistant Professor', dept: 'Artificial Intelligence', email: 'rivera@westbridge.edu', avatar: 'MR' },
  ]

  const recentActivities = [
    { text: 'Finalized student roster for CS301 (38 students)', time: '2 hours ago', icon: 'groups' },
    { text: 'Updated syllabus and room allocation for CY201', time: 'Yesterday', icon: 'edit_document' },
    { text: 'Scheduled virtual advising hours for Fall 2026', time: '2 days ago', icon: 'event_available' },
    { text: 'Submitted midterm grade evaluation rubrics', time: 'Nov 12, 2026', icon: 'grade' },
  ]

  const permissions = [
    { name: 'Faculty Portal Access', desc: 'Authorized to view teaching console', active: true },
    { name: 'Grade Submission Rights', desc: 'Can submit official term grades', active: true },
    { name: 'Course Roster Inspection', desc: 'Full student directory and audit view', active: true },
    { name: 'Syllabus & Schedule Editor', desc: 'Authorized to update room & times', active: true },
  ]

  return (
    <FacultyLayout title="Faculty Profile">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Profile Card Header Banner */}
        <div className="rounded-2xl bg-[#0A192B]/85 border border-[#1E344D] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-[2px] flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(20,184,166,0.35)]">
                <div className="w-full h-full bg-[#071426] rounded-[14px] flex items-center justify-center text-teal-400 font-bold text-2xl">
                  <span className="material-symbols-outlined text-[36px]">school</span>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="badge badge-teal font-mono text-xs font-semibold">
                    Faculty Instructor
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  <span className="font-mono text-xs text-teal-300 font-semibold">{facultyId}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60"></span>
                  <span className="text-xs text-[#94A3B8]">Fall 2026 Term</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-slate-300 mt-1">{department}</p>
                <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{email}</p>
              </div>
            </div>

            <div className="flex sm:flex-col items-end gap-2 shrink-0">
              <span className="px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-medium text-xs flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                <span>Active Faculty Appointment</span>
              </span>
              <span className="text-xs text-[#64748B] font-mono">Turing Science Hall #314</span>
            </div>
          </div>
        </div>

        {/* 3-Column Grid Layout Eliminating Void Space */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Span 2 (Institutional Details, Office Hours & Assigned Courses) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Institutional Information */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-6 backdrop-blur-xl shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E344D] pb-3">
                <span className="material-symbols-outlined text-[20px] text-teal-400">account_balance</span>
                <span>Institutional Details & Academic Department</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">University</span>
                  <p className="text-white font-medium mt-1">Westbridge University</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Academic College</span>
                  <p className="text-white font-medium mt-1">School of Engineering & Computing</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Department</span>
                  <p className="text-white font-medium mt-1">{department}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Academic Rank</span>
                  <p className="text-teal-400 font-bold mt-1">Senior Associate Professor</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Research Focus</span>
                  <p className="text-slate-200 mt-1">Advanced Algorithms, Distributed Graphs, Parallel Computing</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Teaching Tenure</span>
                  <p className="text-slate-200 mt-1">Since 2018 (8 Academic Years)</p>
                </div>
              </div>
            </div>

            {/* Office & Advising Hours */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-6 backdrop-blur-xl shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E344D] pb-3">
                <span className="material-symbols-outlined text-[20px] text-teal-400">schedule</span>
                <span>Office, Lab & Advising Hours</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Physical Office Location</span>
                  <p className="text-white font-medium mt-1">Turing Science Hall, Room 314</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">In-Person Student Advising</span>
                  <p className="text-white font-medium mt-1">Mon, Wed 2:00 PM – 4:00 PM</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Virtual Advising (Google Meet)</span>
                  <p className="text-white font-medium mt-1">Tue, Thu 3:00 PM – 4:30 PM</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1E344D]/60">
                  <span className="text-[#64748B] uppercase font-mono text-[10px]">Institutional Direct Line</span>
                  <p className="text-teal-400 font-mono font-medium mt-1">+1 (555) 382-9314</p>
                </div>
              </div>
            </div>

            {/* Current Teaching Assignments */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-6 backdrop-blur-xl shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1E344D] pb-3">
                <span className="material-symbols-outlined text-[20px] text-teal-400">menu_book</span>
                <span>Fall 2026 Active Course Allocations</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#071426] border border-teal-500/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      CS301
                    </span>
                    <span className="text-xs text-[#94A3B8] font-mono">4 Credits</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Data Structures & Algorithms</h3>
                  <p className="text-xs text-[#94A3B8]">Mon, Wed 10:00 – 11:30 AM · Turing Hall 102</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-teal-400 font-medium">
                    <span>Enrolled: 38 / 38 (Full)</span>
                    <span className="text-xs text-[#64748B] font-mono">SEC A</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#071426] border border-cyan-500/30 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      CY201
                    </span>
                    <span className="text-xs text-[#94A3B8] font-mono">3 Credits</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Network Security</h3>
                  <p className="text-xs text-[#94A3B8]">Mon, Wed 03:00 – 04:30 PM · Hopper Hall 201</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-cyan-400 font-medium">
                    <span>Enrolled: 38 / 38 (Full)</span>
                    <span className="text-xs text-[#64748B] font-mono">SEC A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Span 1 (Activity, Permissions, Department Colleagues) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Widget 1: Permissions & System Access */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-5 backdrop-blur-xl shadow-lg space-y-3.5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">verified_user</span>
                <span>Permissions &amp; Access</span>
              </h2>

              <div className="space-y-2.5">
                {permissions.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-teal-400 text-[18px] shrink-0 mt-0.5">check_circle</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{p.name}</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5 leading-tight">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Recent Activity */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-5 backdrop-blur-xl shadow-lg space-y-3.5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">history</span>
                <span>Recent Activity</span>
              </h2>

              <div className="space-y-3">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">{act.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-200 text-xs leading-tight font-medium">{act.text}</p>
                      <span className="text-[10px] text-[#64748B] font-mono mt-1 block">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Department Colleagues */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-5 backdrop-blur-xl shadow-lg space-y-3.5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">groups</span>
                <span>Department Colleagues</span>
              </h2>

              <div className="space-y-2.5">
                {colleagues.map((col, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                        {col.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{col.name}</div>
                        <div className="text-[10px] text-[#94A3B8] truncate">{col.role}</div>
                      </div>
                    </div>

                    <a
                      href={`mailto:${col.email}`}
                      className="w-7 h-7 rounded-lg bg-[#12243A] hover:bg-[#1E344D] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors shrink-0"
                      title={`Email ${col.name}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">mail</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FacultyLayout>
  )
}
