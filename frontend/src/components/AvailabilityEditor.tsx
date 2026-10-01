import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AstrologerApiError,
  astrologerApi,
  type AvailabilityException,
  type AvailabilityInput,
} from '../api/astrologer'
import { Button } from './Button'
import { Card } from './Card'
import { Skeleton } from './Skeleton'
import { Toast } from './Toast'

const weekdays = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
]

type FieldErrors = Record<string, string>
type ExceptionMode = 'blocked-all' | 'blocked' | 'extra'

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function tomorrowInIst() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(Date.now())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const today = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`)
  today.setUTCDate(today.getUTCDate() + 1)
  return today.toISOString().slice(0, 10)
}

function modeOf(exception: AvailabilityException): ExceptionMode {
  if (exception.kind === 'extra') return 'extra'
  return exception.startTime === null ? 'blocked-all' : 'blocked'
}

function validate(availability: AvailabilityInput) {
  const errors: FieldErrors = {}

  for (const [index, range] of availability.weekly.entries()) {
    if (range.endTime <= range.startTime) {
      errors[`weekly-${index}-end`] = 'End time must be after start time.'
    }
  }
  for (const { value: weekday } of weekdays) {
    const ranges = availability.weekly
      .map((range, index) => ({ range, index }))
      .filter(({ range }) => range.weekday === weekday)
      .sort((left, right) => left.range.startTime.localeCompare(right.range.startTime))
    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1]!
      const current = ranges[index]!
      if (current.range.startTime < previous.range.endTime) {
        errors[`weekly-${current.index}-start`] = 'Hours on the same day cannot overlap.'
      }
    }
  }

  for (const [index, exception] of availability.exceptions.entries()) {
    if (!exception.date) errors[`exception-${index}-date`] = 'Choose a date.'
    if (modeOf(exception) !== 'blocked-all') {
      if (!exception.startTime) errors[`exception-${index}-start`] = 'Choose a start time.'
      if (!exception.endTime || (exception.startTime && exception.endTime <= exception.startTime)) {
        errors[`exception-${index}-end`] = 'End time must be after start time.'
      }
    }
  }

  const dates = new Set(availability.exceptions.map((exception) => exception.date))
  for (const date of dates) {
    const entries = availability.exceptions
      .map((exception, index) => ({ exception, index }))
      .filter(({ exception }) => exception.date === date)
    const wholeDay = entries.find(({ exception }) => modeOf(exception) === 'blocked-all')
    if (wholeDay && entries.length > 1) {
      errors[`exception-${wholeDay.index}-date`] = 'A whole-day block must be the only change on this date.'
      continue
    }
    const timed = entries
      .filter(({ exception }) => exception.startTime && exception.endTime)
      .sort((left, right) => left.exception.startTime!.localeCompare(right.exception.startTime!))
    for (let index = 1; index < timed.length; index += 1) {
      const previous = timed[index - 1]!
      const current = timed[index]!
      if (current.exception.startTime! < previous.exception.endTime!) {
        errors[`exception-${current.index}-start`] = 'Changes on the same date cannot overlap.'
      }
    }
  }

  return errors
}

type AvailabilityEditorProps = {
  onSignedOut: () => void
}

export function AvailabilityEditor({ onSignedOut }: AvailabilityEditorProps) {
  const [availability, setAvailability] = useState<AvailabilityInput | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoadError('')
    setAvailability(null)
    try {
      setAvailability(await astrologerApi.getAvailability())
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        onSignedOut()
      } else {
        setLoadError(messageFrom(error))
      }
    }
  }, [onSignedOut])

  useEffect(() => {
    let active = true
    void astrologerApi.getAvailability()
      .then((loaded) => {
        if (active) setAvailability(loaded)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof AstrologerApiError && error.status === 401) {
          onSignedOut()
        } else {
          setLoadError(messageFrom(error))
        }
      })
    return () => { active = false }
  }, [onSignedOut])

  const setDayOff = (weekday: number, dayOff: boolean) => {
    setAvailability((current) => current && ({
      ...current,
      weekly: dayOff
        ? current.weekly.filter((range) => range.weekday !== weekday)
        : [...current.weekly, { weekday, startTime: '09:00', endTime: '17:00' }],
    }))
    setErrors({})
  }

  const addHours = (weekday: number) => {
    setAvailability((current) => current && ({
      ...current,
      weekly: [...current.weekly, { weekday, startTime: '09:00', endTime: '17:00' }],
    }))
  }

  const updateWeekly = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability((current) => current && ({
      ...current,
      weekly: current.weekly.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, [field]: value } : range,
      ),
    }))
    setErrors((current) => ({ ...current, [`weekly-${index}-${field === 'startTime' ? 'start' : 'end'}`]: '' }))
  }

  const removeWeekly = (index: number) => {
    setAvailability((current) => current && ({
      ...current,
      weekly: current.weekly.filter((_, rangeIndex) => rangeIndex !== index),
    }))
    setErrors({})
  }

  const addException = () => {
    setAvailability((current) => current && ({
      ...current,
      exceptions: [...current.exceptions, {
        date: tomorrowInIst(),
        kind: 'blocked',
        startTime: null,
        endTime: null,
      }],
    }))
  }

  const updateException = (index: number, patch: Partial<AvailabilityException>) => {
    setAvailability((current) => current && ({
      ...current,
      exceptions: current.exceptions.map((exception, exceptionIndex) =>
        exceptionIndex === index ? { ...exception, ...patch } : exception,
      ),
    }))
    setErrors({})
  }

  const changeExceptionMode = (index: number, mode: ExceptionMode) => {
    updateException(index, mode === 'blocked-all'
      ? { kind: 'blocked', startTime: null, endTime: null }
      : { kind: mode, startTime: '09:00', endTime: '17:00' })
  }

  const removeException = (index: number) => {
    setAvailability((current) => current && ({
      ...current,
      exceptions: current.exceptions.filter((_, exceptionIndex) => exceptionIndex !== index),
    }))
    setErrors({})
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!availability) return
    const nextErrors = validate(availability)
    setErrors(nextErrors)
    setSaveError('')
    const firstError = Object.keys(nextErrors).find((key) => nextErrors[key])
    if (firstError) {
      setValidationSummary('Please fix the highlighted hours above.')
      window.setTimeout(() => {
        const field = document.querySelector<HTMLElement>(
          `[data-availability-field="${firstError}"]`,
        )
        field?.focus()
        field?.scrollIntoView?.({ block: 'center' })
      }, 0)
      return
    }
    setValidationSummary('')

    setSaving(true)
    try {
      const saved = await astrologerApi.saveAvailability(availability)
      setAvailability({ weekly: saved.weekly, exceptions: saved.exceptions })
      setToast(saved.displacedBookingCount > 0
        ? `Availability saved. ${saved.displacedBookingCount} existing booking${saved.displacedBookingCount === 1 ? '' : 's'} outside these hours ${saved.displacedBookingCount === 1 ? 'remains' : 'remain'} booked.`
        : 'Availability saved.')
    } catch (error) {
      if (error instanceof AstrologerApiError && error.status === 401) {
        onSignedOut()
      } else {
        setSaveError(messageFrom(error))
      }
    } finally {
      setSaving(false)
    }
  }

  if (!availability) {
    return (
      <Card aria-busy={!loadError} className="stack">
        {loadError ? (
          <>
            <p className="field__error" role="alert">{loadError}</p>
            <Button onClick={() => void load()} variant="secondary">Try again</Button>
          </>
        ) : (
          <><Skeleton variant="title" /><Skeleton /><Skeleton /></>
        )}
      </Card>
    )
  }

  return (
    <form className="availability-form" noValidate onSubmit={save}>
      <Card>
        <h3>Weekly hours</h3>
        <p className="screen__intro">Add one or more working ranges, or mark a day off.</p>
        <div className="availability-week">
          {weekdays.map((day) => {
            const ranges = availability.weekly
              .map((range, index) => ({ range, index }))
              .filter(({ range }) => range.weekday === day.value)
            const dayOff = ranges.length === 0
            return (
              <section className="availability-day" key={day.value}>
                <div className="availability-day__heading">
                  <h4>{day.label}</h4>
                  <label className="availability-day__off">
                    <input
                      checked={dayOff}
                      onChange={(event) => setDayOff(day.value, event.target.checked)}
                      type="checkbox"
                    />
                    <span>Day off</span>
                  </label>
                </div>
                {!dayOff ? ranges.map(({ range, index }) => (
                  <div className="availability-range" key={`${day.value}-${index}`}>
                    <label className="field">
                      <span className="field__label">Start</span>
                      <input
                        aria-describedby={errors[`weekly-${index}-start`] ? `weekly-${index}-start-error` : undefined}
                        aria-invalid={Boolean(errors[`weekly-${index}-start`])}
                        className="input"
                        data-availability-field={`weekly-${index}-start`}
                        onChange={(event) => updateWeekly(index, 'startTime', event.target.value)}
                        type="time"
                        value={range.startTime}
                      />
                      {errors[`weekly-${index}-start`] ? <span className="field__error" id={`weekly-${index}-start-error`}>{errors[`weekly-${index}-start`]}</span> : null}
                    </label>
                    <label className="field">
                      <span className="field__label">End</span>
                      <input
                        aria-describedby={errors[`weekly-${index}-end`] ? `weekly-${index}-end-error` : undefined}
                        aria-invalid={Boolean(errors[`weekly-${index}-end`])}
                        className="input"
                        data-availability-field={`weekly-${index}-end`}
                        onChange={(event) => updateWeekly(index, 'endTime', event.target.value)}
                        type="time"
                        value={range.endTime}
                      />
                      {errors[`weekly-${index}-end`] ? <span className="field__error" id={`weekly-${index}-end-error`}>{errors[`weekly-${index}-end`]}</span> : null}
                    </label>
                    <Button onClick={() => removeWeekly(index)} variant="text">Remove</Button>
                  </div>
                )) : null}
                {!dayOff ? <Button onClick={() => addHours(day.value)} variant="secondary">Add hours</Button> : null}
              </section>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="owner-section__heading">
          <div>
            <h3>Date exceptions</h3>
            <p className="screen__intro">Block a date or range, or add extra hours.</p>
          </div>
          <Button onClick={addException} variant="secondary">Add exception</Button>
        </div>
        {availability.exceptions.length === 0 ? (
          <p className="owner-muted">No date exceptions.</p>
        ) : (
          <div className="availability-exceptions">
            {availability.exceptions.map((exception, index) => {
              const mode = modeOf(exception)
              return (
                <section className="availability-exception" key={`${exception.date}-${index}`}>
                  <label className="field">
                    <span className="field__label">Date</span>
                    <input
                      aria-describedby={errors[`exception-${index}-date`] ? `exception-${index}-date-error` : undefined}
                      aria-invalid={Boolean(errors[`exception-${index}-date`])}
                      className="input"
                      data-availability-field={`exception-${index}-date`}
                      onChange={(event) => updateException(index, { date: event.target.value })}
                      type="date"
                      value={exception.date}
                    />
                    {errors[`exception-${index}-date`] ? <span className="field__error" id={`exception-${index}-date-error`}>{errors[`exception-${index}-date`]}</span> : null}
                  </label>
                  <label className="field">
                    <span className="field__label">Change</span>
                    <select
                      className="select"
                      onChange={(event) => changeExceptionMode(index, event.target.value as ExceptionMode)}
                      value={mode}
                    >
                      <option value="blocked-all">Block whole day</option>
                      <option value="blocked">Block part of day</option>
                      <option value="extra">Add extra hours</option>
                    </select>
                  </label>
                  {mode !== 'blocked-all' ? (
                    <>
                      <label className="field">
                        <span className="field__label">Start</span>
                        <input
                          aria-describedby={errors[`exception-${index}-start`] ? `exception-${index}-start-error` : undefined}
                          aria-invalid={Boolean(errors[`exception-${index}-start`])}
                          className="input"
                          data-availability-field={`exception-${index}-start`}
                          onChange={(event) => updateException(index, { startTime: event.target.value })}
                          type="time"
                          value={exception.startTime ?? ''}
                        />
                        {errors[`exception-${index}-start`] ? <span className="field__error" id={`exception-${index}-start-error`}>{errors[`exception-${index}-start`]}</span> : null}
                      </label>
                      <label className="field">
                        <span className="field__label">End</span>
                        <input
                          aria-describedby={errors[`exception-${index}-end`] ? `exception-${index}-end-error` : undefined}
                          aria-invalid={Boolean(errors[`exception-${index}-end`])}
                          className="input"
                          data-availability-field={`exception-${index}-end`}
                          onChange={(event) => updateException(index, { endTime: event.target.value })}
                          type="time"
                          value={exception.endTime ?? ''}
                        />
                        {errors[`exception-${index}-end`] ? <span className="field__error" id={`exception-${index}-end-error`}>{errors[`exception-${index}-end`]}</span> : null}
                      </label>
                    </>
                  ) : null}
                  <Button onClick={() => removeException(index)} variant="text">Remove</Button>
                </section>
              )
            })}
          </div>
        )}
      </Card>

      <p className="screen__intro">Changes affect future free times only. Existing bookings stay booked.</p>
      {saveError ? <p className="field__error" role="alert">{saveError}</p> : null}
      <div className="availability-actions">
        <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save availability'}</Button>
        {validationSummary ? <p className="field__error" role="alert">{validationSummary}</p> : null}
      </div>
      <Toast message={toast} onDismiss={() => setToast('')} open={Boolean(toast)} />
    </form>
  )
}
