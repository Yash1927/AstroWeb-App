import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

type BottomSheetProps = {
  children: ReactNode
  onClose: () => void
  open: boolean
  title: string
}

export function BottomSheet({
  children,
  onClose,
  open,
  title,
}: BottomSheetProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    closeButtonRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  return (
    <div
      aria-hidden={!open}
      className="modal-layer bottom-sheet-layer"
      data-state={open ? 'open' : 'closed'}
      inert={!open}
    >
      <div aria-hidden="true" className="modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="bottom-sheet"
        role="dialog"
      >
        <div aria-hidden="true" className="bottom-sheet__handle" />
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label="Close bottom sheet"
            className="modal-close"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
