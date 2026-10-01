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

const slots = {
  durationMin: 15,
  timeZone: 'Asia/Kolkata',
  days: [
    { date: '2026-10-01', slots: [] },
    {
      date: '2026-10-02',
      slots: [{
        startsAt: '2026-10-02T04:30:00Z',
        endsAt: '2026-10-02T04:45:00Z',
      }],
    },
  ],
}

const confirmedBooking = {
  id: 'booking-1',
  astrologerId: astrologer.id,
  callType: 'normal',
  callMode: 'in_app',
  startsAt: '2026-10-02T04:30:00Z',
  endsAt: '2026-10-02T04:45:00Z',
  status: 'confirmed',
  pricePaise: 0,
  durationMin: 15,
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

  it('collects missing details, shows the summary and confirms a free Normal booking', async () => {
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
      if (String(input) === '/api/astrologers/anika/slots?type=normal') return response(slots)
      if (String(input) === '/api/bookings' && init?.method === 'POST') {
        return response({ booking: confirmedBooking }, 201)
      }
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

    const slotDialog = await screen.findByRole('dialog', { name: 'Choose a time' })
    expect((within(slotDialog).getByRole('button', { name: /1 Oct/ }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(within(slotDialog).getByRole('button', { name: /10:00 am/i }))
    const summary = await screen.findByRole('dialog', { name: 'Booking summary' })
    expect(within(summary).getByText('Anika Rao')).toBeDefined()
    expect(within(summary).getByText('Normal')).toBeDefined()
    expect(within(summary).getByText('15 min')).toBeDefined()
    expect(within(summary).getByText('Free')).toBeDefined()
    await user.click(within(summary).getByRole('button', { name: 'Confirm booking' }))

    const success = await screen.findByRole('dialog', { name: 'Call booked' })
    expect(within(success).getByRole('img', { name: 'Success' })).toBeDefined()
    expect(within(success).getByText(/Your call is booked for Fri, 2 Oct at 10:00 am/i)).toBeDefined()
    expect(within(success).getByRole('link', { name: 'Go to History' }).getAttribute('href')).toBe('/history')
    const bookingRequest = fetchMock.mock.calls.find(([input]) => String(input) === '/api/bookings')
    expect(JSON.parse(String(bookingRequest?.[1]?.body))).toEqual({
      astrologerId: astrologer.id,
      callType: 'normal',
      startsAt: slots.days[1]!.slots[0]!.startsAt,
    })
  })

  it('asks for one valid phone field for an Urgent call', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/astrologers/anika/slots?type=urgent') return response(slots)
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
    expect(within(dialog).getByText('+91')).toBeDefined()
    expect(phoneInput).toHaveProperty('placeholder', '10-digit mobile number')
    await user.type(phoneInput, '12345')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(within(dialog).getByText('Enter a valid 10-digit mobile number.')).toBeDefined()

    await user.clear(phoneInput)
    await user.type(phoneInput, '98 765-43210')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    const updateRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')?.[1] as RequestInit
    expect(JSON.parse(String(updateRequest.body)).phone).toBe('+919876543210')
    const slotDialog = await screen.findByRole('dialog', { name: 'Choose a time' })
    await user.click(within(slotDialog).getByRole('button', { name: /10:00 am/i }))
    const summary = await screen.findByRole('dialog', { name: 'Booking summary' })
    expect(within(summary).getByText(/Anika Rao will call you on \+91 98765 43210/i)).toBeDefined()
    expect(within(summary).getByRole('button', { name: /Pay/ })).toBeDefined()
  })

  it('shows the friendly conflict when the chosen time was just booked', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me') return response({ user: completeUser })
      if (String(input) === '/api/astrologers/anika/slots?type=normal') return response(slots)
      if (String(input) === '/api/bookings' && init?.method === 'POST') {
        return response({
          error: 'Sorry, this time was just booked. Please pick another time.',
        }, 409)
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    }))
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'Call' }))
    await user.click(screen.getByRole('button', { name: /Normal/ }))
    const slotsDialog = await screen.findByRole('dialog', { name: 'Choose a time' })
    await user.click(within(slotsDialog).getByRole('button', { name: /10:00 am/i }))
    const summary = await screen.findByRole('dialog', { name: 'Booking summary' })
    await user.click(within(summary).getByRole('button', { name: 'Confirm booking' }))

    expect((await within(summary).findByRole('alert')).textContent).toBe(
      'Sorry, this time was just booked. Please pick another time.',
    )
  })

  it('shows the upcoming Normal limit as a notice with a History action', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me') return response({ user: completeUser })
      if (String(input) === '/api/astrologers/anika/slots?type=normal') return response(slots)
      if (String(input) === '/api/bookings' && init?.method === 'POST') {
        return response({
          error: 'You already have an upcoming Normal call. You can book another after it ends.',
        }, 409)
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    }))
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'Call' }))
    await user.click(screen.getByRole('button', { name: /Normal/ }))
    const slotsDialog = await screen.findByRole('dialog', { name: 'Choose a time' })
    await user.click(within(slotsDialog).getByRole('button', { name: /10:00 am/i }))
    const summary = await screen.findByRole('dialog', { name: 'Booking summary' })
    await user.click(within(summary).getByRole('button', { name: 'Confirm booking' }))

    const notice = await within(summary).findByRole('status')
    expect(notice.textContent).toBe(
      'You already have an upcoming Normal call. You can book another after it ends.',
    )
    expect(notice.classList.contains('field__error')).toBe(false)
    expect(within(summary).queryByRole('button', { name: 'Confirm booking' })).toBeNull()
    expect(within(summary).getByRole('link', { name: 'Go to History' }).getAttribute('href')).toBe('/history')
  })

  it('disables dates without slots and shows the specified empty-day message', async () => {
    const emptySlots = {
      ...slots,
      days: [{ date: '2026-10-01', slots: [] }],
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [astrologer] })
      if (String(input) === '/api/settings/public') return response(settings)
      if (String(input) === '/api/me') return response({ user: completeUser })
      if (String(input) === '/api/astrologers/anika/slots?type=normal') return response(emptySlots)
      throw new Error(`Unexpected request: ${String(input)}`)
    }))
    const user = userEvent.setup()
    renderHome()

    await user.click(await screen.findByRole('button', { name: 'Call' }))
    await user.click(screen.getByRole('button', { name: /Normal/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose a time' })

    expect((within(dialog).getByRole('button', { name: /1 Oct/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(within(dialog).getByText('No free times on this day. Please try another day.')).toBeDefined()
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

