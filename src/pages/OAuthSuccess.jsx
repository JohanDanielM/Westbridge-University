import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function OAuthSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login: setAuthSession } = useAuth()
  const [statusMessage, setStatusMessage] = useState('Verifying institutional credentials...')
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      if (error || !token) {
        console.warn('[CCRS OAuth] Authentication failed or missing token in callback')
        setHasError(true)
        setStatusMessage('Authentication failed. Redirecting to login...')
        setTimeout(() => {
          navigate('/login?error=oauth_failed', { replace: true })
        }, 1200)
        return
      }

      try {
        setStatusMessage('Establishing secure university session...')
        // Store JWT token under the standard project key
        localStorage.setItem('ccrs_token', token)

        const isNewParam = searchParams.get('is_new')
        const emailParam = searchParams.get('email') || ''
        const nameParam = searchParams.get('name') || ''
        const providerParam = searchParams.get('provider') || ''

        // Fetch current user details with the token
        const user = await authAPI.getMe()

        if (user) {
          setAuthSession(token, user)

          // If new OAuth user, redirect to /register with prefill params
          const needsOnboarding = isNewParam === 'true' || user.is_onboarded === false
          if (needsOnboarding) {
            const userEmail = user.email || emailParam
            const userName = user.full_name || user.name || nameParam
            const userProvider = user.provider || providerParam || 'google'

            setStatusMessage(`Welcome, ${userName}! Please complete your registration...`)
            setTimeout(() => {
              navigate(
                `/register?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}&provider=${encodeURIComponent(userProvider)}`,
                { replace: true }
              )
            }, 600)
            return
          }

          setStatusMessage(`Welcome, ${user.full_name || user.name || 'Student'}! Loading console...`)

          setTimeout(() => {
            if (user.role === 'faculty') {
              navigate('/faculty/dashboard', { replace: true })
            } else if (user.role === 'admin') {
              navigate('/admin/dashboard', { replace: true })
            } else {
              navigate('/dashboard', { replace: true })
            }
          }, 600)
        } else {
          throw new Error('Failed to retrieve user profile')
        }
      } catch (err) {
        console.error('[CCRS OAuth] Profile verification error:', err)
        authAPI.logout()
        setHasError(true)
        setStatusMessage('Failed to verify session profile. Redirecting...')
        setTimeout(() => {
          navigate('/login?error=oauth_failed', { replace: true })
        }, 1200)
      }
    }

    handleOAuthCallback()
  }, [navigate, searchParams, setAuthSession])

  return (
    <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center relative overflow-hidden selection:bg-teal-500/20 selection:text-teal-300 px-6 bg-transparent page-enter">
      <div className="w-full max-w-md premium-card p-8 sm:p-10 border border-[#1E344D] shadow-2xl text-center relative">
        {/* University Crest / Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-[1.5px] mx-auto mb-6 shadow-lg shadow-teal-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#071426] rounded-[14px] flex items-center justify-center">
            {hasError ? (
              <span className="material-symbols-outlined text-rose-400 text-3xl">error</span>
            ) : (
              <svg className="w-8 h-8 text-teal-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
              </svg>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          {hasError ? 'Authentication Issue' : 'Single Sign-On Verification'}
        </h2>

        <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">
          {statusMessage}
        </p>

        {/* Loading Spinner */}
        {!hasError && (
          <div className="flex items-center justify-center gap-3 text-teal-400 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
            <span>Securing session tokens...</span>
          </div>
        )}
      </div>
    </div>
  )
}
