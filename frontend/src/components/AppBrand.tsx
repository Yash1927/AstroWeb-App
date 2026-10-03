import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AppBrandProps = {
  large?: boolean
  panelLabel?: string
  to?: string
}

export function AppBrand({ large = false, panelLabel, to }: AppBrandProps) {
  const content = (
    <>
      <img
        alt="Astromaitreyi"
        className="app-brand__logo"
        src={large ? '/logo.jpg' : '/app-icon-header.png'}
      />
      <span className="app-brand__text">
        <strong>Astromaitreyi</strong>
        {panelLabel ? <span>{panelLabel}</span> : null}
      </span>
    </>
  )

  return to ? (
    <Link className={`app-brand${large ? ' app-brand--large' : ''}`} to={to}>
      {content}
    </Link>
  ) : (
    <div className={`app-brand${large ? ' app-brand--large' : ''}`}>
      {content}
    </div>
  )
}

type AppBarProps = {
  actions?: ReactNode
  panelLabel?: string
}

export function AppBar({ actions, panelLabel }: AppBarProps) {
  return (
    <header className="app-bar">
      <AppBrand panelLabel={panelLabel} to={panelLabel ? undefined : '/'} />
      {actions ? <div className="app-bar__actions">{actions}</div> : null}
    </header>
  )
}
