import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// يُبنى الإنتاج إلى جذر المستودع (index.html + assets/) ليتوافق مع نشر Hostinger
// الذي يخدم جذر المستودع كـ public_html. emptyOutDir=false حتى لا يُحذف مجلد api/.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: resolve(__dirname, '..'),
    emptyOutDir: false,
    assetsDir: 'assets',
  },
});
