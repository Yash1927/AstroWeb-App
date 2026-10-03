import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))

const { data, info } = await sharp(`${publicDirectory}logo.jpg`)
  .extract({ left: 315, top: 185, width: 625, height: 510 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let offset = 0; offset < data.length; offset += info.channels) {
  const red = data[offset]
  const green = data[offset + 1]
  const blue = data[offset + 2]
  const foregroundSignal = Math.max(red - blue - 70, green - blue - 70, 235 - green, 165 - blue)
  data[offset + 3] = Math.max(0, Math.min(255, Math.round((foregroundSignal - 5) * 5.1)))
}

const monogram = await sharp(data, { raw: info })
  .resize({ width: 620, height: 506, fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toBuffer()

const icon = await sharp({
  create: { width: 700, height: 700, channels: 4, background: '#FFFBEB' },
})
  .composite([{ input: monogram, left: 40, top: 97 }])
  .png({ compressionLevel: 9 })
  .toBuffer()

await sharp(icon).toFile(`${publicDirectory}app-icon-source.png`)
await sharp(icon)
  .resize(96, 96)
  .png({ compressionLevel: 9, palette: true })
  .toFile(`${publicDirectory}app-icon-header.png`)
