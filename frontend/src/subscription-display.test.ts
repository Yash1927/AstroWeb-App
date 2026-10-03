import { describe, expect, it } from 'vitest'
import { formatCallsLeft } from './subscription-display'

describe('formatCallsLeft', () => {
  it.each([
    [0, '0 calls left'],
    [1, '1 call left'],
    [2, '2 calls left'],
  ])('formats %i remaining credits', (count, expected) => {
    expect(formatCallsLeft(count)).toBe(expected)
  })
})
