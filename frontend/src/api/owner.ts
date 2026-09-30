export type AstrologerProfile = {
  createdAt: string
  displayName: string
  email: string
  expertise: string[]
  experienceYears: number
  id: string
  isActive: boolean
  isListed: boolean
  languages: string[]
  mustChangePassword: boolean
  profileSavedAt: string | null
}

export type OwnerSettings = {
  normalDurationMin: 10 | 15 | 30
  normalPricePaise: number
  subscriptionCallsPerPack: number
  subscriptionDurationMin: 10 | 15 | 30
  subscriptionPricePaise: number
  urgentDurationMin: 10 | 15 | 30
  urgentPricePaise: number
}

export class OwnerApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function ownerRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
  })

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => ({}))) as {
    error?: string
  } & T

  if (!response.ok) {
    throw new OwnerApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return body
}

export const ownerApi = {
  session: () => ownerRequest<{ authenticated: true }>('/api/owner/session'),
  login: (email: string, password: string) =>
    ownerRequest<{ ok: true }>('/api/auth/owner/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => ownerRequest<void>('/api/owner/logout', { method: 'POST' }),
  listAstrologers: async () =>
    (await ownerRequest<{ astrologers: AstrologerProfile[] }>('/api/owner/astrologers'))
      .astrologers,
  getAstrologer: async (id: string) =>
    (await ownerRequest<{ astrologer: AstrologerProfile }>(`/api/owner/astrologers/${id}`))
      .astrologer,
  createAstrologer: async (input: {
    displayName: string
    email: string
    temporaryPassword: string
  }) =>
    (
      await ownerRequest<{ astrologer: AstrologerProfile }>('/api/owner/astrologers', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).astrologer,
  updateAstrologer: async (id: string, input: { displayName: string; email: string }) =>
    (
      await ownerRequest<{ astrologer: AstrologerProfile }>(`/api/owner/astrologers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).astrologer,
  setListed: async (id: string, isListed: boolean) =>
    (
      await ownerRequest<{ astrologer: AstrologerProfile }>(
        `/api/owner/astrologers/${id}/listing`,
        { method: 'PATCH', body: JSON.stringify({ isListed }) },
      )
    ).astrologer,
  setActive: async (id: string, isActive: boolean) =>
    (
      await ownerRequest<{ astrologer: AstrologerProfile }>(
        `/api/owner/astrologers/${id}/active`,
        { method: 'PATCH', body: JSON.stringify({ isActive }) },
      )
    ).astrologer,
  resetPassword: (id: string, temporaryPassword: string) =>
    ownerRequest<{ ok: true }>(`/api/owner/astrologers/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword }),
    }),
  getSettings: async () =>
    (await ownerRequest<{ settings: OwnerSettings }>('/api/owner/settings')).settings,
  updateSettings: async (settings: OwnerSettings) =>
    (
      await ownerRequest<{ settings: OwnerSettings }>('/api/owner/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
    ).settings,
}

export function paiseToRupees(paise: number) {
  const value = (paise / 100).toFixed(2)
  return value.endsWith('.00') ? value.slice(0, -3) : value
}

export function rupeesToPaise(rupees: string) {
  const normalized = rupees.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return Number.isSafeInteger(paise) && paise <= 2_147_483_647 ? paise : null
}
