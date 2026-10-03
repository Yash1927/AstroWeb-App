import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

type DialogProps = {
  children: ReactNode
  onClose: () => void
  open: boolean
  title: string
}

export function Dialog({ children, onClose, open, title }: DialogProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useLayoutEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    if (open) layer.dataset.wasOpen = 'true'
    layer.dataset.state = open ? 'open' : layer.dataset.wasOpen === 'true' ? 'closed' : 'idle'
  }, [open])

  useEffect(() => {
    if (!open) return

    closeButtonRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return createPortal(
    <div
      aria-hidden={!open}
      className="modal-layer dialog-layer"
      data-state={open ? 'open' : 'idle'}
      inert={!open}
      ref={layerRef}
    >
      <div aria-hidden="true" className="modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            aria-label="Close dialog"
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
    </div>,
    document.body,
  )
}
