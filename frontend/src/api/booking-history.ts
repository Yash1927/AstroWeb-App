export type BookingStatus = 'upcoming' | 'completed' | 'missed' | 'phone-call'

export type BookingCardBase = {
  callMode: 'in_app' | 'phone'
  callType: 'normal' | 'urgent' | 'subscription'
  durationMin: number
  endedStatus: Exclude<BookingStatus, 'upcoming'>
  endsAt: string
  id: string
  pricePaise: number
  startsAt: string
  status: BookingStatus
  usedCredit: boolean
}

export type UserBooking = BookingCardBase & {
  astrologer: {
    displayName: string
    id: string
    photoUrl?: string | null
  }
  phone: string | null
}

export type AstrologerBooking = BookingCardBase & {
  user: {
    birthDate: string | null
    birthPlace: string | null
    birthTime: string | null
    gender: 'male' | 'female' | 'other' | null
    id: string
    name: string
    phone: string | null
  }
}

export type BookingSections<T extends BookingCardBase> = {
  past: T[]
  upcoming: T[]
}

export type UserBookingSections = BookingSections<UserBooking> & {
  subscriptionCredits: number
}
