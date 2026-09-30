type SkeletonProps = {
  label?: string
  variant?: 'text' | 'title' | 'avatar'
}

export function Skeleton({
  label = 'Loading',
  variant = 'text',
}: SkeletonProps) {
  return (
    <span aria-label={label} role="status">
      <span
        aria-hidden="true"
        className={`skeleton skeleton--${variant}`}
      />
    </span>
  )
}
