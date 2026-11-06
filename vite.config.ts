import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// BASE is set by the GitHub Pages build ("/Aurora/"); locally the app is served from the root.
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5190, strictPort: true },
})
