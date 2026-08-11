import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
// Fix for __dirname in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
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
                './src/main.jsx',
                './src/App.jsx',
                './src/pages/Index.jsx',
            ]
        },
        // Vite dev server natively handles SPA routing
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
            '/ws': {
                target: 'ws://localhost:5000',
                ws: true,
                changeOrigin: true,
                configure: (proxy) => {
                    proxy.on('error', (err) => {
                        if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message?.includes('socket hang up')) {
                            return;
                        }
                        console.warn('[vite] ws proxy error:', err.message);
                    });
                }
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
});
