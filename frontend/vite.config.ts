import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      includeAssets: ['app-icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AstroWebApp',
        short_name: 'AstroWebApp',
        description: 'Book calm, private calls with astrologers.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFBEB',
        theme_color: '#FFFBEB',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{css,html,js,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api(?:\/|$)/,
          /^\/ws(?:\/|$)/,
          /^\/call(?:\/|$)/,
          /^\/astrologer\/call(?:\/|$)/,
          /(?:^|\/)(?:payment|payments|razorpay)(?:\/|$)/i,
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
