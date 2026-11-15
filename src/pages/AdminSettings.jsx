import React, { useState } from 'react'
import AppLayout from '../components/AppLayout'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general') // 'general' | 'term' | 'security'
  const [toastMessage, setToastMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    universityName: 'Westbridge University',
    portalName: 'Course Catalog & Registration System (CCRS)',
    supportEmail: 'support@westbridge.edu',
    contactPhone: '+1 (555) 382-9000',
    campusAddress: '100 University Boulevard, Tech Valley, CA 94016',
  })

  // Academic Term Settings State
  const [termSettings, setTermSettings] = useState({
    currentSemester: 'Fall 2026',
    registrationDeadline: '2026-12-15',
    addDropDeadline: '2026-11-20',
    maxCredits: 24,
    minCreditsFullTime: 12,
    autoWaitlistPromotion: true,
    offerExpirationHours: 24,
  })

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 60,
    require2FAForAdmin: true,
    minPasswordLength: 8,
    maxFailedAttempts: 5,
    lockoutDurationMins: 15,
  })

  const auditLogs = [
    { text: 'Dr. Melissa Carter updated active academic term to Fall 2026', time: '15 mins ago', user: 'Admin' },
    { text: 'Manual seat release: 2 seats allocated for CS301', time: '1 hour ago', user: 'Admin' },
    { text: 'Security policy updated: 2FA required for administrators', time: '3 hours ago', user: 'System' },
    { text: 'Faculty account provisioned: Dr. Eileen Wu (Mathematics)', time: 'Yesterday', user: 'Admin' },
    { text: 'Course capacity modified: AI401 increased to 38 seats', time: 'Nov 14, 2026', user: 'Admin' },
  ]

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      showToast('System configuration changes successfully saved.')
    }, 600)
  }

  return (
    <AppLayout title="System Settings">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#0A192B]/85 border border-[#1E344D] backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold tracking-wider uppercase">
                Institutional Configuration
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400/70"></span>
              <span className="font-mono text-xs text-[#94A3B8]">Admin Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="material-symbols-outlined text-teal-400 text-2xl sm:text-3xl">settings</span>
              System Settings &amp; Governance
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Configure university policies, academic term constraints, and portal security parameters.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-[#071426] font-bold text-xs transition-all shadow-glow-teal hover:scale-[1.02] cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#071426] border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {toastMessage && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs sm:text-sm shadow-glow-teal animate-fade-in backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-teal-400 text-[20px]">check_circle</span>
              <span className="font-medium">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage('')}
              className="text-teal-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1E344D]/80 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0A192B]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain</span>
            <span>General Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('term')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'term'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0A192B]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">date_range</span>
            <span>Academic Term</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0A192B]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span>Security &amp; Access</span>
          </button>
        </div>

        {/* 2-Column Grid Layout Eliminating Void Space */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Span 2 (Active Form Tab) */}
          <div className="lg:col-span-2">
            {/* Tab 1: General Settings */}
            {activeTab === 'general' && (
              <form onSubmit={handleSave} className="p-6 sm:p-7 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl shadow-xl space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-[20px]">account_balance</span>
                    Institutional Identity &amp; Contact Info
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Configure primary university branding and official support communication channels.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">University Name</label>
                    <input
                      type="text"
                      value={generalSettings.universityName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, universityName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Portal Display Name</label>
                    <input
                      type="text"
                      value={generalSettings.portalName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, portalName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Support &amp; Registrar Email</label>
                    <input
                      type="email"
                      value={generalSettings.supportEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Central IT Support Phone</label>
                    <input
                      type="text"
                      value={generalSettings.contactPhone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Campus Address</label>
                    <input
                      type="text"
                      value={generalSettings.campusAddress}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, campusAddress: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1E344D] flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#071426] font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save General Settings
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Academic Term Settings */}
            {activeTab === 'term' && (
              <form onSubmit={handleSave} className="p-6 sm:p-7 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl shadow-xl space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-[20px]">calendar_today</span>
                    Academic Term &amp; Enrollment Controls
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Manage the active registration semester, deadlines, credit caps, and waitlist automation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Active Semester</label>
                    <select
                      value={termSettings.currentSemester}
                      onChange={(e) => setTermSettings({ ...termSettings, currentSemester: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors cursor-pointer"
                    >
                      <option value="Fall 2026">Fall 2026 (Active Priority)</option>
                      <option value="Spring 2027">Spring 2027 (Upcoming)</option>
                      <option value="Summer 2027">Summer 2027 (Term Session)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Registration Deadline</label>
                    <input
                      type="date"
                      value={termSettings.registrationDeadline}
                      onChange={(e) => setTermSettings({ ...termSettings, registrationDeadline: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Max Registered Credits Per Student</label>
                    <input
                      type="number"
                      min="12"
                      max="30"
                      value={termSettings.maxCredits}
                      onChange={(e) => setTermSettings({ ...termSettings, maxCredits: parseInt(e.target.value) || 24 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#64748B] mt-1">Institutional cap (default 24 credits per term).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Seat Offer Expiration Window (Hours)</label>
                    <input
                      type="number"
                      min="6"
                      max="72"
                      value={termSettings.offerExpirationHours}
                      onChange={(e) => setTermSettings({ ...termSettings, offerExpirationHours: parseInt(e.target.value) || 24 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#64748B] mt-1">Duration before a released seat offer passes to next student.</p>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1E344D]">
                    <div>
                      <div className="text-xs font-bold text-white">Automated Waitlist Promotion Engine</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">
                        Automatically trigger 24-hr seat offers to the top waitlist student when an enrolled student drops.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termSettings.autoWaitlistPromotion}
                        onChange={(e) => setTermSettings({ ...termSettings, autoWaitlistPromotion: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1E344D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1E344D] flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#071426] font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save Term Policies
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Security & Access Settings */}
            {activeTab === 'security' && (
              <form onSubmit={handleSave} className="p-6 sm:p-7 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl shadow-xl space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-[20px]">encrypted</span>
                    Authentication, Sessions &amp; Access Controls
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Configure session expiration, two-factor authentication, and account lockout protections.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="480"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 60 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#64748B] mt-1">JWT access token expiration lifetime (standard: 60 mins).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Max Failed Sign-In Attempts</label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={securitySettings.maxFailedAttempts}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, maxFailedAttempts: parseInt(e.target.value) || 5 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071426] border border-[#1E344D] text-white text-xs focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#64748B] mt-1">Threshold before temporary account lockout.</p>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1E344D]">
                    <div>
                      <div className="text-xs font-bold text-white">Require Multi-Factor Authentication (2FA) for Administrators</div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">
                        Enforce time-based one-time password (TOTP) verification for all administrative operations.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.require2FAForAdmin}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, require2FAForAdmin: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1E344D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1E344D] flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#071426] font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save Security Policies
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Span 1 (System Status & Audit Log) */}
          <div className="lg:col-span-1 space-y-6">
            {/* System Status Widget */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-5 backdrop-blur-xl shadow-lg space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#1E344D] pb-3">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400 text-[18px]">dns</span>
                  <span>System Infrastructure</span>
                </span>
                <span className="flex items-center gap-1.5 text-teal-400 text-[11px] font-mono">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span>ONLINE</span>
                </span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between">
                  <span className="text-[#94A3B8]">API Gateway Latency</span>
                  <span className="font-mono text-teal-300 font-bold">18 ms · Optimal</span>
                </div>

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between">
                  <span className="text-[#94A3B8]">Database Cluster</span>
                  <span className="font-mono text-white font-medium">MongoDB Atlas</span>
                </div>

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between">
                  <span className="text-[#94A3B8]">Scheduled Backup</span>
                  <span className="font-mono text-white font-medium">Daily 03:00 UTC</span>
                </div>

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between">
                  <span className="text-[#94A3B8]">System Uptime</span>
                  <span className="font-mono text-emerald-400 font-bold">99.98%</span>
                </div>

                <div className="p-3 rounded-xl bg-[#071426] border border-[#1E344D]/50 flex items-center justify-between">
                  <span className="text-[#94A3B8]">Active Version</span>
                  <span className="font-mono text-[#94A3B8]">v2.4.0-prod</span>
                </div>
              </div>
            </div>

            {/* Audit Log Widget */}
            <div className="rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] p-5 backdrop-blur-xl shadow-lg space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E344D] pb-3">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">history</span>
                <span>Recent System Audit Log</span>
              </h2>

              <div className="space-y-3">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-teal-400/60 mt-1.5 shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-200 text-xs leading-tight font-medium">{log.text}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-mono mt-1">
                        <span>{log.time}</span>
                        <span>·</span>
                        <span className="text-teal-400/80">{log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
