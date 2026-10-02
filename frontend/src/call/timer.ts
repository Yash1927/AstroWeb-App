export function secondsLeft(endsAt: string, now: number) {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1_000))
}

export function formatTimeLeft(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function forceRelayForDevelopment(isDevelopment: boolean, value: string | undefined) {
  return isDevelopment && value === 'true'
}
