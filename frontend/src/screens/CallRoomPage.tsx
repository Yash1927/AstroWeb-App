import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AstrologerBooking, UserBooking } from '../api/booking-history'
import { AstrologerApiError, astrologerApi } from '../api/astrologer'
import { callApi } from '../api/calls'
import { userApi, UserApiError } from '../api/user'
import { AudioPeer, type OutgoingCallSignal } from '../call/audio-peer'
import {
  callWebSocketUrl,
  parseServerCallMessage,
  type CallParticipant,
} from '../call/protocol'
import { SpeakingMonitor } from '../call/speaking-monitor'
import { forceRelayForDevelopment, formatTimeLeft, secondsLeft } from '../call/timer'
import { formatBookingTime } from '../booking-display'
import {
  Avatar,
  BookingListSkeleton,
  BottomSheet,
  Button,
  Card,
  Toast,
  UserSignIn,
} from '../components'
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

type ChatMessage = {
  from: 'local' | 'remote'
  id: number
  text: string
}

type ToastState = {
  kind: 'success' | 'error'
  message: string
} | null

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
const CHAT_INTERVAL_MS = 1_000
const MAX_BROWSER_TIMEOUT_MS = 2_147_483_647

function supportsSpeakerSelection() {
  return typeof HTMLMediaElement !== 'undefined'
    && typeof (HTMLMediaElement.prototype as HTMLMediaElement & {
      setSinkId?: (sinkId: string) => Promise<void>
    }).setSinkId === 'function'
}

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

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10v4h4l5 4V6L8 10zM17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h16v12H9l-5 4z" />
      <path d="M8 9h8M8 13h5" />
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
  const [callNow, setCallNow] = useState(() => Date.now())
  const [chatOpen, setChatOpen] = useState(false)
  const [chatText, setChatText] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatReady, setChatReady] = useState(true)
  const [localSpeaking, setLocalSpeaking] = useState(false)
  const [peerSpeaking, setPeerSpeaking] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<AudioPeer | null>(null)
  const peerPresentRef = useRef(false)
  const localMutedRef = useRef(false)
  const connectionTimeoutRef = useRef<number | null>(null)
  const chatReadyTimeoutRef = useRef<number | null>(null)
  const lastChatAtRef = useRef(0)
  const nextChatIdRef = useRef(1)
  const localSpeakingRef = useRef<SpeakingMonitor | null>(null)
  const peerSpeakingRef = useRef<SpeakingMonitor | null>(null)
  const replacingMicrophoneRef = useRef(false)
  const joinAttemptRef = useRef(0)
  const mountedRef = useRef(true)
  const now = useBookingClock(details ? [details.booking] : [])

  useEffect(() => {
    if (!details) return
    const startsAt = Date.parse(details.booking.startsAt)
    const endsAt = Date.parse(details.booking.endsAt)
    let interval: number | null = null
    const update = () => {
      const current = Date.now()
      setCallNow(current)
      if (current >= endsAt && interval !== null) {
        window.clearInterval(interval)
        interval = null
      }
    }
    const beginCountdown = () => {
      update()
      if (Date.now() < endsAt) interval = window.setInterval(update, 1_000)
    }
    const current = Date.now()
    const startDelay = Math.max(0, startsAt - current + 1)
    const startTimeout = current < endsAt && startDelay <= MAX_BROWSER_TIMEOUT_MS
      ? window.setTimeout(beginCountdown, startDelay)
      : null
    return () => {
      if (startTimeout !== null) window.clearTimeout(startTimeout)
      if (interval !== null) window.clearInterval(interval)
    }
  }, [details, now])

  const stopSpeakingMonitors = useCallback(() => {
    localSpeakingRef.current?.stop()
    peerSpeakingRef.current?.stop()
    localSpeakingRef.current = null
    peerSpeakingRef.current = null
    if (mountedRef.current) {
      setLocalSpeaking(false)
      setPeerSpeaking(false)
    }
  }, [])

  const monitorLocalStream = useCallback((stream: MediaStream) => {
    localSpeakingRef.current?.stop()
    setLocalSpeaking(false)
    try {
      localSpeakingRef.current = new SpeakingMonitor(stream, setLocalSpeaking)
    } catch {
      localSpeakingRef.current = null
      setLocalSpeaking(false)
    }
  }, [])

  const monitorRemoteStream = useCallback((stream: MediaStream | null) => {
    peerSpeakingRef.current?.stop()
    peerSpeakingRef.current = null
    setPeerSpeaking(false)
    if (!stream) return
    try {
      peerSpeakingRef.current = new SpeakingMonitor(stream, setPeerSpeaking)
    } catch {
      peerSpeakingRef.current = null
    }
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

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
    if (chatReadyTimeoutRef.current !== null) {
      window.clearTimeout(chatReadyTimeoutRef.current)
      chatReadyTimeoutRef.current = null
    }
    stopSpeakingMonitors()
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
    replacingMicrophoneRef.current = false
    if (audioRef.current) audioRef.current.srcObject = null
    if (updateState && mountedRef.current) {
      setJoining(false)
      setLocalJoined(false)
      setPeerPresent(false)
      setPeerMuted(false)
      setLocalMuted(false)
      setChatOpen(false)
      setChatText('')
      setChatMessages([])
      setChatReady(true)
    }
  }, [clearConnectionTimeout, stopSpeakingMonitors])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopConnection(true, false)
    }
  }, [stopConnection])

  const currentNow = Math.max(now, callNow)
  const ended = details ? currentNow >= Date.parse(details.booking.endsAt) : false
  const started = details ? currentNow >= Date.parse(details.booking.startsAt) : false

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

    const [captureResult, iceServerResult] = await Promise.allSettled([
      navigator.mediaDevices?.getUserMedia
        ? navigator.mediaDevices.getUserMedia(microphoneConstraints)
        : Promise.reject(new Error('unsupported')),
      callApi.getIceServers(details.booking.id),
    ])

    if (captureResult.status === 'rejected') {
      if (attempt !== joinAttemptRef.current) return
      setJoining(false)
      setMicrophoneError(
        "Microphone access is blocked. In your browser's site settings, allow the microphone for this site, then try again.",
      )
      return
    }
    const stream = captureResult.value

    if (iceServerResult.status === 'rejected') {
      for (const track of stream.getTracks()) track.stop()
      if (attempt !== joinAttemptRef.current) return
      setJoining(false)
      setConnectionError(
        iceServerResult.reason instanceof Error
          ? iceServerResult.reason.message
          : 'Call audio is unavailable. Please try again.',
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
    monitorLocalStream(stream)
    const peer = new AudioPeer({
      forceRelay: forceRelayForDevelopment(
        import.meta.env.DEV,
        import.meta.env.VITE_FORCE_RELAY,
      ),
      iceServers: iceServerResult.value,
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
        monitorRemoteStream(remoteStream)
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
        if (message.muted) setPeerSpeaking(false)
        return
      }
      if (message.type === 'chat' && message.from === otherRole) {
        setChatMessages((messages) => [...messages, {
          from: 'remote',
          id: nextChatIdRef.current++,
          text: message.text,
        }])
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
    socket.onclose = (event) => {
      if (socketRef.current !== socket) return
      socketRef.current = null
      clearConnectionTimeout()
      if (chatReadyTimeoutRef.current !== null) {
        window.clearTimeout(chatReadyTimeoutRef.current)
        chatReadyTimeoutRef.current = null
      }
      peerRef.current?.close()
      peerRef.current = null
      for (const track of streamRef.current?.getTracks() ?? []) track.stop()
      streamRef.current = null
      peerPresentRef.current = false
      localMutedRef.current = false
      stopSpeakingMonitors()
      if (!mountedRef.current) return
      setJoining(false)
      setLocalJoined(false)
      setPeerPresent(false)
      setPeerMuted(false)
      setLocalMuted(false)
      setChatOpen(false)
      setChatText('')
      setChatMessages([])
      setChatReady(true)
      if (event.code === 4000) {
        setCallNow(Date.parse(details.booking.endsAt))
      } else if (Date.now() < Date.parse(details.booking.endsAt)) {
        setConnectionError('The call connection ended. Choose Join call to reconnect.')
      }
    }
  }

  const replaceDefaultMicrophone = useCallback(async () => {
    if (replacingMicrophoneRef.current || !peerRef.current || !streamRef.current) return
    replacingMicrophoneRef.current = true
    const attempt = joinAttemptRef.current
    let replacementStream: MediaStream | null = null
    try {
      replacementStream = await navigator.mediaDevices.getUserMedia(microphoneConstraints)
      const nextTrack = replacementStream.getAudioTracks()[0]
      if (!nextTrack) throw new Error('No microphone is available.')
      if (attempt !== joinAttemptRef.current || !peerRef.current) {
        for (const track of replacementStream.getTracks()) track.stop()
        return
      }
      nextTrack.enabled = !localMutedRef.current
      await peerRef.current.replaceLocalAudioTrack(nextTrack)
      for (const track of replacementStream.getTracks()) {
        if (track !== nextTrack) track.stop()
      }
      if (streamRef.current) monitorLocalStream(streamRef.current)
      setToast({ kind: 'success', message: 'Audio device changed.' })
    } catch {
      for (const track of replacementStream?.getTracks() ?? []) {
        if (!streamRef.current?.getTracks().includes(track)) track.stop()
      }
    } finally {
      replacingMicrophoneRef.current = false
    }
  }, [monitorLocalStream])

  useEffect(() => {
    if (!localJoined || !navigator.mediaDevices?.addEventListener) return
    const handleDeviceChange = () => { void replaceDefaultMicrophone() }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [localJoined, replaceDefaultMicrophone])

  async function switchSpeaker() {
    const audio = audioRef.current as (HTMLAudioElement & {
      setSinkId?: (sinkId: string) => Promise<void>
      sinkId?: string
    }) | null
    if (!audio?.setSinkId) return
    try {
      const outputs = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audiooutput')
      if (!outputs.length) {
        setToast({ kind: 'error', message: 'No audio output is available.' })
        return
      }
      const currentSinkId = audio.sinkId || 'default'
      const currentIndex = outputs.findIndex((device) => device.deviceId === currentSinkId)
      const next = outputs[(currentIndex + 1) % outputs.length]!
      await audio.setSinkId(next.deviceId)
      setToast({ kind: 'success', message: 'Audio output changed.' })
    } catch {
      setToast({ kind: 'error', message: 'Audio output could not be changed.' })
    }
  }

  function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = chatText.trim()
    const socket = socketRef.current
    if (!text || text.length > 500 || !peerPresentRef.current) return
    const sentAt = Date.now()
    if (!chatReady || sentAt - lastChatAtRef.current < CHAT_INTERVAL_MS) return
    if (socket?.readyState !== WebSocket.OPEN) return

    socket.send(JSON.stringify({ type: 'chat', text }))
    setChatMessages((messages) => [...messages, {
      from: 'local',
      id: nextChatIdRef.current++,
      text,
    }])
    setChatText('')
    lastChatAtRef.current = sentAt
    setChatReady(false)
    chatReadyTimeoutRef.current = window.setTimeout(() => {
      chatReadyTimeoutRef.current = null
      setChatReady(true)
    }, CHAT_INTERVAL_MS)
  }

  function toggleMute() {
    const muted = !localMutedRef.current
    localMutedRef.current = muted
    for (const track of streamRef.current?.getAudioTracks() ?? []) track.enabled = !muted
    setLocalMuted(muted)
    if (muted) setLocalSpeaking(false)
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
  const remainingSeconds = details ? secondsLeft(details.booking.endsAt, currentNow) : 0
  const showTwoMinuteNotice = connected && remainingSeconds > 0 && remainingSeconds <= 120
  const speakerSelectionAvailable = supportsSpeakerSelection()

  return (
    <main className="call-room-page screen">
      <Card className="call-room">
        <h1>Call room</h1>
        <p aria-live="polite" className="call-room__state" role="status">{stateMessage}</p>

        {connected ? (
          <div aria-label={`${formatTimeLeft(remainingSeconds)} remaining`} className="call-room__timer">
            <span>Time left</span>
            <strong>{formatTimeLeft(remainingSeconds)}</strong>
          </div>
        ) : null}

        {showTwoMinuteNotice ? (
          <p aria-live="polite" className="call-room__notice" role="status">2 minutes left.</p>
        ) : null}

        {waiting ? <div aria-hidden="true" className="breathe-circle" /> : null}

        {connected ? (
          <div className="call-room__participants">
            <div className="call-participant">
              <div className={`call-participant__avatar${localSpeaking && !localMuted ? ' call-participant__avatar--speaking' : ''}`}>
                <Avatar id={details.local.id} name={details.local.name} size={96} />
                {localMuted ? <MutedBadge name={details.local.name} /> : null}
              </div>
              <strong>{details.local.name}</strong>
              <span>You</span>
            </div>
            <div className="call-participant">
              <div className={`call-participant__avatar${peerSpeaking && !peerMuted ? ' call-participant__avatar--speaking' : ''}`}>
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
            {speakerSelectionAvailable ? (
              <button className="call-room-control" onClick={() => void switchSpeaker()} type="button">
                <span className="call-room-control__icon"><SpeakerIcon /></span>
                <span>Speaker</span>
              </button>
            ) : null}
            <button className="call-room-control" onClick={() => setChatOpen(true)} type="button">
              <span className="call-room-control__icon"><ChatIcon /></span>
              <span>Chat</span>
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
      <BottomSheet onClose={() => setChatOpen(false)} open={chatOpen && localJoined && !ended} title="Call chat">
        <div className="call-chat">
          <div
            aria-live="polite"
            aria-relevant="additions"
            className="call-chat__messages"
          >
            {chatMessages.length ? chatMessages.map((message) => (
              <div
                className={`chat-message chat-message--${message.from}`}
                key={message.id}
              >
                <strong>{message.from === 'local' ? 'You' : details.remote.name}</strong>
                <span>{message.text}</span>
              </div>
            )) : <p className="call-chat__empty">No messages yet.</p>}
          </div>
          <form className="call-chat__form" onSubmit={sendChatMessage}>
            <label className="field__label" htmlFor="call-chat-message">Message</label>
            <textarea
              className="input call-chat__input"
              id="call-chat-message"
              maxLength={500}
              onChange={(event) => setChatText(event.target.value)}
              placeholder="Write a message"
              rows={3}
              value={chatText}
            />
            <div className="call-chat__actions">
              <span className="field__hint">{chatText.length}/500</span>
              <Button
                disabled={!chatReady || !peerPresent || !chatText.trim()}
                type="submit"
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>
      <Toast
        kind={toast?.kind}
        message={toast?.message ?? ''}
        onDismiss={dismissToast}
        open={Boolean(toast)}
      />
    </main>
  )
}

