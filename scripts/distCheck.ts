/**
 * Checks the built site before it is published: the page must carry the exact security
 * policy, and no built file may reach other servers or run text as code. It catches a
 * compromised build tool that slips something into dist/ even though the source is clean.
 */

export interface DistFile {
  /** Path relative to dist/, with forward slashes. */
  path: string;
  /** File contents; empty for binary files, which are only checked by name. */
  text: string;
}

/** Only XML namespace identifiers may look like a web address; they are never fetched. */
const ALLOWED_URL_PREFIXES = ['http://www.w3.org/'];

/** Code patterns the game never uses; finding one in the bundle means something was injected. */
const FORBIDDEN_CODE = [
  'eval(',
  'new Function',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'sendBeacon',
  'importScripts',
  'postMessage',
  'window.open',
  'window.top',
  'sourceMappingURL',
];

const URL_PATTERN = /https?:\/\/[^\s"'`<>)]*/gi;
const CSP_PATTERN = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/gi;
const REFERRER_TAG = /<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/i;

/** Returns one readable line per problem; an empty list means dist/ is fine to publish. */
export function findDistProblems(files: readonly DistFile[], expectedPolicy: string): string[] {
  const problems: string[] = [];

  const page = files.find((file) => file.path === 'index.html');
  if (!page) {
    problems.push('index.html is missing');
  } else {
    const policies = [...page.text.matchAll(CSP_PATTERN)].map((match) => match[1]);
    if (policies.length !== 1) {
      problems.push(`index.html must have exactly one security policy, found ${policies.length}`);
    } else if (policies[0] !== expectedPolicy) {
      problems.push(`index.html has a different security policy: ${policies[0] ?? ''}`);
    }
    if (!REFERRER_TAG.test(page.text)) problems.push('index.html is missing the no-referrer rule');
  }

  for (const file of files) {
    if (file.path.endsWith('.map')) problems.push(`${file.path}: source map published`);
    for (const match of file.text.matchAll(URL_PATTERN)) {
      const url = match[0];
      if (!ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
        problems.push(`${file.path}: external address ${url}`);
      }
    }
    for (const pattern of FORBIDDEN_CODE) {
      if (file.text.includes(pattern)) problems.push(`${file.path}: forbidden code "${pattern}"`);
    }
  }

  return problems;
}
