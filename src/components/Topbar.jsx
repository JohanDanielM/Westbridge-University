import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/westbridge-logo.png'

export default function Topbar({ pageTitle, onToggleMobileNav }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const isFaculty = location.pathname.startsWith('/faculty') || user?.role === 'faculty'
  const isAdmin = !isFaculty && (location.pathname.startsWith('/admin') || user?.role === 'admin')

  const displayName = user?.full_name || user?.name || (isFaculty ? 'Faculty Member' : (isAdmin ? 'System Administrator' : 'Student'))
  const displayId = isFaculty
    ? (user?.department || user?.faculty_id || 'Faculty')
    : (isAdmin ? (user?.department || 'Administrator') : (user?.student_id || user?.roll_number || user?.email || 'Student'))

  const consoleLabel = isFaculty ? 'Faculty Portal' : (isAdmin ? 'Admin Console' : 'Portal')
  const roleBadge = isFaculty ? 'Faculty' : (isAdmin ? 'Admin' : 'Student')
  const sessionStatus = isFaculty
    ? 'Faculty Session Active'
    : (isAdmin ? 'Registration Session Active' : 'Registration closes Nov 20')

  const handleLogoClick = () => {
    if (user?.role === 'student') navigate('/dashboard')
    else if (user?.role === 'faculty') navigate('/faculty/dashboard')
    else if (user?.role === 'admin') navigate('/admin')
    else navigate('/login')
  }

  const [isVisible, setIsVisible] = useState(true)
  const hideTimerRef = useRef(null)

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 1500)
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

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
        className={`fixed top-0 left-0 right-0 w-full h-16 md:h-20 bg-[#0A192B]/90 backdrop-blur-2xl z-50 flex items-center justify-between px-4 sm:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.35)] border-b border-[#1E344D] transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
      {/* Left: Interactive Logo & Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center cursor-pointer focus:outline-none group select-none transition-transform hover:scale-[1.02]"
          aria-label="Westbridge University Home"
        >
          <img
            src={logo}
            alt="Westbridge University"
            className="h-10 md:h-12 w-auto object-contain"
          />
        </button>

        {/* Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 border-l border-[#1E344D] pl-3">
          <span className="text-xs text-[#94A3B8] font-medium hidden md:inline">
            {consoleLabel}
          </span>
          <span className="material-symbols-outlined text-[#64748B] text-[16px] hidden md:inline">
            chevron_right
          </span>
          <span className="text-sm text-white font-semibold tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Center Term Status Pill */}
      <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071426]/80 border border-[#1E344D]">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
        <span className="font-mono text-xs text-white font-medium">
          Fall 2026
        </span>
        <span className="text-xs text-[#64748B]">·</span>
        <span className="text-xs text-[#94A3B8]">
          {sessionStatus}
        </span>
      </div>

      {/* Right Actions: Notifications & User Profile Menu */}
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
              {/* Online status indicator */}
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

              {/* Menu items */}
              <div className="flex flex-col gap-0.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false)
                    if (isFaculty) navigate('/faculty/profile')
                    else if (isAdmin) navigate('/admin')
                    else navigate('/academic-record')
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[16px] text-teal-400">person</span>
                  <span>{isFaculty ? 'Faculty Profile' : (isAdmin ? 'System Settings' : 'My Academic Record')}</span>
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
    </header>
    </>
  )
}
