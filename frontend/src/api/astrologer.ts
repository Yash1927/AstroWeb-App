import type { AstrologerBooking, BookingSections } from './booking-history'

export type AstrologerOwnProfile = {
  displayName: string
  email: string
  expertise: string[]
  experienceYears: number
  id: string
  languages: string[]
  profileSavedAt: string | null
  photoUrl: string | null
}

export type AstrologerProfileInput = Pick<
  AstrologerOwnProfile,
  'displayName' | 'expertise' | 'experienceYears' | 'languages'
>

export type AvailabilityRule = {
  endTime: string
  startTime: string
  weekday: number
}

export type AvailabilityException = {
  date: string
  endTime: string | null
  kind: 'blocked' | 'extra'
  startTime: string | null
}

export type AvailabilityInput = {
  exceptions: AvailabilityException[]
  weekly: AvailabilityRule[]
}

export type SavedAvailability = AvailabilityInput & {
  displacedBookingCount: number
}

export type BlogDocument = { type: 'doc'; content?: BlogNode[] }

export type BlogNode = {
  attrs?: Record<string, unknown>
  content?: BlogNode[]
  marks?: Array<{ attrs?: Record<string, unknown>; type: string }>
  text?: string
  type: string
}

export type MediaAsset = {
  bytes: number
  createdAt: string
  height: number
  id: string
  kind: 'profile_photo' | 'blog_image'
  url: string
  width: number
}

export type AstrologerBlogPost = {
  body: BlogDocument
  commentCount: number
  coverMediaId: string | null
  coverUrl: string | null
  comments: Array<{
    authorFirstName: string
    body: string
    createdAt: string
    id: string
  }>
  createdAt: string
  id: string
  likeCount: number
  readingMinutes: number
  publishedAt: string | null
  status: 'draft' | 'published'
  title: string
  updatedAt: string
}

export class AstrologerApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function astrologerRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
  })

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new AstrologerApiError(
      body.error ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return body
}

export const astrologerApi = {
  session: () =>
    astrologerRequest<{ authenticated: true; mustChangePassword: boolean }>(
      '/api/astrologer/session',
    ),
  login: (email: string, password: string) =>
    astrologerRequest<{ mustChangePassword: boolean }>('/api/auth/astrologer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    astrologerRequest<void>('/api/astrologer/logout', { method: 'POST' }),
  replaceTemporaryPassword: (newPassword: string) =>
    astrologerRequest<{ ok: true }>('/api/astrologer/password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
  getProfile: async () =>
    (await astrologerRequest<{ profile: AstrologerOwnProfile }>('/api/astrologer/profile'))
      .profile,
  saveProfile: async (profile: AstrologerProfileInput) =>
    (
      await astrologerRequest<{ profile: AstrologerOwnProfile }>(
        '/api/astrologer/profile',
        { method: 'PUT', body: JSON.stringify(profile) },
      )
    ).profile,
  uploadProfilePhoto: async (file: File) => {
    const body = new FormData()
    body.append('image', file)
    return (
      await astrologerRequest<{ asset: MediaAsset }>('/api/astrologer/profile/photo', {
        method: 'POST',
        body,
      })
    ).asset
  },
  removeProfilePhoto: () => astrologerRequest<void>('/api/astrologer/profile/photo', {
    method: 'DELETE',
  }),
  uploadBlogImage: async (file: File) => {
    const body = new FormData()
    body.append('image', file)
    return (
      await astrologerRequest<{ asset: MediaAsset }>('/api/astrologer/blog-images', {
        method: 'POST',
        body,
      })
    ).asset
  },
  getAvailability: async () =>
    (
      await astrologerRequest<{ availability: AvailabilityInput }>(
        '/api/astrologer/availability',
      )
    ).availability,
  saveAvailability: async (availability: AvailabilityInput) =>
    (
      await astrologerRequest<{ availability: SavedAvailability }>(
        '/api/astrologer/availability',
        { method: 'PUT', body: JSON.stringify(availability) },
      )
    ).availability,
  getBookings: () => astrologerRequest<BookingSections<AstrologerBooking>>(
    '/api/astrologer/bookings',
  ),
  getBooking: async (bookingId: string) => (
    await astrologerRequest<{ booking: AstrologerBooking }>(
      `/api/astrologer/bookings/${bookingId}`,
    )
  ).booking,
  getBlogs: async () => (
    await astrologerRequest<{ posts: AstrologerBlogPost[] }>('/api/astrologer/blogs')
  ).posts,
  saveBlog: async (
    id: string | null,
    input: { body: BlogDocument; coverMediaId: string | null; status: 'draft' | 'published'; title: string },
  ) => (
    await astrologerRequest<{ post: AstrologerBlogPost }>(
      id ? `/api/astrologer/blogs/${id}` : '/api/astrologer/blogs',
      { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) },
    )
  ).post,
  deleteBlog: (id: string) => astrologerRequest<void>(`/api/astrologer/blogs/${id}`, {
    method: 'DELETE',
  }),
  deleteBlogComment: (id: string, commentId: string) => astrologerRequest<void>(
    `/api/astrologer/blogs/${id}/comments/${commentId}`,
    { method: 'DELETE' },
  ),
}
