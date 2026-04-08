import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/aravind-portfolio/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
  },
});
