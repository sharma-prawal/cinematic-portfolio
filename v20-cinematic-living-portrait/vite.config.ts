import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({ root, plugins: [react()], cacheDir: './node_modules/.vite', server: { host: '127.0.0.1', port: 4320, strictPort: true, fs: { strict: true, allow: [root] } } });
