import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix for __dirname in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Code splitting optimization - simplified for better compatibility
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Only split large vendor libraries
          if (id.includes('node_modules')) {
            // React and related libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            // Framer Motion (large animation library)
            if (id.includes('framer-motion')) {
              return 'animation-vendor'
            }
            // Recharts (charting library)
            if (id.includes('recharts')) {
              return 'chart-vendor'
            }
            // Leaflet (mapping library)
            if (id.includes('leaflet')) {
              return 'map-vendor'
            }
            // Other node_modules
            return 'vendor'
          }
          // Don't manually chunk app code - let Vite handle it
        },
        // Simplified file naming for better server compatibility
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minify with esbuild for faster builds
    minify: 'esbuild',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Disable sourcemaps in production for smaller files
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Common JS output format for better compatibility
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    port: 8080,
    host: true,
    strictPort: false,
    // Enable CORS
    cors: true,
    // Warm up frequently used files for faster dev startup
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/Index.tsx',
      ]
    },
    // Vite dev server natively handles SPA routing
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 8080,
    host: true,
    strictPort: false,
    // SPA fallback for preview mode
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      // Pre-bundle Leaflet so ESM named imports (e.g. DomUtil) work with react-leaflet
      'leaflet',
      'react-leaflet',
      '@react-leaflet/core',
    ],
  },
  // Base path for deployment (change if deploying to subdirectory)
  base: '/',
})
