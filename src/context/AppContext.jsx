import React, { createContext, useContext, useState } from 'react'
import { studentAPI } from '../services/api'

const AppContext = createContext(null)

export const initialCartCourses = [
  {
    code: 'CS301',
    section: 'Sec A',
    credits: 4,
    title: 'Data Structures & Algorithms',
    instructor: 'Dr. Sharma',
    schedule: 'Mon, Wed 10:00 – 11:30 AM',
    room: 'Turing Hall 102',
    hasConflict: false,
  },
  {
    code: 'SE319',
    section: 'Sec A',
    credits: 4,
    title: 'Software Engineering Architecture',
    instructor: 'Dr. Al-Mansoor',
    schedule: 'Mon, Fri 01:00 – 02:30 PM',
    room: 'Hall 204',
    hasConflict: false,
  },
  {
    code: 'MATH302',
    section: 'Sec C',
    credits: 3,
    title: 'Probability & Statistics',
    instructor: 'Dr. Eileen Wu',
    schedule: 'Wed, Fri 08:30 – 10:00 AM',
    room: 'Gauss 11',
    hasConflict: false,
  },
  {
    code: 'CS401',
    section: 'Sec A',
    credits: 4,
    title: 'Advanced Algorithms & Complexity',
    instructor: 'Prof. Alan Turing',
    schedule: 'Mon, Wed 03:30 – 05:00 PM',
    room: 'Von Neumann 201',
    hasConflict: true,
    conflictMessage: 'Prerequisite requirement: You cannot register until MATH101 (Calculus I) is verified.',
  },
]

export const initialRegisteredCourses = [
  {
    code: 'CS301',
    sec: 'SEC A',
    title: 'Data Structures & Algorithms',
    instructor: 'Dr. Sharma',
    time: 'Mon, Wed 10:00 – 11:30 AM',
    room: 'Turing Hall 102',
    credits: 4,
  },
  {
    code: 'CS304',
    sec: 'SEC B',
    title: 'Database Management Systems',
    instructor: 'Prof. Vance',
    time: 'Tue, Thu 02:00 – 03:30 PM',
    room: 'Ada Lab 4',
    credits: 4,
  },
  {
    code: 'SE319',
    sec: 'SEC A',
    title: 'Software Engineering',
    instructor: 'Dr. Al-Mansoor',
    time: 'Mon, Fri 01:00 – 02:30 PM',
    room: 'Hall 204',
    credits: 4,
  },
  {
    code: 'MATH302',
    sec: 'SEC C',
    title: 'Probability & Statistics',
    instructor: 'Dr. Eileen Wu',
    time: 'Wed, Fri 08:30 – 10:00 AM',
    room: 'Gauss 11',
    credits: 3,
  },
]

export function AppProvider({ children }) {
  const [cart, setCart] = useState(initialCartCourses)
  const [registeredCourses, setRegisteredCourses] = useState(initialRegisteredCourses)
  const [lastConfirmation, setLastConfirmation] = useState({
    refNumber: 'REF-2026-F-88412',
    timestamp: 'Oct 28, 2026 · 14:32 EST',
    term: 'Fall 2026',
    items: initialRegisteredCourses,
  })

  const addToCart = (course) => {
    if (!cart.some((c) => c.code === course.code)) {
      setCart((prev) => [
        ...prev,
        {
          code: course.code,
          section: course.section || 'Sec A',
          credits: course.credits || 4,
          title: course.title || course.name,
          instructor: course.instructor || course.faculty_name,
          schedule: course.schedule || `${(course.days || []).join(', ')} ${course.start_time || ''}`,
          room: course.room || 'TBA',
          hasConflict: false,
        },
      ])
    }
  }

  const removeFromCart = (courseCode) => {
    setCart((prev) => prev.filter((c) => c.code !== courseCode))
  }

  const clearCart = () => {
    setCart([])
  }

  const resolveConflicts = () => {
    setCart((prev) => prev.filter((c) => !c.hasConflict))
  }

  const confirmRegistration = async () => {
    const validItems = cart.filter((c) => !c.hasConflict)
    const validCodes = validItems.map((c) => c.code)

    let refNum = `REF-2026-F-${Math.floor(10000 + Math.random() * 90000)}`
    const now = new Date()
    let timeStr = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EST`

    try {
      // Attempt backend API registration if token is present
      const res = await studentAPI.registerCourses(validCodes)
      if (res && res.reference_number) {
        refNum = res.reference_number
        timeStr = res.timestamp
      }
    } catch (err) {
      console.warn('Backend offline or error during registration; using client state:', err.message)
    }

    const newRegistered = validItems.map((c) => ({
      code: c.code,
      sec: c.section || 'SEC A',
      title: c.title,
      instructor: c.instructor,
      time: c.schedule,
      room: c.room,
      credits: c.credits,
    }))

    const merged = [...registeredCourses]
    newRegistered.forEach((item) => {
      if (!merged.some((m) => m.code === item.code)) {
        merged.push(item)
      }
    })

    setRegisteredCourses(merged)
    setLastConfirmation({
      refNumber: refNum,
      timestamp: timeStr,
      term: 'Fall 2026',
      items: newRegistered.length > 0 ? newRegistered : merged,
    })
    setCart([])
  }

  return (
    <AppContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        removeFromCart,
        clearCart,
        resolveConflicts,
        registeredCourses,
        setRegisteredCourses,
        confirmRegistration,
        lastConfirmation,
        setLastConfirmation,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
