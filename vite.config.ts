/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serverer appen fra /<repo-navn>/. Workflowen setter VITE_BASE.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: base,
        name: 'Cut – 12 uker',
        short_name: 'Cut',
        description: 'Trening, mat og fremgang for 12-ukers cut',
        lang: 'nb',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#090b0f',
        theme_color: '#090b0f',
        categories: ['health', 'fitness'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Android viser et installeringsvindu med skjermbilder (som i en appbutikk).
        screenshots: [
          {
            src: 'screenshots/i-dag.jpg',
            sizes: '1080x2340',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'I dag: fremdrift, vekt, skritt og dagens økt',
          },
          {
            src: 'screenshots/okt.jpg',
            sizes: '1080x2340',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Økt med øvelsesbilder, sett og pausetimer',
          },
          {
            src: 'screenshots/kalender.jpg',
            sizes: '1080x2340',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Kalender: hele planen uke for uke',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webmanifest,ico}'],
        // Skjermbildene brukes bare av installeringsvinduet, ikke i appen.
        globIgnores: ['screenshots/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Bilder for egne øvelser som ikke ligger i appen, hentes fra Free Exercise DB og caches.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images-remote',
              expiration: { maxEntries: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
