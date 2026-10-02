// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage'

const userDetails = {
  id: 'maya',
  email: 'maya@example.com',
  name: 'Maya Shah',
  birthDate: '1991-08-17',
  birthTime: '05:30',
  birthPlace: 'Jaipur',
  phone: null,
  gender: 'female',
  subscriptionCredits: 0,
  detailsComplete: true,
}

function response(body: unknown, status = 200) {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SettingsPage', () => {
  it('shows Google sign-in when signed out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Sign in' }, 401)))
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Continue with Google' })).toBeDefined()
  })

  it('keeps email read-only, saves details and logs out', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/auth/logout') return response({}, 204)
      if (init?.method === 'PUT') {
        return response({ user: { ...userDetails, birthPlace: 'Udaipur' } })
      }
      return response({ user: userDetails })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)

    const email = await screen.findByLabelText(/Email/) as HTMLInputElement
    expect(email.readOnly).toBe(true)
    const place = screen.getByLabelText('Place of birth')
    const phone = screen.getByLabelText('Phone number')
    await user.clear(place)
    await user.type(place, 'Udaipur')
    await user.type(phone, '98 765-43210')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Saved')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ method: 'PUT' }))
    const updateRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')?.[1] as RequestInit
    expect(JSON.parse(String(updateRequest.body)).phone).toBe('+919876543210')

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Continue with Google' })).toBeDefined()
  })

  it('shows the upcoming phone-call removal rule at the phone field', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return response({
          error: 'You have an upcoming phone call, so we need your number.',
          field: 'phone',
        }, 409)
      }
      return response({ user: { ...userDetails, phone: '+919876543210' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)

    const phone = await screen.findByLabelText('Phone number')
    await user.clear(phone)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const error = await screen.findByText('You have an upcoming phone call, so we need your number.')
    expect(phone.getAttribute('aria-invalid')).toBe('true')
    expect(phone.getAttribute('aria-describedby')).toContain(error.id)
  })
})

