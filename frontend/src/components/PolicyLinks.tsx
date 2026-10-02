import { Link } from 'react-router-dom'

const links = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/refunds', 'Cancellation & Refunds'],
  ['/shipping', 'Shipping'],
  ['/contact', 'Contact us'],
  ['/about', 'About us'],
  ['/pricing', 'Pricing'],
] as const

type PolicyLinksProps = { compact?: boolean }

export function PolicyLinks({ compact = false }: PolicyLinksProps) {
  return (
    <nav
      aria-label="Policies and help"
      className={compact ? 'policy-links policy-links--compact' : 'policy-links'}
    >
      {links.map(([path, label]) => <Link key={path} to={path}>{label}</Link>)}
    </nav>
  )
}
