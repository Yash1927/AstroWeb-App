import type { CallType } from './public'

export type CreatedBooking = {
  astrologerId: string
  callMode: 'in_app' | 'phone'
  callType: CallType
  durationMin: 10 | 15 | 30
  endsAt: string
  id: string
  pricePaise: number
  startsAt: string
  status: 'confirmed' | 'pending_payment'
  usedCredit: boolean
}

export type BookingCheckout = {
  amountPaise: number
  currency: 'INR'
  expiresAt: string
  keyId: string
  orderId: string
  prefill: {
    contact: string
    email: string
    name: string
  }
}

export type CreateBookingResponse = {
  booking: CreatedBooking
  checkout?: BookingCheckout
  subscriptionCredits?: number
}

export type PaymentVerification =
  | {
      booking: CreatedBooking & { status: 'confirmed' }
      status: 'confirmed'
      subscriptionCredits?: number
    }
  | { message: string; status: 'refunded' }

export class BookingApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function bookingRequest<T>(path: string, init: RequestInit) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new BookingApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return body
}

export const bookingApi = {
  create: async (input: {
    astrologerId: string
    callType: CallType
    startsAt: string
  }) => (
    await bookingRequest<CreateBookingResponse>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ),
  verifyPayment: (input: {
    bookingId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) => bookingRequest<PaymentVerification>('/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
}
