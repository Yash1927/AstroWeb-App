import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'text'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  softGlow?: boolean
  variant?: ButtonVariant
}

export function Button({
  className = '',
  softGlow = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = [
    'button',
    `button--${variant}`,
    softGlow ? 'button--soft-glow' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} type={type} {...props} />
}
