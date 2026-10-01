import { useCallback, useEffect, useState } from 'react'
import type { AstrologerBooking, BookingSections } from '../api/booking-history'
import { AstrologerApiError, astrologerApi } from '../api/astrologer'
import { BookingLists } from './BookingLists'
import { BookingListSkeleton } from './BookingListSkeleton'
import { Button } from './Button'
import { Card } from './Card'

type AstrologerBookingsProps = {
  onSignedOut: () => void
}

type LoadState = 'loading' | 'ready' | 'error'

export function AstrologerBookings({ onSignedOut }: AstrologerBookingsProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [bookings, setBookings] = useState<BookingSections<AstrologerBooking>>({
    upcoming: [],
    past: [],
  })

  const load = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      setBookings(await astrologerApi.getBookings())
      setState('ready')
    } catch (loadError) {
      if (loadError instanceof AstrologerApiError && loadError.status === 401) {
        onSignedOut()
        return
      }
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
      setState('error')
    }
  }, [onSignedOut])

  useEffect(() => {
    let active = true
    void astrologerApi.getBookings()
      .then((loaded) => {
        if (!active) return
        setBookings(loaded)
        setState('ready')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        if (loadError instanceof AstrologerApiError && loadError.status === 401) {
          onSignedOut()
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
        setState('error')
      })
    return () => { active = false }
  }, [onSignedOut])

  if (state === 'loading') return <BookingListSkeleton />
  if (state === 'error') {
    return (
      <Card className="home-state">
        <p className="field__error" role="alert">{error}</p>
        <Button onClick={() => void load()} variant="secondary">Try again</Button>
      </Card>
    )
  }
  return <BookingLists audience="astrologer" bookings={bookings} />
}

