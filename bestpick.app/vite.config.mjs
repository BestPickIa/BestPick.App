import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [
    { name: 'existing-jsx', enforce: 'pre', async transform(code, id) {
      if (/\/src\/.*\.js$/.test(id)) return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
    } }, react(), tailwindcss(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  server: { port: 3000 },
  build: { outDir: 'build' },
});
