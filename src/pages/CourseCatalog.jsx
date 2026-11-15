import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CourseCard from '../components/catalog/CourseCard'
import CourseDrawer from '../components/catalog/CourseDrawer'
import { studentAPI } from '../services/api'
import useMagnetic from '../hooks/useMagnetic'

const FALLBACK_COURSES = [
  {
    course_code: 'CS301',
    section: 'SEC A',
    course_name: 'Data Structures & Algorithms',
    credits: 4,
    department: 'Computer Science',
    faculty_name: 'Dr. Sharma',
    schedule: 'Mon, Wed 10:00 – 11:30 AM',
    room: 'Turing Hall 102',
    capacity: 45,
    enrolled: 37,
    seats_left: 8,
    status: 'open',
    description:
      'Fundamental algorithms and data structures: trees, graphs, sorting, searching, hashing, dynamic programming, and complexity analysis (Big-O).',
    prerequisites: ['CS102', 'MATH101'],
  },
  {
    course_code: 'CS304',
    section: 'SEC B',
    course_name: 'Database Management Systems',
    credits: 4,
    department: 'Computer Science',
    faculty_name: 'Prof. Vance',
    schedule: 'Tue, Thu 02:00 – 03:30 PM',
    room: 'Ada Lab 4',
    capacity: 40,
    enrolled: 37,
    seats_left: 3,
    status: 'open',
    description:
      'Relational database architecture, relational algebra, SQL, indexing (B+ Trees), query optimization, transaction processing, and ACID concurrency control.',
    prerequisites: ['CS201'],
  },
  {
    course_code: 'CS401',
    section: 'SEC A',
    course_name: 'Advanced Algorithms & Complexity',
    credits: 4,
    department: 'Computer Science',
    faculty_name: 'Prof. Alan Turing',
    schedule: 'Mon, Wed 03:30 – 05:00 PM',
    room: 'Von Neumann 201',
    capacity: 30,
    enrolled: 30,
    seats_left: 0,
    status: 'full',
    description:
      'NP-completeness, approximation algorithms, randomized algorithms, linear programming, network flows, and advanced computational complexity theory.',
    prerequisites: ['CS301'],
  },
  {
    course_code: 'SE319',
    section: 'SEC A',
    course_name: 'Software Architecture & Design Patterns',
    credits: 4,
    department: 'Software Eng',
    faculty_name: 'Dr. Al-Mansoor',
    schedule: 'Mon, Fri 01:00 – 02:30 PM',
    room: 'Hall 204',
    capacity: 50,
    enrolled: 38,
    seats_left: 12,
    status: 'open',
    description:
      'Enterprise architectural patterns, microservices, domain-driven design, Gang of Four design patterns, CI/CD pipelines, and software quality attributes.',
    prerequisites: ['CS202'],
  },
  {
    course_code: 'MATH302',
    section: 'SEC C',
    course_name: 'Probability & Stochastic Processes',
    credits: 3,
    department: 'Mathematics',
    faculty_name: 'Dr. Eileen Wu',
    schedule: 'Wed, Fri 08:30 – 10:00 AM',
    room: 'Gauss 11',
    capacity: 35,
    enrolled: 30,
    seats_left: 5,
    status: 'open',
    description:
      'Axioms of probability, continuous and discrete random variables, joint distributions, expectation, central limit theorem, and Poisson processes.',
    prerequisites: ['MATH201'],
  },
  {
    course_code: 'DS201',
    section: 'SEC A',
    course_name: 'Foundations of Data Science',
    credits: 4,
    department: 'Data Science',
    faculty_name: 'Dr. Marcus Rivera',
    schedule: 'Tue, Thu 10:00 – 11:30 AM',
    room: 'Curie Hall 105',
    capacity: 60,
    enrolled: 45,
    seats_left: 15,
    status: 'open',
    description:
      'Exploratory data analysis, statistical inference, feature engineering, regression models, classification with scikit-learn, and reproducible research workflows.',
    prerequisites: ['MATH101', 'CS101'],
  },
]

