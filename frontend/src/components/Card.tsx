import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  compact?: boolean
  interactive?: boolean
}

export function Card({
  children,
  className = '',
  compact = false,
  interactive = false,
  ...props
}: CardProps) {
  const classes = [
    'card',
    compact ? 'card--compact' : '',
    interactive ? 'card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes} {...props}>
      {children}
    </article>
  )
}
