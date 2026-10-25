import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss()],
    // .env.local sta in cima al progetto, condiviso con il backend Python.
    envDir: '..',
    // Rimuove i console.log dal bundle prod (console.error/warn restano, utili
    // per debug da devtools su un'app single-user senza servizio di logging esterno).
    esbuild: command === 'build' ? { pure: ['console.log'] } : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // In locale le rotte /api/* le serve il backend Python (npm run api).
      // xfwd: il backend vede l'indirizzo di Vite e ci rimanda lì dopo la banca.
      proxy: { '/api': { target: 'http://localhost:8000', xfwd: true } },
    },
  };
});
