import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { publicApi, type PublicSettings } from '../api/public'
import {
  userApi,
  UserApiError,
  type UserDetails,
  type UserDetailsInput,
} from '../api/user'
import {
  AstrologerCard,
  BottomSheet,
  Button,
  Card,
  Skeleton,
  Toast,
  UserDetailsForm,
  UserSignIn,
  type AstrologerCardProfile,
} from '../components'
import { detailsDraftFrom } from '../user-details'

type CallType = 'normal' | 'urgent' | 'subscription'
type FlowStep = 'options' | 'checking' | 'sign-in' | 'details' | 'phone' | 'ready' | 'error'

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatRupees(paise: number) {
  const hasPaise = paise % 100 !== 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100)
}

function AstrologerCardSkeleton() {
  return (
    <Card className="home-card-skeleton">
      <div className="astrologer-card__header">
        <Skeleton label="Loading astrologer" variant="avatar" />
        <div className="home-card-skeleton__heading">
          <Skeleton label="Loading astrologer" variant="title" />
          <Skeleton label="Loading astrologer" />
        </div>
      </div>
      <Skeleton label="Loading astrologer" />
      <Skeleton label="Loading astrologer" />
      <span aria-hidden="true" className="home-card-skeleton__button" />
    </Card>
  )
}

type CallOption = {
  callType: CallType
  description: string
  label: string
  summary: string
}

function optionsFrom(settings: PublicSettings): CallOption[] {
  return [
    {
      callType: 'normal',
      label: 'Normal',
      summary: `${settings.normalPricePaise === 0 ? 'Free' : formatRupees(settings.normalPricePaise)} · ${settings.normalDurationMin} min`,
      description: 'Talk inside the app',
    },
    {
      callType: 'urgent',
      label: 'Urgent',
      summary: `${formatRupees(settings.urgentPricePaise)} · ${settings.urgentDurationMin} min`,
      description: 'The astrologer calls your phone',
    },
    {
      callType: 'subscription',
      label: 'Subscription',
      summary: `${formatRupees(settings.subscriptionPricePaise)} for ${settings.subscriptionCallsPerPack} calls · ${settings.subscriptionDurationMin} min each`,
      description: 'The astrologer calls your phone',
    },
  ]
}

function isCallType(value: string | null): value is CallType {
  return value === 'normal' || value === 'urgent' || value === 'subscription'
}

function needsPhone(callType: CallType) {
  return callType === 'urgent' || callType === 'subscription'
}

function completeDetails(user: UserDetails): UserDetailsInput | null {
  if (!user.birthDate || !user.birthTime || !user.birthPlace || !user.gender) return null
  return {
    name: user.name,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    birthPlace: user.birthPlace,
    phone: user.phone,
    gender: user.gender,
  }
}

function bookingReturnTo(astrologerId: string, callType: CallType) {
  const query = new URLSearchParams({ bookingAstrologer: astrologerId, callType })
  return `/?${query.toString()}`
}

