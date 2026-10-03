import { useCallback, useEffect, useState } from 'react'
import type { UserBookingSections } from '../api/booking-history'
import { userApi, UserApiError } from '../api/user'
import {
  BookingLists,
  BookingListSkeleton,
  Button,
  Card,
  PageHeader,
  UserSignIn,
} from '../components'
import { formatCallsLeft } from '../subscription-display'

type HistoryState = 'loading' | 'signed-out' | 'ready' | 'error'

export default function HistoryPage() {
  const [state, setState] = useState<HistoryState>('loading')
  const [bookings, setBookings] = useState<UserBookingSections>({
    upcoming: [],
    past: [],
    subscriptionCredits: 0,
  })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      setBookings(await userApi.getBookings())
      setState('ready')
    } catch (loadError) {
      if (loadError instanceof UserApiError && loadError.status === 401) {
        setState('signed-out')
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
        setState('error')
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    void userApi.getBookings()
      .then((loaded) => {
        if (!active) return
        setBookings(loaded)
        setState('ready')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        if (loadError instanceof UserApiError && loadError.status === 401) {
          setState('signed-out')
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
          setState('error')
        }
      })
    return () => { active = false }
  }, [])

  return (
    <section className="screen user-screen">
      <PageHeader title="History" />
      {state === 'loading' ? (
        <BookingListSkeleton />
      ) : state === 'signed-out' ? (
        <UserSignIn
          description="Sign in to see your upcoming and past calls."
          returnTo="/history"
        />
      ) : state === 'error' ? (
        <Card className="home-state">
          <p className="field__error" role="alert">{error}</p>
          <Button onClick={() => void load()} variant="secondary">Try again</Button>
        </Card>
      ) : (
        <div className="stack">
          {bookings.subscriptionCredits > 0 ? (
            <p className="booking-notice" role="status">
              Subscription: {formatCallsLeft(bookings.subscriptionCredits)}
            </p>
          ) : null}
          <BookingLists audience="user" bookings={bookings} />
        </div>
      )}
    </section>
  )
}
