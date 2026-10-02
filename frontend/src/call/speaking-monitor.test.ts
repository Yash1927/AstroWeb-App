import { describe, expect, it } from 'vitest'
import { audioLevel, isSpeaking } from './speaking-monitor'

describe('speaking level detection', () => {
  it('distinguishes silence from a voice-level waveform', () => {
    const silence = new Uint8Array([128, 128, 128, 128])
    const voice = new Uint8Array([96, 160, 92, 164])

    expect(audioLevel(silence)).toBe(0)
    expect(isSpeaking(silence)).toBe(false)
    expect(isSpeaking(voice)).toBe(true)
  })
})
