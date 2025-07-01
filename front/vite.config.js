import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['cdfa-2402-a00-152-6ff8-a574-690c-2627-3606.ngrok-free.app'],
  },
})
