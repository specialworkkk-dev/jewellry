// Shared infrastructure for the owner -> customer -> admin end-to-end run.
// Everything runs against a SCRATCH copy of the repo and an in-memory MongoDB.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORT = Number(process.env.E2E_PORT || 3115);
export const MONGO_PORT = Number(process.env.E2E_MONGO_PORT || 27118);
export const BASE = `http://localhost:${PORT}`;
export const MONGO_URI = `mongodb://127.0.0.1:${MONGO_PORT}/e2e`;
export const R2_PUBLIC = 'https://pub-e2etest.r2.dev'; // dummy; only used for URL-prefix validation
export const WORK = process.env.E2E_WORK
  || path.join(os.tmpdir(), 'jewellry-e2e-work');
export const APP = path.join(WORK, 'app');
export const LOG = path.join(WORK, 'dev-server.log');

// ---------------------------------------------------------------- results
const results = [];
export function record(id, name, status, detail = '') {
  results.push({ id, name, status, detail });
  const tag = status === 'PASS' ? 'PASS' : status === 'WARN' ? 'WARN' : status === 'INFO' ? 'INFO' : 'FAIL';
  console.log(`  [${tag}] ${id} ${name}${detail ? '  -- ' + detail : ''}`);
}
export const getResults = () => results;
export function check(id, name, cond, detail = '') {
  record(id, name, cond ? 'PASS' : 'FAIL', cond ? '' : detail);
  return !!cond;
}
export function warn(id, name, cond, detail = '') {
  record(id, name, cond ? 'PASS' : 'WARN', cond ? '' : detail);
  return !!cond;
}
export function section(title) { console.log(`\n=== ${title} ===`); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- http client
let ipCounter = 10;
export const nextIp = () => `10.${Math.floor(ipCounter / 250) % 250}.${ipCounter++ % 250}.${(ipCounter * 7) % 250 + 1}`;

export const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export class Client {
  constructor(label = 'anon', ip = nextIp()) {
    this.label = label; this.ip = ip; this.jar = new Map();
  }
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
  storeCookies(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = c.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim(); const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=0/i.test(a)) || value === '';
      if (expired) this.jar.delete(name); else this.jar.set(name, value);
    }
  }
  async req(method, url, { json, form, body, headers = {}, ip, raw } = {}) {
    const h = { 'x-forwarded-for': ip || this.ip, 'user-agent': BROWSER_UA, ...headers };
    const ck = this.cookieHeader();
    if (ck) h.cookie = ck;
    let payload = body;
    if (json !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(json); }
    if (form) { h['content-type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
    const res = await fetch(url.startsWith('http') ? url : BASE + url, {
      method, headers: h, body: payload, redirect: 'manual', signal: AbortSignal.timeout(180_000),
    });
    this.storeCookies(res);
    const text = await res.text();
    let data; if (!raw) { try { data = JSON.parse(text); } catch { /* html */ } }
    return { status: res.status, headers: res.headers, text, data, location: res.headers.get('location') };
  }
  get(url, o) { return this.req('GET', url, o); }
  post(url, json, o = {}) { return this.req('POST', url, { json, ...o }); }
  patch(url, json, o = {}) { return this.req('PATCH', url, { json, ...o }); }
  async login(username, password) {
    const c = await this.get('/api/auth/csrf');
    const r = await this.req('POST', '/api/auth/callback/credentials', {
      form: { csrfToken: c.data.csrfToken, username, password, json: 'true', callbackUrl: BASE },
    });
    const s = await this.get('/api/auth/session');
    const ok = Boolean(s.data?.user);
    return { ok, status: r.status, url: r.data?.url, session: s.data, raw: r };
  }
  sessionCookie() { return this.jar.get('next-auth.session-token'); }
}

// ---------------------------------------------------------------- environment
export function prepareWorkdir() {
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(APP, { recursive: true });
  fs.rmSync(path.join(APP, '.next'), { recursive: true, force: true });
  // NEVER copy .env* (the real .env.local holds real credentials), node_modules, .next, .git.
  execFileSync('rsync', ['-a', '--delete',
    '--exclude', '.next', '--exclude', 'node_modules', '--exclude', '.git', '--exclude', '.env*',
    '--exclude', 'next-env.d.ts', '--exclude', '.vercel',
    REPO + '/', APP + '/'], { stdio: 'inherit' });
  const nm = path.join(APP, 'node_modules');
  try { fs.rmSync(nm, { recursive: true, force: true }); } catch { /* */ }
  fs.symlinkSync(path.join(REPO, 'node_modules'), nm, 'dir');
  const env = [
    `MONGODB_URI=${MONGO_URI}`,
    `NEXTAUTH_SECRET=e2e-dummy-secret-not-real-0123456789abcdef`,
    `NEXTAUTH_URL=${BASE}`,
    `NEXT_PUBLIC_BASE_URL=${BASE}`,
    `TRUST_PROXY_HEADERS=1`,
    `NEXT_PUBLIC_R2_DEV_URL=${R2_PUBLIC}`,
    `CRON_SECRET=e2e-cron`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(APP, '.env.local'), env);
}

export function gitFingerprint() {
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd: REPO }).toString()
      + execFileSync('git', ['diff', '--stat'], { cwd: REPO }).toString()
      + execFileSync('bash', ['-c', "git ls-files -m -o --exclude-standard | grep -v '^scripts/e2e\\|^tests/e2e' | xargs -r stat -c '%n %Y' | sort"], { cwd: REPO }).toString();
  } catch { return ''; }
}

