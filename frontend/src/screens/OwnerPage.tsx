import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  OwnerApiError,
  ownerApi,
  paiseToRupees,
  rupeesToPaise,
  type AstrologerProfile,
  type OwnerSettings,
} from '../api/owner'
import { AppBar, AppBrand, Avatar, Button, Card, Dialog, OwnerRecentComments, Skeleton, Toast } from '../components'
import { withLowercaseDayPeriod } from '../display-time'

type OwnerSection = 'astrologers' | 'settings' | 'comments'
type ToastState = { kind: 'success' | 'error'; message: string } | null

type SettingsForm = {
  normalDurationMin: string
  normalPriceRupees: string
  subscriptionCallsPerPack: string
  subscriptionDurationMin: string
  subscriptionPriceRupees: string
  urgentDurationMin: string
  urgentPriceRupees: string
}

type SettingsFieldErrors = Partial<Record<keyof SettingsForm, string>>

const emptySettingsForm: SettingsForm = {
  normalDurationMin: '15',
  normalPriceRupees: '0',
  subscriptionCallsPerPack: '4',
  subscriptionDurationMin: '15',
  subscriptionPriceRupees: '999',
  urgentDurationMin: '15',
  urgentPriceRupees: '300',
}

function settingsToForm(settings: OwnerSettings): SettingsForm {
  return {
    normalDurationMin: String(settings.normalDurationMin),
    normalPriceRupees: paiseToRupees(settings.normalPricePaise),
    subscriptionCallsPerPack: String(settings.subscriptionCallsPerPack),
    subscriptionDurationMin: String(settings.subscriptionDurationMin),
    subscriptionPriceRupees: paiseToRupees(settings.subscriptionPricePaise),
    urgentDurationMin: String(settings.urgentDurationMin),
    urgentPriceRupees: paiseToRupees(settings.urgentPricePaise),
  }
}

function asDuration(value: string): 10 | 15 | 30 | null {
  const duration = Number(value)
  return duration === 10 || duration === 15 || duration === 30 ? duration : null
}

