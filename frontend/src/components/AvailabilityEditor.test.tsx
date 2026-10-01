// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvailabilityEditor } from './AvailabilityEditor'

function response(body: unknown, status = 200) {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AvailabilityEditor', () => {
  it('shows range errors beside the field and saves multiple hours plus an exception', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) {
        return response({
          availability: {
            weekly: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
            exceptions: [],
          },
        })
      }
      const body = JSON.parse(String(init.body))
      return response({
        availability: { ...body, displacedBookingCount: 0 },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<AvailabilityEditor onSignedOut={vi.fn()} />)

    const monday = (await screen.findByRole('heading', { name: 'Monday' })).closest('section')!
    const firstEnd = within(monday).getByLabelText('End')
    fireEvent.change(firstEnd, { target: { value: '08:00' } })
    await user.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(within(monday).getByText('End time must be after start time.')).toBeDefined()
    expect(screen.getByText('Please fix the highlighted hours above.')).toBeDefined()
    await waitFor(() => expect(document.activeElement).toBe(firstEnd))
    expect(scrollIntoView).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.change(firstEnd, { target: { value: '12:00' } })
    await user.click(within(monday).getByRole('button', { name: 'Add hours' }))
    const starts = within(monday).getAllByLabelText('Start')
    const ends = within(monday).getAllByLabelText('End')
    fireEvent.change(starts[1]!, { target: { value: '13:00' } })
    fireEvent.change(ends[1]!, { target: { value: '15:00' } })
    await user.click(screen.getByRole('button', { name: 'Add exception' }))
    await user.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(await screen.findByText('Availability saved.')).toBeDefined()
    const request = fetchMock.mock.calls[1]![1] as RequestInit
    const saved = JSON.parse(String(request.body))
    expect(saved.weekly).toEqual([
      { weekday: 1, startTime: '09:00', endTime: '12:00' },
      { weekday: 1, startTime: '13:00', endTime: '15:00' },
    ])
    expect(saved.exceptions[0]).toEqual(expect.objectContaining({
      kind: 'blocked',
      startTime: null,
      endTime: null,
    }))
  })
})