let mongod; let devProc;
export async function startMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongod = await MongoMemoryServer.create({ instance: { port: MONGO_PORT, dbName: 'e2e' } });
}
export async function stopMongo() { try { await mongod?.stop(); } catch { /* */ } }

export function freePort(port) {
  try { execFileSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' }); } catch { /* nothing listening */ }
}

export async function startServer() {
  freePort(PORT);
  const out = fs.openSync(LOG, 'w');
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^(MONGODB|NEXTAUTH|R2_|ABLY|VAPID|NEXT_PUBLIC_VAPID|UPSTASH|CRON|TRUST_PROXY)/.test(k)) delete env[k];
  Object.assign(env, {
    MONGODB_URI: MONGO_URI, NEXTAUTH_SECRET: 'e2e-dummy-secret-not-real-0123456789abcdef',
    NEXTAUTH_URL: BASE, TRUST_PROXY_HEADERS: '1', NEXT_PUBLIC_R2_DEV_URL: R2_PUBLIC,
    NEXT_TELEMETRY_DISABLED: '1',
  });
  devProc = spawn(path.join(APP, 'node_modules/.bin/next'), ['dev', '--webpack', '-p', String(PORT)], {
    cwd: APP, env, stdio: ['ignore', out, out], detached: true,
  });
  for (let i = 0; i < 120; i++) {
    await sleep(1000);
    try { const r = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(60_000) }); if (r.ok) return; } catch { /* booting */ }
  }
  throw new Error('dev server did not become ready; see ' + LOG);
}
export function stopServer() { freePort(PORT); }

export function logIssues() {
  const text = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
  const lines = text.split('\n');
  const issues = [];
  lines.forEach((l, i) => {
    if (/(⨯|⨯|Error:|error TS|Module not found|Unhandled|TypeError|ReferenceError|Warning:|MongoServerError|Failed to compile)/.test(l)) {
      issues.push(l.trim().slice(0, 300));
    }
  });
  const counts = new Map();
  for (const l of issues) counts.set(l, (counts.get(l) || 0) + 1);
  return [...counts].map(([l, n]) => `${n}x ${l}`);
}

// ---------------------------------------------------------------- browser (server actions need a real browser)
let browser;
export async function getBrowser() {
  if (browser) return browser;
  const pwPath = process.env.PLAYWRIGHT_CORE
    || ['/home/root509/pgas-platform/node_modules/playwright-core', '/home/root509/pgas-portal-frontend/node_modules/playwright-core']
      .find((p) => fs.existsSync(p));
  const { chromium } = await import(path.join(pwPath, 'index.mjs'));
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  const dir = fs.readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell')).sort().reverse()[0];
  const exe = path.join(base, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  return browser;
}
export async function closeBrowser() { try { await browser?.close(); } catch { /* */ } }

export async function withPage(client, fn) {
  const b = await getBrowser();
  const ctx = await b.newContext({ baseURL: BASE, extraHTTPHeaders: { 'x-forwarded-for': client.ip } });
  const cookies = [...client.jar].map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' }));
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120_000);
  try { return await fn(page); } finally { await ctx.close(); }
}
