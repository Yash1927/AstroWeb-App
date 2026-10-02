import { describe, expect, it } from 'vitest'
import {
  forceRelayForDevelopment,
  formatTimeLeft,
  secondsLeft,
} from './timer'

describe('call timer', () => {
  it('rounds up remaining seconds and formats a stable minute clock', () => {
    const end = '2026-10-01T10:15:00.000Z'
    expect(secondsLeft(end, Date.parse('2026-10-01T10:12:59.100Z'))).toBe(121)
    expect(secondsLeft(end, Date.parse('2026-10-01T10:13:00.000Z'))).toBe(120)
    expect(secondsLeft(end, Date.parse('2026-10-01T10:15:01.000Z'))).toBe(0)
    expect(formatTimeLeft(121)).toBe('2:01')
    expect(formatTimeLeft(9)).toBe('0:09')
  })

  it('allows relay-only ICE only in development with an explicit true flag', () => {
    expect(forceRelayForDevelopment(true, 'true')).toBe(true)
    expect(forceRelayForDevelopment(true, 'false')).toBe(false)
    expect(forceRelayForDevelopment(false, 'true')).toBe(false)
  })
})
