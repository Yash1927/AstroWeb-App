// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioPeer } from './audio-peer'

class FakeMediaStream {
  tracks: MediaStreamTrack[]

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks]
  }

  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track)
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  getTracks() {
    return [...this.tracks]
  }

  removeTrack(track: MediaStreamTrack) {
    this.tracks = this.tracks.filter((candidate) => candidate !== track)
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('AudioPeer', () => {
  it('uses relay-only ICE when requested and replaces the live microphone sender', async () => {
    const oldTrack = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack
    const nextTrack = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack
    const stream = new FakeMediaStream([oldTrack])
    const replaceTrack = vi.fn(async () => undefined)
    let configuration: RTCConfiguration | undefined

    class FakePeerConnection {
      connectionState: RTCPeerConnectionState = 'new'
      localDescription: RTCSessionDescription | null = null
      onconnectionstatechange: (() => void) | null = null
      onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
      onnegotiationneeded: (() => void) | null = null
      ontrack: ((event: RTCTrackEvent) => void) | null = null
      signalingState: RTCSignalingState = 'stable'

      constructor(value: RTCConfiguration) {
        configuration = value
      }

      addIceCandidate = vi.fn(async () => undefined)
      addTrack = vi.fn(() => ({ track: oldTrack, replaceTrack }))
      close = vi.fn()
      getSenders = vi.fn(() => [{ track: oldTrack, replaceTrack }])
      setLocalDescription = vi.fn(async () => undefined)
      setRemoteDescription = vi.fn(async () => undefined)
    }

    vi.stubGlobal('MediaStream', FakeMediaStream)
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
    const peer = new AudioPeer({
      forceRelay: true,
      iceServers: [{ urls: 'turn:turn.example.test:3478' }],
      onConnectionStateChange: vi.fn(),
      onRemoteStream: vi.fn(),
      polite: false,
      send: vi.fn(),
      stream: stream as unknown as MediaStream,
    })

    await peer.replaceLocalAudioTrack(nextTrack)

    expect(configuration).toEqual({
      iceServers: [{ urls: 'turn:turn.example.test:3478' }],
      iceTransportPolicy: 'relay',
    })
    expect(replaceTrack).toHaveBeenCalledWith(nextTrack)
    expect(oldTrack.stop).toHaveBeenCalled()
    expect(stream.getAudioTracks()).toEqual([nextTrack])
  })
})
