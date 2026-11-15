import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { studentAPI } from '../services/api'

export default function WaitingList() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [confirmModal, setConfirmModal] = useState(null) // { type: 'accept' | 'decline' | 'leave', entry }
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchWaitlist = async () => {
    try {
      setLoading(true)
      const data = await studentAPI.getWaitlist()
      setEntries(data || [])
    } catch (err) {
      console.warn('Failed to fetch waitlist entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // 1-second interval for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-refresh every 30s and on window focus
  useEffect(() => {
    fetchWaitlist()
    const autoRefresh = setInterval(fetchWaitlist, 30000)

    const handleFocus = () => {
      fetchWaitlist()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(autoRefresh)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleAction = async () => {
    if (!confirmModal) return
    const { type, entry } = confirmModal
    try {
      setActionLoading(true)
      setErrorMessage('')

      if (type === 'accept') {
        await studentAPI.acceptOffer(entry.course_code)
      } else if (type === 'decline') {
        await studentAPI.declineOffer(entry.course_code)
      } else if (type === 'leave') {
        await studentAPI.leaveWaitlist(entry.course_code)
      }

      setConfirmModal(null)
      await fetchWaitlist()
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCountdown = (expiresAt) => {
    if (!expiresAt) return { text: 'Expired', isAmber: false, isRose: true, expired: true }
    const expiryTime = new Date(expiresAt).getTime()
    const diff = Math.max(0, Math.floor((expiryTime - now) / 1000))
    if (diff <= 0) {
      return { text: 'Offer Expired', isAmber: false, isRose: true, expired: true }
    }

    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60

    const isRose = diff < 30 * 60 // under 30m
    const isAmber = !isRose && diff < 2 * 3600 // under 2h

    const text = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

    return { text, isAmber, isRose, expired: false }
  }

  const offeredEntries = entries.filter((e) => e.status === 'offered')
  const waitingEntries = entries.filter((e) => e.status === 'waiting')
  const historyEntries = entries.filter(
    (e) => !['offered', 'waiting'].includes(e.status)
  )

  return (
    <AppLayout title="Waiting List">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0A192B]/80 border border-[#1E344D] backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-teal-400 font-semibold uppercase tracking-wider">
                Real-Time Queue Management
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Course Waiting Lists &amp; Seat Offers
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Monitor your active waiting line positions and claim 24-hour reserved seats upon availability release.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchWaitlist}
              className="btn-secondary-neo px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-400">refresh</span>
              <span>Refresh Status</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="btn-primary-neo px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Browse Catalog</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: ACTIVE SEAT OFFERS (URGENT) */}
        {offeredEntries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400 text-[20px]">mark_email_unread</span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Active Seat Offers ({offeredEntries.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offeredEntries.map((offer) => {
                const countdown = formatCountdown(offer.offer_expires_at)
                return (
                  <div
                    key={offer.id}
                    className="p-5 rounded-2xl bg-[#0D1B2E] border border-teal-500/50 border-t-4 border-t-teal-400 shadow-xl space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {offer.course_code}
                          </span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            Seat Available
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{offer.course_name}</h3>
                      </div>

                      {/* Expiry Badge */}
                      <div
                        className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 ${
                          countdown.isRose
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                            : countdown.isAmber
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">schedule</span>
                        <span>{countdown.text}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      A seat has opened up for you! Confirm acceptance within your 24-hour reservation window to lock in enrollment.
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E344D]">
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: 'decline', entry: offer })}
                        className="btn-secondary-neo px-4 py-2 text-xs"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: 'accept', entry: offer })}
                        className="btn-primary-neo px-4 py-2 text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Accept Seat</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: WAITING LIST ENTRIES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-400 text-[20px]">hourglass_top</span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Courses You Are Waiting On ({waitingEntries.length})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center rounded-2xl bg-[#0A192B]/40 border border-[#1E344D]">
              <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : waitingEntries.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0A192B]/50 border border-dashed border-[#1E344D] text-[#94A3B8] text-xs">
              You are not currently waiting on any courses. When full courses are requested, they will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingEntries.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0A192B] border border-[#1E344D] hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {item.course_code}
                      </span>
                      <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        #{item.rank || item.position} in line
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{item.course_name}</h3>

                    <div className="text-xs text-[#94A3B8] space-y-1 pt-1 font-mono">
                      <div className="flex justify-between">
                        <span>Queue Position:</span>
                        <span className="text-white font-semibold">Position #{item.position}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seats Remaining:</span>
                        <span className="text-slate-300">{item.seats_left ?? 0} seats</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1E344D] flex items-center justify-between">
                    <span className="text-[11px] text-[#64748B]">Auto-promotes when seat opens</span>
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ type: 'leave', entry: item })}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span className="material-symbols-outlined text-[15px]">logout</span>
                      <span>Leave waitlist</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: RECENT HISTORY */}
        {historyEntries.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[#1E344D]/60">
            <h3 className="text-sm font-bold text-[#94A3B8] uppercase font-mono tracking-wider">
              Past Waitlist Activity
            </h3>
            <div className="rounded-xl border border-[#1E344D] overflow-hidden bg-[#0A192B]/60">
              <div className="divide-y divide-[#1E344D]/50 text-xs">
                {historyEntries.map((h) => (
                  <div key={h.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-white">{h.course_code}</span>
                      <span className="text-slate-300 truncate max-w-xs">{h.course_name}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] uppercase px-2.5 py-0.5 rounded ${
                        h.status === 'accepted'
                          ? 'bg-teal-500/15 text-teal-300'
                          : h.status === 'declined'
                          ? 'bg-slate-500/20 text-slate-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION / ACTION MODAL */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#0A192B] border border-[#1E344D] shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-white">
                  {confirmModal.type === 'accept'
                    ? 'Confirm Seat Acceptance'
                    : confirmModal.type === 'decline'
                    ? 'Decline Seat Offer'
                    : 'Leave Course Waitlist'}
                </h3>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="w-8 h-8 rounded-lg bg-[#12243A] text-[#94A3B8] hover:text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {confirmModal.type === 'accept'
                  ? `Are you sure you want to accept the seat offer for ${confirmModal.entry.course_code} (${confirmModal.entry.course_name})? You will be immediately registered and enrolled in this course.`
                  : confirmModal.type === 'decline'
                  ? `Are you sure you want to decline this seat for ${confirmModal.entry.course_code}? The seat will be immediately released to the next student in line.`
                  : `Are you sure you want to leave the waitlist for ${confirmModal.entry.course_code}? You will lose your current line position.`}
              </p>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-[16px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmModal(null)}
                  className="btn-secondary-neo px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    confirmModal.type === 'accept'
                      ? 'bg-teal-500 hover:bg-teal-400 text-[#071426] shadow-lg shadow-teal-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20'
                  }`}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {confirmModal.type === 'accept' ? 'Accept Seat' : confirmModal.type === 'decline' ? 'Decline' : 'Leave Waitlist'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
