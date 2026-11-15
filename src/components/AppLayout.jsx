import React, { useState, useRef, useEffect } from 'react'
import TopNav from './layout/TopNav'

export default function AppLayout({ title = 'Portal', children }) {
  const [isNavVisible, setIsNavVisible] = useState(false)
  const hideTimerRef = useRef(null)

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setIsNavVisible(true)
  }

  const handleMouseLeave = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = setTimeout(() => {
      setIsNavVisible(false)
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <div className="text-on-surface antialiased selection:bg-teal-500/20 selection:text-teal-300 min-h-screen relative overflow-x-hidden bg-transparent">
      {/* Invisible Hover Zone at the very top edge of the screen */}
      <div
        className="fixed top-0 left-0 w-full h-3 z-50 pointer-events-auto cursor-pointer"
        onMouseEnter={handleMouseEnter}
        aria-hidden="true"
      />

      {/* Top Navigation with role-based horizontal sliding tab strip and collapsive auto-hide */}
      <TopNav
        pageTitle={title}
        isVisible={isNavVisible}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Main Content Area - starts directly from top with minimal spacing */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="w-full pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 flex-1 page-enter">
          <div className="flex flex-col w-full pb-12 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
