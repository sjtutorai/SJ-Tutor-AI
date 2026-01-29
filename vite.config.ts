
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the browser environment as per global guidelines
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('lucide-react')) return 'ui-icons';
              if (id.includes('react-markdown')) return 'markdown';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
