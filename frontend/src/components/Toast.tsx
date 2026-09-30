import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ToastProps = {
  kind?: 'success' | 'error'
  message: string
  onDismiss: () => void
  open: boolean
}

export function Toast({
  kind = 'success',
  message,
  onDismiss,
  open,
}: ToastProps) {
  useEffect(() => {
    if (!open) return

    const timeout = window.setTimeout(onDismiss, 4_000)
    return () => window.clearTimeout(timeout)
  }, [onDismiss, open])

  return createPortal(
    <div
      aria-hidden={!open}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
      className={`toast toast--${kind}`}
      data-state={open ? 'open' : 'closed'}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <p className="toast__message">{message}</p>
      <button
        aria-label="Dismiss message"
        className="modal-close"
        onClick={onDismiss}
        tabIndex={open ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>,
    document.body,
  )
}
