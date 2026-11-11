import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths let dist/ work on any static host, including
  // GitHub Pages project sites, Netlify, Vercel, or a plain file server.
  base: './',
  plugins: [react()],
})
