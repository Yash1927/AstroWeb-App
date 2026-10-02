import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { UserDetailsInput } from '../api/user'
import {
  validateUserDetails,
  localTodayText,
  type UserDetailsDraft,
  type UserDetailsFieldErrors,
} from '../user-details'
import { Button } from './Button'
import { PhoneNumberField } from './PhoneNumberField'

function formatTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return ''
  const [hoursText, minutes] = value.split(':')
  const hours = Number(hoursText)
  const period = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${minutes} ${period}`
}

type UserDetailsFormProps = {
  busy?: boolean
  initial: UserDetailsDraft
  onSubmit: (details: UserDetailsInput) => Promise<void> | void
  onFieldChange?: (field: keyof UserDetailsDraft) => void
  serverError?: string
  serverFieldErrors?: UserDetailsFieldErrors
  submitLabel?: string
}

export function UserDetailsForm({
  busy = false,
  initial,
  onSubmit,
  onFieldChange,
  serverError = '',
  serverFieldErrors = {},
  submitLabel = 'Save details',
}: UserDetailsFormProps) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<UserDetailsFieldErrors>({})
  const formId = useId()

  const update = (field: keyof UserDetailsDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    onFieldChange?.(field)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateUserDetails(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !draft.gender) return

    void onSubmit({
      name: draft.name.trim(),
      birthDate: draft.birthDate,
      birthTime: draft.birthTime,
      birthPlace: draft.birthPlace.trim(),
      phone: draft.phone || null,
      gender: draft.gender,
    })
  }

  return (
    <form className="user-details-form" noValidate onSubmit={submit}>
      <label className="field">
        <span className="field__label">Name</span>
        <input
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          aria-invalid={Boolean(errors.name)}
          className="input"
          maxLength={60}
          onChange={(event) => update('name', event.target.value)}
          value={draft.name}
        />
        {errors.name ? <span className="field__error" id={`${formId}-name-error`}>{errors.name}</span> : null}
      </label>

      <label className="field">
        <span className="field__label">Date of birth</span>
        <input
          aria-describedby={errors.birthDate ? `${formId}-birth-date-error` : undefined}
          aria-invalid={Boolean(errors.birthDate)}
          className="input"
          max={localTodayText()}
          onChange={(event) => update('birthDate', event.target.value)}
          type="date"
          value={draft.birthDate}
        />
        {errors.birthDate ? <span className="field__error" id={`${formId}-birth-date-error`}>{errors.birthDate}</span> : null}
      </label>

      <label className="field">
        <span className="field__label">Time of birth</span>
        <input
          aria-describedby={errors.birthTime ? `${formId}-birth-time-error` : undefined}
          aria-invalid={Boolean(errors.birthTime)}
          className="input"
          onChange={(event) => update('birthTime', event.target.value)}
          type="time"
          value={draft.birthTime}
        />
        {draft.birthTime && !errors.birthTime ? (
          <span className="field__hint">{formatTime(draft.birthTime)}</span>
        ) : null}
        {errors.birthTime ? <span className="field__error" id={`${formId}-birth-time-error`}>{errors.birthTime}</span> : null}
      </label>

      <label className="field">
        <span className="field__label">Place of birth</span>
        <input
          aria-describedby={errors.birthPlace ? `${formId}-birth-place-error` : undefined}
          aria-invalid={Boolean(errors.birthPlace)}
          className="input"
          maxLength={100}
          onChange={(event) => update('birthPlace', event.target.value)}
          placeholder="City, state or country"
          value={draft.birthPlace}
        />
        {errors.birthPlace ? <span className="field__error" id={`${formId}-birth-place-error`}>{errors.birthPlace}</span> : null}
      </label>

      <PhoneNumberField
        error={errors.phone ?? serverFieldErrors.phone}
        errorId={`${formId}-phone-error`}
        hint="Optional for Normal calls"
        onChange={(value) => update('phone', value)}
        value={draft.phone}
      />

      <label className="field">
        <span className="field__label">Gender</span>
        <select
          aria-describedby={errors.gender ? `${formId}-gender-error` : undefined}
          aria-invalid={Boolean(errors.gender)}
          className="select"
          onChange={(event) => update('gender', event.target.value)}
          value={draft.gender}
        >
          <option value="">Choose gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {errors.gender ? <span className="field__error" id={`${formId}-gender-error`}>{errors.gender}</span> : null}
      </label>

      <p className="privacy-note">
        Your details are private. Only the astrologer you book can see them.{' '}
        <Link to="/privacy">Privacy Policy</Link>
      </p>
      {serverError ? <p className="field__error" role="alert">{serverError}</p> : null}
      <Button disabled={busy} type="submit">
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}

