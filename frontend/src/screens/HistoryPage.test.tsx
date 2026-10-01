// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HistoryPage from './HistoryPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HistoryPage', () => {
  it('asks a signed-out visitor to Continue with Google', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ error: 'Continue with Google to proceed.' }),
      ok: false,
      status: 401,
    } as Response)))

    render(<MemoryRouter><HistoryPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Continue with Google' })).toBeDefined()
  })

  it('loads only the current user booking sections', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ upcoming: [], past: [] }),
      ok: true,
      status: 200,
    } as Response))
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><HistoryPage /></MemoryRouter>)

    expect(await screen.findByText('No upcoming calls.')).toBeDefined()
    expect(screen.getByText('No past calls yet.')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/me/bookings', expect.objectContaining({
      credentials: 'same-origin',
    }))
  })
})

