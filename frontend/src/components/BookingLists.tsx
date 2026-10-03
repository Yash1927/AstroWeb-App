import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type {
  AstrologerBooking,
  BookingSections,
  UserBooking,
} from '../api/booking-history'
import {
  bookingStatusAt,
  formatBirthDate,
  formatBirthTime,
  formatBookingDateTime,
  formatBookingTime,
  formatPhone,
  formatPrice,
} from '../booking-display'
import { Avatar } from './Avatar'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'
import { useBookingClock } from '../use-booking-clock'

type BookingListsProps = {
  audience: 'user' | 'astrologer'
  bookings: BookingSections<UserBooking> | BookingSections<AstrologerBooking>
}

function allBookings(bookings: BookingListsProps['bookings']) {
  return [...bookings.upcoming, ...bookings.past]
}

function userName(booking: UserBooking | AstrologerBooking, audience: BookingListsProps['audience']) {
  return audience === 'user'
    ? (booking as UserBooking).astrologer.displayName
    : (booking as AstrologerBooking).user.name
}

function personId(booking: UserBooking | AstrologerBooking, audience: BookingListsProps['audience']) {
  return audience === 'user'
    ? (booking as UserBooking).astrologer.id
    : (booking as AstrologerBooking).user.id
}

function personPhoto(booking: UserBooking | AstrologerBooking, audience: BookingListsProps['audience']) {
  return audience === 'user' ? (booking as UserBooking).astrologer.photoUrl : null
}

function UserDetails({ booking }: { booking: AstrologerBooking }) {
  const gender = booking.user.gender
    ? `${booking.user.gender[0].toLocaleUpperCase()}${booking.user.gender.slice(1)}`
    : 'Not provided'

  return (
    <dl className="booking-card__user-details">
      <div><dt>Date of birth</dt><dd>{formatBirthDate(booking.user.birthDate)}</dd></div>
      <div><dt>Time of birth</dt><dd>{formatBirthTime(booking.user.birthTime)}</dd></div>
      <div><dt>Place of birth</dt><dd>{booking.user.birthPlace ?? 'Not provided'}</dd></div>
      <div><dt>Gender</dt><dd>{gender}</dd></div>
      {booking.user.phone ? (
        <div>
          <dt>Phone number</dt>
          <dd>
            {booking.callMode === 'phone' ? (
              <a href={`tel:${booking.user.phone}`}>{formatPhone(booking.user.phone)}</a>
            ) : formatPhone(booking.user.phone)}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}

function BookingCard({
  audience,
  booking,
  now,
}: {
  audience: BookingListsProps['audience']
  booking: UserBooking | AstrologerBooking
  now: number
}) {
  const name = userName(booking, audience)
  const status = bookingStatusAt(booking, now)
  const hasStarted = now >= Date.parse(booking.startsAt)
  const hasEnded = now >= Date.parse(booking.endsAt)
  const callPath = audience === 'user'
    ? `/call/${booking.id}`
    : `/astrologer/call/${booking.id}`
  const isPhoneCall = booking.callMode === 'phone'
  const userBooking = booking as UserBooking

  return (
    <Card className="booking-card">
      <header className="booking-card__header">
        <div className="booking-card__person">
          <Avatar id={personId(booking, audience)} name={name} size={40} src={personPhoto(booking, audience)} />
          <div>
            <h3>{name}</h3>
            <p>
              {isPhoneCall && audience === 'astrologer'
                ? `Phone call · ${formatBookingDateTime(booking.startsAt)}`
                : `${booking.callType[0].toLocaleUpperCase()}${booking.callType.slice(1)} call`}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </header>
      <dl className="booking-card__facts">
        <div><dt>Date and time</dt><dd>{formatBookingDateTime(booking.startsAt)}</dd></div>
        <div><dt>Duration</dt><dd>{booking.durationMin} min</dd></div>
        <div><dt>Paid</dt><dd>{formatPrice(booking)}</dd></div>
      </dl>
      {audience === 'astrologer' ? (
        <UserDetails booking={booking as AstrologerBooking} />
      ) : null}
      {isPhoneCall && audience === 'user' && !hasEnded && userBooking.phone ? (
        <div className="booking-card__phone-call">
          <span aria-hidden="true">☎</span>
          <p>
            {name} will call you at {formatBookingTime(booking.startsAt)} on{' '}
            {formatPhone(userBooking.phone)}. Please keep your phone nearby.
          </p>
          <Link to="/settings">Wrong number? Update it in Settings.</Link>
        </div>
      ) : null}
      {!isPhoneCall && !hasEnded ? (
        <Link
          className={`button ${hasStarted ? 'button--primary button--soft-glow' : 'button--secondary'} booking-card__action`}
          to={callPath}
        >
          {hasStarted ? 'Join now' : 'Join'}
        </Link>
      ) : null}
    </Card>
  )
}

export function BookingLists({ audience, bookings }: BookingListsProps) {
  const combined = useMemo(() => allBookings(bookings), [bookings])
  const now = useBookingClock(combined)
  const sections = useMemo(() => ({
    upcoming: combined
      .filter((booking) => Date.parse(booking.endsAt) > now)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    past: combined
      .filter((booking) => Date.parse(booking.endsAt) <= now)
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt)),
  }), [combined, now])

  return (
    <div className="booking-sections">
      <section aria-labelledby={`${audience}-upcoming-heading`}>
        <h2 id={`${audience}-upcoming-heading`}>Upcoming</h2>
        {sections.upcoming.length ? (
          <div className="booking-list">
            {sections.upcoming.map((booking) => (
              <BookingCard audience={audience} booking={booking} key={booking.id} now={now} />
            ))}
          </div>
        ) : <p className="booking-empty">No upcoming calls.</p>}
      </section>
      <section aria-labelledby={`${audience}-past-heading`}>
        <h2 id={`${audience}-past-heading`}>Past</h2>
        {sections.past.length ? (
          <div className="booking-list">
            {sections.past.map((booking) => (
              <BookingCard audience={audience} booking={booking} key={booking.id} now={now} />
            ))}
          </div>
        ) : <p className="booking-empty">No past calls yet.</p>}
      </section>
    </div>
  )
}