function formatCreatedAt(value: string) {
  return withLowercaseDayPeriod(new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value)))
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function OwnerPage() {
  const [authState, setAuthState] = useState<'checking' | 'logged-out' | 'logged-in'>('checking')
  const [section, setSection] = useState<OwnerSection>('astrologers')
  const [astrologers, setAstrologers] = useState<AstrologerProfile[]>([])
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(emptySettingsForm)
  const [loadingData, setLoadingData] = useState(false)
  const [pageError, setPageError] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addError, setAddError] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [selected, setSelected] = useState<AstrologerProfile | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)

  const [resetTarget, setResetTarget] = useState<AstrologerProfile | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<SettingsFieldErrors>({})

  const handleSessionEnded = useCallback(() => {
    setAuthState('logged-out')
    setAstrologers([])
  }, [])

  const loadData = useCallback(async () => {
    setLoadingData(true)
    setPageError('')

    try {
      const [nextAstrologers, settings] = await Promise.all([
        ownerApi.listAstrologers(),
        ownerApi.getSettings(),
      ])
      setAstrologers(nextAstrologers)
      setSettingsForm(settingsToForm(settings))
    } catch (error) {
      if (error instanceof OwnerApiError && error.status === 401) {
        setAuthState('logged-out')
      } else {
        setPageError(messageFrom(error))
      }
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      try {
        await ownerApi.session()
        if (!active) return
        setAuthState('logged-in')
        await loadData()
      } catch (error) {
        if (!active) return
        if (error instanceof OwnerApiError && error.status === 401) {
          setAuthState('logged-out')
        } else {
          setAuthState('logged-out')
          setLoginError(messageFrom(error))
        }
      }
    }

    void checkSession()
    return () => {
      active = false
    }
  }, [loadData])

  const replaceAstrologer = (updated: AstrologerProfile) => {
    setAstrologers((current) =>
      current
        .map((astrologer) => (astrologer.id === updated.id ? updated : astrologer))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    )
    setSelected((current) => (current?.id === updated.id ? updated : current))
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError('')

    try {
      await ownerApi.login(loginEmail, loginPassword)
      setLoginPassword('')
      setAuthState('logged-in')
      await loadData()
    } catch (error) {
      setLoginError(messageFrom(error))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    try {
      await ownerApi.logout()
      setAuthState('logged-out')
      setAstrologers([])
      setLoginEmail('')
      setLoginPassword('')
    } catch (error) {
      setToast({ kind: 'error', message: messageFrom(error) })
    }
  }

  const clearAddForm = () => {
    setAddName('')
    setAddEmail('')
    setAddPassword('')
    setAddError('')
  }

  const openAddDialog = () => {
    clearAddForm()
    setAddOpen(true)
  }

  const closeAddDialog = () => {
    setAddOpen(false)
    clearAddForm()
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setAddError('')

    if (addPassword.length < 10) {
      setAddError('The temporary password must be at least 10 characters.')
      return
    }

    setAddBusy(true)
    try {
      const created = await ownerApi.createAstrologer({
        displayName: addName,
        email: addEmail,
        temporaryPassword: addPassword,
      })
      setAstrologers((current) =>
        [...current, created].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      )
      closeAddDialog()
      setToast({
        kind: 'success',
        message: 'Astrologer added. Share the temporary password securely.',
      })
    } catch (error) {
      setAddError(messageFrom(error))
    } finally {
      setAddBusy(false)
    }
  }

  const openProfile = async (id: string) => {
    setActionId(id)
    try {
      const profile = await ownerApi.getAstrologer(id)
      setSelected(profile)
      setEditName(profile.displayName)
      setEditEmail(profile.email)
      setProfileError('')
    } catch (error) {
      setToast({ kind: 'error', message: messageFrom(error) })
    } finally {
      setActionId(null)
    }
  }

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setProfileBusy(true)
    setProfileError('')

    try {
      const updated = await ownerApi.updateAstrologer(selected.id, {
        displayName: editName,
        email: editEmail,
      })
      replaceAstrologer(updated)
      setToast({ kind: 'success', message: 'Astrologer details saved.' })
    } catch (error) {
      setProfileError(messageFrom(error))
    } finally {
      setProfileBusy(false)
    }
  }

  const changeListing = async (astrologer: AstrologerProfile) => {
    setActionId(astrologer.id)
    try {
      const updated = await ownerApi.setListed(astrologer.id, !astrologer.isListed)
      replaceAstrologer(updated)
      setToast({
        kind: 'success',
        message: updated.isListed ? 'Astrologer shown on Home.' : 'Astrologer hidden from Home.',
      })
    } catch (error) {
      setToast({ kind: 'error', message: messageFrom(error) })
    } finally {
      setActionId(null)
    }
  }

  const changeActive = async (astrologer: AstrologerProfile) => {
    setActionId(astrologer.id)
    try {
      const updated = await ownerApi.setActive(astrologer.id, !astrologer.isActive)
      replaceAstrologer(updated)
      setToast({
        kind: 'success',
        message: updated.isActive ? 'Astrologer account reactivated.' : 'Astrologer account deactivated.',
      })
    } catch (error) {
      setToast({ kind: 'error', message: messageFrom(error) })
    } finally {
      setActionId(null)
    }
  }

  const removePhoto = async () => {
    if (!selected) return
    setProfileBusy(true)
    setProfileError('')
    try {
      await ownerApi.removePhoto(selected.id)
      const updated = { ...selected, photoUrl: null }
      setSelected(updated)
      replaceAstrologer(updated)
      setToast({ kind: 'success', message: 'Profile photo removed.' })
    } catch (error) { setProfileError(messageFrom(error)) }
    finally { setProfileBusy(false) }
  }

  const handleReset = async (event: FormEvent) => {
    event.preventDefault()
    if (!resetTarget) return
    setResetError('')

    if (resetPassword.length < 10) {
      setResetError('The temporary password must be at least 10 characters.')
      return
    }

    setResetBusy(true)
    try {
      await ownerApi.resetPassword(resetTarget.id, resetPassword)
      replaceAstrologer({ ...resetTarget, mustChangePassword: true })
      setResetTarget(null)
      setResetPassword('')
      setToast({
        kind: 'success',
        message: 'Temporary password reset. Share it securely.',
      })
    } catch (error) {
      setResetError(messageFrom(error))
    } finally {
      setResetBusy(false)
    }
  }

  const handleSettingsSave = async (event: FormEvent) => {
    event.preventDefault()
    setSettingsError('')
    setSettingsFieldErrors({})

    const normalPricePaise = rupeesToPaise(settingsForm.normalPriceRupees)
    const urgentPricePaise = rupeesToPaise(settingsForm.urgentPriceRupees)
    const subscriptionPricePaise = rupeesToPaise(settingsForm.subscriptionPriceRupees)
    const subscriptionCallsPerPack = Number(settingsForm.subscriptionCallsPerPack)
    const normalDurationMin = asDuration(settingsForm.normalDurationMin)
    const urgentDurationMin = asDuration(settingsForm.urgentDurationMin)
    const subscriptionDurationMin = asDuration(settingsForm.subscriptionDurationMin)

    const fieldErrors: SettingsFieldErrors = {}

    if (normalPricePaise === null) {
      fieldErrors.normalPriceRupees = 'Enter a valid normal call price in rupees.'
    }
    if (urgentPricePaise === null) {
      fieldErrors.urgentPriceRupees = 'Enter a valid urgent call price in rupees.'
    }
    if (subscriptionPricePaise === null) {
      fieldErrors.subscriptionPriceRupees = 'Enter a valid subscription pack price in rupees.'
    }
    if (!Number.isInteger(subscriptionCallsPerPack) || subscriptionCallsPerPack < 1) {
      fieldErrors.subscriptionCallsPerPack = 'Enter a whole number of calls, at least 1.'
    }
    if (!normalDurationMin) {
      fieldErrors.normalDurationMin = 'Choose 10, 15 or 30 minutes for a normal call.'
    }
    if (!urgentDurationMin) {
      fieldErrors.urgentDurationMin = 'Choose 10, 15 or 30 minutes for an urgent call.'
    }
    if (!subscriptionDurationMin) {
      fieldErrors.subscriptionDurationMin = 'Choose 10, 15 or 30 minutes for a subscription call.'
    }

    if (
      Object.keys(fieldErrors).length > 0 ||
      normalPricePaise === null ||
      urgentPricePaise === null ||
      subscriptionPricePaise === null ||
      !Number.isInteger(subscriptionCallsPerPack) ||
      subscriptionCallsPerPack < 1 ||
      !normalDurationMin ||
      !urgentDurationMin ||
      !subscriptionDurationMin
    ) {
      setSettingsFieldErrors(fieldErrors)
      return
    }

    setSettingsBusy(true)
    try {
      const saved = await ownerApi.updateSettings({
        normalPricePaise,
        urgentPricePaise,
        subscriptionPricePaise,
        subscriptionCallsPerPack,
        normalDurationMin,
        urgentDurationMin,
        subscriptionDurationMin,
      })
      setSettingsForm(settingsToForm(saved))
      setToast({ kind: 'success', message: 'Pricing and call settings saved.' })
    } catch (error) {
      setSettingsError(messageFrom(error))
    } finally {
      setSettingsBusy(false)
    }
  }

  if (authState === 'checking') {
    return (
      <main className="standalone-page screen" aria-busy="true">
        <Card className="owner-login-card">
          <AppBrand large />
          <Skeleton variant="title" />
          <Skeleton />
          <Skeleton />
        </Card>
      </main>
    )
  }

  if (authState === 'logged-out') {
    return (
      <main className="standalone-page screen">
        <Card className="owner-login-card">
          <AppBrand large />
          <h1>Owner login</h1>
          <p className="screen__intro">Sign in to manage astrologers and call settings.</p>
          <form className="stack" onSubmit={handleLogin}>
            <label className="field">
              <span className="field__label">Email</span>
              <input
                autoComplete="username"
                className="input"
                onChange={(event) => setLoginEmail(event.target.value)}
                required
                type="email"
                value={loginEmail}
              />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input
                autoComplete="current-password"
                className="input"
                onChange={(event) => setLoginPassword(event.target.value)}
                required
                type="password"
                value={loginPassword}
              />
            </label>
            {loginError ? <p className="field__error" role="alert">{loginError}</p> : null}
            <Button disabled={loginBusy} type="submit">
              {loginBusy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className="owner-page screen">
      <AppBar actions={<Button onClick={handleLogout} variant="secondary">Log out</Button>} panelLabel="Owner panel" />
      <h1 className="visually-hidden">Owner panel</h1>

      <nav aria-label="Owner sections" className="owner-section-nav">
        <button
          aria-pressed={section === 'astrologers'}
          className="chip"
          onClick={() => setSection('astrologers')}
          type="button"
        >
          Astrologers
        </button>
        <button
          aria-pressed={section === 'settings'}
          className="chip"
          onClick={() => setSection('settings')}
          type="button"
        >
          Pricing &amp; call settings
        </button>
        <button
          aria-pressed={section === 'comments'}
          className="chip"
          onClick={() => setSection('comments')}
          type="button"
        >
          Recent comments
        </button>
      </nav>

      {pageError ? (
        <Card>
          <p className="field__error" role="alert">{pageError}</p>
          <Button onClick={() => void loadData()} variant="secondary">Try again</Button>
        </Card>
      ) : null}

      {!pageError && section === 'astrologers' ? (
        <section aria-labelledby="astrologers-heading" className="owner-section">
          <div className="owner-section__heading">
            <div>
              <h2 id="astrologers-heading">Astrologers</h2>
              <p className="screen__intro">Manage accounts and whether each astrologer appears on Home.</p>
            </div>
            <Button onClick={openAddDialog}>Add astrologer</Button>
          </div>

          {loadingData ? (
            <div className="owner-card-grid" aria-busy="true">
              <Card><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>
              <Card><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>
            </div>
          ) : astrologers.length === 0 ? (
            <Card>
              <h3>No astrologers yet</h3>
              <p>Add the first astrologer when you have their name, email and temporary password.</p>
            </Card>
          ) : (
            <div className="owner-card-grid">
              {astrologers.map((astrologer) => (
                <Card key={astrologer.id}>
                  <div className="owner-profile-summary">
                    <Avatar id={astrologer.id} name={astrologer.displayName} size={56} src={astrologer.photoUrl} />
                    <div>
                      <h3>{astrologer.displayName}</h3>
                      <p className="owner-muted">{astrologer.email}</p>
                    </div>
                  </div>
                  <div className="owner-status-row">
                    <span className={`owner-status owner-status--${astrologer.isActive ? 'success' : 'danger'}`}>
                      {astrologer.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="owner-status">
                      {astrologer.isListed ? 'Shown on Home' : 'Hidden from Home'}
                    </span>
                    {astrologer.mustChangePassword ? (
                      <span className="owner-status">Password change needed</span>
                    ) : null}
                  </div>
                  <div className="owner-actions">
                    <Button
                      disabled={actionId === astrologer.id}
                      onClick={() => void openProfile(astrologer.id)}
                      variant="secondary"
                    >
                      View and edit
                    </Button>
                    <Button
                      disabled={actionId === astrologer.id || !astrologer.isActive}
                      onClick={() => void changeListing(astrologer)}
                      variant="text"
                    >
                      {astrologer.isListed ? 'Hide from Home' : 'Show on Home'}
                    </Button>
                    <Button
                      disabled={actionId === astrologer.id}
                      onClick={() => void changeActive(astrologer)}
                      variant="text"
                    >
                      {astrologer.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                    <Button
                      onClick={() => {
                        setResetTarget(astrologer)
                        setResetPassword('')
                        setResetError('')
                      }}
                      variant="text"
                    >
                      Reset password
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : !pageError && section === 'settings' ? (
        <section aria-labelledby="settings-heading" className="owner-section">
          <div className="owner-section__heading">
            <div>
              <h2 id="settings-heading">Pricing &amp; call settings</h2>
              <p className="screen__intro">Changes apply to new bookings only.</p>
            </div>
          </div>
          {loadingData ? (
            <Card aria-busy="true">
              <Skeleton variant="title" />
              <Skeleton />
              <Skeleton />
            </Card>
          ) : (
          <Card>
            <form className="owner-settings-form" noValidate onSubmit={handleSettingsSave}>
              <div className="owner-form-grid">
                <label className="field">
                  <span className="field__label">Normal call price</span>
                  <span className="owner-money-input">
                    <span aria-hidden="true">₹</span>
                    <input
                      aria-describedby={settingsFieldErrors.normalPriceRupees ? 'normal-price-error' : undefined}
                      aria-invalid={Boolean(settingsFieldErrors.normalPriceRupees)}
                      className="input"
                      inputMode="decimal"
                      onChange={(event) => setSettingsForm((current) => ({ ...current, normalPriceRupees: event.target.value }))}
                      value={settingsForm.normalPriceRupees}
                    />
                  </span>
                  {settingsFieldErrors.normalPriceRupees ? <span className="field__error" id="normal-price-error" role="alert">{settingsFieldErrors.normalPriceRupees}</span> : null}
                </label>
                <label className="field">
                  <span className="field__label">Urgent call price</span>
                  <span className="owner-money-input">
                    <span aria-hidden="true">₹</span>
                    <input
                      aria-describedby={settingsFieldErrors.urgentPriceRupees ? 'urgent-price-error' : undefined}
                      aria-invalid={Boolean(settingsFieldErrors.urgentPriceRupees)}
                      className="input"
                      inputMode="decimal"
                      onChange={(event) => setSettingsForm((current) => ({ ...current, urgentPriceRupees: event.target.value }))}
                      value={settingsForm.urgentPriceRupees}
                    />
                  </span>
                  {settingsFieldErrors.urgentPriceRupees ? <span className="field__error" id="urgent-price-error" role="alert">{settingsFieldErrors.urgentPriceRupees}</span> : null}
                </label>
                <label className="field">
                  <span className="field__label">Subscription pack price</span>
                  <span className="owner-money-input">
                    <span aria-hidden="true">₹</span>
                    <input
                      aria-describedby={settingsFieldErrors.subscriptionPriceRupees ? 'subscription-price-error' : undefined}
                      aria-invalid={Boolean(settingsFieldErrors.subscriptionPriceRupees)}
                      className="input"
                      inputMode="decimal"
                      onChange={(event) => setSettingsForm((current) => ({ ...current, subscriptionPriceRupees: event.target.value }))}
                      value={settingsForm.subscriptionPriceRupees}
                    />
                  </span>
                  {settingsFieldErrors.subscriptionPriceRupees ? <span className="field__error" id="subscription-price-error" role="alert">{settingsFieldErrors.subscriptionPriceRupees}</span> : null}
                </label>
                <label className="field">
                  <span className="field__label">Calls in one subscription pack</span>
                  <input
                    aria-describedby={settingsFieldErrors.subscriptionCallsPerPack ? 'subscription-calls-error' : undefined}
                    aria-invalid={Boolean(settingsFieldErrors.subscriptionCallsPerPack)}
                    className="input"
                    min="1"
                    onChange={(event) => setSettingsForm((current) => ({ ...current, subscriptionCallsPerPack: event.target.value }))}
                    type="number"
                    value={settingsForm.subscriptionCallsPerPack}
                  />
                  {settingsFieldErrors.subscriptionCallsPerPack ? <span className="field__error" id="subscription-calls-error" role="alert">{settingsFieldErrors.subscriptionCallsPerPack}</span> : null}
                </label>
              </div>
              <fieldset className="owner-fieldset">
                <legend>Call durations</legend>
                <div className="owner-form-grid">
                  {(['normal', 'urgent', 'subscription'] as const).map((callType) => {
                    const field = `${callType}DurationMin` as const
                    const label = callType === 'subscription' ? 'Subscription call' : `${callType[0].toUpperCase()}${callType.slice(1)} call`
                    const errorId = `${callType}-duration-error`
                    return (
                      <label className="field" key={callType}>
                        <span className="field__label">{label}</span>
                        <select
                          aria-describedby={settingsFieldErrors[field] ? errorId : undefined}
                          aria-invalid={Boolean(settingsFieldErrors[field])}
                          className="select"
                          onChange={(event) => setSettingsForm((current) => ({ ...current, [field]: event.target.value }))}
                          value={settingsForm[field]}
                        >
                          <option value="10">10 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                        </select>
                        {settingsFieldErrors[field] ? <span className="field__error" id={errorId} role="alert">{settingsFieldErrors[field]}</span> : null}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              {settingsError ? <p className="field__error" role="alert">{settingsError}</p> : null}
              <Button disabled={settingsBusy} type="submit">
                {settingsBusy ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </Card>
          )}
        </section>
      ) : !pageError ? (
        <section aria-labelledby="comments-heading" className="owner-section">
          <div className="owner-section__heading"><div><h2 id="comments-heading">Recent comments</h2><p className="screen__intro">Review the latest comments across published posts.</p></div></div>
          <OwnerRecentComments onSignedOut={handleSessionEnded} />
        </section>
      ) : null}

      <Dialog onClose={closeAddDialog} open={addOpen} title="Add astrologer">
        <form className="stack" onSubmit={handleAdd}>
          <label className="field"><span className="field__label">Name</span><input autoComplete="name" className="input" maxLength={80} onChange={(event) => setAddName(event.target.value)} required value={addName} /></label>
          <label className="field"><span className="field__label">Email</span><input autoComplete="email" className="input" maxLength={254} onChange={(event) => setAddEmail(event.target.value)} required type="email" value={addEmail} /></label>
          <label className="field"><span className="field__label">Temporary password</span><input autoComplete="new-password" className="input" minLength={10} onChange={(event) => setAddPassword(event.target.value)} required type="password" value={addPassword} /><span className="field__hint">At least 10 characters. Share it securely.</span></label>
          {addError ? <p className="field__error" role="alert">{addError}</p> : null}
          <Button disabled={addBusy} type="submit">{addBusy ? 'Adding…' : 'Add astrologer'}</Button>
        </form>
      </Dialog>

      <Dialog onClose={() => setSelected(null)} open={Boolean(selected)} title="Astrologer profile">
        {selected ? (
          <div className="stack">
            <div className="owner-profile-summary"><Avatar id={selected.id} name={selected.displayName} size={56} src={selected.photoUrl} /><div><h3>{selected.displayName}</h3><p className="owner-muted">Created {formatCreatedAt(selected.createdAt)}</p></div></div>
            {selected.photoUrl ? <Button disabled={profileBusy} onClick={() => void removePhoto()} variant="secondary">Remove photo</Button> : null}
            <dl className="owner-detail-list">
              <div><dt>Expertise</dt><dd>{selected.expertise.length ? selected.expertise.join(', ') : 'Not added yet'}</dd></div>
              <div><dt>Languages</dt><dd>{selected.languages.length ? selected.languages.join(', ') : 'Not added yet'}</dd></div>
              <div><dt>Experience</dt><dd>{selected.experienceYears} years</dd></div>
              <div><dt>Profile saved</dt><dd>{selected.profileSavedAt ? formatCreatedAt(selected.profileSavedAt) : 'Not saved yet'}</dd></div>
              <div><dt>Account</dt><dd>{selected.isActive ? 'Active' : 'Inactive'}</dd></div>
              <div><dt>Home</dt><dd>{selected.isListed ? 'Shown' : 'Hidden'}</dd></div>
            </dl>
            <form className="stack" onSubmit={handleProfileSave}>
              <label className="field"><span className="field__label">Name</span><input className="input" maxLength={80} onChange={(event) => setEditName(event.target.value)} required value={editName} /></label>
              <label className="field"><span className="field__label">Email</span><input className="input" maxLength={254} onChange={(event) => setEditEmail(event.target.value)} required type="email" value={editEmail} /></label>
              {profileError ? <p className="field__error" role="alert">{profileError}</p> : null}
              <Button disabled={profileBusy} type="submit">{profileBusy ? 'Saving…' : 'Save details'}</Button>
            </form>
          </div>
        ) : null}
      </Dialog>

      <Dialog onClose={() => setResetTarget(null)} open={Boolean(resetTarget)} title="Reset password">
        <form className="stack" onSubmit={handleReset}>
          <p>Set a new temporary password for {resetTarget?.displayName}. They will have to replace it after login.</p>
          <label className="field"><span className="field__label">New temporary password</span><input autoComplete="new-password" className="input" minLength={10} onChange={(event) => setResetPassword(event.target.value)} required type="password" value={resetPassword} /><span className="field__hint">At least 10 characters.</span></label>
          {resetError ? <p className="field__error" role="alert">{resetError}</p> : null}
          <Button disabled={resetBusy} type="submit">{resetBusy ? 'Resetting…' : 'Reset password'}</Button>
        </form>
      </Dialog>

      <Toast kind={toast?.kind} message={toast?.message ?? ''} onDismiss={() => setToast(null)} open={Boolean(toast)} />
    </main>
  )
}
