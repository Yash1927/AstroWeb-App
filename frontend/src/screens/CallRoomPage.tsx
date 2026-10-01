import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AstrologerBooking, UserBooking } from '../api/booking-history'
import { AstrologerApiError, astrologerApi } from '../api/astrologer'
import { userApi, UserApiError } from '../api/user'
import { AudioPeer, type OutgoingCallSignal } from '../call/audio-peer'
import {
  callWebSocketUrl,
  parseServerCallMessage,
  type CallParticipant,
} from '../call/protocol'
import { formatBookingTime } from '../booking-display'
import { Avatar, BookingListSkeleton, Button, Card, UserSignIn } from '../components'
import { useBookingClock } from '../use-booking-clock'

type CallRoomPageProps = {
  audience: CallParticipant
}

type PageState = 'loading' | 'ready' | 'signed-out' | 'error'

type Person = {
  id: string
  name: string
}

type RoomDetails = {
  booking: UserBooking | AstrologerBooking
  local: Person
  remote: Person
}

const microphoneConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
}

const AUDIO_CONNECTION_ERROR = 'Audio could not connect. Leave the call and try joining again.'
const AUDIO_CONNECTION_TIMEOUT_MS = 15_000

function firstName(name: string) {
  return name.trim().split(/\s+/u)[0] || name
}

function MicrophoneIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 4 16 16M9 9.5V6a3 3 0 0 1 5.7-1.3M15 11V6M6 11v1a6 6 0 0 0 9.7 4.7M18 11v1a6 6 0 0 1-.4 2.2M12 18v3M9 21h6" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="11" rx="3" width="6" x="9" y="3" />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" />
    </svg>
  )
}

function LeaveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  )
}

function MutedBadge({ name }: { name: string }) {
  return (
    <span aria-label={`${name} is muted`} className="call-participant__muted" role="img">
      <MicrophoneIcon muted />
    </span>
  )
}

