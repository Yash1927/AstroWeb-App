// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BlogsPage from './BlogsPage'
import BlogPostPage from './BlogPostPage'

const summary = {
  id: '43f7d52f-98aa-4f2d-bc32-3baa7382080f',
  title: 'A gentle guide',
  excerpt: 'A calm excerpt for the list.',
  publishedAt: '2026-10-02T07:00:00Z',
  author: { id: 'ee6438fd-fc87-4d4c-a3ec-ebac07a814f0', displayName: 'Anika Rao', photoUrl: null },
  coverUrl: null,
  readingMinutes: 1,
  likeCount: 2,
  commentCount: 1,
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('Blogs', () => {
  it('loads twenty-post pages through the Load more action', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return {
        json: async () => url.endsWith('page=1')
          ? { posts: [summary], nextPage: 2 }
          : { posts: [{ ...summary, id: '8b834d55-89c3-47d2-ab28-b8373842fd40', title: 'Second post' }], nextPage: null },
        ok: true,
        status: 200,
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><BlogsPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'A gentle guide' })).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByRole('heading', { name: 'Second post' })).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/blogs?page=2', expect.anything())
  })

  it('renders blog and comment text as text and gates a visitor like with Google', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/me') {
        return { json: async () => ({ error: 'Please sign in.' }), ok: false, status: 401 } as Response
      }
      return {
        json: async () => ({ post: {
          ...summary,
          body: { type: 'doc', content: [
            { type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'A second paragraph.' }] },
          ] },
          likedByViewer: false,
          comments: [{
            id: '8b834d55-89c3-47d2-ab28-b8373842fd40',
            body: '<script>alert(2)</script>',
            createdAt: '2026-10-02T08:00:00Z',
            canDelete: false,
            author: { firstName: 'Maya', avatarId: 'avatar' },
          }],
        } }),
        ok: true,
        status: 200,
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <MemoryRouter initialEntries={[`/blogs/${summary.id}`]}>
        <Routes><Route path="/blogs/:id" element={<BlogPostPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('<script>alert(1)</script>')).toBeDefined()
    expect(screen.getByText('<script>alert(2)</script>')).toBeDefined()
    expect(document.querySelector('.blog-post script')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Like this post' }))
    expect(screen.getByRole('dialog', { name: 'Continue with Google' })).toBeDefined()
    expect(screen.getByText('Sign in to like or comment on this post.')).toBeDefined()
  })

  it('keeps a visitor comment draft in session storage through the sign-in redirect', async () => {
    sessionStorage.setItem(`astrowebapp:blog-comment-draft:${summary.id}`, 'A saved thought')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/me') {
        return { json: async () => ({ error: 'Please sign in.' }), ok: false, status: 401 } as Response
      }
      return {
        json: async () => ({ post: {
          ...summary,
          body: 'Post body.',
          likedByViewer: false,
          comments: [],
        } }),
        ok: true,
        status: 200,
      } as Response
    }))
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/blogs/${summary.id}`]}>
        <Routes><Route path="/blogs/:id" element={<BlogPostPage />} /></Routes>
      </MemoryRouter>,
    )

    const field = await screen.findByLabelText('Add a comment')
    expect(field).toHaveProperty('value', 'A saved thought')
    await user.type(field, ' to keep')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(screen.getByRole('dialog', { name: 'Continue with Google' })).toBeDefined()
    expect(sessionStorage.getItem(`astrowebapp:blog-comment-draft:${summary.id}`)).toBe('A saved thought to keep')
  })

  it('asks before deleting a user comment', async () => {
    const comment = {
      id: '8b834d55-89c3-47d2-ab28-b8373842fd40',
      body: 'My comment',
      createdAt: '2026-10-02T08:00:00Z',
      canDelete: true,
      author: { firstName: 'Maya', avatarId: 'avatar' },
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/me') {
        return { json: async () => ({ user: { id: 'user' } }), ok: true, status: 200 } as Response
      }
      if (init?.method === 'DELETE') {
        return { json: async () => ({}), ok: true, status: 204 } as Response
      }
      return {
        json: async () => ({ post: {
          ...summary,
          body: 'Post body.',
          likedByViewer: false,
          comments: [comment],
        } }),
        ok: true,
        status: 200,
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/blogs/${summary.id}`]}>
        <Routes><Route path="/blogs/:id" element={<BlogPostPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('My comment')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete comment?' })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    await user.click(within(confirmation).getByRole('button', { name: 'Delete comment' }))

    await waitFor(() => expect(screen.queryByText('My comment')).toBeNull())
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/blogs/${summary.id}/comments/${comment.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
