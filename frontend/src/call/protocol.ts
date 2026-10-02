import type { RealtimeIceCandidate } from './audio-peer'

export type CallParticipant = 'user' | 'astrologer'

export type ServerCallMessage =
  | { type: 'join'; bookingId: string; participant: CallParticipant }
  | { type: 'leave'; participant: CallParticipant; reason: 'left' | 'ended' }
  | {
    type: 'presence'
    participants: Record<CallParticipant, { muted: boolean; present: boolean }>
  }
  | { type: 'offer' | 'answer'; from: CallParticipant; sdp: string }
  | { type: 'ice-candidate'; from: CallParticipant; candidate: RealtimeIceCandidate }
  | { type: 'mute-state'; participant: CallParticipant; muted: boolean }
  | { type: 'chat'; from: CallParticipant; text: string }

function participant(value: unknown): value is CallParticipant {
  return value === 'user' || value === 'astrologer'
}

function iceCandidate(value: unknown): value is RealtimeIceCandidate {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RealtimeIceCandidate>
  return typeof candidate.candidate === 'string'
    && (candidate.sdpMid === null || typeof candidate.sdpMid === 'string')
    && (candidate.sdpMLineIndex === null || Number.isInteger(candidate.sdpMLineIndex))
}

export function parseServerCallMessage(value: string): ServerCallMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || !(('type') in parsed)) return null
  const message = parsed as Record<string, unknown>
  if (message.type === 'join') {
    return typeof message.bookingId === 'string' && participant(message.participant)
      ? message as ServerCallMessage
      : null
  }
  if (message.type === 'leave') {
    return participant(message.participant)
      && (message.reason === 'left' || message.reason === 'ended')
      ? message as ServerCallMessage
      : null
  }
  if (message.type === 'presence') {
    const people = message.participants
    if (!people || typeof people !== 'object') return null
    const values = people as Record<string, unknown>
    for (const role of ['user', 'astrologer'] as const) {
      const value = values[role]
      if (!value || typeof value !== 'object') return null
      const state = value as Record<string, unknown>
      if (typeof state.present !== 'boolean' || typeof state.muted !== 'boolean') return null
    }
    return message as ServerCallMessage
  }
  if (message.type === 'offer' || message.type === 'answer') {
    return participant(message.from) && typeof message.sdp === 'string'
      ? message as ServerCallMessage
      : null
  }
  if (message.type === 'ice-candidate') {
    return participant(message.from) && iceCandidate(message.candidate)
      ? message as ServerCallMessage
      : null
  }
  if (message.type === 'mute-state') {
    return participant(message.participant) && typeof message.muted === 'boolean'
      ? message as ServerCallMessage
      : null
  }
  if (message.type === 'chat') {
    return participant(message.from)
      && typeof message.text === 'string'
      && message.text.trim().length > 0
      && message.text.length <= 500
      ? message as ServerCallMessage
      : null
  }
  return null
}

export function callWebSocketUrl(participant: CallParticipant) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws?role=${participant}`
}

