import { useEffect, useState } from 'react'
import type { BookingCardBase } from './api/booking-history'

export function useBookingClock(bookings: BookingCardBase[]) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const current = Date.now()
    const nextBoundary = bookings
      .flatMap((booking) => [Date.parse(booking.startsAt), Date.parse(booking.endsAt)])
      .filter((boundary) => boundary > current)
      .sort((left, right) => left - right)[0]
    if (nextBoundary === undefined) return

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(nextBoundary - current + 1, 60_000),
    )
    return () => window.clearTimeout(timeout)
  }, [bookings, now])

  return now
}

