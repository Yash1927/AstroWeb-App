// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

afterEach(cleanup)

describe('Avatar', () => {
  it('skips words that do not start with a letter when making initials', () => {
    render(<Avatar id="sumit" name="sumit 007" />)

    expect(screen.getByRole('img', { name: 'sumit 007' }).textContent).toBe('S')
  })
})
