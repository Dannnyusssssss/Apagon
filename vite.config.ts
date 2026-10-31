import { defineConfig, type Plugin } from 'vitest/config';
import { DESCRIPTION, THEME_COLOR, TITLE } from './src/data/meta.ts';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Injects title, description and theme color into index.html so they live in single constants.
function injectMeta(): Plugin {
  return {
    name: 'inject-meta',
    transformIndexHtml(html) {
      return html
        .replace('%GAME_TITLE%', escapeHtml(TITLE))
        .replace('%GAME_DESCRIPTION%', escapeHtml(DESCRIPTION))
        .replace('%THEME_COLOR%', escapeHtml(THEME_COLOR));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [injectMeta()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
