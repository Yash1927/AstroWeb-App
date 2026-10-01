// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CallRoomPage from './CallRoomPage'

const peerSpies = vi.hoisted(() => ({
  close: vi.fn(),
  connectionStateCallbacks: [] as Array<(state: RTCPeerConnectionState) => void>,
  receiveDescription: vi.fn(),
  receiveIceCandidate: vi.fn(),
  resetForPeer: vi.fn(),
}))

vi.mock('../call/audio-peer', () => ({
  AudioPeer: class {
    constructor(options: { onConnectionStateChange: (state: RTCPeerConnectionState) => void }) {
      peerSpies.connectionStateCallbacks.push(options.onConnectionStateChange)
    }

    close = peerSpies.close
    receiveDescription = peerSpies.receiveDescription
    receiveIceCandidate = peerSpies.receiveIceCandidate
    resetForPeer = peerSpies.resetForPeer
  },
}))

const bookingId = '1c10ff39-56b3-4c86-9fa4-a8cb17d4a7df'

class FakeWebSocket {
  static readonly OPEN = 1
  static instances: FakeWebSocket[] = []
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  readyState = FakeWebSocket.OPEN
  sent: string[] = []
  readonly url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }

  open() {
    this.onopen?.()
  }

  receive(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }

  send(message: string) {
    this.sent.push(message)
  }
}

function jsonResponse(body: object) {
  return {
    json: async () => body,
    ok: true,
    status: 200,
  } as Response
}

function mockApi(startsAt: string, endsAt: string) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input)
    if (path === '/api/me') {
      return jsonResponse({
        user: {
          id: 'user-1',
          name: 'Sumit Sharma',
          email: 'user@example.test',
          birthDate: '1990-01-01',
          birthPlace: 'Delhi',
          birthTime: '10:00',
          gender: 'male',
          phone: null,
          subscriptionCredits: 0,
          detailsComplete: true,
        },
      })
    }
    return jsonResponse({
      booking: {
        id: bookingId,
        astrologer: {
          id: 'c7de117d-d65f-43fe-8c3d-c528423ae50f',
          displayName: 'Anika Rao',
        },
        callType: 'normal',
        startsAt,
        endsAt,
        durationMin: 15,
        pricePaise: 0,
        usedCredit: false,
        status: 'upcoming',
        endedStatus: 'missed',
      },
    })
  }))
}

function renderUserCall() {
  render(
    <MemoryRouter initialEntries={[`/call/${bookingId}`]}>
      <Routes>
        <Route path="call/:bookingId" element={<CallRoomPage audience="user" />} />
        <Route path="history" element={<p>History</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function activeWindow() {
  return {
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 60_000).toISOString(),
  }
}

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  FakeWebSocket.instances = []
  peerSpies.close.mockReset()
  peerSpies.connectionStateCallbacks.length = 0
  peerSpies.receiveDescription.mockReset()
  peerSpies.receiveIceCandidate.mockReset()
  peerSpies.resetForPeer.mockReset()
  vi.unstubAllGlobals()
})

