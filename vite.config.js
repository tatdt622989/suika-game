// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  root: './',
  base: process.env.NODE_ENV === 'production' ? '/suika_game/' : '/',
  plugins: [eslint()],
});
