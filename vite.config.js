import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as esbuild from 'esbuild';

/**
 * Dev-only plugin to pre-bundle the curated project icon hub into a single module.
 * Eliminates the HTTP/1.1 waterfall in the browser on cold / incognito tab loads.
 * In production, Vite & Rollup tree-shake normally.
 */
function bundleIconsPlugin() {
  let pending = null;
  return {
    name: 'bundle-icons-hub',
    apply: 'serve',
    handleHotUpdate({ file }) {
      if (file.endsWith('icons.js')) {
        pending = null;
      }
    },
    async transform(_code, id, options) {
      if (options?.ssr) return;

      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (!cleanId.endsWith('/src/components/icons.js')) return;

      pending ??= esbuild
        .build({
          entryPoints: [cleanId],
          bundle: true,
          format: 'esm',
          write: false,
          loader: { '.js': 'jsx' },
          external: ['react', 'react/jsx-runtime', 'react-dom']
        })
        .then((r) => r.outputFiles[0].text);

      try {
        return { code: await pending, map: null };
      } catch (e) {
        pending = null;
        throw e;
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), bundleIconsPlugin()],
  server: {
    host: true,
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/index.css',
        './src/components/icons.js'
      ]
    }
  },
  optimizeDeps: {
    exclude: ['@phosphor-icons/react', 'lucide-react'],
    include: ['react', 'react-dom', 'framer-motion', '@supabase/supabase-js']
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
          }
        }
      }
    }
  }
});
