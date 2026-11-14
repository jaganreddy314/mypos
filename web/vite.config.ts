import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // The till has to open with no connection: the app, its font and the menu photos are
    // all kept on the iPad. Database calls are never cached; orders wait in IndexedDB instead.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fish Lips Till',
        short_name: 'Till',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#f6f7f9',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Menu photos come from the online-ordering site's image host.
            urlPattern: /^https:\/\/d2ova09jg8x3xk\.cloudfront\.net\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'menu-photos',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
