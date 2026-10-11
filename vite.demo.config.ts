import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const scriptClassico: Plugin = {
  name: 'script-classico',
  enforce: 'post',
  transformIndexHtml: html => html
    .replace(/<script type="module" crossorigin/g, '<script defer')
    .replace(/ crossorigin/g, ''),
};

// Build della demo per la documentazione (demo.html → docs/demo/), pubblicata su GitHub Pages.
// Un solo script classico (iife, niente type="module" né crossorigin): così la demo si apre
// anche da disco (file://), dove il browser blocca moduli e risorse con CORS.
// envPrefix diverso da VITE_: nessuna variabile di .env.local (chiavi Firebase, ID dei fogli)
// può finire nei file pubblici della demo.
export default defineConfig({
  plugins: [react(), tailwindcss(), scriptClassico],
  base: './',
  envPrefix: 'WALLY_DEMO_',
  esbuild: { pure: ['console.log'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  build: {
    outDir: 'docs/demo',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'demo.html'),
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
