// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CallPlaceholderPage from './CallPlaceholderPage'

const bookingId = '1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df'

function response(startsAt: string, endsAt: string) {
  return {
    json: async () => ({
      booking: {
        id: bookingId,
        astrologer: {
          id: 'c7de117d-d65f-43fe-8c3d-c528423ae50f',
          displayName: 'Anika Rao',
        },
        callType: 'normal',
        startsAt,
        endsAt,
        durationMin: 15,
        pricePaise: 0,
        usedCredit: false,
        status: 'upcoming',
        endedStatus: 'missed',
      },
    }),
    ok: true,
    status: 200,
  } as Response
}

function renderUserCall() {
  render(
    <MemoryRouter initialEntries={[`/call/${bookingId}`]}>
      <Routes>
        <Route
          path="call/:bookingId"
          element={<CallPlaceholderPage audience="user" />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CallPlaceholderPage', () => {
  it('shows the IST start time before the call begins', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(
      '2099-10-01T10:00:00Z',
      '2099-10-01T10:15:00Z',
    )))

    renderUserCall()

    expect(await screen.findByText('Please wait. Your call will start at 3:30 PM.')).toBeDefined()
  })

  it('shows the deferred room message after the call begins', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(
      '2000-10-01T10:00:00Z',
      '2000-10-01T10:15:00Z',
    )))

    renderUserCall()

    expect(await screen.findByText('Coming in the next step')).toBeDefined()
  })
})

