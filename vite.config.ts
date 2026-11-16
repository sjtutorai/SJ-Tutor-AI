import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const fallbackKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY_1,
    process.env.VITE_GEMINI_API_KEY_2,
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.API_KEY,
    env.VITE_GEMINI_API_KEY,
    env.VITE_GEMINI_API_KEY_1,
    env.VITE_GEMINI_API_KEY_2,
  ]
    .map((k) => (k || '').trim())
    .filter((k) => k.length > 5 && k !== 'undefined' && k !== 'null');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __FALLBACK_GEMINI_KEYS__: JSON.stringify(Array.from(new Set(fallbackKeys))),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false,
      ws: false,
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