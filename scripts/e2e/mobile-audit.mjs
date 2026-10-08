#!/usr/bin/env node
// One-command mobile layout audit on a SCRATCH stack (never the real DB / .env.local).
//   E2E_PORT=3115 E2E_MONGO_PORT=27115 E2E_WORK=/some/dir node scripts/e2e/mobile-audit.mjs
// Options (env): AUDIT_WIDTHS=320,360,390  AUDIT_ONLY=/dashboard  AUDIT_SHOTS=dir (save PNG per route/width)
//                AUDIT_KEEP=1 (leave servers up)  AUDIT_JSON=file (write raw findings)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE, Client, prepareWorkdir, startMongo, stopMongo, startServer, stopServer,
  closeBrowser, withPage, MONGO_URI,
} from './lib.mjs';
import { auditPage, formatFindings, summarize, DEFAULT_WIDTHS } from './mobile-audit-lib.mjs';

const PW = 'Passw0rd!xyz';
const ADMIN_PW = 'AdminPass#12345';
const widths = (process.env.AUDIT_WIDTHS || DEFAULT_WIDTHS.join(',')).split(',').map(Number);
const only = process.env.AUDIT_ONLY;
const shotsDir = process.env.AUDIT_SHOTS;
const all = [];

async function seed() {
  mongoose.set('autoIndex', false);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const now = new Date();
  const cats = {};
  for (const [slug, name] of [['rings', 'Rings'], ['necklaces', 'Necklaces']]) {
    const r = await db.collection('categories').insertOne({ name, slug, isSystemDefault: true, createdAt: now, updatedAt: now });
    cats[slug] = r.insertedId.toString();
  }
  await db.collection('platformsettings').insertOne({ key: 'default', allowAutoApproval: false, allowPublicRegistration: true, defaultMaxProducts: 50, defaultMaxLinkOpens: 500, createdAt: now, updatedAt: now });
  await db.collection('users').insertOne({ name: 'Audit Admin', username: 'auditadmin', email: 'auditadmin@example.test', mobile: '9999999999', passwordHash: await bcrypt.hash(ADMIN_PW, 10), role: 'SUPER_ADMIN', createdAt: now, updatedAt: now });
  return { db, cats };
}

async function main() {
  prepareWorkdir();
  await startMongo();
  try {
    await startServer();
    const { db, cats } = await seed();
    const reg = await new Client('reg').post('/api/auth/register', {
      name: 'Owner With A Rather Long Name Indeed', username: 'auditowner', email: 'auditowner.with.a.long.address@example.test',
      mobile: '9812345678', password: PW, shopName: 'The Very Long Named Jewellery Emporium of Surat', city: 'Surat', state: 'GJ',
    });
    if (reg.status !== 201) throw new Error('register failed ' + reg.status + reg.text);
    const shop = await db.collection('shops').findOne({});
    await db.collection('shops').updateOne({ _id: shop._id }, { $set: { isApproved: true } });
    const owner = new Client('owner');
    if (!(await owner.login('auditowner', PW)).ok) throw new Error('owner login failed');
    const products = [];
    for (let i = 0; i < 8; i++) {
      const r = await owner.post('/api/products', {
        name: i === 0 ? 'Extraordinarily Long Gold Plated Kundan Meenakari Bridal Necklace Set With Matching Earrings' : `Product ${i} ring`,
        sku: `AUD-${i}`, categoryId: i % 2 ? cats.necklaces : cats.rings, priceType: 'FIXED_PRICE', price: 1000 + i * 137,
        description: 'Handcrafted piece. '.repeat(i === 0 ? 20 : 2), isPublished: i !== 3,
      });
      if (r.status < 300) products.push(r.data?.product?._id || r.data?._id || r.data?.id);
    }
    const prodId = products.find(Boolean) || (await db.collection('products').findOne({}))?._id?.toString();
    const admin = new Client('admin');
    if (!(await admin.login('auditadmin', ADMIN_PW)).ok) throw new Error('admin login failed');

    const slug = shop.slug;
    const sid = shop._id.toString();
    const groups = [
      ['public', new Client('anon'), ['/', '/login', '/register', '/shop/demo', `/shop/${slug}`, `/shop/${slug}/product/${prodId}`, '/does-not-exist']],
      ['owner', owner, ['/dashboard', '/dashboard/products', '/dashboard/products/create', `/dashboard/products/${prodId}/edit`, '/dashboard/enquiries', '/dashboard/marketing', '/dashboard/media', '/dashboard/settings']],
      ['admin', admin, ['/admin', '/admin/shops', `/admin/shops/${sid}`, '/admin/users', '/admin/settings', '/admin/infrastructure']],
    ];
    if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
    for (const [label, client, routes] of groups) {
      for (const route of routes) {
        if (only && !route.startsWith(only)) continue;
        try {
          await withPage(client, async (page) => {
            page.setDefaultTimeout(60_000);
            await page.setViewportSize({ width: widths[0], height: 800 });
            const resp = await page.goto(BASE + route, { waitUntil: 'load' }).catch((e) => { console.log('  nav fail', route, String(e).slice(0, 80)); });
            await page.waitForTimeout(600);
            for (const w of widths) {
              const f = await auditPage(page, { widths: [w], reload: false });
              f.forEach((x) => { x.url = BASE + route; x.group = label; });
              all.push(...f);
              if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${label}${route.replace(/[^\w]+/g, '_')}_${w}.png`), fullPage: false });
            }
            console.log(`  audited ${label.padEnd(6)} ${route} (${resp?.status?.() ?? '?'})`);
          });
        } catch (e) { console.log('  crawl error', route, String(e).slice(0, 120)); }
      }
    }
    console.log('\n===== MOBILE AUDIT FINDINGS (path / type / widths / selector / rect / detail) =====');
    console.log(formatFindings(all));
    console.log('\nTotals by type:', summarize(all));
    if (process.env.AUDIT_JSON) fs.writeFileSync(process.env.AUDIT_JSON, JSON.stringify(all, null, 1));
  } finally {
    if (!process.env.AUDIT_KEEP) { await closeBrowser(); stopServer(); await stopMongo(); await mongoose.disconnect().catch(() => {}); }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); stopServer(); process.exit(1); });
