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

/**
 * Content Security Policy of the published page, matched to what the build loads:
 * one own module script, one own stylesheet and the own favicon. Audio is synthesized
 * with WebAudio, sprites are in-memory canvases, fonts are the system ones, and nothing
 * is fetched, so everything else stays closed. `frame-ancestors` is left out: a <meta>
 * policy cannot set it, and the game must stay embeddable in the portal.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const CHARSET_TAG = '<meta charset="UTF-8" />';

// Adds the policy and the referrer rule to the built page only: the dev server needs
// inline scripts and a websocket for hot reload, which this policy would block.
function securityMeta(): Plugin {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_TAG)) {
        throw new Error('index.html: charset tag not found, cannot add the security policy');
      }
      return html.replace(
        CHARSET_TAG,
        `${CHARSET_TAG}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />` +
          '\n    <meta name="referrer" content="no-referrer" />',
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [injectMeta(), securityMeta()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // The build makes a single script with no preload links; without the polyfill
    // the page makes no network request at all, which `connect-src 'none'` relies on.
    modulePreload: { polyfill: false },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
