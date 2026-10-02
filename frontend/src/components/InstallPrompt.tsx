import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from './Button'
import { isIosSafari } from './install-prompt-utils'

const INSTALL_DISMISSED_KEY = 'astrowebapp-install-dismissed'
const IOS_HINT_DISMISSED_KEY = 'astrowebapp-ios-install-hint-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function stored(key: string) {
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function remember(key: string) {
  try {
    window.localStorage.setItem(key, 'true')
  } catch {
    // The prompt can still close when storage is unavailable.
  }
}

function isStandalone() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone
  return navigatorWithStandalone.standalone === true
    || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function InstallPrompt() {
  const location = useLocation()
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(
    () => !isStandalone() && isIosSafari(navigator) && !stored(IOS_HINT_DISMISSED_KEY),
  )

  useEffect(() => {
    if (isStandalone()) return

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      if (!stored(INSTALL_DISMISSED_KEY)) {
        setInstallEvent(event as BeforeInstallPromptEvent)
      }
    }
    const handleInstalled = () => {
      remember(INSTALL_DISMISSED_KEY)
      setInstallEvent(null)
      setShowIosHint(false)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (location.pathname !== '/') return null

  if (installEvent) {
    const dismiss = () => {
      remember(INSTALL_DISMISSED_KEY)
      setInstallEvent(null)
    }
    const install = async () => {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'dismissed') remember(INSTALL_DISMISSED_KEY)
      setInstallEvent(null)
    }

    return (
      <aside aria-label="Install AstroWebApp" className="install-banner">
        <div>
          <strong>Install AstroWebApp</strong>
          <p>Open it from your home screen whenever you need it.</p>
        </div>
        <div className="install-banner__actions">
          <Button onClick={() => void install()}>Install app</Button>
          <Button onClick={dismiss} variant="text">Not now</Button>
        </div>
      </aside>
    )
  }

  if (showIosHint) {
    const dismiss = () => {
      remember(IOS_HINT_DISMISSED_KEY)
      setShowIosHint(false)
    }

    return (
      <aside aria-label="Install AstroWebApp" className="install-banner">
        <p>To install: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>
        <Button onClick={dismiss} variant="text">Got it</Button>
      </aside>
    )
  }

  return null
}
