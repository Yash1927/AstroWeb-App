export type BlogAuthor = {
  displayName: string
  id: string
}

export type BlogSummary = {
  author: BlogAuthor
  commentCount: number
  excerpt: string
  id: string
  likeCount: number
  publishedAt: string
  title: string
}

export type BlogComment = {
  author: { avatarId: string; firstName: string }
  body: string
  canDelete: boolean
  createdAt: string
  id: string
}

export type BlogPost = BlogSummary & {
  body: string
  comments: BlogComment[]
  likedByViewer: boolean
}

export class BlogApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function blogRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
  })
  const body = (response.status === 204
    ? {}
    : await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) {
    throw new BlogApiError(body.error ?? 'Something went wrong. Please try again.', response.status)
  }
  return body
}

export const blogsApi = {
  list: (page: number) => blogRequest<{ nextPage: number | null; posts: BlogSummary[] }>(
    `/api/blogs?page=${page}`,
  ),
  get: async (id: string) => (
    await blogRequest<{ post: BlogPost }>(`/api/blogs/${id}`)
  ).post,
  toggleLike: (id: string) => blogRequest<{ likeCount: number; liked: boolean }>(
    `/api/blogs/${id}/like`,
    { method: 'PUT' },
  ),
  comment: async (id: string, body: string) => (
    await blogRequest<{ comment: BlogComment }>(`/api/blogs/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
  ).comment,
  deleteComment: (id: string, commentId: string) => blogRequest<void>(
    `/api/blogs/${id}/comments/${commentId}`,
    { method: 'DELETE' },
  ),
}