describe('CallRoomPage', () => {
  it('shows the before-start and ended states without connecting audio', async () => {
    const getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    mockApi('2099-10-01T10:00:00Z', '2099-10-01T10:15:00Z')
    renderUserCall()

    expect(await screen.findByText('Please wait. Your call will start at 3:30 PM.')).toBeDefined()
    expect(document.querySelector('.breathe-circle')).not.toBeNull()
    expect(getUserMedia).not.toHaveBeenCalled()

    cleanup()
    mockApi('2000-10-01T10:00:00Z', '2000-10-01T10:15:00Z')
    renderUserCall()
    expect(await screen.findByText('This call has ended.')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Back to History' })).toBeDefined()
  })

  it('asks for the microphone only on Join, then shows both people and mute state', async () => {
    const track = { enabled: true, stop: vi.fn() }
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream
    const getUserMedia = vi.fn(async () => stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const { startsAt, endsAt } = activeWindow()
    mockApi(startsAt, endsAt)
    renderUserCall()
    const user = userEvent.setup()

    expect(await screen.findByText('Waiting for Anika Rao to join…')).toBeDefined()
    expect(getUserMedia).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Join call' }))
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })

    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    const socket = FakeWebSocket.instances[0]!
    socket.open()
    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'join', bookingId })
    socket.receive({ type: 'join', bookingId, participant: 'user' })
    socket.receive({
      type: 'presence',
      participants: {
        user: { present: true, muted: false },
        astrologer: { present: true, muted: true },
      },
    })

    expect(await screen.findByText('Connected.')).toBeDefined()
    expect(screen.getByLabelText('Anika Rao is muted')).toBeDefined()
    await user.click(screen.getByRole('button', { name: 'Mute' }))
    expect(track.enabled).toBe(false)
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({ type: 'mute-state', muted: true })
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Leave call' }))
    expect(track.stop).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Join call' })).toBeDefined()
  })

  it('shows audio failure only from peer failure or timeout and clears it after connecting', async () => {
    const track = { enabled: true, stop: vi.fn() }
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    })
    vi.stubGlobal('WebSocket', FakeWebSocket)
    peerSpies.receiveDescription.mockRejectedValueOnce(new Error('stale description'))
    peerSpies.receiveIceCandidate.mockRejectedValueOnce(new Error('stale candidate'))
    const { startsAt, endsAt } = activeWindow()
    mockApi(startsAt, endsAt)
    renderUserCall()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Join call' }))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    const socket = FakeWebSocket.instances[0]!
    act(() => {
      socket.open()
      socket.receive({ type: 'join', bookingId, participant: 'user' })
      socket.receive({
        type: 'presence',
        participants: {
          user: { present: true, muted: false },
          astrologer: { present: true, muted: false },
        },
      })
      socket.receive({ type: 'offer', from: 'astrologer', sdp: 'stale-offer' })
      socket.receive({
        type: 'ice-candidate',
        from: 'astrologer',
        candidate: { candidate: 'stale-candidate', sdpMid: '0', sdpMLineIndex: 0 },
      })
    })

    await waitFor(() => expect(peerSpies.receiveIceCandidate).toHaveBeenCalled())
    expect(screen.queryByText('Audio could not connect. Leave the call and try joining again.')).toBeNull()

    act(() => peerSpies.connectionStateCallbacks[0]?.('failed'))
    expect(await screen.findByText('Audio could not connect. Leave the call and try joining again.')).toBeDefined()

    act(() => peerSpies.connectionStateCallbacks[0]?.('connected'))
    expect(screen.queryByText('Audio could not connect. Leave the call and try joining again.')).toBeNull()

    act(() => socket.receive({ type: 'leave', participant: 'astrologer', reason: 'left' }))
    vi.useFakeTimers()
    act(() => socket.receive({
      type: 'presence',
      participants: {
        user: { present: true, muted: false },
        astrologer: { present: true, muted: false },
      },
    }))
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('Audio could not connect. Leave the call and try joining again.')).toBeDefined()

    act(() => peerSpies.connectionStateCallbacks[0]?.('connected'))
    expect(screen.queryByText('Audio could not connect. Leave the call and try joining again.')).toBeNull()
    vi.useRealTimers()
  })

  it('keeps the local track unmuted when the peer leaves and rejoins', async () => {
    const track = { enabled: true, stop: vi.fn() }
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    })
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const { startsAt, endsAt } = activeWindow()
    mockApi(startsAt, endsAt)
    renderUserCall()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Join call' }))
    await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1))
    const socket = FakeWebSocket.instances[0]!
    act(() => {
      socket.open()
      socket.receive({ type: 'join', bookingId, participant: 'user' })
      socket.receive({
        type: 'presence',
        participants: {
          user: { present: true, muted: false },
          astrologer: { present: true, muted: false },
        },
      })
    })

    await user.click(await screen.findByRole('button', { name: 'Mute' }))
    await user.click(screen.getByRole('button', { name: 'Unmute' }))
    act(() => {
      socket.receive({ type: 'leave', participant: 'astrologer', reason: 'left' })
      socket.receive({
        type: 'presence',
        participants: {
          user: { present: true, muted: false },
          astrologer: { present: true, muted: false },
        },
      })
    })

    expect(await screen.findByRole('button', { name: 'Mute' })).toBeDefined()
    expect(track.enabled).toBe(true)
    expect(screen.queryByLabelText('Anika Rao is muted')).toBeNull()
  })

  it('explains a denied microphone and offers Try again', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied'))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    const { startsAt, endsAt } = activeWindow()
    mockApi(startsAt, endsAt)
    renderUserCall()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Join call' }))

    expect(await screen.findByText(
      "Microphone access is blocked. In your browser's site settings, allow the microphone for this site, then try again.",
    )).toBeDefined()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
  })
})

