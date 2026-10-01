// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HistoryPage from './HistoryPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HistoryPage', () => {
  it('asks a signed-out visitor to Continue with Google', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ error: 'Continue with Google to proceed.' }),
      ok: false,
      status: 401,
    } as Response)))

    render(<HistoryPage />)

    expect(await screen.findByRole('heading', { name: 'Continue with Google' })).toBeDefined()
  })
})

