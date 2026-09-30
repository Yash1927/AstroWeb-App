import { lazy, Suspense } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'
import OwnerPage from './screens/OwnerPage'
import AstrologerPage from './screens/AstrologerPage'

const DesignPage = import.meta.env.DEV
  ? lazy(() => import('./screens/DesignPage'))
  : null

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

function BottomTabBar() {
  return (
    <nav aria-label="Main navigation" className="bottom-tab-bar">
      {tabs.map((tab) => (
        <NavLink
          className="bottom-tab-bar__link"
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
      <main className="app-main">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}

type PlaceholderProps = {
  description: string
  title: string
}

function Placeholder({ description, title }: PlaceholderProps) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="screen__intro">{description}</p>
    </section>
  )
}

function LaterStep({ title }: { title: string }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="screen__intro">Coming in a later step.</p>
    </section>
  )
}

function NotFound() {
  return (
    <main className="standalone-page screen">
      <section className="card">
        <h1>Page not found</h1>
        <p>This page does not exist.</p>
        <Link className="button button--secondary" to="/">
          Go home
        </Link>
      </section>
    </main>
  )
}

const policyPages = [
  ['terms', 'Terms'],
  ['privacy', 'Privacy'],
  ['refunds', 'Refunds'],
  ['shipping', 'Shipping'],
  ['contact', 'Contact'],
  ['about', 'About'],
  ['pricing', 'Pricing'],
] as const

function App() {
  return (
    <Routes>
      <Route element={<UserShell />}>
        <Route
          index
          element={
            <Placeholder
              description="Astrologer profiles will appear here in Step 5."
              title="Home"
            />
          }
        />
        <Route
          path="history"
          element={
            <Placeholder
              description="Your upcoming and past calls will appear here in Step 9."
              title="History"
            />
          }
        />
        <Route
          path="blogs"
          element={
            <Placeholder
              description="Articles from astrologers will appear here in Step 14."
              title="Blogs"
            />
          }
        />
        <Route path="blogs/:id" element={<LaterStep title="Blog post" />} />
        <Route
          path="settings"
          element={
            <Placeholder
              description="Your details and account options will appear here in Step 6."
              title="Settings"
            />
          }
        />
        <Route path="call/:bookingId" element={<LaterStep title="Call room" />} />
        {policyPages.map(([path, title]) => (
          <Route key={path} path={path} element={<LaterStep title={title} />} />
        ))}
      </Route>
      <Route path="astrologer" element={<AstrologerPage />} />
      <Route path="owner" element={<OwnerPage />} />
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
