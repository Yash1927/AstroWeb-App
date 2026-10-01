export type RealtimeIceCandidate = {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  usernameFragment?: string | null
}

export type OutgoingCallSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice-candidate'; candidate: RealtimeIceCandidate }

type AudioPeerOptions = {
  onConnectionStateChange: (state: RTCPeerConnectionState) => void
  onRemoteStream: (stream: MediaStream | null) => void
  polite: boolean
  send: (signal: OutgoingCallSignal) => void
  stream: MediaStream
}

const peerConfiguration: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export class AudioPeer {
  private connection: RTCPeerConnection | null = null
  private ignoreOffer = false
  private isSettingRemoteAnswerPending = false
  private makingOffer = false
  private readonly options: AudioPeerOptions
  private readonly remoteStream = new MediaStream()

  constructor(options: AudioPeerOptions) {
    this.options = options
    this.createConnection()
  }

  private createConnection() {
    const connection = new RTCPeerConnection(peerConfiguration)
    this.connection = connection
    this.ignoreOffer = false
    this.isSettingRemoteAnswerPending = false
    this.makingOffer = false
    for (const track of this.options.stream.getAudioTracks()) {
      connection.addTrack(track, this.options.stream)
    }
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const value = candidate.toJSON()
        this.options.send({
          type: 'ice-candidate',
          candidate: {
            candidate: value.candidate ?? '',
            sdpMid: value.sdpMid ?? null,
            sdpMLineIndex: value.sdpMLineIndex ?? null,
            usernameFragment: value.usernameFragment ?? null,
          },
        })
      }
    }
    connection.ontrack = ({ track }) => {
      if (!this.remoteStream.getTracks().some((candidate) => candidate.id === track.id)) {
        this.remoteStream.addTrack(track)
      }
      this.options.onRemoteStream(this.remoteStream)
    }
    connection.onconnectionstatechange = () => {
      if (this.connection === connection) {
        this.options.onConnectionStateChange(connection.connectionState)
      }
    }
    connection.onnegotiationneeded = () => {
      void this.negotiate().catch(() => undefined)
    }
  }

  private async negotiate() {
    const connection = this.connection
    if (!connection || connection.signalingState === 'closed') return
    try {
      this.makingOffer = true
      await connection.setLocalDescription()
      if (this.connection !== connection) return
      const description = connection.localDescription
      if (description?.sdp && (description.type === 'offer' || description.type === 'answer')) {
        this.options.send({ type: description.type, sdp: description.sdp })
      }
    } finally {
      if (this.connection === connection) this.makingOffer = false
    }
  }

  resetForPeer() {
    if (this.connection) {
      this.connection.onconnectionstatechange = null
      this.connection.close()
    }
    for (const track of this.remoteStream.getTracks()) this.remoteStream.removeTrack(track)
    this.options.onRemoteStream(null)
    this.createConnection()
  }

  async receiveDescription(type: 'offer' | 'answer', sdp: string) {
    const connection = this.connection
    if (!connection || connection.signalingState === 'closed') return
    const description = { type, sdp } satisfies RTCSessionDescriptionInit
    const readyForOffer = !this.makingOffer
      && (connection.signalingState === 'stable' || this.isSettingRemoteAnswerPending)
    const offerCollision = type === 'offer' && !readyForOffer
    this.ignoreOffer = !this.options.polite && offerCollision
    if (this.ignoreOffer) return

    this.isSettingRemoteAnswerPending = type === 'answer'
    try {
      await connection.setRemoteDescription(description)
    } finally {
      if (this.connection === connection) this.isSettingRemoteAnswerPending = false
    }
    if (this.connection !== connection) return
    if (type === 'offer') await this.negotiate()
  }

  async receiveIceCandidate(candidate: RealtimeIceCandidate) {
    const connection = this.connection
    if (!connection || connection.signalingState === 'closed') return
    try {
      await connection.addIceCandidate(candidate)
    } catch (error) {
      if (!this.ignoreOffer) throw error
    }
  }

  close() {
    if (this.connection) {
      this.connection.onconnectionstatechange = null
      this.connection.close()
    }
    this.connection = null
    for (const track of this.remoteStream.getTracks()) this.remoteStream.removeTrack(track)
    this.options.onRemoteStream(null)
  }
}

