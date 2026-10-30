import { defineConfig, type Plugin } from 'vitest/config';
import { TITLE } from './src/data/meta.ts';

// Injects the game title into index.html so it lives in a single constant.
function injectTitle(): Plugin {
  return {
    name: 'inject-title',
    transformIndexHtml(html) {
      return html.replace('%GAME_TITLE%', TITLE);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [injectTitle()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
