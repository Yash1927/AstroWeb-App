import { useCallback, useEffect, useState } from 'react'
import { userApi, UserApiError } from '../api/user'
import { Button, Card, Skeleton, UserSignIn } from '../components'

type HistoryState = 'loading' | 'signed-out' | 'signed-in' | 'error'

export default function HistoryPage() {
  const [state, setState] = useState<HistoryState>('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      await userApi.getMe()
      setState('signed-in')
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
    void userApi.getMe()
      .then(() => {
        if (active) setState('signed-in')
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
      <h1>History</h1>
      {state === 'loading' ? (
        <Card className="stack" aria-busy="true">
          <Skeleton label="Loading History" variant="title" />
          <Skeleton label="Loading History" />
        </Card>
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
        <Card>
          <p>Your upcoming and past calls will appear here in Step 9.</p>
        </Card>
      )}
    </section>
  )
}

