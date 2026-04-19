import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
            return 'vendor-antd'
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts'
          }
          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'vendor-router'
          }
          if (id.includes('react-dom') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('axios') || id.includes('zustand') || id.includes('dayjs')) {
            return 'vendor-misc'
          }
          return 'vendor'
        },
      },
    },
  },
})
