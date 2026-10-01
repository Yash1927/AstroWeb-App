import { useEffect, useRef, useState } from 'react'

type GoogleButtonOptions = {
  logo_alignment: 'left'
  shape: 'pill'
  size: 'large'
  state: string
  text: 'continue_with'
  theme: 'outline'
  type: 'standard'
  width: string
}

type GoogleAccounts = {
  id: {
    initialize(config: {
      auto_select: false
      client_id: string
      login_uri: string
      ux_mode: 'redirect'
    }): void
    renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
  }
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google?.accounts.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    const script = existing ?? document.createElement('script')

    const onLoad = () => resolve()
    const onError = () => reject(new Error('Google sign-in could not load. Please try again.'))
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.dataset.googleIdentity = 'true'
      document.head.append(script)
    }
  }).catch((error) => {
    googleScriptPromise = null
    throw error
  })

  return googleScriptPromise
}

type GoogleSignInButtonProps = {
  clientId?: string
  returnTo: string
}

export function GoogleSignInButton({
  clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID,
  returnTo,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const parent = buttonRef.current
    if (!parent) return

    if (!clientId) return
    void loadGoogleScript()
      .then(() => {
        const element = buttonRef.current
        if (!active || !element || !window.google) return
        element.replaceChildren()
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'redirect',
          login_uri: new URL('/api/auth/google', window.location.origin).toString(),
          auto_select: false,
        })
        window.google.accounts.id.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: String(Math.min(320, Math.max(240, element.clientWidth))),
          state: returnTo,
        })
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Google sign-in could not load. Please try again.',
          )
        }
      })

    return () => {
      active = false
      parent.replaceChildren()
    }
  }, [clientId, returnTo])

  return (
    <div className="google-sign-in">
      <div aria-label="Continue with Google" className="google-sign-in__button" ref={buttonRef} />
      {!clientId || error ? (
        <p className="field__error" role="alert">
          {clientId ? error : 'Google sign-in is not configured yet.'}
        </p>
      ) : null}
    </div>
  )
}

