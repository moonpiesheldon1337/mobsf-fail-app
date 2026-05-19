import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// IMPORTANT: change this to match your repo name on GitHub.
// For https://moonpiesheldon1337.github.io/mobsf-fail-app/ the base is '/mobsf-fail-app/'.
const REPO_BASE = '/mobsf-fail-app/'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? REPO_BASE : '/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 4000,
  },
})
