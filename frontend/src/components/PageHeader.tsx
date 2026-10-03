import type { ReactNode } from 'react'

type PageHeaderProps = {
  actions?: ReactNode
  intro?: string
  title: string
}

export function PageHeader({ actions, intro, title }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {intro ? <p className="screen__intro">{intro}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}

