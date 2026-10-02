// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallPrompt } from './InstallPrompt'
import { isIosSafari } from './install-prompt-utils'

function renderPrompt() {
  return render(<MemoryRouter><InstallPrompt /></MemoryRouter>)
}

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InstallPrompt', () => {
  it('offers the saved browser install event and remembers an explicit dismissal', async () => {
    const event = installEvent()
    renderPrompt()
    window.dispatchEvent(event)

    expect(await screen.findByText('Install AstroWebApp')).toBeDefined()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Install AstroWebApp')).toBeNull()
    expect(window.localStorage.getItem('astrowebapp-install-dismissed')).toBe('true')

    window.dispatchEvent(installEvent())
    expect(screen.queryByText('Install AstroWebApp')).toBeNull()
  })

  it('calls the browser install prompt', async () => {
    const event = installEvent()
    renderPrompt()
    window.dispatchEvent(event)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Install app' }))
    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('remembers a dismissal from the browser install prompt', async () => {
    const event = installEvent('dismissed')
    renderPrompt()
    window.dispatchEvent(event)

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Install app' }))
    expect(window.localStorage.getItem('astrowebapp-install-dismissed')).toBe('true')
  })

  it('shows and remembers the iPhone Add to Home Screen hint', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1')
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('iPhone')

    renderPrompt()
    expect(await screen.findByText(/To install: tap/)).toBeDefined()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Got it' }))
    expect(window.localStorage.getItem('astrowebapp-ios-install-hint-dismissed')).toBe('true')
  })

  it('recognizes iPadOS devices that report a desktop platform', () => {
    expect(isIosSafari({
      userAgent: 'Mozilla/5.0 (Macintosh) Version/18.0 Mobile Safari/604.1',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })).toBe(true)
  })

  it('does not show the Safari hint in another iOS browser', () => {
    expect(isIosSafari({
      userAgent: 'Mozilla/5.0 (iPhone) CriOS/140.0 Mobile Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    })).toBe(false)
  })

  it('does not offer installation when already running standalone', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    renderPrompt()
    window.dispatchEvent(installEvent())

    expect(screen.queryByText('Install AstroWebApp')).toBeNull()
  })
})
