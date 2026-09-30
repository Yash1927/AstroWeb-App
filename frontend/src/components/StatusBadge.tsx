const statusLabels = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  missed: 'Missed',
  'phone-call': 'Phone call',
} as const

type Status = keyof typeof statusLabels

type StatusBadgeProps = {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {statusLabels[status]}
    </span>
  )
}
