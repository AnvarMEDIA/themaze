'use client'

import toast from 'react-hot-toast'

interface UndoOptions {
  message:   string
  undoLabel?: string
  /** Called when the user clicks Undo. Should restore the item. */
  onUndo:    () => Promise<void> | void
  /** How long the user has to undo, in ms. Default: 8000. */
  duration?: number
}

/**
 * Shows a toast with an inline "Undo" button.
 *
 * The toast is dismissable and self-closes after `duration` ms. Clicking
 * Undo calls onUndo and closes the toast immediately. Designed for use
 * after soft-delete operations where the backend keeps the row and can
 * restore it.
 */
export function showUndoToast({ message, undoLabel = 'Undo', onUndo, duration = 8000 }: UndoOptions) {
  const id = toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#1A1A1A',
          color: '#EDEBE3',
          border: '1px solid #252525',
          borderRadius: 12,
          padding: '10px 14px 10px 16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          opacity: t.visible ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      >
        <span style={{ fontSize: 14 }}>{message}</span>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id)
            try {
              await onUndo()
              toast.success('Restored')
            } catch {
              toast.error('Undo failed')
            }
          }}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            background: '#C8FF47',
            color: '#0A0A0A',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {undoLabel}
        </button>
      </div>
    ),
    { duration },
  )
  return id
}
