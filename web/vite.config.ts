import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function packageChunkName(id: string): string | undefined {
  const marker = '/node_modules/'
  const markerIndex = id.lastIndexOf(marker)
  if (markerIndex === -1) {
    return undefined
  }

  const packagePath = id.slice(markerIndex + marker.length)
  const segments = packagePath.split('/')
  const packageName = segments[0]?.startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]

  if (!packageName) {
    return undefined
  }

  if (packageName === 'react' || packageName === 'react-dom' || packageName === 'react-router-dom' || packageName === 'scheduler') {
    return 'react-vendor'
  }

  if (packageName === 'antd') {
    const antdSegment = segments[2]
    return antdSegment ? `antd-${antdSegment}` : 'antd-core'
  }

  if (packageName === '@ant-design/icons') {
    return 'antd-icons'
  }

  if (packageName.startsWith('rc-')) {
    return `rc-${packageName.slice(3)}`
  }

  if (packageName === 'zustand') {
    return 'state-vendor'
  }

  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return packageChunkName(id)
        },
      },
    },
  },
})
