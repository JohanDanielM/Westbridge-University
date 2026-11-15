import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import logo from '../assets/westbridge-logo.png'

export default function ForgotPassword() {
  const navigate = useNavigate()

  // Multi-step state: 1 = Email Input, 2 = OTP + New Password
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Loading & Alert state
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessNotice('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid university email address.')
      return
    }

    setLoading(true)
    try {
      const res = await authAPI.forgotPassword(cleanEmail)
      setSuccessNotice(res.message || 'Verification code sent to your email.')
      setStep(2)
      setResendCooldown(60)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send verification code. Please check your email address.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setErrorMessage('')
    setSuccessNotice('')
    setLoading(true)
    try {
      const res = await authAPI.forgotPassword(email.trim().toLowerCase())
      setSuccessNotice(res.message || 'A new verification code has been dispatched.')
      setResendCooldown(60)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanOtp = otp.trim()
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter a valid 6-digit numeric verification code.')
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      await authAPI.resetPassword({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      // Redirect to login with success flag
      navigate('/login?reset=success')
    } catch (err) {
      setErrorMessage(err.message || 'Password reset failed. Please check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-teal-500/20 selection:text-teal-300 bg-transparent page-enter">
      {/* Main Header */}
      <header className="w-full border-b border-[#1E344D] bg-[#071426]/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 md:h-20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center cursor-pointer focus:outline-none group select-none transition-transform hover:scale-[1.02]"
            aria-label="Westbridge University Home"
          >
            <img
              src={logo}
              alt="Westbridge University"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </button>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-grow flex items-center justify-center py-10 lg:py-16 px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="w-full max-w-[480px]">
          <div className="premium-card p-8 sm:p-10 border border-[#1E344D] shadow-2xl relative">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1E344D]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full text-xs font-bold font-mono flex items-center justify-center transition-colors ${
                    step === 1
                      ? 'bg-teal-500 text-[#04211D] shadow-[0_0_12px_rgba(20,184,166,0.5)]'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  }`}
                >
                  {step > 1 ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    '1'
                  )}
                </div>
                <span className={`text-xs font-semibold ${step === 1 ? 'text-white' : 'text-[#94A3B8]'}`}>
                  Identify Account
                </span>
              </div>

              <div className="h-px w-10 bg-[#1E344D]"></div>

              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full text-xs font-bold font-mono flex items-center justify-center transition-colors ${
                    step === 2
                      ? 'bg-teal-500 text-[#04211D] shadow-[0_0_12px_rgba(20,184,166,0.5)]'
                      : 'bg-[#12243A] text-[#64748B] border border-[#1E344D]'
                  }`}
                >
                  2
                </div>
                <span className={`text-xs font-semibold ${step === 2 ? 'text-white' : 'text-[#64748B]'}`}>
                  Reset Password
                </span>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success / Status Alert */}
            {successNotice && (
              <div className="mb-5 p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-teal-400">mark_email_read</span>
                <span>{successNotice}</span>
              </div>
            )}

            {/* STEP 1: Request OTP Form */}
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Reset Your Password
                  </h2>
                  <p className="text-sm text-[#94A3B8] mt-1.5 leading-relaxed">
                    Enter your registered university email address to receive a 6-digit verification code.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSendOtp}>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="email">
                      University Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. j.smith@westbridge.edu"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition duration-150 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 btn-primary-neo flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        <span>Sending verification code...</span>
                      </span>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
                
                {/* Remember Password Link */}
                <div className="mt-6 text-center text-sm text-[#94A3B8]">
                  Remember your password? <Link to="/login" className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2">Sign In</Link>
                </div>  
              </div>
            )}

            {/* STEP 2: Verify OTP & New Password Form */}
            {step === 2 && (
              <div>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Enter Verification Code
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setErrorMessage('')
                        setSuccessNotice('')
                      }}
                      className="text-xs text-teal-400 hover:underline"
                    >
                      Change Email
                    </button>
                  </div>
                  <p className="text-sm text-[#94A3B8] mt-1.5 leading-relaxed">
                    We sent a 6-digit OTP to <strong className="text-white">{email}</strong>. Valid for 10 minutes.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleResetPassword}>
                  {/* 6-Digit OTP Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="otp">
                      6-Digit Security Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <span className="material-symbols-outlined text-[18px]">pin</span>
                      </div>
                      <input
                        id="otp"
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-base tracking-[0.35em] font-mono text-teal-300 placeholder-slate-600 transition duration-150 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="newPassword">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full pl-10 pr-11 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition duration-150 focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-slate-200 transition-colors focus:outline-none"
                      >
                        <svg className={`w-4 h-4 ${showPassword ? 'text-teal-400' : 'text-[#64748B]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        className="w-full pl-10 pr-11 py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition duration-150 focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-slate-200 transition-colors focus:outline-none"
                      >
                        <svg className={`w-4 h-4 ${showConfirmPassword ? 'text-teal-400' : 'text-[#64748B]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Submit Reset Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 mt-2 btn-primary-neo flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        <span>Updating credentials...</span>
                      </span>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                      </>
                    )}
                  </button>

                  {/* Resend Code Section */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Didn't receive the code?</span>
                    <button 
                      type="button"
                      onClick={handleResendOtp} 
                      disabled={resendCooldown > 0 || loading}
                      className={`font-semibold ${
                        resendCooldown > 0 
                          ? 'text-[#64748B] cursor-not-allowed' 
                          : 'text-teal-400 hover:text-teal-300 underline'
                      }`}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1E344D] bg-[#071426]/70 backdrop-blur-sm z-20 py-5">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94A3B8] font-normal">
          <div>© 2026 Westbridge University. All rights reserved.</div>
          <div className="text-[#64748B] text-[11px] font-mono">
            Institutional Course Registration System · FERPA Compliant
          </div>
        </div>
      </footer>
    </div>
  )
}
