import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI, metaAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/westbridge-logo.png'

const DEFAULT_STREAMS = [
  { code: 'CS', name: 'Computer Science' },
  { code: 'SE', name: 'Software Engineering' },
  { code: 'DS', name: 'Data Science' },
  { code: 'AI', name: 'Artificial Intelligence' },
  { code: 'CY', name: 'Cybersecurity' },
]

export default function Register() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const handleLogoClick = () => {
    if (!user) {
      navigate('/login')
    } else if (user.role === 'student') {
      navigate('/dashboard')
    } else if (user.role === 'faculty') {
      navigate('/faculty/dashboard')
    } else if (user.role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/login')
    }
  }

  const paramEmail = searchParams.get('email') || ''
  const paramName = searchParams.get('name') || ''
  const paramProvider = (searchParams.get('provider') || searchParams.get('oauth') || '').toLowerCase()
  const isOAuth = !!paramProvider
  const isGoogle = paramProvider === 'google'
  const isGitHub = paramProvider === 'github'

  // Step state: 1 = Form, 2 = Verification
  const [step, setStep] = useState(1)

  // Meta information
  const [streams, setStreams] = useState(DEFAULT_STREAMS)
  const [termInfo, setTermInfo] = useState({ term: 'Fall 2026', admission_year: 2026 })

  // Step 1 Form Fields (Pre-filled from OAuth URL params if available)
  const [fullName, setFullName] = useState(paramName)
  const [email, setEmail] = useState(paramEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stream, setStream] = useState('CS')
  const [currentYear, setCurrentYear] = useState(1)
  const [currentSemester, setCurrentSemester] = useState(1)
  const [entryType, setEntryType] = useState('first_year')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  // OAuth / GitHub email verification states
  const [isEmailVerified, setIsEmailVerified] = useState(isGoogle)
  const [githubOtp, setGithubOtp] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  // Step 2 Verification Fields
  const [assignedStudentId, setAssignedStudentId] = useState('')
  const [assignedRollNumber, setAssignedRollNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resendActive, setResendActive] = useState(false)

  // Status & loading
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Calculate 16 years ago for DOB limit
  const today = new Date()
  const maxDobDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0]

  useEffect(() => {
    if (paramName && !fullName) setFullName(paramName)
    if (paramEmail && !email) setEmail(paramEmail)
    if (isGoogle) setIsEmailVerified(true)
  }, [paramName, paramEmail, isGoogle])

  useEffect(() => {
    let t = null
    if (otpCooldown > 0) {
      t = setInterval(() => setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000)
    }
    return () => {
      if (t) clearInterval(t)
    }
  }, [otpCooldown])

  useEffect(() => {
    let isMounted = true
    const fetchMetadata = async () => {
      try {
        const [streamsData, termData] = await Promise.all([
          metaAPI.streams().catch(() => DEFAULT_STREAMS),
          metaAPI.term().catch(() => ({ term: 'Fall 2026', admission_year: 2026 })),
        ])
        if (isMounted) {
          if (Array.isArray(streamsData) && streamsData.length > 0) {
            setStreams(streamsData)
            setStream(streamsData[0].code)
          }
          if (termData?.term) {
            setTermInfo(termData)
          }
        }
      } catch {
        // fallback to defaults
      }
    }
    fetchMetadata()
    return () => {
      isMounted = false
    }
  }, [])

  // Cooldown countdown for Step 2
  useEffect(() => {
    let timer = null
    if (step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [step, resendCooldown])

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      setErrorMessage('Student photo must be a valid JPEG or PNG file.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Student photo size must be under 2 MB.')
      return
    }

    setErrorMessage('')
    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoDataUrl(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address to receive the verification code.')
      return
    }
    setErrorMessage('')
    setSuccessMessage('')
    setIsSendingOtp(true)
    try {
      await authAPI.sendOTP(email.trim().toLowerCase())
      setOtpSent(true)
      setOtpCooldown(60)
      setSuccessMessage(`A 6-digit verification code has been dispatched to ${email}.`)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch verification code.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!githubOtp || githubOtp.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }
    setErrorMessage('')
    setSuccessMessage('')
    setIsVerifyingOtp(true)
    try {
      await authAPI.verifyOTP(email.trim().toLowerCase(), githubOtp.trim())
      setIsEmailVerified(true)
      setSuccessMessage('Email verified successfully! You may now submit your registration.')
    } catch (err) {
      setErrorMessage(err.message || 'Verification code is invalid or has expired.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (isGitHub && !isEmailVerified) {
      setErrorMessage('Please verify your email address with the 6-digit verification code before submitting.')
      return
    }

    if (!isOAuth) {
      if (password !== confirmPassword) {
        setErrorMessage('Password and confirmation do not match.')
        return
      }

      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.')
        return
      }
    } else if (password) {
      if (password !== confirmPassword) {
        setErrorMessage('Password and confirmation do not match.')
        return
      }

      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.')
        return
      }
    }

    if (!agreeTerms) {
      setErrorMessage('You must agree to the Westbridge University Terms and Honor Code.')
      return
    }

    setLoading(true)
    try {
      const submitPassword = password.trim() || `OAuth_WBU_${Math.random().toString(36).slice(2)}!A9`
      const submitConfirmPassword = confirmPassword.trim() || submitPassword

      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: submitPassword,
        confirm_password: submitConfirmPassword,
        stream,
        current_year: Number(currentYear),
        current_semester: Number(currentSemester),
        entry_type: entryType,
        date_of_birth: dateOfBirth,
        gender,
        phone: phone.trim(),
        address: address.trim(),
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
        photo_data_url: photoDataUrl || null,
        agree_terms: agreeTerms,
      }

      const res = await authAPI.register(payload)

      if (isOAuth || res?.requires_verification === false || res?.is_onboarded) {
        if (res?.access_token) {
          localStorage.setItem('ccrs_token', res.access_token)
        }
        setSuccessMessage('Registration profile completed successfully! Redirecting to dashboard...')
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 800)
        return
      }

      if (res && res.student_id) {
        setAssignedStudentId(res.student_id)
        setAssignedRollNumber(res.roll_number || '')
      }

      setStep(2)
      setResendCooldown(60)
      setSuccessMessage('Verification code sent. Please check your inbox.')
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please verify your details.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!verificationCode || verificationCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.')
      return
    }

    setLoading(true)
    try {
      await authAPI.verifyEmail(email.trim().toLowerCase(), verificationCode.trim())
      navigate('/login', {
        state: { message: 'Email verified. Sign in with your credentials.' },
      })
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resendActive) return

    setErrorMessage('')
    setSuccessMessage('')
    setResendActive(true)

    try {
      await authAPI.resendVerification(email.trim().toLowerCase())
      setSuccessMessage('A new verification code has been dispatched to your email.')
      setResendCooldown(60)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.')
    } finally {
      setResendActive(false)
    }
  }

  const streamPreviewRoll = `${stream || 'CS'}-${termInfo.admission_year || 2026}-XXXX`

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-teal-500/20 selection:text-teal-300 bg-transparent page-enter">
      {/* Header */}
      <header className="w-full border-b border-[#1E344D] bg-[#071426]/80 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 md:h-20 flex items-center justify-between">
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

          <div className="text-xs text-[#94A3B8] flex items-center gap-2">
            <span>Already enrolled?</span>
            <button
              onClick={() => navigate('/login')}
              className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 transition-colors focus:outline-none"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-10 lg:py-14 px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="w-full max-w-[620px]">
          <div className="premium-card p-8 sm:p-10 border border-[#1E344D] shadow-2xl relative">
            {/* Centered Logo on Register card */}
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

            {/* Form Header */}
            <div className="mb-7 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase font-mono tracking-wider mb-3">
                {step === 1 ? 'Step 1 of 2 · Student Self-Service' : 'Step 2 of 2 · Email Verification'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {step === 1 ? 'Create Student Account' : 'Verify Your Email'}
              </h1>
              <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
                {step === 1
                  ? 'Complete your profile to generate your student ID and access course registration.'
                  : `Enter the 6-digit code sent to ${email}.`}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {isOAuth && (
              <div className="mb-5 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>
                    Authenticated via <strong className="capitalize">{paramProvider}</strong>. Please complete the registration details below to activate your student console.
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0">
                  Onboarding
                </span>
              </div>
            )}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Registration Form */}
            {step === 1 && (
              <form onSubmit={handleRegister} className="space-y-5">
                {/* Section: Academic Stream & Cohort */}
                <div className="p-4 rounded-xl bg-[#071426]/70 border border-[#1E344D] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                      Academic Information
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#12243A] text-[#94A3B8] text-[11px] font-mono border border-[#1E344D]">
                      Admission {termInfo.admission_year || 2026} · {termInfo.term || 'Fall 2026'}
                    </span>
                  </div>

                  {/* Stream Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_stream">
                      Degree Stream <span className="text-teal-400">*</span>
                    </label>
                    <select
                      id="reg_stream"
                      required
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                    >
                      {streams.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Year & Current Semester */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_year">
                        Current Year <span className="text-teal-400">*</span>
                      </label>
                      <select
                        id="reg_year"
                        required
                        value={currentYear}
                        onChange={(e) => setCurrentYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                      >
                        <option value={1}>Year 1 (Freshman)</option>
                        <option value={2}>Year 2 (Sophomore)</option>
                        <option value={3}>Year 3 (Junior)</option>
                        <option value={4}>Year 4 (Senior)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_semester">
                        Current Semester <span className="text-teal-400">*</span>
                      </label>
                      <select
                        id="reg_semester"
                        required
                        value={currentSemester}
                        onChange={(e) => setCurrentSemester(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                      >
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                      </select>
                    </div>
                  </div>

                  {/* Entry Type Radio Cards */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Entry Type <span className="text-teal-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEntryType('first_year')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          entryType === 'first_year'
                            ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-sm'
                            : 'bg-[#0D1B2E] border-[#1E344D] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white">First Year</div>
                        <div className="text-[11px] text-[#94A3B8] mt-0.5">Regular admission</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEntryType('transfer')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          entryType === 'transfer'
                            ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-sm'
                            : 'bg-[#0D1B2E] border-[#1E344D] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white">Transfer</div>
                        <div className="text-[11px] text-[#94A3B8] mt-0.5">Direct entry credits</div>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Roll Number Preview Notice */}
                  <div className="p-3 rounded-xl bg-[#0D1B2E] border border-[#1E344D] text-xs text-[#94A3B8] flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-teal-400 text-[18px]">badge</span>
                    <span>
                      Your student ID and roll number are generated automatically when you register. Preview:{' '}
                      <span className="font-mono text-teal-300 font-bold">{streamPreviewRoll}</span>
                    </span>
                  </div>
                </div>

                {/* Section: Account & Authentication */}
                <div className="p-4 rounded-xl bg-[#071426]/70 border border-[#1E344D] space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                    Account &amp; Security
                  </span>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_fullname">
                      Full Name <span className="text-teal-400">*</span>
                    </label>
                    <input
                      id="reg_fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* University or Personal Email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_email">
                        Email Address <span className="text-teal-400">*</span>
                      </label>
                      {isGoogle ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-medium">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          <span>Verified via Google</span>
                        </span>
                      ) : isGitHub ? (
                        isEmailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-medium">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                            <span>Verified via GitHub</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                            <span className="material-symbols-outlined text-[12px]">mail</span>
                            <span>Verification Required</span>
                          </span>
                        )
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="reg_email"
                        type="email"
                        required
                        readOnly={isGoogle}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (isGitHub && isEmailVerified) setIsEmailVerified(false)
                        }}
                        placeholder="e.g. a.morgan@westbridge.edu"
                        className={`w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none ${
                          isGoogle ? 'opacity-90 cursor-not-allowed bg-[#081524]' : ''
                        }`}
                      />
                      {isGitHub && !isEmailVerified && (
                        <button
                          type="button"
                          disabled={isSendingOtp || otpCooldown > 0}
                          onClick={handleSendOtp}
                          className="btn-secondary-neo px-3.5 py-2 text-xs text-teal-300 shrink-0 whitespace-nowrap"
                        >
                          {isSendingOtp ? 'Sending...' : otpCooldown > 0 ? `Resend (${otpCooldown}s)` : 'Verify Email'}
                        </button>
                      )}
                    </div>

                    {/* GitHub Email OTP Code Input */}
                    {isGitHub && !isEmailVerified && (
                      <div className="p-3 rounded-xl bg-[#09182B] border border-amber-500/30 space-y-2 mt-2">
                        <div className="text-[11px] text-[#94A3B8]">
                          {otpSent
                            ? `Enter the 6-digit verification code sent to ${email}:`
                            : 'GitHub emails require verification before account registration. Click "Verify Email" to receive your code.'}
                        </div>
                        {otpSent && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="6-digit code"
                              value={githubOtp}
                              onChange={(e) => setGithubOtp(e.target.value.replace(/\D/g, ''))}
                              className="w-36 px-3 py-1.5 bg-[#071426] border border-[#1E344D] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none tracking-widest text-center"
                            />
                            <button
                              type="button"
                              disabled={isVerifyingOtp || githubOtp.length !== 6}
                              onClick={handleVerifyOtp}
                              className="btn-primary-neo px-3.5 py-1.5 text-xs font-semibold"
                            >
                              {isVerifyingOtp ? 'Verifying...' : 'Confirm Code'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_pwd">
                        {isOAuth ? 'Password (Optional)' : 'Password'} {!isOAuth && <span className="text-teal-400">*</span>}
                      </label>
                      <input
                        id="reg_pwd"
                        type={showPassword ? 'text' : 'password'}
                        required={!isOAuth}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isOAuth ? 'Optional or min 8 chars' : 'Min 8 characters'}
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_pwd_confirm">
                        {isOAuth ? 'Confirm Password (Optional)' : 'Confirm Password'} {!isOAuth && <span className="text-teal-400">*</span>}
                      </label>
                      <input
                        id="reg_pwd_confirm"
                        type={showPassword ? 'text' : 'password'}
                        required={!isOAuth && !!password}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        className="w-4 h-4 rounded border-[#1E344D] bg-[#0D1B2E] text-teal-500 focus:ring-0 transition"
                      />
                      <span>Show password</span>
                    </label>
                  </div>
                </div>

                {/* Section: Personal Information */}
                <div className="p-4 rounded-xl bg-[#071426]/70 border border-[#1E344D] space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                    Personal Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_dob">
                        Date of Birth <span className="text-teal-400">*</span>
                      </label>
                      <input
                        id="reg_dob"
                        type="date"
                        required
                        max={maxDobDate}
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-[#64748B] block">Must be at least 16 years old</span>
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_gender">
                        Gender
                      </label>
                      <select
                        id="reg_gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white transition focus:border-teal-500 focus:outline-none"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="non_binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  {/* Phone & Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_phone">
                      Contact Phone <span className="text-teal-400">*</span>
                    </label>
                    <input
                      id="reg_phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 555-019-2834"
                      className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_address">
                      Residential Address <span className="text-teal-400">*</span>
                    </label>
                    <textarea
                      id="reg_address"
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, city, state, postal code"
                      className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Section: Guardian Information */}
                <div className="p-4 rounded-xl bg-[#071426]/70 border border-[#1E344D] space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                    Emergency &amp; Guardian Contact
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_gname">
                        Guardian Name <span className="text-teal-400">*</span>
                      </label>
                      <input
                        id="reg_gname"
                        type="text"
                        required
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="e.g. Eleanor Morgan"
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="reg_gphone">
                        Guardian Phone <span className="text-teal-400">*</span>
                      </label>
                      <input
                        id="reg_gphone"
                        type="tel"
                        required
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="e.g. +1 555-019-9988"
                        className="w-full px-3.5 py-2.5 bg-[#0D1B2E] border border-[#1E344D] rounded-xl text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Photo Upload */}
                <div className="p-4 rounded-xl bg-[#071426]/70 border border-[#1E344D] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
                      Student Identification Photo
                    </span>
                    <span className="text-[11px] text-[#64748B] font-mono">Max 2 MB (JPEG/PNG)</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {photoDataUrl ? (
                      <img
                        src={photoDataUrl}
                        alt="Student ID Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-teal-500/50 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#0D1B2E] border border-[#1E344D] flex items-center justify-center text-[#64748B]">
                        <span className="material-symbols-outlined text-[24px]">account_box</span>
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        id="student_photo"
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handlePhotoUpload}
                        className="text-xs text-[#94A3B8] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/10 file:text-teal-300 hover:file:bg-teal-500/20 cursor-pointer"
                      />
                      <span className="text-[11px] text-[#64748B] block mt-1">
                        Used for your official Westbridge digital student ID badge.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-[#1E344D] bg-[#071426] text-teal-500 focus:ring-0 transition shrink-0"
                    />
                    <span className="leading-relaxed text-[#94A3B8]">
                      I agree to the Westbridge University Academic Integrity Policy, Registration Regulations, and Privacy Terms.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 btn-primary-neo flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                      <span>{isOAuth ? 'Completing your registration...' : 'Creating your student profile...'}</span>
                    </span>
                  ) : (
                    <span>{isOAuth ? 'Complete Registration & Access Console' : 'Create Account'}</span>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Email Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyEmail} className="space-y-6">
                {/* ID & Roll number notification card */}
                {assignedStudentId && (
                  <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center space-y-1">
                    <span className="text-xs text-teal-400 font-mono uppercase tracking-wider block">
                      Account Registered Successfully
                    </span>
                    <p className="text-sm text-white font-medium">
                      Your student ID is <span className="font-mono text-teal-300 font-bold">{assignedStudentId}</span> and your roll number is{' '}
                      <span className="font-mono text-cyan-300 font-bold">{assignedRollNumber}</span>.
                    </p>
                  </div>
                )}

                {/* 6-digit code input */}
                <div className="space-y-2 text-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="verify_code">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    id="verify_code"
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-48 mx-auto text-center font-mono text-2xl tracking-[0.5em] py-3 bg-[#071426] border border-[#1E344D] rounded-xl text-white transition focus:border-teal-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-[#64748B] block">
                    Code expires in 10 minutes.
                  </span>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-12 btn-primary-neo flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span>Verify Email &amp; Complete Registration</span>
                  )}
                </button>

                {/* Resend Code Button & Cooldown */}
                <div className="pt-2 text-center text-xs text-[#94A3B8]">
                  <span>Didn&apos;t receive the code? </span>
                  {resendCooldown > 0 ? (
                    <span className="text-teal-400/60 font-mono">
                      Resend code in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendActive}
                      className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 transition-colors focus:outline-none"
                    >
                      {resendActive ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Back to Login Footer */}
            <div className="mt-6 pt-5 border-t border-[#1E344D] text-center text-xs text-[#94A3B8]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 transition-colors focus:outline-none"
              >
                Sign in to CCRS Portal
              </button>
            </div>
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
