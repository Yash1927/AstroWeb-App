import type { AstrologerCardProfile } from '../components'

export type PublicSettings = {
  normalDurationMin: 10 | 15 | 30
  normalPricePaise: number
  subscriptionCallsPerPack: number
  subscriptionDurationMin: 10 | 15 | 30
  subscriptionPricePaise: number
  urgentDurationMin: 10 | 15 | 30
  urgentPricePaise: number
}

export class PublicApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function publicRequest<T>(path: string) {
  const response = await fetch(path)
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new PublicApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return body
}

export const publicApi = {
  getAstrologers: async () =>
    (await publicRequest<{ astrologers: AstrologerCardProfile[] }>('/api/astrologers'))
      .astrologers,
  getSettings: () => publicRequest<PublicSettings>('/api/settings/public'),
}
