import type { BookingCardBase, BookingStatus } from './api/booking-history'
import { withLowercaseDayPeriod } from './display-time'

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

export function bookingStatusAt(booking: BookingCardBase, now: number): BookingStatus {
  return now < Date.parse(booking.endsAt) ? 'upcoming' : booking.endedStatus
}

export function formatBookingDateTime(value: string) {
  const date = new Date(value)
  return `${dateFormatter.format(date)} · ${withLowercaseDayPeriod(timeFormatter.format(date))}`
}

export function formatBookingTime(value: string) {
  return withLowercaseDayPeriod(timeFormatter.format(new Date(value)))
}

export function formatPrice(booking: BookingCardBase) {
  if (booking.usedCredit) return 'Subscription call'
  if (booking.pricePaise === 0) return 'Free'
  const rupees = booking.pricePaise / 100
  return `₹${rupees.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  })}`
}

export function formatBirthDate(value: string | null) {
  if (!value) return 'Not provided'
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

export function formatBirthTime(value: string | null) {
  if (!value) return 'Not provided'
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours! >= 12 ? 'pm' : 'am'
  const displayHours = hours! % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function formatPhone(value: string) {
  return value.replace(/^(\+91)(\d{5})(\d{5})$/u, '$1 $2 $3')
}
