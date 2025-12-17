import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/Millionaires-Club/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {
            // Cache busting: hash filenames to prevent caching
            entryFileNames: 'js/[name]-[hash].js',
            chunkFileNames: 'js/[name]-[hash].js',
            assetFileNames: '[ext]/[name]-[hash][extname]'
          }
        },
        // Ensure consistent builds
        minify: 'terser',
        sourcemap: false
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
