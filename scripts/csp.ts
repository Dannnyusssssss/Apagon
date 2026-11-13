/**
 * Content Security Policy of the published page, matched to what the build loads:
 * one own module script, one own stylesheet and the own favicon. Audio is synthesized
 * with WebAudio, sprites are in-memory canvases, fonts are the system ones, and nothing
 * is fetched, so everything else stays closed. `frame-ancestors` is left out: a <meta>
 * policy cannot set it, and the game must stay embeddable in the portal.
 *
 * The build adds it to the page and the dist check compares the page against it.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
