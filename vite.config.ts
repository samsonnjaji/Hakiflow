import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'katiba-icon.png', 'katiba-wordmark.png', 'katiba-icon-192.png', 'katiba-icon-512.png'],
      manifest: {
        name: 'Katiba OS — Intelligent Legal Infrastructure',
        short_name: 'Katiba OS',
        description: 'An offline-first small claims evidence and filing copilot for Kenya.',
        theme_color: '#102a24',
        background_color: '#f4f1e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/katiba-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/katiba-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly',
        }],
      },
    }),
  ],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } },
})
