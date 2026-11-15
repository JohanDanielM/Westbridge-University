import React, { useState, useRef, useEffect } from 'react'
import { notificationsData } from '../data/mockData'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#12243A] transition-colors relative focus:outline-none"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        <span className="absolute top-2 right-2 w-4 h-4 bg-teal-500 text-[#04211D] rounded-full font-mono text-[10px] font-bold flex items-center justify-center leading-none">
          3
        </span>
      </button>

      {isOpen && (
        <div className="dropdown-panel absolute right-0 mt-2 w-80 p-4 shadow-2xl flex flex-col gap-3 z-50">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#1E344D]">
            <span className="text-sm font-bold text-white tracking-tight">
              Notifications
            </span>
            <span className="text-[11px] font-mono text-teal-300 uppercase font-semibold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
              3 Unread
            </span>
          </div>

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {notificationsData.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg hover:bg-[#071426]/70 border border-transparent hover:border-[#1E344D] text-xs flex flex-col gap-0.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">{item.time}</span>
                </div>
                <span className="text-[11px] text-[#94A3B8]">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
