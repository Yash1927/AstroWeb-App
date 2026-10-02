const SPEAKING_THRESHOLD = 0.04

export function audioLevel(samples: Uint8Array<ArrayBuffer>) {
  let sum = 0
  for (const sample of samples) {
    const normalized = (sample - 128) / 128
    sum += normalized * normalized
  }
  return Math.sqrt(sum / samples.length)
}

export function isSpeaking(samples: Uint8Array<ArrayBuffer>) {
  return audioLevel(samples) >= SPEAKING_THRESHOLD
}

export class SpeakingMonitor {
  private readonly analyser: AnalyserNode
  private readonly context: AudioContext
  private frame: number | null = null
  private lastValue = false
  private readonly onChange: (speaking: boolean) => void
  private readonly samples: Uint8Array<ArrayBuffer>
  private readonly source: MediaStreamAudioSourceNode

  constructor(stream: MediaStream, onChange: (speaking: boolean) => void) {
    this.context = new AudioContext()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 512
    this.samples = new Uint8Array(this.analyser.fftSize)
    this.source = this.context.createMediaStreamSource(stream)
    this.source.connect(this.analyser)
    this.onChange = onChange
    void this.context.resume().catch(() => undefined)
    this.read()
  }

  private read = () => {
    this.analyser.getByteTimeDomainData(this.samples)
    const value = isSpeaking(this.samples)
    if (value !== this.lastValue) {
      this.lastValue = value
      this.onChange(value)
    }
    this.frame = window.requestAnimationFrame(this.read)
  }

  stop() {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame)
    this.source.disconnect()
    this.analyser.disconnect()
    void this.context.close().catch(() => undefined)
  }
}
