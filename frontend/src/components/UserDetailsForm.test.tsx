// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserDetailsForm } from './UserDetailsForm'

afterEach(cleanup)

const completeDetails = {
  name: 'Maya Shah',
  birthDate: '1991-08-17',
  birthTime: '05:30',
  birthPlace: 'Jaipur',
  phone: '',
  gender: 'female' as const,
}

describe('UserDetailsForm', () => {
  it('shows the specific message when date of birth is empty', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserDetailsForm
          initial={{ ...completeDetails, birthDate: '' }}
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(screen.getByText('Enter your date of birth.')).toBeDefined()
  })

  it('keeps the non-future message for a future date of birth', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserDetailsForm
          initial={{ ...completeDetails, birthDate: '9999-12-31' }}
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(screen.getByText('Enter a date of birth that is not in the future.')).toBeDefined()
  })

  it('shows a fixed +91 prefix and submits formatted digits canonically', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MemoryRouter>
        <UserDetailsForm initial={completeDetails} onSubmit={onSubmit} />
      </MemoryRouter>,
    )

    const phone = screen.getByPlaceholderText('10-digit mobile number')
    expect(screen.getByText('+91')).toBeDefined()
    await user.type(phone, '98 765-43210')
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(phone).toHaveProperty('value', '9876543210')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ phone: '+919876543210' }))
  })
})
