// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AstrologerBlogs } from './AstrologerBlogs'

vi.mock('./RichBlogEditor', async () => {
  const { useState } = await import('react')
  type Node = { content?: Node[]; text?: string }
  const textFrom = (node: Node): string => node.text ?? node.content?.map(textFrom).join('') ?? ''
  return {
    RichBlogEditor: ({ initialContent, onChange }: { initialContent: Node; onChange: (document: object) => void }) => {
      const [value, setValue] = useState(() => textFrom(initialContent))
      return (
        <textarea
          aria-label="Post body"
          onChange={(event) => {
            const next = event.target.value
            setValue(next)
            onChange({ type: 'doc', content: [{ type: 'paragraph', content: next ? [{ type: 'text', text: next }] : undefined }] })
          }}
          value={value}
        />
      )
    },
  }
})

const post = {
  id: '43f7d52f-98aa-4f2d-bc32-3baa7382080f',
  title: 'A gentle guide',
  body: { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Post body.' }] }] },
  coverMediaId: null,
  coverUrl: null,
  status: 'published' as const,
  publishedAt: '2026-10-02T07:00:00Z',
  createdAt: '2026-10-02T06:00:00Z',
  updatedAt: '2026-10-02T07:00:00Z',
  likeCount: 1,
  commentCount: 1,
  readingMinutes: 1,
  comments: [{
    id: '8b834d55-89c3-47d2-ab28-b8373842fd40',
    authorFirstName: 'Maya',
    body: 'A useful comment',
    createdAt: '2026-10-02T08:00:00Z',
  }],
}

function jsonResponse(value: unknown, status = 200) {
  return {
    json: async () => value,
    ok: status >= 200 && status < 300,
    status,
  } as Response
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AstrologerBlogs', () => {
  it('asks before deleting a comment and updates the list count after confirmation', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') return jsonResponse({}, 204)
      return jsonResponse({ posts: [post] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AstrologerBlogs onSignedOut={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const commentCard = screen.getByText('A useful comment').closest('article')
    expect(commentCard).not.toBeNull()
    await user.click(within(commentCard!).getByRole('button', { name: 'Delete' }))

    const confirmation = screen.getByRole('dialog', { name: 'Delete comment?' })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    await user.click(within(confirmation).getByRole('button', { name: 'Delete comment' }))

    await waitFor(() => expect(screen.queryByText('A useful comment')).toBeNull())
    expect(screen.getByText(/0 comments/u)).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/astrologer/blogs/${post.id}/comments/${post.comments[0]!.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('refreshes like and comment counts when the panel regains focus', async () => {
    let listCalls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      listCalls += 1
      return jsonResponse({ posts: [{
        ...post,
        likeCount: listCalls === 1 ? 1 : 3,
        commentCount: listCalls === 1 ? 1 : 2,
      }] })
    }))
    render(<AstrologerBlogs onSignedOut={vi.fn()} />)

    expect(await screen.findByText(/1 likes · 1 comments/u)).toBeDefined()
    window.dispatchEvent(new Event('focus'))

    expect(await screen.findByText(/3 likes · 2 comments/u)).toBeDefined()
    expect(screen.getByText('Published').classList).toContain('status-badge')
  })

  it('shows the server validation message in the editor', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return jsonResponse({ error: 'The post contains an unsupported block.' }, 400)
      }
      return jsonResponse({ posts: [post] })
    }))
    const user = userEvent.setup()
    render(<AstrologerBlogs onSignedOut={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(await screen.findByRole('button', { name: 'Unpublish' }))

    expect((await screen.findByRole('alert')).textContent).toBe('The post contains an unsupported block.')
  })

  it('keeps focus and text typed while the first autosave creates the post', async () => {
    let resolveSave: ((response: Response) => void) | undefined
    const saveResponse = new Promise<Response>((resolve) => { resolveSave = resolve })
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return saveResponse
      return jsonResponse({ posts: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AstrologerBlogs onSignedOut={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Write a post' }))
    const title = screen.getByRole('textbox', { name: 'Post title' })
    const editor = await screen.findByRole('textbox', { name: 'Post body' })
    vi.useFakeTimers()
    fireEvent.change(title, { target: { value: 'A new post' } })
    editor.focus()
    fireEvent.change(editor, { target: { value: 'First thought' } })
    await act(async () => { vi.advanceTimersByTime(2_500); await Promise.resolve() })
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)

    fireEvent.change(editor, { target: { value: 'First thought, continued' } })
    expect(editor).toBe(document.activeElement)
    resolveSave?.(jsonResponse({ post: { ...post, title: 'A new post', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First thought' }] }] }, status: 'draft', publishedAt: null } }, 201))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(editor).toBe(document.activeElement)
    expect(editor.textContent).toBe('First thought, continued')
  })

  it('stops retrying a failed autosave until the content changes', async () => {
    let saveCalls = 0
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        saveCalls += 1
        if (saveCalls === 1) return jsonResponse({ error: 'The draft could not be saved.' }, 503)
        return jsonResponse({ post: { ...post, status: 'draft', publishedAt: null } }, 201)
      }
      return jsonResponse({ posts: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AstrologerBlogs onSignedOut={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Write a post' }))
    const editor = await screen.findByRole('textbox', { name: 'Post body' })
    vi.useFakeTimers()
    fireEvent.change(screen.getByRole('textbox', { name: 'Post title' }), { target: { value: 'A new post' } })
    editor.focus()
    fireEvent.change(editor, { target: { value: 'First thought' } })
    await act(async () => { vi.advanceTimersByTime(2_500); await Promise.resolve(); await Promise.resolve() })

    expect(screen.getByText('Not saved')).toBeDefined()
    expect(screen.getByRole('alert').textContent).toBe('The draft could not be saved.')
    await act(async () => { vi.advanceTimersByTime(10_000); await Promise.resolve() })
    expect(saveCalls).toBe(1)

    fireEvent.change(editor, { target: { value: 'First thought, revised' } })
    await act(async () => { vi.advanceTimersByTime(2_500); await Promise.resolve(); await Promise.resolve() })
    expect(saveCalls).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
