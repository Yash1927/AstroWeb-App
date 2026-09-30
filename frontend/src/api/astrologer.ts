export type AstrologerOwnProfile = {
  displayName: string
  email: string
  expertise: string[]
  experienceYears: number
  id: string
  languages: string[]
  profileSavedAt: string | null
}

export type AstrologerProfileInput = Pick<
  AstrologerOwnProfile,
  'displayName' | 'expertise' | 'experienceYears' | 'languages'
>

export class AstrologerApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function astrologerRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
  })

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new AstrologerApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return body
}

export const astrologerApi = {
  session: () =>
    astrologerRequest<{ authenticated: true; mustChangePassword: boolean }>(
      '/api/astrologer/session',
    ),
  login: (email: string, password: string) =>
    astrologerRequest<{ mustChangePassword: boolean }>('/api/auth/astrologer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    astrologerRequest<void>('/api/astrologer/logout', { method: 'POST' }),
  replaceTemporaryPassword: (newPassword: string) =>
    astrologerRequest<{ ok: true }>('/api/astrologer/password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
  getProfile: async () =>
    (await astrologerRequest<{ profile: AstrologerOwnProfile }>('/api/astrologer/profile'))
      .profile,
  saveProfile: async (profile: AstrologerProfileInput) =>
    (
      await astrologerRequest<{ profile: AstrologerOwnProfile }>(
        '/api/astrologer/profile',
        { method: 'PUT', body: JSON.stringify(profile) },
      )
    ).profile,
}
