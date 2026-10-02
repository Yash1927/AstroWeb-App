// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PolicyPage from './PolicyPage'

const settings = {
  normalPricePaise: 0,
  urgentPricePaise: 30_000,
  subscriptionPricePaise: 99_900,
  subscriptionCallsPerPack: 4,
  normalDurationMin: 15,
  urgentDurationMin: 15,
  subscriptionDurationMin: 15,
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

describe('PolicyPage', () => {
  it('shows the required shipping statement and an owner placeholder', () => {
    render(<MemoryRouter><PolicyPage kind="shipping" /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Shipping policy' })).toBeDefined()
    expect(screen.getByText('Services are delivered online or by phone. Nothing is shipped.')).toBeDefined()
    expect(screen.getByText(/\[Owner: add any other service-delivery details/)).toBeDefined()
  })

  it('loads every displayed price and duration from public Settings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(settings)))
    render(<MemoryRouter><PolicyPage kind="pricing" /></MemoryRouter>)

    expect(await screen.findByText('Free')).toBeDefined()
    expect(screen.getByText('₹300 per call')).toBeDefined()
    expect(screen.getByText('₹999 for 4 calls')).toBeDefined()
    expect(screen.getByText('15 minutes · Talk inside the app')).toBeDefined()
    expect(screen.getAllByText(/15 minutes/)).toHaveLength(3)
  })

  it('keeps the public Pricing page usable when Settings cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Unavailable' }, 503)))
    render(<MemoryRouter><PolicyPage kind="pricing" /></MemoryRouter>)

    expect(await screen.findByText('Pricing is unavailable. Please try again.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeDefined()
  })
})
