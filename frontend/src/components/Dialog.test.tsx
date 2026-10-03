// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { BottomSheet } from './BottomSheet'
import { Dialog } from './Dialog'
import { Toast } from './Toast'

afterEach(cleanup)

function DialogHarness() {
  const [name, setName] = useState('')
  const [open, setOpen] = useState(true)

  return (
    <div className="screen">
      <Dialog onClose={() => setOpen(false)} open={open} title="Add astrologer">
        <label>
          Name
          <input
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
      </Dialog>
    </div>
  )
}

function InitiallyClosedDialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">Open</button>
      <Dialog onClose={() => setOpen(false)} open={open} title="Confirm action">
        <button onClick={() => setOpen(false)} type="button">Close</button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('keeps focus and stays open while a multi-word value is typed', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const input = screen.getByRole('textbox', { name: 'Name' })

    await user.click(input)
    await user.type(input, 'Anika Rao')

    expect(input).toBe(document.activeElement)
    expect((input as HTMLInputElement).value).toBe('Anika Rao')
    expect(screen.getByRole('dialog', { name: 'Add astrologer' })).toBeDefined()
  })

  it('does not play the closing animation until it has been opened', async () => {
    const user = userEvent.setup()
    render(<InitiallyClosedDialogHarness />)
    const layer = document.querySelector('.dialog-layer')

    expect(layer?.getAttribute('data-state')).toBe('idle')
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(layer?.getAttribute('data-state')).toBe('open')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(layer?.getAttribute('data-state')).toBe('closed')
  })

  it('starts every shared overlay in the hidden idle state', () => {
    render(
      <>
        <Dialog onClose={() => undefined} open={false} title="Dialog">Dialog body</Dialog>
        <BottomSheet onClose={() => undefined} open={false} title="Sheet">Sheet body</BottomSheet>
        <Toast message="Saved" onDismiss={() => undefined} open={false} />
      </>,
    )

    expect(document.querySelector('.dialog-layer')?.getAttribute('data-state')).toBe('idle')
    expect(document.querySelector('.bottom-sheet-layer')?.getAttribute('data-state')).toBe('idle')
    expect(document.querySelector('.toast')?.getAttribute('data-state')).toBe('idle')
  })
})
