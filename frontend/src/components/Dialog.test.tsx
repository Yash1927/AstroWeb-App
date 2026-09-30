// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Dialog } from './Dialog'

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
})
