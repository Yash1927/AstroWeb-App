import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  AstrologerApiError,
  astrologerApi,
  type AstrologerOwnProfile,
  type AstrologerProfileInput,
} from '../api/astrologer'
import {
  AstrologerCard,
  AstrologerBookings,
  Avatar,
  AppBar,
  AppBrand,
  AvailabilityEditor,
  Button,
  Card,
  Dialog,
  Skeleton,
  Toast,
} from '../components'

const AstrologerBlogs = lazy(() => import('../components/AstrologerBlogs').then((module) => ({ default: module.AstrologerBlogs })))
const ProfilePhotoCropper = lazy(() => import('../components/ProfilePhotoCropper').then((module) => ({ default: module.ProfilePhotoCropper })))

type AuthState = 'checking' | 'logged-out' | 'password' | 'logged-in'
type AstrologerSection = 'profile' | 'availability' | 'bookings' | 'blogs'
type ProfileField = keyof AstrologerProfileInput
type ProfileErrors = Partial<Record<ProfileField, string>>
type ToastState = { kind: 'success' | 'error'; message: string } | null

const expertiseSuggestions = ['Vedic', 'Tarot', 'Numerology']

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

type TagInputProps = {
  error?: string
  label: string
  onChange: (tags: string[]) => void
  suggestions?: string[]
  tags: string[]
}

