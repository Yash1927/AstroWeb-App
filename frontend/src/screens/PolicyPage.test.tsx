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
  it.each([
    ['about', 'About us'],
    ['contact', 'Contact us'],
    ['privacy', 'Privacy policy'],
    ['refunds', 'Cancellation and refunds'],
    ['shipping', 'Shipping policy'],
    ['terms', 'Terms and conditions'],
  ] as const)('shows dated real copy on the %s page', (kind, title) => {
    render(<MemoryRouter><PolicyPage kind={kind} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: title })).toBeDefined()
    expect(screen.getByText('Last updated: 2026-10-03')).toBeDefined()
    expect(screen.queryByText(/\[Owner:/)).toBeNull()
  })

  it('explains digital delivery for every call type', () => {
    render(<MemoryRouter><PolicyPage kind="shipping" /></MemoryRouter>)

    expect(screen.getByText(/Nothing is shipped and there are no delivery charges/)).toBeDefined()
    expect(screen.getByText(/Normal consultation is delivered as an audio call inside the app/)).toBeDefined()
    expect(screen.getByText(/Urgent or Subscription consultation is delivered by phone/)).toBeDefined()
  })

  it('includes the terms disclaimer, account rules and consumer grievance timing', () => {
    render(<MemoryRouter><PolicyPage kind="terms" /></MemoryRouter>)

    expect(screen.getByText(/must be at least 18 years old/)).toBeDefined()
    expect(screen.getByText(/not a substitute for medical, legal, financial or psychological advice/)).toBeDefined()
    expect(screen.getByText(/independent consultants and are not employees/)).toBeDefined()
    expect(screen.getByText(/Payments are processed by Razorpay/)).toBeDefined()
    expect(screen.getByText(/acknowledge a consumer complaint within 48 hours/)).toBeDefined()
    expect(screen.getByText(/resolve it within one month/)).toBeDefined()
  })

  it('describes privacy law, processors, phone use and deletion requests', () => {
    render(<MemoryRouter><PolicyPage kind="privacy" /></MemoryRouter>)

    expect(screen.getByText(/Digital Personal Data Protection Act, 2023/)).toBeDefined()
    expect(screen.getByText(/treat birth details as sensitive/)).toBeDefined()
    expect(screen.getByText(/phone number is not used for marketing/)).toBeDefined()
    expect(screen.getByText(/Google Identity Services/)).toBeDefined()
    expect(screen.getByText(/Cloudflare R2/)).toBeDefined()
    expect(screen.getByText(/request access, correction or deletion/)).toBeDefined()
  })

  it('states the implemented payment, conflict-refund and missed-call rules', () => {
    render(<MemoryRouter><PolicyPage kind="refunds" /></MemoryRouter>)

    expect(screen.getByText(/Normal calls are free, so there is no payment to refund/)).toBeDefined()
    expect(screen.getByText(/automatically asks Razorpay to refund/)).toBeDefined()
    expect(screen.getByText(/does not issue an automatic refund or automatically restore a Subscription credit/)).toBeDefined()
    expect(screen.getByText(/usually appears within 5–7 working days/)).toBeDefined()
  })

  it('keeps only the five requested owner-fact placeholders', () => {
    render(<MemoryRouter><PolicyPage kind="contact" /></MemoryRouter>)

    const pageText = document.body.textContent ?? ''
    expect(pageText).toContain('Shashank Pokhariyal')
    expect(pageText).toContain('[OWNER: registered address]')
    expect(pageText).toContain('[OWNER: support email]')
    expect(pageText).toContain('[OWNER: support phone]')
    expect(pageText).toContain('[OWNER: GSTIN if any]')

    cleanup()
    render(<MemoryRouter><PolicyPage kind="terms" /></MemoryRouter>)
    expect(document.body.textContent).toContain('[OWNER: city for jurisdiction]')
  })

  it('loads every displayed price and duration from public Settings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(settings)))
    render(<MemoryRouter><PolicyPage kind="pricing" /></MemoryRouter>)

    expect(await screen.findByText('Free')).toBeDefined()
    expect(screen.getByText('₹300 per call')).toBeDefined()
    expect(screen.getByText('₹999 for 4 calls')).toBeDefined()
    expect(screen.getByText('15 minutes · Talk inside the app')).toBeDefined()
    expect(screen.getAllByText(/15 minutes/)).toHaveLength(3)
    expect(screen.getByText(/inclusive of applicable taxes, if any/)).toBeDefined()
    expect(screen.getByText('Last updated: 2026-10-03')).toBeDefined()
  })

  it('keeps the public Pricing page usable when Settings cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ error: 'Unavailable' }, 503)))
    render(<MemoryRouter><PolicyPage kind="pricing" /></MemoryRouter>)

    expect(await screen.findByText('Pricing is unavailable. Please try again.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeDefined()
  })
})
