// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AstrologerBooking, UserBooking } from '../api/booking-history'
import { BookingLists } from './BookingLists'

const start = '2026-10-01T10:00:01Z'
const end = '2026-10-01T10:00:02Z'

const userBooking: UserBooking = {
  id: '1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df',
  astrologer: {
    id: 'c7de117d-d65f-43fe-8c3d-c528423ae50f',
    displayName: 'Anika Rao',
  },
  callType: 'normal',
  startsAt: start,
  endsAt: end,
  durationMin: 15,
  pricePaise: 0,
  usedCredit: false,
  status: 'upcoming',
  endedStatus: 'missed',
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
})

describe('BookingLists', () => {
  it('changes Join to Join now, then moves the booking to Past without a refresh', () => {
    render(
      <MemoryRouter>
        <BookingLists audience="user" bookings={{ upcoming: [userBooking], past: [] }} />
      </MemoryRouter>,
    )

    const join = screen.getByRole('link', { name: 'Join' })
    expect(join.className).toContain('button--secondary')
    expect(join.getAttribute('href')).toBe(`/call/${userBooking.id}`)
    expect(screen.getByText('Thu, 1 Oct · 3:30 PM')).toBeDefined()

    act(() => { vi.advanceTimersByTime(1_001) })
    const joinNow = screen.getByRole('link', { name: 'Join now' })
    expect(joinNow.className).toContain('button--primary')
    expect(joinNow.className).toContain('button--soft-glow')

    act(() => { vi.advanceTimersByTime(1_000) })
    expect(screen.queryByRole('link', { name: /Join/u })).toBeNull()
    expect(screen.getByText('Missed')).toBeDefined()
    const past = screen.getByRole('heading', { name: 'Past' }).closest('section')!
    expect(within(past).getByText('Anika Rao')).toBeDefined()
  })

  it('shows the booked user details to the astrologer without an email field', () => {
    const astrologerBooking: AstrologerBooking = {
      ...userBooking,
      user: {
        id: '32e5cc0b-a027-4fc2-88cf-5b9af87656dc',
        name: 'Maya Shah',
        birthDate: '1991-08-17',
        birthTime: '05:30',
        birthPlace: 'Jaipur',
        gender: 'female',
        phone: '+919876543210',
      },
    }
    delete (astrologerBooking as Partial<UserBooking>).astrologer

    const { container } = render(
      <MemoryRouter>
        <BookingLists
          audience="astrologer"
          bookings={{ upcoming: [astrologerBooking], past: [] }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Maya Shah')).toBeDefined()
    expect(screen.getByText('17 Aug 1991')).toBeDefined()
    expect(screen.getByText('5:30 AM')).toBeDefined()
    expect(screen.getByText('+91 98765 43210')).toBeDefined()
    expect(container.textContent).not.toContain('Email')
  })
})

