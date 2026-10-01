// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AstrologerCard } from './AstrologerCard'

afterEach(cleanup)

describe('AstrologerCard', () => {
  it('shows every Home-card field and uses the supplied Call action', async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()
    render(
      <AstrologerCard
        onCall={onCall}
        profile={{
          id: 'anika',
          displayName: 'Anika Rao',
          expertise: ['Vedic', 'Tarot'],
          languages: ['Hindi', 'English'],
          experienceYears: 8,
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Anika Rao' })).toBeDefined()
    expect(screen.getByText('Vedic, Tarot')).toBeDefined()
    expect(screen.getByText('Hindi, English')).toBeDefined()
    expect(screen.getByText('8 years of experience')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Call' }))
    expect(onCall).toHaveBeenCalledOnce()
  })

  it('omits an empty expertise or languages row', () => {
    const { rerender } = render(
      <AstrologerCard
        onCall={vi.fn()}
        profile={{
          id: 'sumit',
          displayName: 'Sumit',
          expertise: [],
          languages: ['Hindi'],
          experienceYears: 3,
        }}
      />,
    )

    expect(screen.queryByText('Expertise')).toBeNull()
    expect(screen.getByText('Languages')).toBeDefined()
    expect(screen.queryByText('Not added yet')).toBeNull()

    rerender(
      <AstrologerCard
        onCall={vi.fn()}
        profile={{
          id: 'sumit',
          displayName: 'Sumit',
          expertise: ['Vedic'],
          languages: [],
          experienceYears: 3,
        }}
      />,
    )

    expect(screen.getByText('Expertise')).toBeDefined()
    expect(screen.queryByText('Languages')).toBeNull()
  })
})
