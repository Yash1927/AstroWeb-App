import {
  defineConfig,
  type AssetType,
  type ResolvedAssetSize,
} from '@vite-pwa/assets-generator/config'

function assetName(type: AssetType, size: ResolvedAssetSize) {
  if (type === 'apple') return 'apple-touch-icon.png'
  if (type === 'maskable') return 'maskable-icon-512x512.png'
  return `pwa-${size.width}x${size.height}.png`
}

export default defineConfig({
  images: ['public/app-icon.svg'],
  logLevel: 'silent',
  manifestIconsEntry: false,
  preset: {
    apple: {
      padding: 0,
      resizeOptions: { background: '#FFFBEB', fit: 'contain' },
      sizes: [180],
    },
    assetName,
    maskable: {
      padding: 0,
      resizeOptions: { background: '#FFFBEB', fit: 'contain' },
      sizes: [512],
    },
    png: { compressionLevel: 9, quality: 85 },
    transparent: {
      padding: 0,
      resizeOptions: { background: '#FFFBEB', fit: 'contain' },
      sizes: [192, 512],
    },
  },
})
