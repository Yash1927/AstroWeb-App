import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { userApi, UserApiError, type UserDetails, type UserDetailsInput } from '../api/user'
import {
  Avatar,
  Button,
  Card,
  Skeleton,
  Toast,
  UserDetailsForm,
  UserSignIn,
} from '../components'
import { detailsDraftFrom } from '../user-details'
import type { UserDetailsFieldErrors } from '../user-details'

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveFieldErrors, setSaveFieldErrors] = useState<UserDetailsFieldErrors>({})
  const [savedToast, setSavedToast] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUser(await userApi.getMe())
      setSignedOut(false)
    } catch (loadError) {
      if (loadError instanceof UserApiError && loadError.status === 401) {
        setUser(null)
        setSignedOut(true)
      } else {
        setError(messageFrom(loadError))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void userApi.getMe()
      .then((loadedUser) => {
        if (!active) return
        setUser(loadedUser)
        setSignedOut(false)
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        if (loadError instanceof UserApiError && loadError.status === 401) {
          setSignedOut(true)
        } else {
          setError(messageFrom(loadError))
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const initialDetails = useMemo(
    () => user ? detailsDraftFrom(user) : null,
    [user],
  )

  const save = async (details: UserDetailsInput) => {
    setSaving(true)
    setSaveError('')
    setSaveFieldErrors({})
    try {
      setUser(await userApi.updateMe(details))
      setSavedToast(true)
    } catch (saveFailure) {
      if (saveFailure instanceof UserApiError && saveFailure.field === 'phone') {
        setSaveFieldErrors({ phone: saveFailure.message })
      } else {
        setSaveError(messageFrom(saveFailure))
      }
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    setError('')
    try {
      await userApi.logout()
      setUser(null)
      setSignedOut(true)
    } catch (logoutError) {
      setError(messageFrom(logoutError))
    }
  }

  return (
    <section className="screen user-screen">
      <h1>Settings</h1>

      {loading ? (
        <Card className="stack" aria-busy="true">
          <Skeleton label="Loading Settings" variant="title" />
          <Skeleton label="Loading Settings" />
          <Skeleton label="Loading Settings" />
        </Card>
      ) : signedOut ? (
        <UserSignIn
          description="Sign in to view and update your details."
          returnTo="/settings"
        />
      ) : error || !user || !initialDetails ? (
        <Card className="home-state">
          <p className="field__error" role="alert">{error || 'Settings are unavailable.'}</p>
          <Button onClick={() => void load()} variant="secondary">Try again</Button>
        </Card>
      ) : (
        <div className="settings-layout">
          <Card className="settings-profile">
            <Avatar id={user.id} name={user.name} size={56} />
            <div>
              <h2>{user.name}</h2>
              <p className="owner-muted">{user.email}</p>
            </div>
          </Card>

          <Card>
            <h2>Your details</h2>
            <label className="field settings-email">
              <span className="field__label">Email</span>
              <input className="input" readOnly value={user.email} />
              <span className="field__hint">Your email comes from Google and can’t be edited.</span>
            </label>
            <UserDetailsForm
              busy={saving}
              initial={initialDetails}
              onSubmit={save}
              onFieldChange={(field) => {
                setSaveFieldErrors((current) => ({ ...current, [field]: undefined }))
              }}
              serverError={saveError}
              serverFieldErrors={saveFieldErrors}
              submitLabel="Save"
            />
          </Card>

          <Card>
            <h2>Policies and help</h2>
            <nav aria-label="Policies and help" className="settings-links">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/refunds">Cancellation &amp; Refunds</Link>
              <Link to="/contact">Contact us</Link>
            </nav>
          </Card>

          {error ? <p className="field__error" role="alert">{error}</p> : null}
          <Button onClick={() => void logout()} variant="secondary">Log out</Button>
        </div>
      )}

      <Toast message="Saved" onDismiss={() => setSavedToast(false)} open={savedToast} />
    </section>
  )
}

