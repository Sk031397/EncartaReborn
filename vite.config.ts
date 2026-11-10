/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Encarta Reborn — offline-first PWA. The service worker precaches the app shell
// and the bundled data snapshot so the app works with no network (Req 1).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['data/snapshot.json', 'icons/*.png'],
      workbox: {
        // Images are bundled (public/media) so articles work offline and never
        // contact another site; they must be precached along with the shell.
        globPatterns: ['**/*.{js,css,html,json,svg,png,jpg,jpeg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Encarta Reborn',
        short_name: 'Encarta',
        description:
          'A calm, offline-first, algorithm-free encyclopedia for exploring real places.',
        theme_color: '#0e1626',
        background_color: '#0e1626',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