function TagInput({ error, label, onChange, suggestions = [], tags }: TagInputProps) {
  const inputId = useId()
  const errorId = useId()
  const suggestionsId = useId()
  const [value, setValue] = useState('')
  const [tagError, setTagError] = useState('')

  const addTag = () => {
    const next = value.trim()
    setTagError('')

    if (!next) return
    if (next.length > 40) {
      setTagError(`${label} entries can be up to 40 characters.`)
      return
    }
    if (tags.length >= 20) {
      setTagError(`You can add up to 20 ${label.toLocaleLowerCase()} entries.`)
      return
    }
    if (tags.some((tag) => tag.toLocaleLowerCase() === next.toLocaleLowerCase())) {
      setTagError(`${next} is already added.`)
      return
    }

    onChange([...tags, next])
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addTag()
  }

  const visibleError = tagError || error

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>{label}</label>
      {tags.length ? (
        <div aria-label={`Added ${label.toLocaleLowerCase()}`} className="tag-list">
          {tags.map((tag) => (
            <button
              aria-label={`Remove ${tag}`}
              className="tag"
              key={tag.toLocaleLowerCase()}
              onClick={() => onChange(tags.filter((item) => item !== tag))}
              type="button"
            >
              <span>{tag}</span><span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="tag-input-row">
        <input
          aria-describedby={visibleError ? errorId : undefined}
          aria-invalid={Boolean(visibleError)}
          className="input"
          id={inputId}
          list={suggestions.length ? suggestionsId : undefined}
          maxLength={41}
          onChange={(event) => {
            setValue(event.target.value)
            setTagError('')
          }}
          onKeyDown={handleKeyDown}
          value={value}
        />
        <Button onClick={addTag} variant="secondary">Add</Button>
      </div>
      {suggestions.length ? (
        <>
          <datalist id={suggestionsId}>
            {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
          </datalist>
          <span className="field__hint">Try Vedic, Tarot or Numerology, or type another.</span>
        </>
      ) : (
        <span className="field__hint">Type a language, then choose Add.</span>
      )}
      {visibleError ? <span className="field__error" id={errorId} role="alert">{visibleError}</span> : null}
    </div>
  )
}

export default function AstrologerPage() {
  const location = useLocation()
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [section, setSection] = useState<AstrologerSection>(() => (
    new URLSearchParams(location.search).get('section') === 'bookings' ? 'bookings' : 'profile'
  ))
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [profile, setProfile] = useState<AstrologerOwnProfile | null>(null)
  const [form, setForm] = useState<AstrologerProfileInput>({
    displayName: '',
    expertise: [],
    experienceYears: 0,
    languages: [],
  })
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [profileError, setProfileError] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoRemoveOpen, setPhotoRemoveOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const handleSessionEnded = useCallback(() => {
    setAuthState('logged-out')
    setProfile(null)
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const loaded = await astrologerApi.getProfile()
      setProfile(loaded)
      setForm({
        displayName: loaded.displayName,
        expertise: loaded.expertise,
        experienceYears: loaded.experienceYears,
        languages: loaded.languages,
      })
      setProfileError('')
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        setAuthState('logged-out')
      } else {
        setProfileError(messageFrom(error))
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      try {
        const session = await astrologerApi.session()
        if (!active) return
        if (session.mustChangePassword) {
          setAuthState('password')
          return
        }
        setAuthState('logged-in')
        await loadProfile()
      } catch (error) {
        if (!active) return
        setAuthState('logged-out')
        if (!(error instanceof AstrologerApiError && error.status === 401)) {
          setLoginError(messageFrom(error))
        }
      }
    }

    void checkSession()
    return () => { active = false }
  }, [loadProfile])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError('')

    try {
      const result = await astrologerApi.login(loginEmail, loginPassword)
      setLoginPassword('')
      if (result.mustChangePassword) {
        setAuthState('password')
      } else {
        setAuthState('logged-in')
        await loadProfile()
      }
    } catch (error) {
      setLoginError(messageFrom(error))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    try {
      await astrologerApi.logout()
      setAuthState('logged-out')
      setProfile(null)
      setLoginEmail('')
      setLoginPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        setAuthState('logged-out')
        setProfile(null)
      } else {
        setToast({ kind: 'error', message: messageFrom(error) })
      }
    }
  }

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError('')

    if (newPassword.length < 10) {
      setPasswordError('Your new password must be at least 10 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The passwords do not match. Enter them again.')
      return
    }

    setPasswordBusy(true)
    try {
      await astrologerApi.replaceTemporaryPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setAuthState('logged-in')
      await loadProfile()
      setToast({ kind: 'success', message: 'Your new password is ready.' })
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        setAuthState('logged-out')
      } else {
        setPasswordError(messageFrom(error))
      }
    } finally {
      setPasswordBusy(false)
    }
  }

  const changeField = <K extends ProfileField>(field: K, value: AstrologerProfileInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setProfileErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validateProfile = () => {
    const errors: ProfileErrors = {}
    const nameLength = form.displayName.trim().length
    if (nameLength < 2 || nameLength > 80) {
      errors.displayName = 'Enter a display name between 2 and 80 characters.'
    }
    if (!Number.isInteger(form.experienceYears) || form.experienceYears < 0 || form.experienceYears > 60) {
      errors.experienceYears = 'Enter a whole number from 0 to 60.'
    }
    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault()
    setProfileError('')
    if (!validateProfile()) return

    setProfileBusy(true)
    try {
      const saved = await astrologerApi.saveProfile(form)
      setProfile(saved)
      setForm({
        displayName: saved.displayName,
        expertise: saved.expertise,
        experienceYears: saved.experienceYears,
        languages: saved.languages,
      })
      setToast({ kind: 'success', message: 'Profile saved.' })
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        setAuthState('logged-out')
        setProfile(null)
      } else {
        setProfileError(messageFrom(error))
      }
    } finally {
      setProfileBusy(false)
    }
  }

  const choosePhoto = (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError('Choose a JPG, PNG or WebP image smaller than 5 MB.')
      return
    }
    setProfileError('')
    setCropFile(file)
  }

  const acceptCrop = (file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setCropFile(null)
  }

  const savePhoto = async () => {
    if (!photoFile) return
    setPhotoBusy(true)
    try {
      const asset = await astrologerApi.uploadProfilePhoto(photoFile)
      setProfile((current) => current ? { ...current, photoUrl: asset.url } : current)
      setPhotoFile(null)
      setCropFile(null)
      setPhotoPreview(null)
      setPhotoRemoveOpen(false)
      setToast({ kind: 'success', message: 'Profile photo saved.' })
    } catch (error) { setProfileError(messageFrom(error)) }
    finally { setPhotoBusy(false) }
  }

  const removePhoto = async () => {
    setPhotoBusy(true)
    try {
      await astrologerApi.removeProfilePhoto()
      setProfile((current) => current ? { ...current, photoUrl: null } : current)
      setPhotoFile(null)
      setCropFile(null)
      setPhotoPreview(null)
      setPhotoRemoveOpen(false)
      setToast({ kind: 'success', message: 'Profile photo removed.' })
    } catch (error) { setProfileError(messageFrom(error)) }
    finally { setPhotoBusy(false) }
  }

  if (authState === 'checking') {
    return (
      <main aria-busy="true" className="standalone-page screen">
        <Card className="astrologer-login-card"><AppBrand large /><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>
      </main>
    )
  }

  if (authState === 'logged-out') {
    return (
      <main className="standalone-page screen">
        <Card className="astrologer-login-card">
          <AppBrand large />
          <h1>Astrologer login</h1>
          <p className="screen__intro">Sign in with the account the owner created for you.</p>
          <form className="stack" onSubmit={handleLogin}>
            <label className="field">
              <span className="field__label">Email</span>
              <input autoComplete="username" className="input" onChange={(event) => setLoginEmail(event.target.value)} required type="email" value={loginEmail} />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input autoComplete="current-password" className="input" onChange={(event) => setLoginPassword(event.target.value)} required type="password" value={loginPassword} />
            </label>
            {loginError ? <p className="field__error" role="alert">{loginError}</p> : null}
            <Button disabled={loginBusy} type="submit">{loginBusy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
        </Card>
      </main>
    )
  }

  if (authState === 'password') {
    return (
      <main className="standalone-page screen">
        <Card className="astrologer-login-card">
          <AppBrand large />
          <h1>Set a new password</h1>
          <p className="screen__intro">Replace the temporary password before continuing.</p>
          <form className="stack" onSubmit={handlePassword}>
            <label className="field">
              <span className="field__label">New password</span>
              <input aria-describedby={passwordError ? 'new-password-error' : undefined} aria-invalid={Boolean(passwordError)} autoComplete="new-password" className="input" minLength={10} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} />
              <span className="field__hint">At least 10 characters.</span>
            </label>
            <label className="field">
              <span className="field__label">Confirm new password</span>
              <input aria-describedby={passwordError ? 'new-password-error' : undefined} aria-invalid={Boolean(passwordError)} autoComplete="new-password" className="input" minLength={10} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
            </label>
            {passwordError ? <p className="field__error" id="new-password-error" role="alert">{passwordError}</p> : null}
            <Button disabled={passwordBusy} type="submit">{passwordBusy ? 'Saving…' : 'Save new password'}</Button>
            <Button onClick={() => void handleLogout()} variant="text">Log out</Button>
          </form>
        </Card>
        <Toast kind={toast?.kind} message={toast?.message ?? ''} onDismiss={() => setToast(null)} open={Boolean(toast)} />
      </main>
    )
  }

  return (
    <main className="astrologer-page screen">
      <AppBar actions={<Button onClick={() => void handleLogout()} variant="secondary">Log out</Button>} panelLabel="Astrologer panel" />
      <h1 className="visually-hidden">Astrologer panel</h1>

      <nav aria-label="Astrologer sections" className="astrologer-section-nav">
        {(['profile', 'availability', 'bookings', 'blogs'] as const).map((item) => (
          <button aria-pressed={section === item} className="chip" key={item} onClick={() => setSection(item)} type="button">
            {item[0].toLocaleUpperCase()}{item.slice(1)}
          </button>
        ))}
      </nav>

      {section === 'profile' ? (
        <section aria-labelledby="profile-heading" className="astrologer-section">
          <div className="owner-section__heading">
            <div>
              <h2 id="profile-heading">Profile</h2>
              <p className="screen__intro">This information appears on your Home card.</p>
            </div>
          </div>
          {!profile && !profileError ? (
            <Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>
          ) : (
            <Card>
              <form className="astrologer-profile-form" noValidate onSubmit={handleProfileSave}>
                <div className="profile-photo-field">
                  <Avatar id={profile?.id ?? 'profile'} name={form.displayName} size={96} src={photoPreview ?? profile?.photoUrl} />
                  <div className="stack">
                    <span className="field__label">Profile photo</span>
                    <input accept="image/jpeg,image/png,image/webp" className="visually-hidden" id="profile-photo-upload" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.currentTarget.value = '' }} type="file" />
                    <label className="button button--secondary profile-photo-upload" htmlFor="profile-photo-upload">Upload photo</label>
                    <span className="field__hint">JPG, PNG or WebP, up to 5 MB.</span>
                    <div className="profile-photo-field__actions">
                      {photoFile ? <Button disabled={photoBusy} onClick={() => void savePhoto()} type="button">{photoBusy ? 'Saving…' : 'Save photo'}</Button> : null}
                      {profile?.photoUrl ? <Button disabled={photoBusy} onClick={() => setPhotoRemoveOpen(true)} type="button" variant="secondary">Remove photo</Button> : null}
                    </div>
                  </div>
                </div>
                {cropFile ? (
                  <Suspense fallback={<div aria-busy="true"><Skeleton /><Skeleton /></div>}>
                    <ProfilePhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onCrop={acceptCrop} onError={setProfileError} />
                  </Suspense>
                ) : null}
                <label className="field">
                  <span className="field__label">Display name</span>
                  <input aria-describedby={profileErrors.displayName ? 'display-name-error' : undefined} aria-invalid={Boolean(profileErrors.displayName)} className="input" maxLength={80} onChange={(event) => changeField('displayName', event.target.value)} required value={form.displayName} />
                  {profileErrors.displayName ? <span className="field__error" id="display-name-error" role="alert">{profileErrors.displayName}</span> : null}
                </label>
                <TagInput error={profileErrors.expertise} label="Expertise" onChange={(tags) => changeField('expertise', tags)} suggestions={expertiseSuggestions} tags={form.expertise} />
                <TagInput error={profileErrors.languages} label="Languages" onChange={(tags) => changeField('languages', tags)} tags={form.languages} />
                <label className="field">
                  <span className="field__label">Years of experience</span>
                  <input aria-describedby={profileErrors.experienceYears ? 'experience-error' : undefined} aria-invalid={Boolean(profileErrors.experienceYears)} className="input" inputMode="numeric" max="60" min="0" onChange={(event) => changeField('experienceYears', Number(event.target.value))} required type="number" value={form.experienceYears} />
                  {profileErrors.experienceYears ? <span className="field__error" id="experience-error" role="alert">{profileErrors.experienceYears}</span> : null}
                </label>
                {profileError ? <p className="field__error" role="alert">{profileError}</p> : null}
                <div className="astrologer-form-actions">
                  <Button onClick={() => setPreviewOpen(true)} variant="secondary">Preview</Button>
                  <Button disabled={profileBusy} type="submit">{profileBusy ? 'Saving…' : 'Save profile'}</Button>
                </div>
              </form>
            </Card>
          )}
        </section>
      ) : section === 'availability' ? (
        <section aria-labelledby="availability-heading" className="astrologer-section">
          <div className="owner-section__heading">
            <div>
              <h2 id="availability-heading">Availability</h2>
              <p className="screen__intro">Set the IST hours users can choose.</p>
            </div>
          </div>
          <AvailabilityEditor onSignedOut={handleSessionEnded} />
        </section>
      ) : section === 'bookings' ? (
        <section aria-labelledby="bookings-heading" className="astrologer-section">
          <div className="owner-section__heading">
            <div>
              <h2 id="bookings-heading">Bookings</h2>
              <p className="screen__intro">Your upcoming and past calls.</p>
            </div>
          </div>
          <AstrologerBookings onSignedOut={handleSessionEnded} />
        </section>
      ) : (
        <section aria-labelledby="blogs-heading" className="astrologer-section">
          <div className="owner-section__heading"><div><h2 id="blogs-heading">Blogs</h2><p className="screen__intro">Write and manage your posts.</p></div></div>
          <Suspense fallback={<Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>}>
            <AstrologerBlogs onSignedOut={handleSessionEnded} />
          </Suspense>
        </section>
      )}

      <Dialog onClose={() => setPreviewOpen(false)} open={previewOpen} title="Home card preview">
        <p className="screen__intro">This preview uses your unsaved changes.</p>
        <div className="astrologer-preview-frame">
          <AstrologerCard
            onCall={() => undefined}
            profile={{ id: profile?.id ?? 'preview', photoUrl: photoPreview ?? profile?.photoUrl, ...form }}
          />
        </div>
      </Dialog>
      <Dialog onClose={() => setPhotoRemoveOpen(false)} open={photoRemoveOpen} title="Remove photo?">
        <div className="stack">
          <p>Your initials will be shown until you upload another photo.</p>
          <div className="dialog__actions">
            <Button onClick={() => setPhotoRemoveOpen(false)} variant="secondary">Keep photo</Button>
            <Button disabled={photoBusy} onClick={() => void removePhoto()}>{photoBusy ? 'Removing…' : 'Remove photo'}</Button>
          </div>
        </div>
      </Dialog>
      <Toast kind={toast?.kind} message={toast?.message ?? ''} onDismiss={() => setToast(null)} open={Boolean(toast)} />
    </main>
  )
}
