import type { Gender, UserDetails } from './api/user'

export type UserDetailsDraft = {
  birthDate: string
  birthPlace: string
  birthTime: string
  gender: Gender | ''
  name: string
  phone: string
}

export type UserDetailsFieldErrors = Partial<Record<keyof UserDetailsDraft, string>>

export function localTodayText() {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function isRealLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
}

export function detailsDraftFrom(user: UserDetails): UserDetailsDraft {
  return {
    name: user.name,
    birthDate: user.birthDate ?? '',
    birthTime: user.birthTime ?? '',
    birthPlace: user.birthPlace ?? '',
    phone: user.phone ?? '',
    gender: user.gender ?? '',
  }
}

export function validateUserDetails(draft: UserDetailsDraft): UserDetailsFieldErrors {
  const errors: UserDetailsFieldErrors = {}
  const name = draft.name.trim()
  const place = draft.birthPlace.trim()
  const todayText = localTodayText()

  if (name.length < 2 || name.length > 60) {
    errors.name = 'Enter a name between 2 and 60 characters.'
  }
  if (!isRealLocalDate(draft.birthDate) || draft.birthDate > todayText) {
    errors.birthDate = 'Enter a date of birth that is not in the future.'
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.birthTime)) {
    errors.birthTime = 'Enter your time of birth.'
  }
  if (place.length < 1 || place.length > 100) {
    errors.birthPlace = 'Enter a place of birth up to 100 characters.'
  }
  if (draft.phone && !/^\+91[6-9]\d{9}$/.test(draft.phone)) {
    errors.phone = 'Enter +91 followed by a valid 10-digit mobile number.'
  }
  if (!draft.gender) {
    errors.gender = 'Choose a gender.'
  }

  return errors
}

