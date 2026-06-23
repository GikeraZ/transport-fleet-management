import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Proxy target must be an absolute URL to the backend server
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3001'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'pwa-*.png'],
        manifest: {
          name: 'Transport and Fleet Management System',
          short_name: 'Fleet Manager',
          description: 'Comprehensive transport and fleet management system for vehicle tracking, maintenance, trips, and driver management.',
          theme_color: '#1e40af',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          id: '/',
          lang: 'en',
          dir: 'ltr',
          prefer_related_applications: false,
          icons: [
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Dashboard',
              short_name: 'Dashboard',
              description: 'View your dashboard',
              url: '/dashboard',
              icons: [{ src: 'icon.svg', sizes: '192x192' }],
            },
            {
              name: 'Trips',
              short_name: 'Trips',
              description: 'Manage trips',
              url: '/admin/trips',
              icons: [{ src: 'icon.svg', sizes: '192x192' }],
            },
          ],
          categories: ['business', 'transportation', 'productivity'],
          screenshots: [],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/offline.html',
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    // VITE_API_BASE_URL used by frontend code for fetch calls (relative path through proxy)
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '/api'),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(env.VITE_SOCKET_URL || 'http://localhost:3001'),
    },
  }
})