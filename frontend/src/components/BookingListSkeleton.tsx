import { Card } from './Card'
import { Skeleton } from './Skeleton'

export function BookingListSkeleton() {
  return (
    <div aria-busy="true" className="booking-sections">
      <section>
        <Skeleton label="Loading bookings" variant="title" />
        <Card className="booking-card booking-card--skeleton">
          <div className="booking-card__person">
            <Skeleton label="Loading bookings" variant="avatar" />
            <div><Skeleton label="Loading bookings" variant="title" /><Skeleton label="Loading bookings" /></div>
          </div>
          <Skeleton label="Loading bookings" />
          <Skeleton label="Loading bookings" />
        </Card>
      </section>
    </div>
  )
}

