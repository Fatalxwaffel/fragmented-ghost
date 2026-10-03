import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/apps/spectral-studio/',
  plugins: [react()],
  build: {
    outDir: '../../apps/spectral-studio',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
});
