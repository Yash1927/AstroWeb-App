import type { UserBooking, UserBookingSections } from './booking-history'

export type Gender = 'male' | 'female' | 'other'

export type UserDetails = {
  birthDate: string | null
  birthPlace: string | null
  birthTime: string | null
  detailsComplete: boolean
  email: string
  gender: Gender | null
  id: string
  name: string
  phone: string | null
  subscriptionCredits: number
}

export type UserDetailsInput = {
  birthDate: string
  birthPlace: string
  birthTime: string
  gender: Gender
  name: string
  phone: string | null
}

export class UserApiError extends Error {
  field?: string
  status: number

  constructor(message: string, status: number, field?: string) {
    super(message)
    this.status = status
    this.field = field
  }
}

async function userRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
  })
  const body = (response.status === 204
    ? {}
    : await response.json().catch(() => ({}))) as { error?: string; field?: string } & T

  if (!response.ok) {
    throw new UserApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
      body.field,
    )
  }

  return body
}

export const userApi = {
  getMe: async () => (await userRequest<{ user: UserDetails }>('/api/me')).user,
  updateMe: async (details: UserDetailsInput) => (
    await userRequest<{ user: UserDetails }>('/api/me', {
      method: 'PUT',
      body: JSON.stringify(details),
    })
  ).user,
  getBookings: () => userRequest<UserBookingSections>('/api/me/bookings'),
  getBooking: async (bookingId: string) => (
    await userRequest<{ booking: UserBooking }>(`/api/me/bookings/${bookingId}`)
  ).booking,
  logout: () => userRequest<void>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }),
}

