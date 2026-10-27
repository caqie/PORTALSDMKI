import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const spaFallbackPlugin = {
  name: 'cloudflare-spa-fallback',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distDir, 'index.html');
    const fallbackPath = path.join(distDir, '200.html');
    try {
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, fallbackPath);
        console.log('[cloudflare-spa-fallback] Successfully generated dist/200.html for Cloudflare Pages SPA routing');
      }
    } catch (err) {
      console.warn('[cloudflare-spa-fallback] Could not create dist/200.html:', err);
    }
  }
};

export default defineConfig({
  plugins: [react(), spaFallbackPlugin],
  server: {
    hmr: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@vladmandic/face-api')) return 'vendor-faceapi';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('docx') || id.includes('file-saver') || id.includes('html-docx-js-typescript')) return 'vendor-docx';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@google/genai')) return 'vendor-genai';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
          }
        }
      }
    }
  }
});
