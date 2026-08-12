import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/botc/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor';
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('framer-motion') || id.includes('tailwind') || id.includes('clsx')) return 'ui';
            return 'deps';
          }
        }
      }
    }
  }
})
