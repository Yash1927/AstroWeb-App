import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  publicApi,
  type AvailableSlot,
  type CallType,
  type PublicSettings,
  type SlotResult,
} from '../api/public'
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
  PhoneNumberField,
  Skeleton,
  Toast,
  UserDetailsForm,
  UserSignIn,
  type AstrologerCardProfile,
} from '../components'
import { detailsDraftFrom } from '../user-details'

type FlowStep = 'options' | 'checking' | 'sign-in' | 'details' | 'phone' | 'slots' | 'selected' | 'error'

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

function formatDateChip(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatTimeInIst(startsAt: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(startsAt))
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
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
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

  const loadSlots = useCallback(async (astrologerId: string, callType: CallType) => {
    setFlowStep('slots')
    setSlotsLoading(true)
    setSlotResult(null)
    setSelectedSlot(null)
    setFlowError('')
    try {
      const result = await publicApi.getSlots(astrologerId, callType)
      setSlotResult(result)
      setSelectedDate(
        result.days.find((day) => day.slots.length > 0)?.date
          ?? result.days[0]?.date
          ?? '',
      )
    } catch (error) {
      setFlowError(messageFrom(error))
      setFlowStep('error')
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  const continueForUser = useCallback((
    user: UserDetails,
    callType: CallType,
    astrologerId: string,
  ) => {
    setBookingUser(user)
    setPhone(user.phone ?? '')
    setFlowError('')

    if (!user.detailsComplete) {
      setFlowStep('details')
    } else if (needsPhone(callType) && !user.phone) {
      setFlowStep('phone')
    } else {
      void loadSlots(astrologerId, callType)
    }
  }, [loadSlots])

  const checkUser = useCallback(async (callType: CallType, astrologerId: string) => {
    setFlowStep('checking')
    setFlowError('')
    try {
      continueForUser(await userApi.getMe(), callType, astrologerId)
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
      void checkUser(callType, astrologer.id)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [astrologers, checkUser])

  const openCallOptions = (astrologer: AstrologerCardProfile) => {
    setSelectedAstrologer(astrologer)
    setChosenCallType(null)
    setBookingUser(null)
    setFlowError('')
    setPhoneError('')
    setSlotResult(null)
    setSelectedDate('')
    setSelectedSlot(null)
    setFlowStep('options')
  }

  const closeFlow = () => {
    setSelectedAstrologer(null)
    setChosenCallType(null)
    setBookingUser(null)
    setFlowError('')
    setPhoneError('')
    setSlotResult(null)
    setSelectedDate('')
    setSelectedSlot(null)
    setFlowStep('options')
  }

  const chooseCallType = (callType: CallType) => {
    if (!selectedAstrologer) return
    setChosenCallType(callType)
    void checkUser(callType, selectedAstrologer.id)
  }

  const saveDetails = async (details: UserDetailsInput) => {
    if (!chosenCallType || !selectedAstrologer) return
    setSavingDetails(true)
    setFlowError('')
    try {
      continueForUser(
        await userApi.updateMe(details),
        chosenCallType,
        selectedAstrologer.id,
      )
    } catch (error) {
      setFlowError(messageFrom(error))
    } finally {
      setSavingDetails(false)
    }
  }

  const savePhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit mobile number.')
      return
    }

    if (!bookingUser || !chosenCallType || !selectedAstrologer) return
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
      void loadSlots(selectedAstrologer.id, chosenCallType)
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
  const selectedDay = slotResult?.days.find((day) => day.date === selectedDate) ?? null

  const sheetTitle = flowStep === 'options' && selectedAstrologer
    ? `Call ${selectedAstrologer.displayName}`
    : flowStep === 'details'
      ? 'Your details'
      : flowStep === 'phone'
        ? 'Phone number'
        : flowStep === 'slots'
          ? 'Choose a time'
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
            <PhoneNumberField
              error={phoneError}
              errorId="booking-phone-error"
              onChange={(value) => {
                setPhone(value)
                setPhoneError('')
              }}
              value={phone}
            />
            {flowError ? <p className="field__error" role="alert">{flowError}</p> : null}
            <Button disabled={savingDetails} type="submit">
              {savingDetails ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        ) : flowStep === 'slots' ? (
          slotsLoading || !slotResult ? (
            <div aria-busy="true" className="stack">
              <Skeleton label="Loading dates" variant="title" />
              <Skeleton label="Loading times" />
              <Skeleton label="Loading times" />
            </div>
          ) : (
            <div className="slot-picker">
              <div>
                <h3>Choose a date</h3>
                <div aria-label="Available dates" className="date-chip-list">
                  {slotResult.days.map((day) => (
                    <button
                      aria-pressed={selectedDate === day.date}
                      className="date-chip"
                      disabled={day.slots.length === 0}
                      key={day.date}
                      onClick={() => {
                        setSelectedDate(day.date)
                        setSelectedSlot(null)
                      }}
                      type="button"
                    >
                      {formatDateChip(day.date)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3>Choose a time</h3>
                {!selectedDay || selectedDay.slots.length === 0 ? (
                  <p>No free times on this day. Please try another day.</p>
                ) : (
                  <div aria-label="Available times" className="time-chip-list">
                    {selectedDay.slots.map((slot) => (
                      <button
                        aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                        className="time-chip"
                        key={slot.startsAt}
                        onClick={() => {
                          setSelectedSlot(slot)
                          setFlowStep('selected')
                        }}
                        type="button"
                      >
                        {formatTimeInIst(slot.startsAt)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        ) : flowStep === 'selected' ? (
          <Card compact>
            <p>Confirming comes in the next step</p>
          </Card>
        ) : flowStep === 'error' && chosenCallType ? (
          <div className="stack">
            <p className="field__error" role="alert">{flowError}</p>
            <Button
              onClick={() => selectedAstrologer
                && void checkUser(chosenCallType, selectedAstrologer.id)}
              variant="secondary"
            >
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