export default function CallRoomPage({ audience }: CallRoomPageProps) {
  const { bookingId = '' } = useParams()
  const [state, setState] = useState<PageState>('loading')
  const [details, setDetails] = useState<RoomDetails | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [localJoined, setLocalJoined] = useState(false)
  const [peerPresent, setPeerPresent] = useState(false)
  const [localMuted, setLocalMuted] = useState(false)
  const [peerMuted, setPeerMuted] = useState(false)
  const [microphoneError, setMicrophoneError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<AudioPeer | null>(null)
  const peerPresentRef = useRef(false)
  const localMutedRef = useRef(false)
  const connectionTimeoutRef = useRef<number | null>(null)
  const joinAttemptRef = useRef(0)
  const mountedRef = useRef(true)
  const now = useBookingClock(details ? [details.booking] : [])

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current !== null) {
      window.clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
  }, [])

  const waitForAudioConnection = useCallback(() => {
    clearConnectionTimeout()
    connectionTimeoutRef.current = window.setTimeout(() => {
      connectionTimeoutRef.current = null
      if (mountedRef.current && peerPresentRef.current && peerRef.current) {
        setConnectionError(AUDIO_CONNECTION_ERROR)
      }
    }, AUDIO_CONNECTION_TIMEOUT_MS)
  }, [clearConnectionTimeout])

  useEffect(() => {
    let active = true
    const request = audience === 'user'
      ? Promise.all([userApi.getBooking(bookingId), userApi.getMe()]).then(([booking, user]) => ({
        booking,
        local: { id: user.id, name: user.name },
        remote: { id: booking.astrologer.id, name: booking.astrologer.displayName },
      }))
      : Promise.all([astrologerApi.getBooking(bookingId), astrologerApi.getProfile()])
        .then(([booking, profile]) => ({
          booking,
          local: { id: profile.id, name: profile.displayName },
          remote: { id: booking.user.id, name: booking.user.name },
        }))

    void request
      .then((loaded) => {
        if (!active) return
        setDetails(loaded)
        setState('ready')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        const signedOut = (loadError instanceof UserApiError || loadError instanceof AstrologerApiError)
          && loadError.status === 401
        if (signedOut) {
          setState('signed-out')
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Something went wrong. Please try again.')
          setState('error')
        }
      })
    return () => { active = false }
  }, [audience, bookingId])

  const stopConnection = useCallback((sendLeave: boolean, updateState: boolean) => {
    joinAttemptRef.current += 1
    clearConnectionTimeout()
    const socket = socketRef.current
    socketRef.current = null
    if (sendLeave && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'leave' }))
    }
    socket?.close()
    peerRef.current?.close()
    peerRef.current = null
    for (const track of streamRef.current?.getTracks() ?? []) track.stop()
    streamRef.current = null
    peerPresentRef.current = false
    localMutedRef.current = false
    if (audioRef.current) audioRef.current.srcObject = null
    if (updateState && mountedRef.current) {
      setJoining(false)
      setLocalJoined(false)
      setPeerPresent(false)
      setPeerMuted(false)
      setLocalMuted(false)
    }
  }, [clearConnectionTimeout])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopConnection(true, false)
    }
  }, [stopConnection])

  const ended = details ? now >= Date.parse(details.booking.endsAt) : false
  const started = details ? now >= Date.parse(details.booking.startsAt) : false

  useEffect(() => {
    if (ended) stopConnection(true, true)
  }, [ended, stopConnection])

  function sendSignal(signal: OutgoingCallSignal) {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(signal))
  }

  async function joinCall() {
    if (!details || joining || localJoined || !started || ended) return
    setJoining(true)
    setMicrophoneError('')
    setConnectionError('')
    const attempt = joinAttemptRef.current + 1
    joinAttemptRef.current = attempt

    let stream: MediaStream
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      stream = await navigator.mediaDevices.getUserMedia(microphoneConstraints)
    } catch {
      if (attempt !== joinAttemptRef.current) return
      setJoining(false)
      setMicrophoneError(
        "Microphone access is blocked. In your browser's site settings, allow the microphone for this site, then try again.",
      )
      return
    }

    if (attempt !== joinAttemptRef.current) {
      for (const track of stream.getTracks()) track.stop()
      return
    }

    if (Date.now() >= Date.parse(details.booking.endsAt)) {
      for (const track of stream.getTracks()) track.stop()
      setJoining(false)
      return
    }

    streamRef.current = stream
    localMutedRef.current = false
    for (const track of stream.getAudioTracks()) track.enabled = true
    setLocalMuted(false)
    const peer = new AudioPeer({
      stream,
      polite: audience === 'astrologer',
      send: sendSignal,
      onConnectionStateChange(connectionState) {
        if (connectionState === 'connected') {
          clearConnectionTimeout()
          setConnectionError('')
        } else if (connectionState === 'failed') {
          clearConnectionTimeout()
          setConnectionError(AUDIO_CONNECTION_ERROR)
        }
      },
      onRemoteStream(remoteStream) {
        if (audioRef.current) audioRef.current.srcObject = remoteStream
      },
    })
    peerRef.current = peer

    let socket: WebSocket
    try {
      socket = new WebSocket(callWebSocketUrl(audience))
    } catch {
      stopConnection(false, true)
      setConnectionError('The call could not connect. Please try again.')
      return
    }
    socketRef.current = socket
    let signalQueue = Promise.resolve()

    socket.onopen = () => {
      if (socketRef.current !== socket) return
      socket.send(JSON.stringify({ type: 'join', bookingId: details.booking.id }))
    }
    socket.onmessage = ({ data }) => {
      if (socketRef.current !== socket || typeof data !== 'string') return
      const message = parseServerCallMessage(data)
      if (!message) {
        stopConnection(false, true)
        setConnectionError('The call connection sent an invalid message. Please try again.')
        return
      }
      if (message.type === 'join') {
        setJoining(false)
        setLocalJoined(true)
        return
      }
      if (message.type === 'presence') {
        const other = audience === 'user'
          ? message.participants.astrologer
          : message.participants.user
        if (other.present && !peerPresentRef.current) {
          setConnectionError('')
          peerRef.current?.resetForPeer()
          waitForAudioConnection()
        }
        if (!other.present && peerPresentRef.current) {
          clearConnectionTimeout()
          setConnectionError('')
          peerRef.current?.resetForPeer()
        }
        peerPresentRef.current = other.present
        setPeerPresent(other.present)
        setPeerMuted(other.muted)
        return
      }
      const otherRole: CallParticipant = audience === 'user' ? 'astrologer' : 'user'
      if (message.type === 'leave' && message.participant === otherRole) {
        clearConnectionTimeout()
        setConnectionError('')
        peerPresentRef.current = false
        setPeerPresent(false)
        setPeerMuted(false)
        peerRef.current?.resetForPeer()
        return
      }
      if (message.type === 'mute-state' && message.participant === otherRole) {
        setPeerMuted(message.muted)
        return
      }
      if ((message.type === 'offer' || message.type === 'answer') && message.from === otherRole) {
        signalQueue = signalQueue
          .then(() => peerRef.current?.receiveDescription(message.type, message.sdp))
          .catch(() => undefined)
        return
      }
      if (message.type === 'ice-candidate' && message.from === otherRole) {
        signalQueue = signalQueue
          .then(() => peerRef.current?.receiveIceCandidate(message.candidate))
          .catch(() => undefined)
      }
    }
    socket.onclose = () => {
      if (socketRef.current !== socket) return
      socketRef.current = null
      clearConnectionTimeout()
      peerRef.current?.close()
      peerRef.current = null
      for (const track of streamRef.current?.getTracks() ?? []) track.stop()
      streamRef.current = null
      peerPresentRef.current = false
      localMutedRef.current = false
      if (!mountedRef.current) return
      setJoining(false)
      setLocalJoined(false)
      setPeerPresent(false)
      setPeerMuted(false)
      setLocalMuted(false)
      if (Date.now() < Date.parse(details.booking.endsAt)) {
        setConnectionError('The call connection ended. Choose Join call to reconnect.')
      }
    }
  }

  function toggleMute() {
    const muted = !localMutedRef.current
    localMutedRef.current = muted
    for (const track of streamRef.current?.getAudioTracks() ?? []) track.enabled = !muted
    setLocalMuted(muted)
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'mute-state', muted }))
    }
  }

  function leaveCall() {
    stopConnection(true, true)
    setConnectionError('')
  }

  if (state === 'signed-out' && audience === 'user') {
    return (
      <main className="standalone-page screen">
        <UserSignIn description="Sign in to open your call." returnTo={`/call/${bookingId}`} />
      </main>
    )
  }

  if (state === 'signed-out') {
    return (
      <main className="standalone-page screen">
        <Card className="call-room call-room--message">
          <h1>Astrologer login needed</h1>
          <p>Sign in to open your call.</p>
          <Link className="button button--primary" to="/astrologer">Go to astrologer login</Link>
        </Card>
      </main>
    )
  }

  if (state === 'loading') {
    return <main className="standalone-page screen"><BookingListSkeleton /></main>
  }

  if (state === 'error' || !details) {
    return (
      <main className="standalone-page screen">
        <Card className="call-room call-room--message">
          <h1>Call room</h1>
          <p className="field__error" role="alert">{error || 'The booking is unavailable.'}</p>
        </Card>
      </main>
    )
  }

  let stateMessage = 'Connected.'
  if (!started) {
    stateMessage = `Please wait. Your call will start at ${formatBookingTime(details.booking.startsAt)}.`
  } else if (ended) {
    stateMessage = 'This call has ended.'
  } else if (!peerPresent || !localJoined) {
    stateMessage = audience === 'user'
      ? `Waiting for ${details.remote.name} to join…`
      : `Waiting for ${firstName(details.remote.name)} to join…`
  }

  const connected = started && !ended && localJoined && peerPresent
  const waiting = !ended && (!started || !connected)

  return (
    <main className="call-room-page screen">
      <Card className="call-room">
        <h1>Call room</h1>
        <p aria-live="polite" className="call-room__state" role="status">{stateMessage}</p>

        {waiting ? <div aria-hidden="true" className="breathe-circle" /> : null}

        {connected ? (
          <div className="call-room__participants">
            <div className="call-participant">
              <div className="call-participant__avatar">
                <Avatar id={details.local.id} name={details.local.name} size={96} />
                {localMuted ? <MutedBadge name={details.local.name} /> : null}
              </div>
              <strong>{details.local.name}</strong>
              <span>You</span>
            </div>
            <div className="call-participant">
              <div className="call-participant__avatar">
                <Avatar id={details.remote.id} name={details.remote.name} size={96} />
                {peerMuted ? <MutedBadge name={details.remote.name} /> : null}
              </div>
              <strong>{details.remote.name}</strong>
              <span>{audience === 'user' ? 'Astrologer' : 'Caller'}</span>
            </div>
          </div>
        ) : null}

        {ended ? (
          <Link
            className="button button--primary call-room__back"
            to={audience === 'user' ? '/history' : '/astrologer?section=bookings'}
          >
            {audience === 'user' ? 'Back to History' : 'Back to Bookings'}
          </Link>
        ) : null}

        {started && !ended && !localJoined ? (
          <div className="call-room__join">
            {microphoneError ? <p className="field__error" role="alert">{microphoneError}</p> : null}
            {connectionError ? <p className="field__error" role="alert">{connectionError}</p> : null}
            <Button disabled={joining} onClick={() => void joinCall()}>
              {joining ? 'Joining…' : microphoneError ? 'Try again' : 'Join call'}
            </Button>
          </div>
        ) : null}

        {started && !ended && localJoined ? (
          <div aria-label="Call controls" className="call-room__controls" role="group">
            <button
              aria-pressed={localMuted}
              className="call-room-control"
              onClick={toggleMute}
              type="button"
            >
              <span className="call-room-control__icon"><MicrophoneIcon muted={localMuted} /></span>
              <span>{localMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button className="call-room-control call-room-control--leave" onClick={leaveCall} type="button">
              <span className="call-room-control__icon"><LeaveIcon /></span>
              <span>Leave call</span>
            </button>
          </div>
        ) : null}

        {connectionError && localJoined ? (
          <p className="field__error" role="alert">{connectionError}</p>
        ) : null}
        <audio aria-hidden="true" autoPlay ref={audioRef} />
      </Card>
    </main>
  )
}

