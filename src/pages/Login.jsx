import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import useMagnetic from '../hooks/useMagnetic'
import logo from '../assets/westbridge-logo.png'

const CAMPUS_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
    title: 'Central Campus Quadrangle & Library',
    term: 'Fall 2026',
  },
  {
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=80',
    title: 'Science & Technology Research Complex',
    term: 'Fall 2026',
  },
  {
    url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1600&q=80',
    title: 'Student Learning Commons & Courtyard',
    term: 'Fall 2026',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, login: setAuthSession } = useAuth()
  const [identifier, setIdentifier] = useState('STU2024-00123')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [capsLockActive, setCapsLockActive] = useState(false)
  const magneticBtnRef = useMagnetic({ strength: 0.3, maxShift: 5 })
  const [successMessage, setSuccessMessage] = useState('')
  const [infoNotice, setInfoNotice] = useState('')
  const [activeModal, setActiveModal] = useState(null) // 'privacy' | 'accessibility' | 'contact' | 'support'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Countdown timer for "Registration opens Nov 12"
  const [countdownText, setCountdownText] = useState('')

  useEffect(() => {
    // Target date: Nov 12, 2026 09:00:00 (or dynamically in future)
    const now = new Date()
    let target = new Date(now.getFullYear(), 10, 20, 9, 0, 0)
    if (now > target) {
      target = new Date(now.getFullYear() + 1, 10, 20, 9, 0, 0)
    }

    const updateTimer = () => {
      const diff = Math.max(0, target.getTime() - Date.now())
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)
      setCountdownText(`${days}d ${hours}h ${mins}m ${secs}s`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogoClick = () => {
    if (user?.role === 'student') navigate('/dashboard')
    else if (user?.role === 'faculty') navigate('/faculty/dashboard')
    else if (user?.role === 'admin') navigate('/admin')
    else navigate('/login')
  }

  // 14. Carousel auto-rotate every 5 seconds (5000ms)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % CAMPUS_SLIDES.length)
    }, 5000)
    return () => clearInterval(slideTimer)
  }, [])

  // Support Modal Form state
  const [supportSubject, setSupportSubject] = useState('CCRS Account Login Assistance')
  const [supportMessageText, setSupportMessageText] = useState('')

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
    }
    if (searchParams.get('error') === 'oauth_failed') {
      setErrorMessage('Google/GitHub sign-in failed. Please try again.')
    }
    if (searchParams.get('registered') === 'success') {
      setSuccessMessage('Account created successfully! Please sign in with your credentials.')
    }
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('Password reset successfully! Please sign in with your new credentials.')
    }
  }, [searchParams, location.state])

  const handlePasswordKeyEvent = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'))
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setInfoNotice('')
    try {
      const data = await authAPI.login(identifier, password)
      if (data.access_token && data.user) {
        setAuthSession(data.access_token, data.user)
      }
      const role = (data.user?.role || '').toLowerCase()
      if (role === 'faculty') {
        navigate('/faculty/dashboard')
      } else if (role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        // Backend not reachable, fallback demo
        navigate('/dashboard')
      } else {
        setErrorMessage(err.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

const handleGoogleLogin = () => {
  // Use the Vite env variable, but remove the "/api" part for OAuth routes
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const backendUrl = apiUrl.replace('/api', '')
  window.location.href = `${backendUrl}/auth/google/login`
}

const handleGitHubLogin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const backendUrl = apiUrl.replace('/api', '')
  window.location.href = `${backendUrl}/auth/github/login`
}
  const handleViewCatalogNotice = () => {
    setInfoNotice('Please sign in to access the course catalog and plan your schedule.')
    const el = document.getElementById('identifier')
    if (el) {
      el.focus()
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSupportSubmit = (e) => {
    e.preventDefault()
    const mailtoUrl = `mailto:support@westbridge.edu?subject=${encodeURIComponent(
      supportSubject
    )}&body=${encodeURIComponent(
      supportMessageText || 'Hello Westbridge IT Support,\n\nI need assistance logging into the CCRS portal.'
    )}`
    window.location.href = mailtoUrl
    setActiveModal(null)
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-teal-500/20 selection:text-teal-300 bg-transparent page-enter">
      {/* Main Header */}
      <header className="w-full border-b border-[#1E344D] bg-[#071426]/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 md:h-20 flex items-center justify-between">
          {/* University Branding & Logo */}
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

          {/* Right Navigation: Help */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveModal('support')}
              className="text-[#94A3B8] hover:text-white transition-colors duration-150 flex items-center gap-1 cursor-pointer focus:outline-none text-xs sm:text-sm font-semibold"
            >
              <span>Help</span>
              <svg className="w-3.5 h-3.5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content: 5. items-start alignment */}
      <main className="flex-grow flex items-center justify-center py-10 lg:py-16 px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* 13. Left Column: Hidden on < lg, shown on large screens */}
          <section
            aria-labelledby="intro-heading"
            className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 animate-fade-up"
          >
            <div>
              <div className="mb-8">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="cursor-pointer focus:outline-none select-none transition-transform hover:scale-[1.02]"
                  aria-label="Westbridge University Home"
                >
                  
                </button>
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span className="text-xs font-bold tracking-widest text-teal-400 uppercase font-mono">
                    Welcome to Westbridge University
                  </span>
                </div>
                {/* 3. Headline gradient on "starts here." */}
                <h1
                  className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white tracking-tight leading-[1.15]"
                  id="intro-heading"
                >
                  Your next semester <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                    starts here.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-[#94A3B8] max-w-xl font-normal leading-relaxed">
                  Explore courses, plan your schedule, and take the next step in your academic journey with the Westbridge Course Registration Portal.
                </p>
              </div>
            </div>

            {/* Campus Hero Image Carousel */}
            <div className="relative rounded-2xl overflow-hidden border border-[#1E344D] shadow-2xl group bg-[#0A192B]">
              <div className="aspect-[16/9] w-full relative">
                {/* 11. Status chip on photo: floating badge with live countdown */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071426]/90 backdrop-blur-md border border-teal-500/40 text-xs text-white shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span className="font-semibold">Registration opens Nov 20</span>
                  {countdownText && (
                    <span className="font-mono text-teal-300 text-[11px] font-bold">
                      ({countdownText})
                    </span>
                  )}
                </div>

                {CAMPUS_SLIDES.map((slide, idx) => (
                  <img
                    key={slide.url}
                    src={slide.url}
                    alt={slide.title}
                    className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-[1.02] transition-opacity duration-1000 ease-in-out ${
                      idx === currentSlideIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  />
                ))}

                {/* 4. Carousel bottom gradient fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent to-transparent pointer-events-none z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#040D19]/60 via-transparent to-transparent pointer-events-none z-10"></div>

                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs text-slate-300 z-20">
                  <span className="flex items-center gap-1.5 font-medium bg-[#071426]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {CAMPUS_SLIDES[currentSlideIndex].title}
                  </span>

                  {/* 14. Clickable dots */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {CAMPUS_SLIDES.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setCurrentSlideIndex(dotIdx)}
                          aria-label={`Go to slide ${dotIdx + 1}`}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            dotIdx === currentSlideIndex ? 'bg-teal-400 w-5' : 'bg-white/40 hover:bg-white/70 w-2'
                          }`}
                        />
                      ))}
                    </div>
                    {/* 1. Term label: Spring 2027 */}
                    <span className="hidden sm:inline-block text-[#94A3B8] text-[11px] font-mono ml-1">
                      {CAMPUS_SLIDES[currentSlideIndex].term}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcement Card */}
            <article className="premium-card p-5 border border-[#1E344D]">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center flex-shrink-0 text-teal-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-grow space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      Upcoming Term
                    </span>
                    {/* 1. Term label: Spring 2027 */}
                    <h3 className="text-sm font-semibold text-white">Registration for Spring 2027</h3>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Browse available courses, verify prerequisites, and organize your study load in advance.
                  </p>
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={handleViewCatalogNotice}
                      className="inline-flex items-center text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer group/link focus:outline-none"
                    >
                      <span>View course catalog</span>
                      <span className="ml-1 inline-block transition-transform duration-200 group-hover/link:translate-x-1">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* Right Column: Sign-In Card (12. animate-fade-up delay-100) */}
          <section
            aria-labelledby="signin-heading"
            className="lg:col-span-5 flex flex-col items-center lg:items-end w-full animate-fade-up delay-100"
          >
            {/* 6. Form card subtle glow: shadow-[0_0_40px_rgba(20,184,166,0.15)] border border-teal-500/20 */}
            <div className="w-full max-w-[460px] premium-card p-8 sm:p-10 border border-teal-500/20 shadow-[0_0_40px_rgba(20,184,166,0.15)] relative rounded-2xl">
              {/* Centered Logo on Auth Card */}
              <div className="flex justify-center mb-8 w-full">
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="cursor-pointer focus:outline-none select-none transition-transform active:scale-95"
                  aria-label="Westbridge University Home"
                >
                  <img
                    src={logo}
                    alt="Westbridge University"
                    className="h-16 md:h-20 w-auto object-contain mx-auto"
                  />
                </button>
              </div>

              <div className="mb-7 text-center">
                <h2 className="text-2xl font-bold text-white tracking-tight" id="signin-heading">
                  Sign in to your account
                </h2>
                {/* 7. Brighten text contrast to text-slate-300 text-sm */}
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Use your Westbridge credentials to access the registration portal.
                </p>
              </div>

              {/* Success Notification */}
              {successMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-teal-400">check_circle</span>
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              {/* Informational Notice */}
              {infoNotice && (
                <div className="mb-4 p-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-cyan-400">info</span>
                  <span>{infoNotice}</span>
                </div>
              )}

              {/* 10. Inline red error text */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSignIn}>
                {/* Student ID / Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="identifier">
                    Student ID, Roll Number, or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. STU2026-00001, CS-2026-0001, or student@westbridge.edu"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition duration-150 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handlePasswordKeyEvent}
                      onKeyUp={handlePasswordKeyEvent}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-11 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition duration-150 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-slate-200 transition-colors focus:outline-none"
                    >
                      <svg className={`w-4 h-4 ${showPassword ? 'text-teal-400' : 'text-[#64748B]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>

                  {/* 10. Caps Lock Warning */}
                  {capsLockActive && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs pt-1 font-medium animate-fade-in">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Caps Lock is on</span>
                    </div>
                  )}
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#1E344D] bg-[#071426] text-teal-500 focus:ring-0 focus:ring-offset-0 transition"
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer focus:outline-none"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* 10. Primary Sign-In Button with Loading Spinner */}
                <span ref={magneticBtnRef} className="inline-flex w-full">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 btn-primary-neo flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#071426] border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </span>
              </form>

              {/* 8. Social Login: "or continue with" divider and sleek circular buttons */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1E344D]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#0A192B] text-slate-300 font-medium">or continue with</span>
                </div>
              </div>

              {/* 8. Sleek circular social buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  title="Sign in with Google"
                  aria-label="Sign in with Google"
                  className="w-10 h-10 rounded-full border border-[#1E344D] bg-[#071426] flex items-center justify-center hover:bg-[#12243A] hover:border-teal-500/40 transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.54 0 2.94.54 4.04 1.44l3.03-3.03C17.24 1.7 14.8 1 12 1 7.42 1 3.53 3.6 1.63 7.37l3.66 2.84C6.18 7.33 8.84 5 12 5z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.86c2.16-1.99 3.42-4.92 3.42-8.68z" />
                    <path fill="#FBBC05" d="M5.29 14.79c-.25-.75-.39-1.55-.39-2.39s.14-1.64.39-2.39L1.63 7.17C.59 9.24 0 11.55 0 14s.59 4.76 1.63 6.83l3.66-2.84z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.86c-1.08.72-2.45 1.16-4.24 1.16-3.16 0-5.82-2.33-6.71-5.21L1.63 16.02C3.53 20.4 7.42 23 12 23z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  title="Sign in with GitHub"
                  aria-label="Sign in with GitHub"
                  className="w-10 h-10 rounded-full border border-[#1E344D] bg-[#071426] flex items-center justify-center hover:bg-[#12243A] hover:border-teal-500/40 transition-colors shadow-sm active:scale-95 cursor-pointer text-white"
                >
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </button>
              </div>

              {/* 9. Create account link: secondary button */}
              <div className="mt-6 pt-5 border-t border-[#1E344D] text-center flex flex-col items-center gap-2.5">
                <span className="text-slate-300 text-xs sm:text-sm font-medium">Don't have an account?</span>
                <Link
                  to="/register"
                  className="border border-teal-500 text-teal-400 hover:bg-teal-500/10 px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200"
                >
                  Create an account
                </Link>
              </div>

              {/* 2 & 7. Support & Security Microcopy: Encrypted connection (HTTPS) */}
              <div className="mt-5 pt-4 border-t border-[#1E344D] text-center space-y-2.5">
                <p className="text-xs text-slate-300">
                  Need help?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('support')}
                    className="text-teal-400 font-semibold hover:underline underline-offset-2 transition-colors cursor-pointer focus:outline-none"
                  >
                    Contact IT Support
                  </button>
                </p>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
                  <span className="material-symbols-outlined text-[16px] text-teal-400">lock</span>
                  <span>Encrypted connection (HTTPS)</span>
                  <span className="text-[#64748B]">·</span>
                  <span className="text-slate-400">256-bit TLS</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-[#1E344D] bg-[#071426]/70 backdrop-blur-sm z-20 py-5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-normal">
          <div>© 2026 Westbridge University. All rights reserved.</div>
          <nav className="flex items-center space-x-6 text-slate-300">
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Privacy
            </button>
            <span className="text-[#64748B]">·</span>
            <button
              type="button"
              onClick={() => setActiveModal('accessibility')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Accessibility
            </button>
            <span className="text-[#64748B]">·</span>
            <button
              type="button"
              onClick={() => setActiveModal('contact')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              Contact
            </button>
          </nav>
        </div>
      </footer>

      {/* POPUP MODALS */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg modal-panel p-6 sm:p-8 relative text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-white p-1 rounded-lg hover:bg-[#12243A] transition-colors focus:outline-none"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* PRIVACY MODAL */}
            {activeModal === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <span className="material-symbols-outlined text-[22px]">security</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Institutional Privacy Policy</h3>
                    <p className="text-xs text-[#94A3B8]">Westbridge University Student Record Protection</p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-3 leading-relaxed border-t border-[#1E344D] pt-4 max-h-[60vh] overflow-y-auto pr-1">
                  <p>
                    Westbridge University CCRS strictly adheres to the <strong>Family Educational Rights and Privacy Act (FERPA)</strong> regulations governing student educational data confidentiality.
                  </p>
                  <p>
                    All authentications, course registrations, academic records, and degree progress metrics are processed via TLS 1.3 encrypted channels and stored in protected institutional data stores.
                  </p>
                  <p>
                    Authentication credentials for OAuth (Google and GitHub) are retained purely for single sign-on identity validation and session authorization. We never access personal repositories, private emails, or external account services.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary-neo px-4 py-2 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ACCESSIBILITY MODAL */}
            {activeModal === 'accessibility' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <span className="material-symbols-outlined text-[22px]">accessibility_new</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Accessibility Statement</h3>
                    <p className="text-xs text-[#94A3B8]">Inclusive Academic Computing Services</p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-3 leading-relaxed border-t border-[#1E344D] pt-4 max-h-[60vh] overflow-y-auto pr-1">
                  <p>
                    Westbridge University is committed to making the Course and Credit Registration System accessible to all students, faculty, and administrative staff.
                  </p>
                  <p>
                    Our portal is engineered following <strong>WCAG 2.1 Level AA</strong> guidelines, featuring:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-[#94A3B8]">
                    <li>High-contrast semantic dark color tokens for reduced eye strain</li>
                    <li>Full keyboard navigational support across courses, filters, and forms</li>
                    <li>Screen-reader optimized ARIA tags and landmark roles</li>
                    <li>Scalable typography accommodating standard browser zoom levels</li>
                  </ul>
                  <p>
                    For accessibility accommodations or assistive technology support, please contact <span className="text-teal-400">access@westbridge.edu</span>.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary-neo px-4 py-2 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* CONTACT MODAL */}
            {activeModal === 'contact' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <span className="material-symbols-outlined text-[22px]">contact_mail</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">University Registrar</h3>
                    <p className="text-xs text-[#94A3B8]">Registration &amp; Enrollment Services</p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-3 leading-relaxed border-t border-[#1E344D] pt-4">
                  <div className="p-3 bg-[#071426] rounded-xl border border-[#1E344D] space-y-2">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <span className="material-symbols-outlined text-[16px] text-teal-400">location_on</span>
                      <span>Administrative Hall, Room 204</span>
                    </div>
                    <p className="text-[#94A3B8] pl-6">
                      Westbridge University Campus<br />
                      450 University Ave, Cambridge, MA 02138
                    </p>
                  </div>

                  <div className="space-y-2 pl-1 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-teal-400">schedule</span>
                      <span>Monday – Friday: 8:30 AM – 5:00 PM EST</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-teal-400">mail</span>
                      <a href="mailto:registrar@westbridge.edu" className="text-teal-400 hover:underline">
                        registrar@westbridge.edu
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-teal-400">call</span>
                      <span>+1 (555) 019-2834</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary-neo px-4 py-2 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* IT SUPPORT MODAL */}
            {activeModal === 'support' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <span className="material-symbols-outlined text-[22px]">headset_mic</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Contact IT Support</h3>
                    <p className="text-xs text-[#94A3B8]">CCRS Technical Support &amp; Credential Help</p>
                  </div>
                </div>

                <form onSubmit={handleSupportSubmit} className="space-y-3.5 border-t border-[#1E344D] pt-4">
                  <div className="p-3 bg-[#071426] rounded-xl border border-[#1E344D] text-xs text-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Direct Support Desk Email:</span>
                      <a href="mailto:support@westbridge.edu" className="text-teal-400 font-semibold hover:underline">
                        support@westbridge.edu
                      </a>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono">
                      Avg reply &lt; 2 hrs
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Describe your issue or query
                    </label>
                    <textarea
                      rows={3}
                      value={supportMessageText}
                      onChange={(e) => setSupportMessageText(e.target.value)}
                      placeholder="e.g. Need password reset, course enrollment error, or course registration inquiry..."
                      required
                      className="w-full px-3.5 py-2.5 bg-[#071426] border border-[#1E344D] rounded-xl text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <a
                      href="mailto:support@westbridge.edu"
                      className="text-xs text-slate-300 hover:text-teal-400 transition-colors"
                    >
                      Open in default mail client ↗
                    </a>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="btn-secondary-neo px-3.5 py-2 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary-neo px-4 py-2 text-xs"
                      >
                        Send Request
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
