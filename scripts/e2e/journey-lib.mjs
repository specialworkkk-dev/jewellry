// Helpers for the full-journey (20 shops x 200 customers) e2e run.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  APP, LOG, PORT, BASE, MONGO_URI, R2_PUBLIC, freePort, sleep, getBrowser,
} from './lib.mjs';

// ---------------------------------------------------------------- latency stats
const lat = new Map(); // label -> {ms:number[], fail:number, status:Map}
export function timed(label) {
  const t0 = performance.now();
  return (status, ok = true) => {
    const ms = performance.now() - t0;
    let e = lat.get(label);
    if (!e) lat.set(label, (e = { ms: [], fail: 0, status: new Map() }));
    e.ms.push(ms); if (!ok) e.fail++;
    e.status.set(status, (e.status.get(status) || 0) + 1);
  };
}
const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0;
export function latencyTable() {
  const rows = [];
  for (const [label, e] of [...lat].sort()) {
    const s = [...e.ms].sort((a, b) => a - b);
    rows.push({
      step: label, n: s.length, p50: Math.round(pct(s, 50)), p95: Math.round(pct(s, 95)), p99: Math.round(pct(s, 99)),
      max: Math.round(s[s.length - 1] || 0), statuses: [...e.status].map(([k, v]) => `${k}:${v}`).join(' '),
    });
  }
  return rows;
}
export const totalRequests = () => [...lat.values()].reduce((a, e) => a + e.ms.length, 0);

// ---------------------------------------------------------------- pool
export async function pool(items, concurrency, fn) {
  let i = 0; const errors = [];
  const worker = async () => {
    for (;;) {
      const idx = i++; if (idx >= items.length) return;
      try { await fn(items[idx], idx); } catch (e) { errors.push({ idx, err: String(e?.stack || e).split('\n').slice(0, 3).join(' | ') }); }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return errors;
}

// ---------------------------------------------------------------- deterministic helpers
export const pad = (n, w) => String(n).padStart(w, '0');
// globally unique, deterministic fake client IP for (shop, customer)
export const custIp = (s, c) => `10.${100 + s}.${Math.floor(c / 250) + 1}.${(c % 250) + 1}`;
export const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
];
export const BOT_UAS = ['curl/8.5.0', 'Googlebot/2.1 (+http://www.google.com/bot.html)', 'WhatsApp/2.23.20 A', 'python-requests/2.31', 'facebookexternalhit/1.1'];

// ---------------------------------------------------------------- build + start (production) or dev
export function serverEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^(MONGODB|NEXTAUTH|R2_|ABLY|VAPID|NEXT_PUBLIC_VAPID|UPSTASH|CRON|TRUST_PROXY)/.test(k)) delete env[k];
  return Object.assign(env, {
    MONGODB_URI: MONGO_URI, NEXTAUTH_SECRET: 'e2e-dummy-secret-not-real-0123456789abcdef',
    NEXTAUTH_URL: BASE, NEXT_PUBLIC_BASE_URL: BASE, TRUST_PROXY_HEADERS: '1', NEXT_PUBLIC_R2_DEV_URL: R2_PUBLIC,
    NEXT_TELEMETRY_DISABLED: '1',
  });
}

export let serverPid = null;
export async function startJourneyServer(mode) {
  freePort(PORT);
  const bin = path.join(APP, 'node_modules/.bin/next');
  let buildSecs = 0;
  if (mode === 'prod') {
    const t = Date.now();
    fs.rmSync(path.join(APP, '.next'), { recursive: true, force: true });
    const r = spawnSync(bin, ['build', '--webpack'], { cwd: APP, env: { ...serverEnv(), NODE_ENV: 'production' }, stdio: ['ignore', fs.openSync(path.join(path.dirname(LOG), 'build.log'), 'w'), 'inherit'], timeout: 540_000 });
    buildSecs = Math.round((Date.now() - t) / 1000);
    if (r.status !== 0) throw new Error('next build failed (see build.log)');
  }
  const out = fs.openSync(LOG, 'w');
  const args = mode === 'prod' ? ['start', '-p', String(PORT)] : ['dev', '--webpack', '-p', String(PORT)];
  const p = spawn(bin, args, { cwd: APP, env: serverEnv(), stdio: ['ignore', out, out], detached: true });
  serverPid = p.pid;
  for (let i = 0; i < 180; i++) {
    await sleep(1000);
    try { const r = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(60_000) }); if (r.ok) return { buildSecs }; } catch { /* booting */ }
  }
  throw new Error('server not ready; see ' + LOG);
}

// ---------------------------------------------------------------- crude process-group sampling (RSS MB, %CPU)
const samples = [];
let samplerTimer;
export function startSampler() {
  samplerTimer = setInterval(() => {
    if (!serverPid) return;
    try {
      const out = execFileSync('ps', ['-o', 'rss=,pcpu=', '-g', String(serverPid)]).toString().trim().split('\n');
      let rss = 0, cpu = 0;
      for (const l of out) { const [r, c] = l.trim().split(/\s+/).map(Number); rss += r || 0; cpu += c || 0; }
      samples.push({ t: Date.now(), rssMb: rss / 1024, cpu });
    } catch { /* gone */ }
  }, 2000);
}
export function stopSampler() {
  clearInterval(samplerTimer);
  if (!samples.length) return {};
  return {
    samples: samples.length,
    rssMbMax: Math.round(Math.max(...samples.map((s) => s.rssMb))),
    rssMbLast: Math.round(samples[samples.length - 1].rssMb),
    cpuPctAvg: Math.round(samples.reduce((a, s) => a + s.cpu, 0) / samples.length),
    cpuPctMax: Math.round(Math.max(...samples.map((s) => s.cpu))),
  };
}

// ---------------------------------------------------------------- log scan with expected-noise filter
export function scanServerLog(extraNoise) {
  const text = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
  const bad = /(⨯|Error:|error TS|Module not found|Unhandled|TypeError|ReferenceError|Warning:|Hydration|hydrat|MongoServerError|Failed to compile|ECONN|EADDR|ETIMEDOUT|fetch failed)/i;
  // expected noise: Ably/R2/VAPID are intentionally unconfigured; scheduled push/realtime are skipped
  const noise = /(upstream image response failed for https:\/\/pub-e2etest|Gold rate must be between|Product not found|ABLY|VAPID|R2_|Upstash|UPSTASH|web-push|not configured|Create story error: .*unconfigured)/i;
  const counts = new Map();
  for (const l of text.split('\n')) {
    if (!bad.test(l) || noise.test(l) || (extraNoise && extraNoise.test(l))) continue;
    const k = l.trim().slice(0, 240);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return { lines: text.split('\n').length, issues: [...counts].map(([l, n]) => `${n}x ${l}`) };
}

// Like lib.withPage, but skips __Host-/__Secure- cookies (production NextAuth sets __Host-next-auth.csrf-token
// which Chromium refuses to add for a non-secure localhost origin); the session cookie itself is a plain one.
export async function withPage(client, fn) {
  const b = await getBrowser();
  const ctx = await b.newContext({ baseURL: BASE, extraHTTPHeaders: { 'x-forwarded-for': client.ip } });
  const cookies = [...client.jar].filter(([name]) => !/^__Host-/.test(name)).map(([name, value]) => (/^__Secure-/.test(name) ? { name, value, domain: 'localhost', path: '/', secure: true } : { name, value, domain: 'localhost', path: '/' }));
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120_000);
  try { return await fn(page); } finally { await ctx.close(); }
}
