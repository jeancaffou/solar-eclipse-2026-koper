import { defineConfig } from 'vite';

// Relative asset URLs keep the built site working at a GitHub Pages project
// path as well as at the local Vite root.
export default defineConfig({
  base: './',
});
