// vite.config.ts
import { defineConfig } from "file:///C:/Users/Lenovo/joyevents/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Lenovo/joyevents/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Lenovo/joyevents/frontend/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    // Code splitting optimization - simplified for better compatibility
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "react-vendor";
            }
            if (id.includes("framer-motion")) {
              return "animation-vendor";
            }
            if (id.includes("recharts")) {
              return "chart-vendor";
            }
            if (id.includes("leaflet")) {
              return "map-vendor";
            }
            return "vendor";
          }
        },
        // Simplified file naming for better server compatibility
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1e3,
    // Minify with esbuild for faster builds
    minify: "esbuild",
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Disable sourcemaps in production for smaller files
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: "esnext",
    // Common JS output format for better compatibility
    commonjsOptions: {
      include: [/node_modules/]
    }
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
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/pages/Index.tsx"
      ]
    },
    // Vite dev server natively handles SPA routing
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 8080,
    host: true,
    strictPort: false
    // SPA fallback for preview mode
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "framer-motion",
      "lucide-react",
      // Pre-bundle Leaflet so ESM named imports (e.g. DomUtil) work with react-leaflet
      "leaflet",
      "react-leaflet",
      "@react-leaflet/core"
    ]
  },
  // Base path for deployment (change if deploying to subdirectory)
  base: "/"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMZW5vdm9cXFxcam95ZXZlbnRzXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMZW5vdm9cXFxcam95ZXZlbnRzXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9MZW5vdm8vam95ZXZlbnRzL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcblxuLy8gRml4IGZvciBfX2Rpcm5hbWUgaW4gRVMgbW9kdWxlc1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSlcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIC8vIENvZGUgc3BsaXR0aW5nIG9wdGltaXphdGlvbiAtIHNpbXBsaWZpZWQgZm9yIGJldHRlciBjb21wYXRpYmlsaXR5XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgLy8gT25seSBzcGxpdCBsYXJnZSB2ZW5kb3IgbGlicmFyaWVzXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgLy8gUmVhY3QgYW5kIHJlbGF0ZWQgbGlicmFyaWVzXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0JykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LWRvbScpIHx8IGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcidcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZyYW1lciBNb3Rpb24gKGxhcmdlIGFuaW1hdGlvbiBsaWJyYXJ5KVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmcmFtZXItbW90aW9uJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdhbmltYXRpb24tdmVuZG9yJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVjaGFydHMgKGNoYXJ0aW5nIGxpYnJhcnkpXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdjaGFydC12ZW5kb3InXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBMZWFmbGV0IChtYXBwaW5nIGxpYnJhcnkpXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2xlYWZsZXQnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ21hcC12ZW5kb3InXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPdGhlciBub2RlX21vZHVsZXNcbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yJ1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBEb24ndCBtYW51YWxseSBjaHVuayBhcHAgY29kZSAtIGxldCBWaXRlIGhhbmRsZSBpdFxuICAgICAgICB9LFxuICAgICAgICAvLyBTaW1wbGlmaWVkIGZpbGUgbmFtaW5nIGZvciBiZXR0ZXIgc2VydmVyIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICAvLyBJbmNyZWFzZSBjaHVuayBzaXplIHdhcm5pbmcgbGltaXRcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgLy8gTWluaWZ5IHdpdGggZXNidWlsZCBmb3IgZmFzdGVyIGJ1aWxkc1xuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIC8vIEVuYWJsZSBDU1MgY29kZSBzcGxpdHRpbmdcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgLy8gRGlzYWJsZSBzb3VyY2VtYXBzIGluIHByb2R1Y3Rpb24gZm9yIHNtYWxsZXIgZmlsZXNcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIC8vIFRhcmdldCBtb2Rlcm4gYnJvd3NlcnMgZm9yIHNtYWxsZXIgYnVuZGxlc1xuICAgIHRhcmdldDogJ2VzbmV4dCcsXG4gICAgLy8gQ29tbW9uIEpTIG91dHB1dCBmb3JtYXQgZm9yIGJldHRlciBjb21wYXRpYmlsaXR5XG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICBpbmNsdWRlOiBbL25vZGVfbW9kdWxlcy9dLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDgwODAsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICAvLyBFbmFibGUgQ09SU1xuICAgIGNvcnM6IHRydWUsXG4gICAgLy8gV2FybSB1cCBmcmVxdWVudGx5IHVzZWQgZmlsZXMgZm9yIGZhc3RlciBkZXYgc3RhcnR1cFxuICAgIHdhcm11cDoge1xuICAgICAgY2xpZW50RmlsZXM6IFtcbiAgICAgICAgJy4vc3JjL21haW4udHN4JyxcbiAgICAgICAgJy4vc3JjL0FwcC50c3gnLFxuICAgICAgICAnLi9zcmMvcGFnZXMvSW5kZXgudHN4JyxcbiAgICAgIF1cbiAgICB9LFxuICAgIC8vIFZpdGUgZGV2IHNlcnZlciBuYXRpdmVseSBoYW5kbGVzIFNQQSByb3V0aW5nXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogODA4MCxcbiAgICBob3N0OiB0cnVlLFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgIC8vIFNQQSBmYWxsYmFjayBmb3IgcHJldmlldyBtb2RlXG4gIH0sXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY3kgcHJlLWJ1bmRsaW5nXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcbiAgICAgICdyZWFjdCcsXG4gICAgICAncmVhY3QtZG9tJyxcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgICAvLyBQcmUtYnVuZGxlIExlYWZsZXQgc28gRVNNIG5hbWVkIGltcG9ydHMgKGUuZy4gRG9tVXRpbCkgd29yayB3aXRoIHJlYWN0LWxlYWZsZXRcbiAgICAgICdsZWFmbGV0JyxcbiAgICAgICdyZWFjdC1sZWFmbGV0JyxcbiAgICAgICdAcmVhY3QtbGVhZmxldC9jb3JlJyxcbiAgICBdLFxuICB9LFxuICAvLyBCYXNlIHBhdGggZm9yIGRlcGxveW1lbnQgKGNoYW5nZSBpZiBkZXBsb3lpbmcgdG8gc3ViZGlyZWN0b3J5KVxuICBiYXNlOiAnLycsXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrUyxTQUFTLG9CQUFvQjtBQUMvVCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBSHVKLElBQU0sMkNBQTJDO0FBTXRPLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRzdELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBLElBRUwsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYyxDQUFDLE9BQU87QUFFcEIsY0FBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBRS9CLGdCQUFJLEdBQUcsU0FBUyxPQUFPLEtBQUssR0FBRyxTQUFTLFdBQVcsS0FBSyxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBQ25GLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxlQUFlLEdBQUc7QUFDaEMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLFVBQVUsR0FBRztBQUMzQixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsU0FBUyxHQUFHO0FBQzFCLHFCQUFPO0FBQUEsWUFDVDtBQUVBLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBRUY7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLHVCQUF1QjtBQUFBO0FBQUEsSUFFdkIsUUFBUTtBQUFBO0FBQUEsSUFFUixjQUFjO0FBQUE7QUFBQSxJQUVkLFdBQVc7QUFBQTtBQUFBLElBRVgsUUFBUTtBQUFBO0FBQUEsSUFFUixpQkFBaUI7QUFBQSxNQUNmLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxJQUVaLE1BQU07QUFBQTtBQUFBLElBRU4sUUFBUTtBQUFBLE1BQ04sYUFBYTtBQUFBLFFBQ1g7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxFQUVkO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQTtBQUFBLE1BRUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLE1BQU07QUFDUixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
