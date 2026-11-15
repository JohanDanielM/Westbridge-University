import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import NotificationBell from '../NotificationBell'
import { studentAPI } from '../../services/api'
import logo from '../../assets/westbridge-logo.png'

export default function TopNav({
  pageTitle,
  isVisible: controlledVisible,
  onMouseEnter: controlledMouseEnter,
  onMouseLeave: controlledMouseLeave,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { cart } = useApp()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const [internalVisible, setInternalVisible] = useState(true)
  const hideTimerRef = useRef(null)

  const isControlled = controlledVisible !== undefined
  const isVisible = isControlled ? controlledVisible : internalVisible

  const handleMouseEnter = () => {
    if (controlledMouseEnter) {
      controlledMouseEnter()
    } else {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      setInternalVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (controlledMouseLeave) {
      controlledMouseLeave()
    } else {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
      hideTimerRef.current = setTimeout(() => {
        setInternalVisible(false)
      }, 1500)
    }
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const isFaculty = location.pathname.startsWith('/faculty') || user?.role === 'faculty'
  const isAdmin = !isFaculty && (location.pathname.startsWith('/admin') || user?.role === 'admin')

  const displayName = user?.full_name || user?.name || (isFaculty ? 'Faculty Member' : (isAdmin ? 'System Administrator' : 'Student'))
  const displayId = isFaculty
    ? (user?.department || user?.faculty_id || 'Faculty')
    : (isAdmin ? (user?.department || 'Administrator') : (user?.student_id || user?.roll_number || user?.email || 'Student'))

  const handleLogoClick = () => {
    if (user?.role === 'student') navigate('/dashboard')
    else if (user?.role === 'faculty') navigate('/faculty/dashboard')
    else if (user?.role === 'admin') navigate('/admin')
    else navigate('/login')
  }

  const portalBadge = isFaculty ? 'CCRS FACULTY' : (isAdmin ? 'CCRS ADMIN' : 'CCRS STUDENT')
  const roleBadge = isFaculty ? 'Faculty' : (isAdmin ? 'Admin' : 'Student')
  const cartCount = cart ? cart.length : 0
  const [offeredCount, setOfferedCount] = useState(0)

  useEffect(() => {
    if (!isFaculty && !isAdmin) {
      studentAPI
        .getWaitlist()
        .then((data) => {
          const count = (data || []).filter((e) => e.status === 'offered').length
          setOfferedCount(count)
        })
        .catch(() => {})
    }
  }, [location.pathname, isFaculty, isAdmin])

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = () => {
    setIsProfileOpen(false)
    logout()
    navigate('/login')
  }

  // Role-based top navigation tabs
  const studentTabs = [
    { name: 'Dashboard', path: '/dashboard', icon: 'space_dashboard' },
    { name: 'Course Catalog', path: '/catalog', icon: 'menu_book' },
    { name: 'Timetable', path: '/timetable', icon: 'calendar_month' },
    {
      name: 'Selected Courses',
      path: '/selected-courses',
      icon: 'check_circle',
      badge: cartCount > 0 ? String(cartCount) : null,
    },
    { name: 'Academic Record', path: '/record', icon: 'school' },
    {
      name: 'Waiting List',
      path: '/waitlist',
      icon: 'hourglass_top',
      badge: offeredCount > 0 ? String(offeredCount) : null,
    },
  ]

  const facultyTabs = [
    { name: 'My Courses', path: '/faculty/dashboard', icon: 'menu_book' },
    { name: 'Student Roster', path: '/faculty/roster', icon: 'groups' },
    { name: 'Timetable', path: '/faculty/timetable', icon: 'calendar_month' },
    { name: 'Profile', path: '/faculty/profile', icon: 'account_circle' },
  ]

  const adminTabs = [
    { name: 'Overview', path: '/admin/dashboard', icon: 'grid_view' },
    { name: 'Course Management', path: '/admin/courses', icon: 'menu_book' },
    { name: 'Waitlists', path: '/admin/waitlists', icon: 'list_alt' },
    { name: 'Access Control', path: '/admin/access-control', icon: 'admin_panel_settings' },
    { name: 'Reports', path: '/admin/reports', icon: 'analytics' },
    { name: 'System Settings', path: '/admin/settings', icon: 'settings' },
  ]

  const activeTabs = isFaculty ? facultyTabs : (isAdmin ? adminTabs : studentTabs)

  return (
    <>
      {/* Invisible Hover Zone at the very top of the screen */}
      <div
        onMouseEnter={handleMouseEnter}
        className="fixed top-0 left-0 w-full h-3 z-50 pointer-events-auto cursor-pointer"
        aria-hidden="true"
      />

      <header
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 right-0 w-full z-50 bg-[#0A192B]/90 backdrop-blur-2xl border-b border-[#1E344D] shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
      {/* Upper Bar: Brand, Semester Pill, Notification Bell, User Avatar Profile */}
      <div className="h-16 md:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[#1E344D]/60 max-w-7xl mx-auto w-full">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 cursor-pointer focus:outline-none group select-none transition-transform hover:scale-[1.02]"
            aria-label="Westbridge University Home"
          >
            <img
              src={logo}
              alt="Westbridge University"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </button>
        </div>

        {/* Center: Active Semester Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071426]/80 border border-[#1E344D]">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
          <span className="font-mono text-xs text-white font-medium">
            Fall 2026
          </span>
          <span className="text-xs text-[#64748B]">·</span>
          <span className="text-xs text-teal-400 font-medium">
            Registration Live
          </span>
        </div>

        {/* Right: Notifications & User Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          <div className="w-px h-6 bg-[#1E344D] mx-0.5 sm:mx-1"></div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
              aria-label="User profile menu"
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#12243A] cursor-pointer group select-none transition-colors border border-transparent hover:border-[#1E344D] focus:outline-none"
            >
              <div className="relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-teal-500/40 shadow-[0_0_10px_rgba(20,184,166,0.25)]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shrink-0 text-[#04211D] font-bold text-xs shadow-[0_0_10px_rgba(20,184,166,0.25)]">
                    {isFaculty ? (
                      <span className="material-symbols-outlined text-[15px]">school</span>
                    ) : isAdmin ? (
                      'MC'
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">person</span>
                    )}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-[#0A192B]" />
              </div>

              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-mono text-teal-400/90 leading-tight">
                  {roleBadge}
                </span>
              </div>

              <span className={`material-symbols-outlined text-[#64748B] group-hover:text-white transition-transform duration-200 text-[18px] ${isProfileOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* User Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="dropdown-panel absolute right-0 mt-2 w-64 p-3 shadow-2xl flex flex-col gap-2 z-50">
                {/* Header with user info */}
                <div className="p-2.5 rounded-lg bg-[#071426]/70 border border-[#1E344D]/70 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shrink-0 text-[#04211D] font-bold text-xs shadow-md">
                    {isFaculty ? (
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    ) : isAdmin ? (
                      'MC'
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{displayName}</span>
                    <span className="text-[10px] font-mono text-[#94A3B8] truncate">{displayId}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-teal-300 font-semibold bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded w-fit">
                      <span className="w-1 h-1 rounded-full bg-teal-400"></span>
                      {roleBadge}
                    </span>
                  </div>
                </div>

                {/* Profile Link */}
                <div className="flex flex-col gap-0.5 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false)
                      if (isFaculty) navigate('/faculty/profile')
                      else if (isAdmin) navigate('/admin/settings')
                      else navigate('/record')
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[16px] text-teal-400">person</span>
                    <span>{isFaculty ? 'Faculty Profile' : (isAdmin ? 'System Settings' : 'Academic Record')}</span>
                  </button>
                </div>

                <div className="h-px bg-[#1E344D]/80 my-0.5" />

                {/* Sign Out Action */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-left text-xs font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Bar: Role-based horizontal sliding tab navigation strip */}
      <nav
        aria-label="Primary Navigation"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-center gap-1 sm:gap-2 min-w-max">
          {activeTabs.map((tab) => {
            const isMatch =
              location.pathname === tab.path ||
              (tab.path === '/record' && location.pathname === '/academic-record') ||
              (tab.path === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/overview')) ||
              (tab.path === '/faculty/dashboard' && location.pathname === '/faculty')

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => {
                  const active = isActive || isMatch
                  return `relative flex items-center gap-2 px-3 sm:px-4 py-3 min-h-[44px] text-xs font-medium transition-colors whitespace-nowrap focus:outline-none select-none ${
                    active
                      ? 'text-teal-300 font-semibold'
                      : 'text-[#94A3B8] hover:text-white'
                  }`
                }}
              >
                {({ isActive }) => {
                  const active = isActive || isMatch
                  return (
                    <>
                      <span
                        className={`material-symbols-outlined text-[18px] transition-colors ${
                          active ? 'text-teal-400' : 'text-[#64748B]'
                        }`}
                      >
                        {tab.icon}
                      </span>
                      <span>{tab.name}</span>
                      {tab.badge && (
                        <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                          {tab.badge}
                        </span>
                      )}

                      {/* Active sliding 2px teal underline */}
                      {active && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.8)] rounded-full transition-all duration-300" />
                      )}
                    </>
                  )
                }}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </header>
    </>
  )
}
