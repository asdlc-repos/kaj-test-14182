import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// VITE_API_URL is a build-time env var (VITE_* prefix is automatically exposed by Vite).
// Pass it at docker build time: --build-arg VITE_API_URL=http://task-api:9090
export default defineConfig({
  plugins: [react()],
})
