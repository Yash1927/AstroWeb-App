import { useId, type ReactNode } from 'react'
import { formatIndianPhoneInput, indianPhoneDigits } from '../user-details'

type PhoneNumberFieldProps = {
  error?: string
  errorId: string
  hint?: ReactNode
  onChange: (value: string) => void
  value: string
}

export function PhoneNumberField({
  error,
  errorId,
  hint,
  onChange,
  value,
}: PhoneNumberFieldProps) {
  const inputId = useId()

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        Phone number
      </label>
      {hint ? <span className="field__hint" id={`${inputId}-hint`}>{hint}</span> : null}
      <span className="phone-input" data-invalid={error ? 'true' : undefined}>
        <span aria-hidden="true" className="phone-input__prefix">+91</span>
        <input
          aria-describedby={[
            hint ? `${inputId}-hint` : '',
            error ? errorId : '',
          ].filter(Boolean).join(' ') || undefined}
          aria-invalid={Boolean(error)}
          className="phone-input__control"
          id={inputId}
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => onChange(formatIndianPhoneInput(event.target.value))}
          placeholder="10-digit mobile number"
          type="tel"
          value={indianPhoneDigits(value)}
        />
      </span>
      {error ? <span className="field__error" id={errorId}>{error}</span> : null}
    </div>
  )
}
