// Run after the build (`npm run check:dist`): fails if dist/ is not safe to publish.
// It uses only Node itself, never the build tools, so a compromised tool cannot hide from it.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { CONTENT_SECURITY_POLICY } from './csp.ts';
import { findDistProblems, type DistFile } from './distCheck.ts';

const TEXT_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.webmanifest',
]);

const root = process.argv[2] ?? 'dist';

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const files: DistFile[] = listFiles(root).map((path) => ({
  path: relative(root, path).split(sep).join('/'),
  text: TEXT_EXTENSIONS.has(extname(path).toLowerCase()) ? readFileSync(path, 'utf8') : '',
}));

const problems = findDistProblems(files, CONTENT_SECURITY_POLICY);
if (problems.length > 0) {
  console.error(`dist check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`dist check passed: ${files.length} files.`);
