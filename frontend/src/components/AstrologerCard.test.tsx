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
})
