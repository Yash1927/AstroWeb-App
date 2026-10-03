// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BlogDocument } from '../api/astrologer'
import { RichBlogEditor } from './RichBlogEditor'

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

afterEach(cleanup)

describe('RichBlogEditor toolbar', () => {
  it('keeps a text selection and applies bold through the toolbar button', async () => {
    Range.prototype.getBoundingClientRect = () => ({
      bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0,
      toJSON: () => ({}),
    })
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList
    let latest: BlogDocument | null = null
    render(
      <RichBlogEditor
        initialContent={{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Selected words' }] }] }}
        onChange={(document) => { latest = document }}
        onError={vi.fn()}
      />,
    )

    const editor = screen.getByLabelText('Post body')
    expect(screen.getByRole('button', { name: 'Heading' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.focus(editor)
    fireEvent.keyDown(editor, { ctrlKey: true, key: 'a' })

    const bold = screen.getByRole('button', { name: 'Bold' })
    const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    bold.dispatchEvent(mouseDown)
    expect(mouseDown.defaultPrevented).toBe(true)
    fireEvent.click(bold)

    await waitFor(() => {
      expect(latest?.content?.[0]?.content?.[0]?.marks).toEqual([{ type: 'bold' }])
    })
  })
})