export default function HomePage() {
  const [astrologers, setAstrologers] = useState<AstrologerCardProfile[] | null>(null)
  const [listError, setListError] = useState('')
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState('')
  const [selectedAstrologer, setSelectedAstrologer] = useState<AstrologerCardProfile | null>(null)
  const [chosenCallType, setChosenCallType] = useState<CallType | null>(null)
  const [flowStep, setFlowStep] = useState<FlowStep>('options')
  const [bookingUser, setBookingUser] = useState<UserDetails | null>(null)
  const [flowError, setFlowError] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const restoredFlow = useRef(false)

  const loadAstrologers = useCallback(async () => {
    setAstrologers(null)
    setListError('')

    try {
      setAstrologers(await publicApi.getAstrologers())
    } catch (error) {
      setListError(messageFrom(error))
    }
  }, [])

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    setSettingsError('')

    try {
      setSettings(await publicApi.getSettings())
    } catch (error) {
      setSettings(null)
      setSettingsError(messageFrom(error))
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    void publicApi.getAstrologers()
      .then((loaded) => {
        if (active) setAstrologers(loaded)
      })
      .catch((error: unknown) => {
        if (active) setListError(messageFrom(error))
      })

    void publicApi.getSettings()
      .then((loaded) => {
        if (active) setSettings(loaded)
      })
      .catch((error: unknown) => {
        if (active) setSettingsError(messageFrom(error))
      })
      .finally(() => {
        if (active) setSettingsLoading(false)
      })

    return () => { active = false }
  }, [])

  const continueForUser = useCallback((user: UserDetails, callType: CallType) => {
    setBookingUser(user)
    setPhone(user.phone ?? '')
    setFlowError('')

    if (!user.detailsComplete) {
      setFlowStep('details')
    } else if (needsPhone(callType) && !user.phone) {
      setFlowStep('phone')
    } else {
      setFlowStep('ready')
    }
  }, [])

  const checkUser = useCallback(async (callType: CallType) => {
    setFlowStep('checking')
    setFlowError('')
    try {
      continueForUser(await userApi.getMe(), callType)
    } catch (error) {
      if (error instanceof UserApiError && error.status === 401) {
        setFlowStep('sign-in')
      } else {
        setFlowError(messageFrom(error))
        setFlowStep('error')
      }
    }
  }, [continueForUser])

  useEffect(() => {
    if (restoredFlow.current || astrologers === null) return

    const url = new URL(window.location.href)
    const astrologerId = url.searchParams.get('bookingAstrologer')
    const callType = url.searchParams.get('callType')
    if (!astrologerId || !isCallType(callType)) return

    const timeout = window.setTimeout(() => {
      restoredFlow.current = true
      url.searchParams.delete('bookingAstrologer')
      url.searchParams.delete('callType')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)

      const astrologer = astrologers.find((candidate) => candidate.id === astrologerId)
      if (!astrologer) {
        setToastMessage('That astrologer is no longer available.')
        return
      }

      setSelectedAstrologer(astrologer)
      setChosenCallType(callType)
      void checkUser(callType)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [astrologers, checkUser])

  const openCallOptions = (astrologer: AstrologerCardProfile) => {
    setSelectedAstrologer(astrologer)
    setChosenCallType(null)
    setBookingUser(null)
    setFlowError('')
    setPhoneError('')
    setFlowStep('options')
  }

  const closeFlow = () => {
    setSelectedAstrologer(null)
    setChosenCallType(null)
    setBookingUser(null)
    setFlowError('')
    setPhoneError('')
    setFlowStep('options')
  }

  const chooseCallType = (callType: CallType) => {
    setChosenCallType(callType)
    void checkUser(callType)
  }

  const saveDetails = async (details: UserDetailsInput) => {
    if (!chosenCallType) return
    setSavingDetails(true)
    setFlowError('')
    try {
      continueForUser(await userApi.updateMe(details), chosenCallType)
    } catch (error) {
      setFlowError(messageFrom(error))
    } finally {
      setSavingDetails(false)
    }
  }

  const savePhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter +91 followed by a valid 10-digit mobile number.')
      return
    }

    if (!bookingUser) return
    const details = completeDetails(bookingUser)
    if (!details) {
      setFlowStep('details')
      return
    }

    setSavingDetails(true)
    setPhoneError('')
    setFlowError('')
    try {
      const updated = await userApi.updateMe({ ...details, phone })
      setBookingUser(updated)
      setFlowStep('ready')
    } catch (error) {
      setFlowError(messageFrom(error))
    } finally {
      setSavingDetails(false)
    }
  }

  const detailsDraft = useMemo(
    () => bookingUser ? detailsDraftFrom(bookingUser) : null,
    [bookingUser],
  )

  const sheetTitle = flowStep === 'options' && selectedAstrologer
    ? `Call ${selectedAstrologer.displayName}`
    : flowStep === 'details'
      ? 'Your details'
      : flowStep === 'phone'
        ? 'Phone number'
        : 'Continue booking'

  return (
    <section className="home-screen screen">
      <header className="home-header">
        <h1>AstroWebApp</h1>
      </header>

      {listError ? (
        <Card className="home-state">
          <p className="field__error" role="alert">{listError}</p>
          <Button onClick={() => void loadAstrologers()} variant="secondary">Try again</Button>
        </Card>
      ) : astrologers === null ? (
        <div aria-busy="true" className="home-grid">
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
        </div>
      ) : astrologers.length === 0 ? (
        <Card className="home-state">
          <p>No astrologers are available right now. Please check again later.</p>
        </Card>
      ) : (
        <div className="home-grid">
          {astrologers.map((astrologer) => (
            <div className="home-card-item" key={astrologer.id}>
              <AstrologerCard
                onCall={() => openCallOptions(astrologer)}
                profile={astrologer}
              />
            </div>
          ))}
        </div>
      )}

      <BottomSheet onClose={closeFlow} open={Boolean(selectedAstrologer)} title={sheetTitle}>
        {flowStep === 'options' ? (
          settingsLoading ? (
            <div aria-busy="true" className="stack">
              <Skeleton label="Loading call options" variant="title" />
              <Skeleton label="Loading call options" />
              <Skeleton label="Loading call options" />
            </div>
          ) : settingsError ? (
            <div className="stack">
              <p className="field__error" role="alert">{settingsError}</p>
              <Button onClick={() => void loadSettings()} variant="secondary">Try again</Button>
            </div>
          ) : settings ? (
            <div className="call-option-list">
              {optionsFrom(settings).map((option) => (
                <button
                  className="call-option"
                  key={option.callType}
                  onClick={() => chooseCallType(option.callType)}
                  type="button"
                >
                  <span className="call-option__heading">
                    <strong>{option.label}</strong>
                    <span>{option.summary}</span>
                  </span>
                  <span className="call-option__description">{option.description}</span>
                </button>
              ))}
            </div>
          ) : null
        ) : flowStep === 'checking' ? (
          <div aria-busy="true" className="stack">
            <Skeleton label="Checking your account" variant="title" />
            <Skeleton label="Checking your account" />
          </div>
        ) : flowStep === 'sign-in' && selectedAstrologer && chosenCallType ? (
          <UserSignIn
            description="Sign in to continue with this call."
            returnTo={bookingReturnTo(selectedAstrologer.id, chosenCallType)}
          />
        ) : flowStep === 'details' && detailsDraft ? (
          <UserDetailsForm
            busy={savingDetails}
            initial={detailsDraft}
            onSubmit={saveDetails}
            serverError={flowError}
            submitLabel="Continue"
          />
        ) : flowStep === 'phone' ? (
          <form className="stack" noValidate onSubmit={savePhone}>
            <p>The astrologer will call this number.</p>
            <label className="field">
              <span className="field__label">Phone number</span>
              <input
                aria-describedby={phoneError ? 'booking-phone-error' : undefined}
                aria-invalid={Boolean(phoneError)}
                className="input"
                inputMode="tel"
                maxLength={13}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setPhoneError('')
                }}
                placeholder="+919876543210"
                value={phone}
              />
              {phoneError ? <span className="field__error" id="booking-phone-error">{phoneError}</span> : null}
            </label>
            {flowError ? <p className="field__error" role="alert">{flowError}</p> : null}
            <Button disabled={savingDetails} type="submit">
              {savingDetails ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        ) : flowStep === 'ready' ? (
          <Card compact>
            <p>Choosing a time comes in the next step</p>
          </Card>
        ) : flowStep === 'error' && chosenCallType ? (
          <div className="stack">
            <p className="field__error" role="alert">{flowError}</p>
            <Button onClick={() => void checkUser(chosenCallType)} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <Toast
        kind="error"
        message={toastMessage}
        onDismiss={() => setToastMessage('')}
        open={Boolean(toastMessage)}
      />
    </section>
  )
}
