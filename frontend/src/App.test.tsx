// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function response(body: unknown) {
  return { json: async () => body, ok: true, status: 200 } as Response
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('App connectivity', () => {
  it('shows the offline message and restores the current route when connectivity returns', async () => {
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/astrologers') return response({ astrologers: [] })
      if (String(input) === '/api/settings/public') {
        return response({
          normalPricePaise: 0,
          urgentPricePaise: 30_000,
          subscriptionPricePaise: 99_900,
          subscriptionCallsPerPack: 4,
          normalDurationMin: 15,
          urgentDurationMin: 15,
          subscriptionDurationMin: 15,
        })
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    }))

    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByText("You're offline. Please check your internet connection.")).toBeDefined()

    online.mockReturnValue(true)
    fireEvent(window, new Event('online'))
    expect(await screen.findByText('No astrologers are available right now. Please check again later.')).toBeDefined()
  })
})
