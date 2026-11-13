import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../scripts/csp';
import { findDistProblems, type DistFile } from '../scripts/distCheck';

const PAGE = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />
    <meta name="referrer" content="no-referrer" />
    <script type="module" crossorigin src="./assets/index.js"></script>
  </head>
</html>`;

function site(overrides: Partial<Record<string, string>> = {}): DistFile[] {
  // A path set to undefined removes that file from the site.
  const files = new Map<string, string | undefined>([
    ['index.html', PAGE],
    ['assets/index.js', 'const a=document.createElement("p");a.textContent="Apagón";'],
    ['assets/index.css', 'body{font-family:Georgia,serif}'],
    ['favicon.png', ''],
  ]);
  for (const [path, text] of Object.entries(overrides)) files.set(path, text);
  return [...files].flatMap(([path, text]) => (text === undefined ? [] : [{ path, text }]));
}

function problems(overrides: Partial<Record<string, string>> = {}): string[] {
  return findDistProblems(site(overrides), CONTENT_SECURITY_POLICY);
}

describe('dist check', () => {
  it('passes a clean build', () => {
    expect(problems()).toEqual([]);
  });

  it('keeps every source closed except own scripts, styles and images', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/unsafe|https?:|\*/);
  });

  it('fails without the page', () => {
    expect(problems({ 'index.html': undefined })).toEqual(['index.html is missing']);
  });

  it('fails when the policy is missing, changed or doubled', () => {
    const csp = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
    expect(problems({ 'index.html': PAGE.replace(csp, '') })).toHaveLength(1);
    const weaker = PAGE.replace("connect-src 'none'", 'connect-src *');
    expect(problems({ 'index.html': weaker })[0]).toContain('different security policy');
    expect(problems({ 'index.html': PAGE.replace(csp, csp + csp) })[0]).toContain('found 2');
  });

  it('fails without the no-referrer rule', () => {
    const page = PAGE.replace('<meta name="referrer" content="no-referrer" />', '');
    expect(problems({ 'index.html': page })).toEqual([
      'index.html is missing the no-referrer rule',
    ]);
  });

  it('fails on any external address in code, styles or the page', () => {
    expect(problems({ 'assets/index.js': 'fetch2("https://evil.example/x")' })).toEqual([
      'assets/index.js: external address https://evil.example/x',
    ]);
    expect(problems({ 'assets/index.css': '@import url(http://fonts.example/a.css);' })).toEqual([
      'assets/index.css: external address http://fonts.example/a.css',
    ]);
    const script = '<script src="https://cdn.example/a.js"></script></head>';
    expect(problems({ 'index.html': PAGE.replace('</head>', script) })).toHaveLength(1);
  });

  it('allows XML namespace identifiers, which are never fetched', () => {
    expect(
      problems({ 'assets/index.js': 'createElementNS("http://www.w3.org/2000/svg","svg")' }),
    ).toEqual([]);
  });

  it('fails on code that runs text, writes HTML or talks to other windows or servers', () => {
    for (const code of [
      'eval(x)',
      'new Function("a")',
      'el.innerHTML=x',
      'document.write(x)',
      'fetch(u)',
      'new WebSocket(u)',
      'navigator.sendBeacon(u)',
      'parent.postMessage(x)',
      'window.open(u)',
      'window.top.location=u',
    ]) {
      expect(problems({ 'assets/index.js': code }), code).toHaveLength(1);
    }
  });

  it('fails on published source maps and their links', () => {
    expect(problems({ 'assets/index.js.map': '' })).toEqual([
      'assets/index.js.map: source map published',
    ]);
    expect(problems({ 'assets/index.js': '//# sourceMappingURL=index.js.map' })).toHaveLength(1);
  });
});
