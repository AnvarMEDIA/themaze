'use client'

import { useEffect } from 'react'

/**
 * Minimal centered modal. Enters from scale(0.97)+opacity (never scale(0)),
 * ease-out, ≤200ms — modals keep transform-origin center. Closes on Esc /
 * backdrop click. Respects reduced-motion via a media query on the utility.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 fin-fade"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${maxWidth} my-8 rounded-2xl bg-[#0D0D0D] border border-[#232323] shadow-2xl fin-pop`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#777] hover:text-white hover:bg-[#1A1A1A] transition-colors active:scale-95"
            aria-label="Close"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
