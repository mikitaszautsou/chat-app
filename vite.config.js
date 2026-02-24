import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/moonshot': {
        target: 'https://api.moonshot.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/moonshot/, '/v1'),
      },
    },
  },
})
