import React, { useState } from 'react'
import AppLayout from '../components/AppLayout'
import StatCard from '../components/StatCard'
import useMagnetic from '../hooks/useMagnetic'

export default function AcademicRecord() {
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  const termsData = [
    {
      termId: 'fall2025',
      name: 'Fall 2025',
      sub: 'Sophomore Term 2 · Completed Dec 2025',
      termGpa: '3.82',
      termCredits: '15.0',
      standing: "Dean's Honor Roll",
      courses: [
        { code: 'CS201', name: 'Data Structures & Algorithms', crn: '41802', instructor: 'Prof. R. Chen', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
        { code: 'CS202', name: 'Discrete Mathematics', crn: '41808', instructor: 'Prof. M. Sterling', credits: 3.0, grade: 'Grade B+', gradeType: 'B' },
        { code: 'MATH201', name: 'Linear Algebra & Applications', crn: '42010', instructor: 'Prof. H. Lin', credits: 4.0, grade: 'Grade A-', gradeType: 'A' },
        { code: 'SE210', name: 'Object Oriented Programming & Design', crn: '42115', instructor: 'Prof. K. Patel', credits: 4.0, grade: 'Grade B+', gradeType: 'B' },
      ],
    },
    {
      termId: 'spring2025',
      name: 'Spring 2025',
      sub: 'Sophomore Term 1 · Completed May 2025',
      termGpa: '3.86',
      termCredits: '16.0',
      standing: "Dean's Honor Roll",
      courses: [
        { code: 'CS102', name: 'Introduction to Computer Science II', crn: '31201', instructor: 'Dr. Sharma', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
        { code: 'MATH102', name: 'Calculus II', crn: '31405', instructor: 'Dr. Eileen Wu', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
        { code: 'PHYS101', name: 'Physics for Engineers I & Lab', crn: '31520', instructor: 'Prof. G. Hall', credits: 4.0, grade: 'Grade A-', gradeType: 'A' },
        { code: 'ENGL102', name: 'Academic Research & Composition', crn: '31611', instructor: 'Prof. A. Moore', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
      ],
    },
    {
      termId: 'fall2024',
      name: 'Fall 2024',
      sub: 'Freshman Term 1 · Completed Dec 2024',
      termGpa: '3.85',
      termCredits: '15.0',
      standing: "Dean's Honor Roll",
      courses: [
        { code: 'CS101', name: 'Introduction to Computer Science I', crn: '21001', instructor: 'Dr. Al-Mansoor', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
        { code: 'MATH101', name: 'Calculus I', crn: '21015', instructor: 'Prof. H. Lin', credits: 4.0, grade: 'Grade A', gradeType: 'A' },
        { code: 'CHEM101', name: 'General Chemistry Principles', crn: '21032', instructor: 'Dr. S. Miller', credits: 4.0, grade: 'Grade B+', gradeType: 'B' },
        { code: 'HIST101', name: 'Modern Global History', crn: '21055', instructor: 'Prof. J. Davies', credits: 3.0, grade: 'Grade A', gradeType: 'A' },
      ],
    },
  ]

  const filteredTerms = termsData
    .filter((t) => selectedTerm === 'all' || t.termId === selectedTerm)
    .map((t) => ({
      ...t,
      courses: t.courses.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.instructor.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((t) => t.courses.length > 0)

  return (
    <AppLayout title="Academic Record">
      {/* Top Banner */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Official Transcript &amp; Audit
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8] font-medium">
                Westbridge University
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Academic Record &amp; Degree Progress
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              Comprehensive grade history, cumulative GPA analytics, and degree completion verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span ref={magneticBtnRef} className="inline-flex">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary-neo px-4 py-2.5 text-xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Download Official PDF</span>
              </button>
            </span>
          </div>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
          <StatCard
            title="Cumulative GPA"
            value="3.84"
            valueSuffix="/ 4.00"
            icon="workspace_premium"
            iconBg="bg-teal-500/10"
            iconColor="text-teal-400"
            footerText="Dean's Honors List · Top 5%"
          />

          <StatCard
            title="Credits Completed"
            value="84"
            valueSuffix="/ 120 CR"
            icon="school"
            iconBg="bg-sky-500/10"
            iconColor="text-sky-400"
            progress={70}
            footerText="36 credits remaining"
          />

          <StatCard
            title="Major GPA (CS)"
            value="3.92"
            valueSuffix="/ 4.00"
            icon="psychology"
            iconBg="bg-teal-500/10"
            iconColor="text-teal-400"
            footerText="Departmental Honors"
          />

          <StatCard
            title="Academic Standing"
            value="Good Standing"
            icon="verified"
            iconBg="bg-teal-500/10"
            iconColor="text-teal-400"
            footerText="0 Active Holds"
            footerIcon="check_circle"
          />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Degree Progress & Course History (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Degree Progress Card */}
          <div className="premium-card p-5 md:p-6 border border-[#1E344D] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[20px]">pie_chart</span>
                <h3 className="text-sm font-bold text-white">
                  Degree Requirements Fulfillment
                </h3>
              </div>
              <span className="font-mono text-xs text-teal-400 font-bold">
                70% Completed
              </span>
            </div>

            {/* 1. Major Core */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.7)]"></span>
                  <span className="font-semibold text-white">Computer Science Major Core</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-semibold">60 / 72 credits</span>
                  <span className="text-[#64748B]">(83.3%)</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-[#12243A] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-1000" style={{ width: '83.3%' }}></div>
              </div>
            </div>

            {/* 2. Electives */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]"></span>
                  <span className="font-semibold text-white">Departmental &amp; Technical Electives</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sky-400 font-semibold">18 / 30 credits</span>
                  <span className="text-[#64748B]">(60.0%)</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-[#12243A] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-1000" style={{ width: '60%' }}></div>
              </div>
            </div>

            {/* 3. General Education */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"></span>
                  <span className="font-semibold text-white">General Education &amp; Humanities</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-semibold">6 / 18 credits</span>
                  <span className="text-[#64748B]">(33.3%)</span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-[#12243A] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000" style={{ width: '33.3%' }}></div>
              </div>
            </div>

            {/* Footnote */}
            <div className="mt-1 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#071426] rounded-xl p-3 border border-[#1E344D] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">info</span>
                <span>
                  <strong className="text-teal-300 font-semibold">36 credits remaining</strong> to fulfill university graduation audit.
                </span>
              </div>
              <span className="font-mono text-[#94A3B8]">
                Projected Graduation: <strong className="text-white">Spring 2027</strong>
              </span>
            </div>
          </div>

          {/* Course History Section */}
          <div className="premium-card p-5 md:p-6 border border-[#1E344D] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Historical Transcript
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Official term-by-term record of completed academic courses and letter grades
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#64748B]">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                    className="h-8 pl-8 pr-3 rounded-lg bg-[#071426] text-white placeholder:text-[#64748B] text-xs w-36 sm:w-44 border border-[#1E344D] focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="relative">
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="h-8 px-2.5 pr-7 rounded-lg bg-[#071426] text-white text-xs font-mono border border-[#1E344D] appearance-none cursor-pointer focus:outline-none focus:border-teal-500"
                  >
                    <option value="all">All Semesters</option>
                    <option value="fall2025">Fall 2025</option>
                    <option value="spring2025">Spring 2025</option>
                    <option value="fall2024">Fall 2024</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-[15px] text-[#64748B] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Semester Groups */}
            <div className="flex flex-col gap-5">
              {filteredTerms.map((term) => (
                <div key={term.termId} className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1E344D]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {term.name}
                      </h4>
                      <span className="font-mono text-[11px] text-[#94A3B8] px-2 py-0.5 rounded bg-[#12243A] border border-[#1E344D]">
                        {term.sub}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-teal-400">
                      Term GPA: <strong>{term.termGpa}</strong>
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-[#071426] border border-[#1E344D]">
                    {term.courses.map((course, idx) => (
                      <div
                        key={course.code}
                        className={`flex items-center justify-between p-3 hover:bg-[#12243A] transition-colors border-b border-[#1E344D]/50 last:border-b-0 ${
                          idx % 2 === 1 ? 'bg-[#0A192B]/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 tracking-wider">
                            {course.code}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs sm:text-sm font-semibold text-white truncate">
                              {course.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#94A3B8]">
                              CRN {course.crn} · {course.instructor}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="font-mono text-xs text-[#94A3B8]">
                            {course.credits.toFixed(1)} CR
                          </span>
                          <span
                            className={`badge ${
                              course.gradeType === 'A'
                                ? 'badge-teal'
                                : 'badge-info'
                            }`}
                          >
                            {course.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: GPA Trend & Verification Info (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* GPA Trend Card */}
          <div className="premium-card p-5 border border-[#1E344D] space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E344D]">
              <span className="text-sm font-bold text-white">
                Term GPA Trend
              </span>
              <span className="text-xs font-mono text-teal-400 font-bold">3.84 Cumulative</span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Fall 2024</span>
                  <span className="text-teal-400 font-bold">3.85 GPA</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden">
                  <div className="h-full bg-teal-400" style={{ width: '96.25%' }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Spring 2025</span>
                  <span className="text-teal-400 font-bold">3.86 GPA</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden">
                  <div className="h-full bg-teal-400" style={{ width: '96.5%' }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#94A3B8]">Fall 2025</span>
                  <span className="text-teal-400 font-bold">3.82 GPA</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden">
                  <div className="h-full bg-teal-400" style={{ width: '95.5%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Verification Box */}
          <div className="premium-card p-5 border border-[#1E344D] space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#1E344D]">
              <span className="material-symbols-outlined text-teal-400 text-[18px]">security</span>
              <span className="text-sm font-bold text-white">
                Registrar Verification
              </span>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This digital transcript is authenticated with cryptographic institutional signatures from Westbridge University Office of the Registrar.
            </p>

            <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D] space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Digest ID:</span>
                <span className="text-teal-300">SHA256-88F4-09A1</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Status:</span>
                <span className="text-teal-400 font-bold">Certified Valid</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
