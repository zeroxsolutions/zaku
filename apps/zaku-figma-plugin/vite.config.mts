/// <reference types='vitest' />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/zaku-figma-plugin',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    watch: false,
    globals: true,
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.spec.ts'] },
      },
      {
        extends: true,
        // Found mid-run, a dependency is optimised into a second React copy and every hook throws on null.
        optimizeDeps: {
          include: [
            'react',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            '@base-ui/react/button',
            '@base-ui/react/input',
            'class-variance-authority',
            'input-otp',
            'cn',
            'vitest-browser-react',
          ],
        },
        test: {
          name: 'components',
          include: ['src/**/*.spec.tsx'],
          setupFiles: ['src/test/styles.ts'],
          browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: 'chromium' }] },
        },
      },
    ],
  },
}));
