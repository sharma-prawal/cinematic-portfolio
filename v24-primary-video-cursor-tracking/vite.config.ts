import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], cacheDir: './data/vite-cache', server: { host: '127.0.0.1', port: 4324, strictPort: true }, preview: { host: '127.0.0.1', port: 4324, strictPort: true } });
