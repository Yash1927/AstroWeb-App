import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AstrologerBooking, UserBooking } from '../api/booking-history'
import { AstrologerApiError, astrologerApi } from '../api/astrologer'
import { userApi, UserApiError } from '../api/user'
import { formatBookingTime } from '../booking-display'
import { BookingListSkeleton, Card, UserSignIn } from '../components'
import { useBookingClock } from '../use-booking-clock'

type CallPlaceholderPageProps = {
  audience: 'user' | 'astrologer'
}

type PageState = 'loading' | 'ready' | 'signed-out' | 'error'

export default function CallPlaceholderPage({ audience }: CallPlaceholderPageProps) {
  const { bookingId = '' } = useParams()
  const [state, setState] = useState<PageState>('loading')
  const [booking, setBooking] = useState<UserBooking | AstrologerBooking | null>(null)
  const [error, setError] = useState('')
  const now = useBookingClock(booking ? [booking] : [])

  useEffect(() => {
    let active = true
    const request = audience === 'user'
      ? userApi.getBooking(bookingId)
      : astrologerApi.getBooking(bookingId)
    void request
      .then((loaded) => {
        if (!active) return
        setBooking(loaded)
        setState('ready')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        const signedOut = (loadError instanceof UserApiError || loadError instanceof AstrologerApiError)
          && loadError.status === 401
        if (signedOut) {
          setState('signed-out')
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
          setState('error')
        }
      })
    return () => { active = false }
  }, [audience, bookingId])

  if (state === 'signed-out' && audience === 'user') {
    return (
      <section className="screen user-screen">
        <UserSignIn
          description="Sign in to open your call."
          returnTo={`/call/${bookingId}`}
        />
      </section>
    )
  }

  if (state === 'signed-out') {
    return (
      <main className="standalone-page screen">
        <Card className="call-placeholder">
          <h1>Astrologer login needed</h1>
          <p>Sign in to open your call.</p>
          <Link className="button button--primary" to="/astrologer">Go to astrologer login</Link>
        </Card>
      </main>
    )
  }

  const content = state === 'loading' ? (
    <BookingListSkeleton />
  ) : state === 'error' || !booking ? (
    <Card className="call-placeholder">
      <h1>Call room</h1>
      <p className="field__error" role="alert">{error || 'The booking is unavailable.'}</p>
    </Card>
  ) : (
    <Card className="call-placeholder">
      <h1>Call room</h1>
      <p>
        {now < Date.parse(booking.startsAt)
          ? `Please wait. Your call will start at ${formatBookingTime(booking.startsAt)}.`
          : 'Coming in the next step'}
      </p>
    </Card>
  )

  return audience === 'user' ? (
    <section className="screen user-screen">{content}</section>
  ) : (
    <main className="standalone-page screen">{content}</main>
  )
}

