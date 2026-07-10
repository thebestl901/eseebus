import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'eseebus-app-icon.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/data\.etabus\.gov\.hk\/v1\/transport\/kmb\/(route\/|stop)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kmb-static-data',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/kmb': {
        target: 'https://data.etabus.gov.hk/v1/transport/kmb',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kmb/, ''),
      },
      '/api/citybus': {
        target: 'https://rt.data.gov.hk/v2/transport/citybus',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/citybus/, ''),
      },
      '/api/gmb': {
        target: 'https://data.etagmb.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gmb/, ''),
      },
      '/api/mtr-bus': {
        target: 'https://rt.data.gov.hk/v1/transport/mtr/bus',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mtr-bus/, ''),
      },
      '/api/mtr-data': {
        target: 'https://opendata.mtr.com.hk/data',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mtr-data/, ''),
      },
      '/api/nlb': {
        target: 'https://rt.data.gov.hk/v1/transport/nlb',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nlb/, ''),
      },
      '/api/hko': {
        target: 'https://data.weather.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hko/, ''),
      },
    },
  },
})
