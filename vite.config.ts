import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false,
    },
    build: {
      outDir: 'dist',
      // Increase the warning limit slightly to reduce noise
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manually split vendor chunks to improve caching and reduce single bundle size
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'firebase';
              }
              if (id.includes('@google/genai')) {
                return 'genai';
              }
              if (id.includes('lucide-react')) {
                return 'ui-icons';
              }
              if (id.includes('react-markdown')) {
                return 'markdown';
              }
              return 'vendor';
            }
          }
        }
      }
    }
  };
});