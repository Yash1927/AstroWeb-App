// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleSignInButton } from './GoogleSignInButton'

afterEach(() => {
  cleanup()
  delete window.google
})

describe('GoogleSignInButton', () => {
  it('uses GIS redirect mode and passes the local continuation state', async () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()
    window.google = { accounts: { id: { initialize, renderButton } } }

    render(
      <GoogleSignInButton
        clientId="test-client.apps.googleusercontent.com"
        returnTo="/?bookingAstrologer=anika&callType=normal"
      />,
    )

    await waitFor(() => expect(initialize).toHaveBeenCalledWith({
      client_id: 'test-client.apps.googleusercontent.com',
      ux_mode: 'redirect',
      login_uri: 'http://localhost:3000/api/auth/google',
      auto_select: false,
    }))
    expect(renderButton).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      text: 'continue_with',
      state: '/?bookingAstrologer=anika&callType=normal',
    }))
  })
})

