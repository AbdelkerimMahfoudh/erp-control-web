// Serves `dist/` the way Cloudflare Pages does (docs/74 §8), for the browser checks and for looking at a build:
// `/about` → about.html, `/` → index.html, the `_redirects` 200 rewrites, every `_headers` rule (so the Content
// Security Policy is exercised), and for an address with no file the NEAREST 404.html up its directories
// (`/fr/x/y` → fr/404.html), with a 404 status. Development and CI only — never a production server, and not proof of
// what the host does: the deployed site is checked on its own (`scripts/verify-production.mjs` on ops/verify-production).
//
//   node scripts/serve-dist.mjs [port] [dir]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] ?? 4173);
const dist = resolve(process.argv[3] ?? join(import.meta.dirname, '..', 'dist'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * `_headers`: blocks of a path pattern followed by indented `Name: value` lines, or `! Name` to detach a header a
 * broader rule set (Cloudflare Pages' syntax; a value is `null` for a detach).
 */
function readHeaders() {
  const file = join(dist, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current && line.trim().startsWith('! ')) {
      current.headers.push([line.trim().slice(2).trim(), null]);
    } else if (current) {
      const i = line.indexOf(':');
      current.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

/** `_redirects`: `from to status` lines; a `*` at the end matches any rest. */
function readRedirects() {
  const file = join(dist, '_redirects');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.trim().split(/\s+/);
      return { from, to, status: Number(status ?? 302) };
    });
}

const matches = (pattern, path) => (pattern.endsWith('/*') ? path === pattern.slice(0, -2) || path.startsWith(pattern.slice(0, -1)) : pattern === path);
const HEADERS = readHeaders();
const REDIRECTS = readRedirects();

function fileFor(path) {
  const safe = normalize(path).replace(/^([/\\])+/, '');
  if (safe.startsWith('..')) return null;
  const candidates = path.endsWith('/') ? [join(safe, 'index.html')] : [safe, `${safe}.html`, join(safe, 'index.html')];
  for (const c of candidates) {
    const full = join(dist, c);
    if (full.startsWith(dist) && existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

/** Cloudflare Pages' not-found rule: a 404.html in the address's own directory, else in each parent, up to the root. */
function notFoundFor(path) {
  let dir = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
  for (;;) {
    const full = join(dist, normalize(dir), '404.html');
    if (full.startsWith(dist) && existsSync(full)) return full;
    if (dir === '/' || !dir) return join(dist, '404.html');
    dir = dir.slice(0, dir.slice(0, -1).lastIndexOf('/') + 1);
  }
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  let status = 200;
  const rewrite = REDIRECTS.find((r) => matches(r.from, path));
  if (rewrite && rewrite.status === 200) path = rewrite.to;
  else if (rewrite) {
    res.writeHead(rewrite.status, { Location: rewrite.to });
    return res.end();
  }
  let file = fileFor(path);
  if (!file) {
    status = 404;
    file = notFoundFor(path);
  }
  const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
  for (const rule of HEADERS) {
    if (!matches(rule.pattern, decodeURIComponent(url.pathname))) continue;
    for (const [k, v] of rule.headers) {
      if (v === null) delete headers[k];
      else headers[k] = v;
    }
  }
  // A local server speaks HTTP: the HTTPS-only directives would break it, and are checked in the header file itself.
  delete headers['Strict-Transport-Security'];
  if (headers['Content-Security-Policy']) headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
  res.writeHead(status, headers);
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`serving ${dist} on http://127.0.0.1:${port}`));
