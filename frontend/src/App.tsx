import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import HomePage from './screens/HomePage'
import HistoryPage from './screens/HistoryPage'
import SettingsPage from './screens/SettingsPage'
import CallRoomPage from './screens/CallRoomPage'
import BlogsPage from './screens/BlogsPage'
import BlogPostPage from './screens/BlogPostPage'
import PolicyPage, { type PolicyPageKind } from './screens/PolicyPage'
import { AppBar, AppBrand, InstallPrompt } from './components'

const DesignPage = import.meta.env.DEV
  ? lazy(() => import('./screens/DesignPage'))
  : null
const AstrologerPage = lazy(() => import('./screens/AstrologerPage'))
const OwnerPage = lazy(() => import('./screens/OwnerPage'))

function PanelFallback() {
  return (
    <main aria-busy="true" className="standalone-page screen">
      <section className="card home-state">
        <p>Loading panel…</p>
      </section>
    </main>
  )
}

type TabIconProps = {
  name: 'home' | 'history' | 'blogs' | 'settings'
}

function TabIcon({ name }: TabIconProps) {
  if (name === 'home') {
    return (
      <svg aria-hidden="true" className="bottom-tab-bar__icon" viewBox="0 0 24 24">
        <path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z" />
      </svg>
    )
  }

  if (name === 'history') {
    return (
      <svg aria-hidden="true" className="bottom-tab-bar__icon" viewBox="0 0 24 24">
        <path d="M4 4v5h5M5.2 16.7A8.5 8.5 0 1 0 4 9M12 7v5l3 2" />
      </svg>
    )
  }

  if (name === 'blogs') {
    return (
      <svg aria-hidden="true" className="bottom-tab-bar__icon" viewBox="0 0 24 24">
        <path d="M5 3.5h11a3 3 0 0 1 3 3V20H7a2 2 0 0 1-2-2zM5 17.5a2.5 2.5 0 0 1 2.5-2.5H19M9 8h6" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="bottom-tab-bar__icon" viewBox="0 0 24 24">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19 13.5 1.3 1-.2 2.2-1.5.7-.8 1.4.1 1.7-2 1-1.3-1-1.6.3-1 1.3-2.1-.7-.2-1.7-1.2-1.1-1.7.2-.9-2 1.1-1.3-.1-1.6-1.3-1 .7-2.1 1.7-.2 1.1-1.2-.2-1.7 2-1 1.3 1 1.6-.2 1-1.4 2.1.7.2 1.7 1.2 1.1 1.7-.1.9 2-1 1.3z" />
    </svg>
  )
}

const tabs = [
  { label: 'Home', name: 'home' as const, path: '/', end: true },
  { label: 'History', name: 'history' as const, path: '/history' },
  { label: 'Blogs', name: 'blogs' as const, path: '/blogs' },
  { label: 'Settings', name: 'settings' as const, path: '/settings' },
]

function MainNavigation() {
  return (
    <nav aria-label="Main navigation" className="main-navigation">
      {tabs.map((tab) => (
        <NavLink
          className="main-navigation__link"
          end={tab.end}
          key={tab.path}
          to={tab.path}
        >
          <TabIcon name={tab.name} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function UserShell() {
  return (
    <div className="app-shell">
      <InstallPrompt />
      <div className="app-bar-wrap">
        <AppBar actions={<MainNavigation />} />
      </div>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function CallShell({ children, panelLabel }: { children: ReactNode; panelLabel?: string }) {
  return (
    <div className="call-shell">
      <div className="app-bar-wrap">
        <AppBar panelLabel={panelLabel} />
      </div>
      {children}
    </div>
  )
}

function NotFound() {
  return (
    <main className="standalone-page screen">
      <section className="card">
        <AppBrand large to="/" />
        <h1>Page not found</h1>
        <p>This page does not exist.</p>
        <Link className="button button--secondary" to="/">
          Go home
        </Link>
      </section>
    </main>
  )
}

const policyPages: PolicyPageKind[] = [
  'terms',
  'privacy',
  'refunds',
  'shipping',
  'contact',
  'about',
  'pricing',
]

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}

function OfflinePage() {
  return (
    <main className="standalone-page offline-page screen">
      <section className="card">
        <AppBrand large />
        <h1>You're offline</h1>
        <p role="status">You're offline. Please check your internet connection.</p>
      </section>
    </main>
  )
}

function App() {
  const online = useOnlineStatus()
  if (!online) return <OfflinePage />

  return (
    <Routes>
      <Route element={<UserShell />}>
        <Route index element={<HomePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/:id" element={<BlogPostPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {policyPages.map((path) => (
          <Route key={path} path={path} element={<PolicyPage kind={path} />} />
        ))}
      </Route>
      <Route path="call/:bookingId" element={<CallShell><CallRoomPage audience="user" /></CallShell>} />
      <Route path="astrologer" element={<Suspense fallback={<PanelFallback />}><AstrologerPage /></Suspense>} />
      <Route
        path="astrologer/call/:bookingId"
        element={<CallShell panelLabel="Astrologer panel"><CallRoomPage audience="astrologer" /></CallShell>}
      />
      <Route path="owner" element={<Suspense fallback={<PanelFallback />}><OwnerPage /></Suspense>} />
      {DesignPage ? (
        <Route
          path="_design"
          element={
            <Suspense fallback={<main className="design-page">Loading design page…</main>}>
              <DesignPage />
            </Suspense>
          }
        />
      ) : null}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