export default function CourseCatalog() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [inspectedCourse, setInspectedCourse] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedCourseCodes, setSelectedCourseCodes] = useState(() => {
    try {
      const saved = localStorage.getItem('ccrs_selected_courses')
      return saved ? JSON.parse(saved) : ['CS304', 'SE319', 'MATH302']
    } catch {
      return ['CS304', 'SE319', 'MATH302']
    }
  })

  const [waitlistEntries, setWaitlistEntries] = useState([])
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })

  useEffect(() => {
    let isMounted = true
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const [data, wl] = await Promise.all([
          studentAPI.getCourses().catch(() => null),
          studentAPI.getWaitlist().catch(() => [])
        ])
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setCourses(data)
          } else {
            setCourses(FALLBACK_COURSES)
          }
          setWaitlistEntries(wl || [])
        }
      } catch {
        if (isMounted) {
          setCourses(FALLBACK_COURSES)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchCourses()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('ccrs_selected_courses', JSON.stringify(selectedCourseCodes))
    } catch {
      // storage unavailable
    }
  }, [selectedCourseCodes])

  const departments = ['All', 'Computer Science', 'Mathematics', 'Software Eng', 'Data Science', 'Cybersecurity', 'Humanities']

  const filteredCourses = courses.filter((c) => {
    const code = c.course_code || c.code || ''
    const title = c.course_name || c.title || ''
    const instructor = c.faculty_name || c.instructor || ''
    const dept = c.department || ''

    const matchesDept =
      selectedDept === 'All' ||
      dept.toLowerCase().includes(selectedDept.toLowerCase())

    const query = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !query ||
      code.toLowerCase().includes(query) ||
      title.toLowerCase().includes(query) ||
      instructor.toLowerCase().includes(query) ||
      dept.toLowerCase().includes(query)

    return matchesDept && matchesQuery
  })

  const toggleSelectCourse = (course) => {
    const code = course.course_code || course.code
    if (!code) return

    setSelectedCourseCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code)
      } else {
        return [...prev, code]
      }
    })
  }

  const handleOpenDrawer = (course) => {
    setInspectedCourse(course)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  // Calculate total selected credits
  const selectedCredits = selectedCourseCodes.reduce((sum, code) => {
    const match = courses.find((c) => (c.course_code || c.code) === code)
    return sum + (match?.credits ?? 4)
  }, 0)

  return (
    <AppLayout title="Course Catalog">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
              Undergraduate Curriculum
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
            <span className="font-mono text-xs text-[#94A3B8] font-medium">
              Fall 2026 Term
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Course Catalog &amp; Schedule
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Select available courses, review real-time seating capacity, verify prerequisites, and stage your timetable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span ref={magneticBtnRef} className="inline-flex">
            <button
              onClick={() => navigate('/selected-courses')}
              className="btn-primary-neo px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>View Selected Courses ({selectedCourseCodes.length})</span>
            </button>
          </span>
        </div>
      </div>

      {/* Search Input: 24px below header (mb-6), 16px above chips (mb-4) */}
      <div className="mb-4 relative w-full">
        <span className="material-symbols-outlined text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by course name, code, instructor, or topic..."
          className="w-full h-11 pl-11 pr-20 rounded-xl bg-[#071426] text-white placeholder:text-[#64748B] text-sm focus:outline-none focus:border-teal-500 transition-all border border-[#1E344D]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Department Filter Chips: 16px below search, 24px above grid (mb-6) */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {departments.map((dept) => (
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

      {/* Full Width 12-Column Course Grid: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 */}
      <div className="pb-28">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-56 rounded-2xl bg-[#0D1B2E] border border-[#1E344D] animate-pulse p-5"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCourses.map((c) => {
              const code = c.course_code || c.code
              const isSelected = selectedCourseCodes.includes(code)
              return (
                <CourseCard
                  key={code}
                  course={c}
                  isSelected={isSelected}
                  onSelect={handleOpenDrawer}
                  onToggleSelect={toggleSelectCourse}
                />
              )
            })}
          </div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#0D1B2E]/60 border border-dashed border-[#1E344D]">
            <span className="material-symbols-outlined text-4xl text-[#64748B] mb-2">search_off</span>
            <p className="text-sm font-semibold text-slate-200">No courses match your filter criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedDept('All')
              }}
              className="mt-3 text-xs text-teal-400 hover:text-teal-300 underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Course Inspection Drawer */}
      <CourseDrawer
        course={inspectedCourse}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        isSelected={
          inspectedCourse
            ? selectedCourseCodes.includes(inspectedCourse.course_code || inspectedCourse.code)
            : false
        }
        isWaitlisted={
          inspectedCourse && waitlistEntries.some(
            (w) => w.course_code?.toUpperCase() === (inspectedCourse.course_code || inspectedCourse.code)?.toUpperCase() && ['waiting', 'offered'].includes(w.status)
          )
        }
        waitlistRank={
          inspectedCourse && (
            waitlistEntries.find(
              (w) => w.course_code?.toUpperCase() === (inspectedCourse.course_code || inspectedCourse.code)?.toUpperCase() && ['waiting', 'offered'].includes(w.status)
            )?.rank ||
            waitlistEntries.find(
              (w) => w.course_code?.toUpperCase() === (inspectedCourse.course_code || inspectedCourse.code)?.toUpperCase() && ['waiting', 'offered'].includes(w.status)
            )?.position
          )
        }
        onJoinWaitlist={async (courseToJoin) => {
          const code = courseToJoin.course_code || courseToJoin.code
          await studentAPI.joinWaitlist(code)
          const wl = await studentAPI.getWaitlist().catch(() => [])
          setWaitlistEntries(wl || [])
        }}
        onToggleSelect={toggleSelectCourse}
      />

      {/* Floating Bottom Selected Courses Dock */}
      <aside className="fixed bottom-3 left-0 right-0 px-6 pointer-events-none z-30">
        <div className="max-w-7xl mx-auto pointer-events-auto p-3 sm:px-5 rounded-2xl bg-[#0A192B]/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.65)] flex flex-wrap items-center justify-between gap-4 border border-[#1E344D]">
          {/* Selected courses summary count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {selectedCourseCodes.length} courses selected
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold">
                  {selectedCredits} Credits
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#94A3B8]">
                {selectedCourseCodes.join(' · ')}
              </span>
            </div>
          </div>

          {/* Credit meter progress */}
          <div className="hidden md:flex flex-col w-72 gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#94A3B8]">
                Reg 15 + Selected {selectedCredits}
              </span>
              <span className="font-mono font-bold text-teal-400">
                {15 + selectedCredits} / 24 CR Limit
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#12243A] overflow-hidden flex">
              <div className="h-full bg-teal-400" style={{ width: '62.5%' }} title="15 CR Registered"></div>
              <div
                className="h-full bg-sky-400"
                style={{ width: `${Math.min(37.5, (selectedCredits / 24) * 100)}%` }}
                title="Selected Credits"
              ></div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => navigate('/selected-courses')}
            className="btn-primary-neo px-5 py-2.5 text-xs flex items-center gap-2"
          >
            <span>View Selected Courses</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </aside>
    </AppLayout>
  )
}
