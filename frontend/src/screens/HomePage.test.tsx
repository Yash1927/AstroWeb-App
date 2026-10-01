// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

const settings = {
  normalPricePaise: 0,
  urgentPricePaise: 30_000,
  subscriptionPricePaise: 99_900,
  subscriptionCallsPerPack: 4,
  normalDurationMin: 15,
  urgentDurationMin: 15,
  subscriptionDurationMin: 15,
}

const astrologer = {
  id: 'anika',
  displayName: 'Anika Rao',
  expertise: ['Vedic', 'Tarot'],
  languages: ['Hindi', 'English'],
  experienceYears: 8,
}

const completeUser = {
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

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('HomePage', () => {
  it('shows public cards and sends a signed-out booking choice to Google sign-in', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me') return response({ error: 'Continue with Google to proceed.' }, 401)
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderHome()

    expect(screen.getAllByRole('status', { name: 'Loading astrologer' }).length).toBeGreaterThan(0)
    expect(await screen.findByRole('heading', { name: 'Anika Rao' })).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Call' }))
    expect(screen.getByText('Free · 15 min')).toBeDefined()
    expect(screen.getByText('₹300 · 15 min')).toBeDefined()
    expect(screen.getByText('₹999 for 4 calls · 15 min each')).toBeDefined()
    await user.click(screen.getByRole('button', { name: /Normal/ }))

    expect(await screen.findByRole('heading', { name: 'Continue with Google' })).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({
      credentials: 'same-origin',
    }))
  })

  it('collects missing details and reaches the time-choice placeholder for Normal', async () => {
    const incompleteUser = {
      ...completeUser,
      birthDate: null,
      birthTime: null,
      birthPlace: null,
      gender: null,
      detailsComplete: false,
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me' && init?.method === 'PUT') {
        return response({ user: completeUser })
      }
      if (String(input) === '/api/me') return response({ user: incompleteUser })
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'Call' }))
    await user.click(screen.getByRole('button', { name: /Normal/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Your details' })
    fireEvent.change(within(dialog).getByLabelText('Date of birth'), { target: { value: '1991-08-17' } })
    fireEvent.change(within(dialog).getByLabelText('Time of birth'), { target: { value: '05:30' } })
    await user.type(within(dialog).getByLabelText('Place of birth'), 'Jaipur')
    await user.selectOptions(within(dialog).getByLabelText('Gender'), 'female')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Choosing a time comes in the next step')).toBeDefined()
  })

  it('asks for one valid phone field for an Urgent call', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me' && init?.method === 'PUT') {
        return response({ user: { ...completeUser, phone: '+919876543210' } })
      }
      if (String(input) === '/api/me') return response({ user: completeUser })
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'Call' }))
    await user.click(screen.getByRole('button', { name: /Urgent/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Phone number' })
    const phoneInput = within(dialog).getByLabelText('Phone number')
    await user.type(phoneInput, '12345')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(within(dialog).getByText('Enter +91 followed by a valid 10-digit mobile number.')).toBeDefined()

    await user.clear(phoneInput)
    await user.type(phoneInput, '+919876543210')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Choosing a time comes in the next step')).toBeDefined()
  })

  it('shows the specified empty state without requiring login', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (
      String(input) === '/api/astrologers'
        ? response({ astrologers: [] })
        : response(settings)
    )))

    renderHome()

    expect(
      await screen.findByText('No astrologers are available right now. Please check again later.'),
    ).toBeDefined()
  })
})

