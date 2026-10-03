import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './Button'

type Props = {
  file: File
  onCancel: () => void
  onCrop: (file: File) => void
  onError: (message: string) => void
}

type ImageSize = { height: number; width: number }

export function ProfilePhotoCropper({ file, onCancel, onCrop, onError }: Props) {
  const image = useRef<HTMLImageElement>(null)
  const source = useMemo(() => URL.createObjectURL(file), [file])
  const [busy, setBusy] = useState(false)
  const [horizontal, setHorizontal] = useState(50)
  const [vertical, setVertical] = useState(50)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState<ImageSize | null>(null)

  useEffect(() => () => URL.revokeObjectURL(source), [source])

  const geometry = size ? (() => {
    const baseScale = Math.max(1 / size.width, 1 / size.height)
    const width = size.width * baseScale * zoom * 100
    const height = size.height * baseScale * zoom * 100
    return {
      height,
      left: -((width - 100) * horizontal) / 100,
      top: -((height - 100) * vertical) / 100,
      width,
    }
  })() : null

  const finishCrop = async () => {
    if (!image.current || !size) return
    setBusy(true)
    try {
      const outputSize = 512
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Photo cropping is unavailable in this browser.')
      const baseScale = Math.max(outputSize / size.width, outputSize / size.height)
      const scale = baseScale * zoom
      const drawnWidth = size.width * scale
      const drawnHeight = size.height * scale
      const left = -((drawnWidth - outputSize) * horizontal) / 100
      const top = -((drawnHeight - outputSize) * vertical) / 100
      context.drawImage(image.current, left, top, drawnWidth, drawnHeight)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The crop could not be created.')), 'image/webp', 0.9)
      })
      onCrop(new File([blob], 'profile-photo.webp', { type: 'image/webp' }))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The crop could not be created.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="photo-crop-heading" className="profile-cropper">
      <div>
        <h3 id="photo-crop-heading">Crop your photo</h3>
        <p className="field__hint">Zoom and move the crop until your face is centred in the square.</p>
      </div>
      <div className="profile-cropper__frame">
        <img
          alt="Square profile crop preview"
          draggable={false}
          onLoad={(event) => setSize({ height: event.currentTarget.naturalHeight, width: event.currentTarget.naturalWidth })}
          ref={image}
          src={source}
          style={geometry ? { height: `${geometry.height}%`, left: `${geometry.left}%`, top: `${geometry.top}%`, width: `${geometry.width}%` } : undefined}
        />
      </div>
      <label className="field">
        <span className="field__label">Zoom</span>
        <input aria-label="Photo zoom" max="3" min="1" onChange={(event) => setZoom(Number(event.target.value))} step="0.05" type="range" value={zoom} />
      </label>
      <div className="profile-cropper__position">
        <label className="field">
          <span className="field__label">Move left or right</span>
          <input aria-label="Horizontal crop position" max="100" min="0" onChange={(event) => setHorizontal(Number(event.target.value))} type="range" value={horizontal} />
        </label>
        <label className="field">
          <span className="field__label">Move up or down</span>
          <input aria-label="Vertical crop position" max="100" min="0" onChange={(event) => setVertical(Number(event.target.value))} type="range" value={vertical} />
        </label>
      </div>
      <div className="astrologer-form-actions">
        <Button disabled={busy || !size} onClick={() => void finishCrop()} type="button">{busy ? 'Cropping…' : 'Use this crop'}</Button>
        <Button disabled={busy} onClick={onCancel} type="button" variant="secondary">Choose another photo</Button>
      </div>
    </section>
  )
}
