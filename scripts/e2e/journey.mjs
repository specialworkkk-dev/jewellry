#!/usr/bin/env node
// Full-journey e2e: 20 shops x 200 customers, owner -> customer -> admin, on a SCRATCH repo copy
// + in-memory MongoDB (never touches .env.local / the real DB).
//
//   E2E_PORT=3116 E2E_MONGO_PORT=27116 E2E_WORK=/some/scratch/dir node scripts/e2e/journey.mjs
//   env: E2E_MODE=prod|dev (default prod = next build --webpack && next start)
//        J_CUSTOMERS=200  J_CONC=40  (scale knobs)   J_SKIP_BUILD=1 (reuse prepared .next, prod only)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE, R2_PUBLIC, WORK, Client, check, warn, record, section, sleep, getResults, BROWSER_UA,
  prepareWorkdir, startMongo, stopMongo, freePort, PORT, MONGO_PORT, MONGO_URI, closeBrowser,
} from './lib.mjs';
import {
  timed, latencyTable, totalRequests, pool, pad, custIp, UAS, BOT_UAS,
  withPage, startJourneyServer, startSampler, stopSampler, scanServerLog,
} from './journey-lib.mjs';

const MODE = process.env.E2E_MODE || 'prod';
const NCUST = Number(process.env.J_CUSTOMERS || 200);
const CONC = Number(process.env.J_CONC || 40);
const PW = 'Passw0rd!xyz';
const ADMIN_PW = 'AdminPass#12345';
const oid = (s) => new mongoose.Types.ObjectId(String(s));
let db; const col = (n) => db.collection(n);
const bugs = [];
const bug = (id, where, text) => { bugs.push({ id, where, text }); console.log(`  [BUG] ${id} ${where} -- ${text}`); };
const guard = async (name, fn) => {
  try { await fn(); } catch (e) { record(name, 'section crashed', 'FAIL', String(e?.stack || e).split('\n').slice(0, 5).join(' | ')); }
};
const fmt = (n) => Number(n).toLocaleString('en-IN');

// ----------------------------------------------------------------- fixtures
const NAMES = [
  ['Shree Laxmi Jewellers', 'Surat', 'Gujarat'], ['Tanishka Gold House', 'Jaipur', 'Rajasthan'], ['Mahalaxmi Ornaments', 'Mumbai', 'Maharashtra'],
  ['Kalyan Swarna Mahal', 'Hyderabad', 'Telangana'], ['Rajputana Gems', 'Jaipur', 'Rajasthan'], ['Sanghvi Diamonds', 'Mumbai', 'Maharashtra'],
  ['Vardhaman Jewels', 'Ahmedabad', 'Gujarat'], ['Pearl Palace', 'Hyderabad', 'Telangana'], ['Anand Swarnakar', 'Pune', 'Maharashtra'],
  ['Nakshatra Jewellery', 'Chennai', 'Tamil Nadu'], ['Ganga Gold Palace', 'Varanasi', 'Uttar Pradesh'], ['Hira Panna Jewels', 'Nagpur', 'Maharashtra'],
  ['Surya Kundan House', 'Lucknow', 'Uttar Pradesh'], ['Meenakshi Gold Mart', 'Chennai', 'Tamil Nadu'], ['Chettinad Temple Jewels', 'Madurai', 'Tamil Nadu'],
  ['Bengal Bridal Gold', 'Kolkata', 'West Bengal'], ['Punjab Phulkari Jewels', 'Ludhiana', 'Punjab'], ['Deccan Pearl Mart', 'Hyderabad', 'Telangana'],
  ['Awadh Zari Gold', 'Lucknow', 'Uttar Pradesh'], ['Kerala Kasavu Jewels', 'Kochi', 'Kerala'],
];
// roles of shop indices
const APPROVE = Array.from({ length: 19 }, (_, i) => i);   // 0..18 approved, then 18 is rejected via UI
const REJECTED = 18, PENDING = 19;
const OK_SHOPS = Array.from({ length: 18 }, (_, i) => i);   // final approved
const LIM_SHOP = 14;      // maxLinkOpens=150
const EXPIRED_SHOP = 15;  // planEndsAt in the past (after setup)
const MAXP_SHOP = 16;     // maxProducts=5
const SUSPEND_SHOP = 12, PUBLISH_SHOP = 3, GOLD_SHOP = 1, LIMITS_SHOP = 9;
const SAMPLES = [1, 7, 11];  // dashboard UI samples
const IDOR_A = 0, IDOR_B = 2;
const ss = (i) => pad(i, 2);
const tok = (i) => `SH${ss(i)}x`;

let cats = {}; let adminClient;
const shops = [];
const KINDS = ['Ring', 'Necklace', 'Earrings', 'Bangle', 'Pendant', 'Chain', 'Mangalsutra', 'Draft Anklet'];

// ----------------------------------------------------------------- seed
async function seed() {
  mongoose.set('autoIndex', false);
  await mongoose.connect(MONGO_URI);
  db = mongoose.connection.db;
  const now = new Date();
  for (const [slug, name] of [['rings', 'Rings'], ['necklaces', 'Necklaces'], ['earrings', 'Earrings']]) {
    const r = await col('categories').insertOne({ name, slug, isSystemDefault: true, createdAt: now, updatedAt: now });
    cats[slug] = r.insertedId.toString();
  }
  await col('platformsettings').insertOne({ key: 'default', allowAutoApproval: false, allowPublicRegistration: true, defaultMaxProducts: 50, defaultMaxLinkOpens: 500, createdAt: now, updatedAt: now });
  await col('users').insertOne({ name: 'Journey Super', username: 'jadmin', email: 'jadmin@example.test', mobile: '9999999999', passwordHash: await bcrypt.hash(ADMIN_PW, 10), role: 'SUPER_ADMIN', createdAt: now, updatedAt: now });
}

async function ownerClient(i) {
  const s = shops[i];
  if (s.client && [...s.client.jar.keys()].some((k) => /session-token/.test(k))) return s.client;
  const c = new Client(`owner${i}`, `172.20.${i}.1`);
  const r = await c.login(s.username, PW);
  if (!r.ok) throw new Error(`owner ${i} login failed ${JSON.stringify(r.session)}`);
  s.client = c; return c;
}
const shopDoc = (i) => col('shops').findOne({ _id: oid(shops[i].id) });

async function adminEdit(shopId, fields, { bypassMin = false } = {}) {
  return withPage(adminClient, async (page) => {
    await page.goto(`/admin/shops/${shopId}`);
    await page.waitForLoadState('load').catch(() => {});
    await sleep(2500);
    if (bypassMin) await page.evaluate(() => document.querySelectorAll('input').forEach((i) => { i.removeAttribute('min'); i.removeAttribute('max'); i.removeAttribute('required'); i.removeAttribute('step'); }));
    for (const [name, value] of Object.entries(fields)) {
      const el = page.locator(`[name="${name}"]`);
      if ((await el.evaluate((n) => n.tagName)) === 'SELECT') await el.selectOption(String(value));
      else await el.fill(String(value));
    }
    await page.locator('form button[type=submit]').first().click();
    for (let i = 0; i < 80; i++) {
      await sleep(500);
      const u = new URL(page.url());
      if (!/\/admin\/shops\/[0-9a-f]{24}$/.test(u.pathname)) return { url: page.url(), error: null, saved: true };
      if (u.search.includes('error')) return { url: page.url(), error: decodeURIComponent(u.search), saved: false };
      const alert = await page.locator('[role=alert]').first().innerText({ timeout: 500 }).catch(() => '');
      if (alert) return { url: page.url(), error: alert, saved: false };
    }
    throw new Error('adminEdit: no redirect/error for ' + JSON.stringify(fields));
  });
}

// ================================================================= A. onboarding
async function scenarioA() {
  section('A. ONBOARDING (20 shops, auto-approval off)');
  const t0 = Date.now();
  await pool([...Array(20).keys()], 4, async (i) => {
    const [name, city, state] = NAMES[i];
    const done = timed('POST /api/auth/register');
    const r = await new Client('reg', `172.19.${i}.1`).post('/api/auth/register', {
      name: `Owner ${name.split(' ')[0]}`, username: `jny${ss(i)}`, email: `jny${ss(i)}@example.test`, mobile: `98${pad(7000000 + i * 137, 8)}`,
      whatsappNumber: `98${pad(7000000 + i * 137, 8)}`, password: PW, shopName: name, city, state, address: `${i + 1} Main Bazaar`, pincode: `${390000 + i}`,
    });
    done(r.status, r.status === 201);
    if (r.status !== 201) record('A1', `register shop ${i}`, 'FAIL', `${r.status} ${r.text.slice(0, 150)}`);
  });
  for (let i = 0; i < 20; i++) {
    const u = await col('users').findOne({ username: `jny${ss(i)}` });
    const s = u && await col('shops').findOne({ ownerId: u._id });
    shops.push({ i, name: NAMES[i][0], city: NAMES[i][1], username: `jny${ss(i)}`, id: s?._id?.toString(), ownerId: u?._id?.toString(), slug: s?.slug, template: s?.storefrontTemplate, approved: s?.isApproved, whatsapp: s?.whatsappNumber });
  }
  check('A1', '20 shops registered (201) in ' + (Date.now() - t0) + 'ms', shops.every((s) => s.id && s.slug));
  check('A2', 'every shop has storefrontTemplate 1..5', shops.every((s) => Number.isInteger(s.template) && s.template >= 1 && s.template <= 5), JSON.stringify(shops.map((s) => s.template)));
  const dist = [0, 0, 0, 0, 0, 0]; shops.forEach((s) => dist[s.template]++);
  record('A2i', 'template distribution (1..5)', 'INFO', String(dist.slice(1)));
  check('A3', 'all 20 pending after registration', shops.every((s) => s.approved === false));
  check('A3b', 'WhatsApp numbers stored', shops.every((s) => /^98\d{8}$/.test(s.whatsapp || '')));
  check('A3c', 'slugs unique', new Set(shops.map((s) => s.slug)).size === 20, shops.map((s) => s.slug).join(','));
  // pending => storefront 404 and not public
  const botGet = (p) => new Client('pub', `172.18.0.${1 + Math.floor(Math.random() * 200)}`).get(p, { headers: { 'user-agent': BOT_UAS[1] } });
  let n404 = 0; for (const s of shops) { const r = await botGet(`/shop/${s.slug}`); if (r.status === 404) n404++; }
  check('A4', 'pending storefronts all 404', n404 === 20, `${n404}/20`);
  const sm = await botGet('/sitemap.xml');
  check('A5', 'pending shops not listed in /sitemap.xml', sm.status === 200 && shops.every((s) => !sm.text.includes(`/shop/${s.slug}`)), `status ${sm.status}`);
  const eqPending = await new Client('x', '172.18.5.5').post('/api/enquiries', { shopId: shops[0].id, customerName: 'Nobody', customerPhone: '9000000000', message: 'hello pending' });
  check('A6', 'enquiry to pending shop 404', eqPending.status === 404, `status ${eqPending.status}`);

  // admin
  adminClient = new Client('admin', '172.17.0.1');
  check('A7', 'admin login', (await adminClient.login('jadmin', ADMIN_PW)).ok);
  const ap = await new Client('x', '172.18.5.6').post(`/api/admin/shops/${shops[0].id}/approve`, {});
  check('A7b', 'unauthenticated approve -> 401', ap.status === 401, `status ${ap.status}`);
  await pool(APPROVE, 4, async (i) => {
    const done = timed('POST /api/admin/shops/:id/approve');
    const r = await adminClient.post(`/api/admin/shops/${shops[i].id}/approve`, {});
    done(r.status, r.status === 200);
    if (r.status !== 200) record('A8', `approve shop ${i}`, 'FAIL', `status ${r.status}`);
  });
  check('A8', '19 shops approved via API', (await col('shops').countDocuments({ isApproved: true })) === 19);
  const live = await botGet(`/shop/${shops[REJECTED].slug}`);
  check('A8b', 'approved shop storefront live (200) before rejection', live.status === 200, `status ${live.status}`);
  const rej = await adminEdit(shops[REJECTED].id, { isApproved: 'false' });
  check('A9', 'admin rejects shop #18 (form)', rej.saved && (await shopDoc(REJECTED)).isApproved === false, JSON.stringify(rej));
  const dead = await botGet(`/shop/${shops[REJECTED].slug}`);
  check('A9b', 'rejected storefront back to 404 (cache invalidated)', dead.status === 404, `status ${dead.status}`);
  const stillPending = await botGet(`/shop/${shops[PENDING].slug}`);
  check('A9c', 'pending shop #19 still 404', stillPending.status === 404);
  const okLive = await Promise.all(OK_SHOPS.map((i) => botGet(`/shop/${shops[i].slug}`).then((r) => r.status)));
  check('A9d', '18 approved storefronts 200', okLive.every((s) => s === 200), okLive.join(','));
  const sm2 = await botGet('/sitemap.xml');
  check('A9e', 'sitemap lists exactly the 18 approved', OK_SHOPS.every((i) => sm2.text.includes(`/shop/${shops[i].slug}`)) && !sm2.text.includes(shops[REJECTED].slug) && !sm2.text.includes(shops[PENDING].slug));

  // admin list/search/pagination
  const ids = (h) => [...new Set((h.match(/\/admin\/shops\/[0-9a-f]{24}/g) || []).map((x) => x.slice(-24)))];
  const list = await adminClient.get('/admin/shops?size=100');
  check('A10', 'admin list shows all 20 shops', list.status === 200 && ids(list.text).length === 20, `ids ${ids(list.text).length}`);
  const hasStatus = /Pending|Not approved|Rejected/i.test(list.text.replace(/<script[\s\S]*?<\/script>/g, ''));
  warn('A10b', 'admin shop list distinguishes pending/approved/rejected', hasStatus, 'list only shows Active/Inactive; all 20 shops (incl. 1 pending, 1 rejected) read "Active"');
  if (!hasStatus) bug('B-ADMIN-STATUS', 'src/app/admin/shops/page.tsx:35 (select omits isApproved) & :20-26 (StatusBadge uses isActive only)', 'Admin Manage Shops list cannot show approval state; pending and rejected shops are labelled "Active". Fix: select isApproved and render Pending/Approved badge.');
  const byName = await adminClient.get(`/admin/shops?q=${encodeURIComponent('Pearl')}`);
  const wantPearl = shops.filter((s) => /pearl/i.test(s.name)).map((s) => s.id).sort();
  check('A11', 'search by name "Pearl" finds exactly the 2 pearl shops', JSON.stringify(ids(byName.text).sort()) === JSON.stringify(wantPearl), `${ids(byName.text).length} vs ${wantPearl.length}`);
  const byCity = await adminClient.get(`/admin/shops?q=Hyderabad`);
  const wantHyd = shops.filter((s) => s.city === 'Hyderabad').map((s) => s.id).sort();
  check('A11b', 'search by city "Hyderabad"', JSON.stringify(ids(byCity.text).sort()) === JSON.stringify(wantHyd), `${ids(byCity.text).length} vs ${wantHyd.length}`);
  const bySlug = await adminClient.get(`/admin/shops?q=${shops[10].slug}`);
  check('A11c', 'search by slug', ids(bySlug.text).includes(shops[10].id));
  const p = [1, 2, 3, 4].map((n) => adminClient.get(`/admin/shops?size=6&page=${n}`));
  const pr = (await Promise.all(p)).map((r) => ids(r.text));
  check('A12', 'pagination size=6: pages 6/6/6/2, disjoint, union=20', pr.map((x) => x.length).join() === '6,6,6,2' && new Set(pr.flat()).size === 20, pr.map((x) => x.length).join());

  // owner login
  let okLogins = 0;
  await pool([...Array(20).keys()], 6, async (i) => {
    const done = timed('POST login (credentials)');
    const c = new Client(`login${i}`, `172.20.${i}.2`);
    const r = await c.login(shops[i].username, PW); done(r.status, r.ok);
    if (r.ok && r.session.user.role === 'SHOP_OWNER' && r.session.user.shopId === shops[i].id) okLogins++;
  });
  check('A13', 'all 20 owners (incl. pending/rejected) can log in with right password', okLogins === 20, `${okLogins}/20`);
  const wr = await new Client('w', '172.20.30.1').login(shops[0].username, 'wrong-password');
  check('A13b', 'wrong password -> no session', !wr.ok);
  const wr2 = await new Client('w2', '172.20.30.2').login('nonexistent_user', PW);
  check('A13c', 'unknown user -> no session', !wr2.ok);
  const own = await new Client('o', '172.20.30.3').get('/dashboard');
  check('A13d', 'anonymous /dashboard redirects to login', [302, 303, 307, 308].includes(own.status), `status ${own.status}`);
}

// ================================================================= B. owner setup
const pubProducts = {}; // shop -> [{id,name,price,priceType,sku,fixedFinal}]
const allProducts = {}; // shop -> all created (incl. draft)
const mediaDoc = (shopId, key, kind = 'photos') => ({ shopId: oid(shopId), key, kind, day: '2026-10-09', contentType: 'image/jpeg', contentLength: 2048, state: 'confirmed', expiresAt: new Date(Date.now() + 86400e3), purgeAt: new Date(Date.now() + 86400e3 * 30) });
const mediaUrl = (shopId, key) => `${R2_PUBLIC}/${key}`;

async function setupShop(i) {
  const s = shops[i]; const c = await ownerClient(i); const T = tok(i);
  const keys = [];
  for (let n = 1; n <= 8; n++) keys.push(`shops/${s.id}/products/${n}.jpg`);
  for (let n = 1; n <= 2; n++) keys.push(`shops/${s.id}/stories/${n}.jpg`, `shops/${s.id}/posts/${n}.jpg`);
  keys.push(`shops/${s.id}/ads/1.jpg`);
  await col('mediareservations').insertMany(keys.map((k) => mediaDoc(s.id, k)));
  const cat = await c.get('/api/categories');
  if (cat.status !== 200 || (cat.data.categories || []).length < 3) record('B1', `categories API shop ${i}`, 'FAIL', `status ${cat.status}`);
  const catIds = [cats.rings, cats.necklaces, cats.earrings];
  allProducts[i] = []; pubProducts[i] = [];
  const types = ['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST'];
  const created = [];
  for (let n = 1; n <= 8; n++) {
    const priceType = types[n % 3]; const base = 20000 + n * 1500 + i * 10;
    const body = {
      name: `${T} ${KINDS[n - 1]} ${n}`, sku: `SH${ss(i)}-${n}`, categoryId: catIds[n % 3], priceType,
      description: `Handcrafted ${KINDS[n - 1]} by ${s.name}`, images: [mediaUrl(s.id, `shops/${s.id}/products/${n}.jpg`)],
      goldPurity: ['14K', '18K', '22K', '24K'][n % 4], goldWeight: 3 + n * 0.5, diamondWeight: n % 2 ? 0.25 : undefined, stoneType: n % 2 ? 'Diamond' : '',
      isPublished: n !== 8, isNewArrival: n % 3 === 1, isBestseller: n % 4 === 2, isBridalCollection: n % 5 === 0, isFeatured: n === 1,
    };
    if (priceType !== 'PRICE_ON_REQUEST') body.price = base;
    if (priceType !== 'PRICE_ON_REQUEST' && n % 3 === 1) { body.discountType = n === 1 ? 'PERCENTAGE' : 'FIXED_AMOUNT'; body.discountValue = n === 1 ? 10 : 500; }
    if (n % 2 === 0) { body.makingCharges = 1800 + n * 100; if (n % 4 === 0) { body.makingChargesDiscountType = 'PERCENTAGE'; body.makingChargesDiscountValue = 15; } }
    const done = timed('POST /api/products');
    const r = await c.post('/api/products', body); done(r.status, r.status === 201);
    const p = r.data?.product;
    if (i === MAXP_SHOP && n > 5) { created.push({ n, status: r.status }); continue; }
    if (r.status !== 201 || !p) { record('B2', `shop ${i} product ${n}`, 'FAIL', `status ${r.status} ${r.text.slice(0, 160)}`); continue; }
    let expect = priceType === 'PRICE_ON_REQUEST' ? undefined : body.price;
    if (body.discountType === 'PERCENTAGE') expect = Math.round(body.price * (1 - body.discountValue / 100) * 100) / 100;
    if (body.discountType === 'FIXED_AMOUNT') expect = body.price - body.discountValue;
    if (p.price !== expect) record('B2p', `shop ${i} product ${n} stored price`, 'FAIL', `expected ${expect} got ${p.price}`);
    if (priceType === 'PRICE_ON_REQUEST' && p.price !== undefined) record('B2q', `shop ${i} POR product has price`, 'FAIL', String(p.price));
    const rec = { id: p._id, name: body.name, price: p.price, priceType, sku: body.sku, published: body.isPublished, body };
    allProducts[i].push(rec); if (body.isPublished) pubProducts[i].push(rec);
  }
  // stories/posts/ad
  for (let n = 1; n <= 2; n++) {
    let d = timed('POST /api/stories');
    let r = await c.post('/api/stories', { mediaUrl: mediaUrl(s.id, `shops/${s.id}/stories/${n}.jpg`), mediaType: 'IMAGE' }); d(r.status, r.status === 201);
    if (r.status !== 201) record('B3', `shop ${i} story ${n}`, 'FAIL', `status ${r.status} ${r.text.slice(0, 120)}`);
    d = timed('POST /api/posts');
    r = await c.post('/api/posts', { caption: `${T} post ${n} from ${s.name}`, mediaUrls: [mediaUrl(s.id, `shops/${s.id}/posts/${n}.jpg`)], mediaType: 'IMAGE', linkedProductId: allProducts[i][0]?.id }); d(r.status, r.status === 201);
    if (r.status !== 201) record('B4', `shop ${i} post ${n}`, 'FAIL', `status ${r.status} ${r.text.slice(0, 120)}`);
  }
  const d = timed('POST /api/advertisements');
  const ad = await c.post('/api/advertisements', { title: `${T} Festive Offer`, message: `Flat 10% off making charges at ${s.name}`, type: 'PROMO_STRIP', imageUrl: mediaUrl(s.id, `shops/${s.id}/ads/1.jpg`) }); d(ad.status, ad.status === 201);
  if (ad.status !== 201) record('B5', `shop ${i} ad`, 'FAIL', `status ${ad.status} ${ad.text.slice(0, 120)}`);
  // gold rate: set directly in DB (dashboard server action is exercised for one shop in D)
  await col('shops').updateOne({ _id: oid(s.id) }, { $set: { goldRate22K: 6000 + i * 10, goldRate24K: 6500 + i * 10 } });
  return created;
}

async function scenarioB() {
  section('B. OWNER SETUP (18 approved shops)');
  await col('shops').updateOne({ _id: oid(shops[MAXP_SHOP].id) }, { $set: { maxProducts: 5 } });
  await col('shops').updateOne({ _id: oid(shops[LIM_SHOP].id) }, { $set: { maxLinkOpens: 150 } });
  const extra = {};
  const errs = await pool(OK_SHOPS, 6, async (i) => { extra[i] = await setupShop(i); });
  if (errs.length) record('B0', 'owner setup crashed for some shops', 'FAIL', JSON.stringify(errs.slice(0, 3)));
  const counts = await Promise.all(OK_SHOPS.map((i) => col('products').countDocuments({ shopId: oid(shops[i].id) })));
  const exp = OK_SHOPS.map((i) => (i === MAXP_SHOP ? 5 : 8));
  check('B1', 'product counts per shop (8; 5 for maxProducts=5 shop)', JSON.stringify(counts) === JSON.stringify(exp), `got ${counts}`);
  check('B1b', 'maxProducts=5 shop: products 6..8 rejected with 403', (extra[MAXP_SHOP] || []).length === 3 && extra[MAXP_SHOP].every((x) => x.status === 403), JSON.stringify(extra[MAXP_SHOP]));
  const cnt = async (name) => (await Promise.all(OK_SHOPS.map((i) => col(name).countDocuments({ shopId: oid(shops[i].id) }))));
  check('B2', '2 stories per shop', (await cnt('stories')).every((x) => x === 2), String(await cnt('stories')));
  check('B3', '2 posts per shop', (await cnt('posts')).every((x) => x === 2), String(await cnt('posts')));
  check('B4', '1 promo ad per shop', (await cnt('advertisements')).every((x) => x === 1), String(await cnt('advertisements')));
  const flags = await col('products').aggregate([{ $group: { _id: null, nw: { $sum: { $cond: ['$isNewArrival', 1, 0] } }, bs: { $sum: { $cond: ['$isBestseller', 1, 0] } }, br: { $sum: { $cond: ['$isBridalCollection', 1, 0] } }, mc: { $sum: { $cond: [{ $gt: ['$makingCharges', 0] }, 1, 0] } }, md: { $sum: { $cond: [{ $gt: ['$makingChargesDiscountValue', 0] }, 1, 0] } }, gp: { $sum: { $cond: [{ $ne: [{ $type: '$goldPurity' }, 'missing'] }, 1, 0] } } } }]).toArray();
  record('B5i', 'flag/making/purity totals stored', 'INFO', JSON.stringify(flags[0]));
  check('B5', 'flags new/bestseller/bridal + making-charge discounts + purity persisted', flags[0].nw > 0 && flags[0].bs > 0 && flags[0].br > 0 && flags[0].md > 0 && flags[0].gp > 100, JSON.stringify(flags[0]));
  // negative: unconfirmed media rejected
  const c0 = await ownerClient(0);
  const un = await c0.post('/api/products', { name: 'x', sku: 'UNCONF', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST', images: [`${R2_PUBLIC}/shops/${shops[0].id}/products/never-uploaded.jpg`] });
  check('B6', 'unconfirmed upload rejected (400)', un.status === 400, `status ${un.status}`);

  // expired plan
  await col('shops').updateOne({ _id: oid(shops[EXPIRED_SHOP].id) }, { $set: { planEndsAt: new Date(Date.now() - 5 * 86400e3), planPrice: 999 } });
  const ce = await ownerClient(EXPIRED_SHOP);
  const body = { name: 'Late', sku: 'LATE-1', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' };
  const e1 = await ce.post('/api/products', body);
  check('B7', 'expired-plan shop: create product -> 403', e1.status === 403 && /expired/i.test(e1.text), `status ${e1.status} ${e1.text.slice(0, 100)}`);
  const e2 = await ce.post('/api/posts', { mediaUrls: [mediaUrl(shops[EXPIRED_SHOP].id, `shops/${shops[EXPIRED_SHOP].id}/posts/1.jpg`)] });
  const e3 = await ce.post('/api/stories', { mediaUrl: mediaUrl(shops[EXPIRED_SHOP].id, `shops/${shops[EXPIRED_SHOP].id}/stories/1.jpg`) });
  const e4 = await ce.post('/api/advertisements', { title: 'a', message: 'b' });
  check('B7b', 'expired-plan shop: post/story/ad -> 403', [e2, e3, e4].every((r) => r.status === 403), `${e2.status},${e3.status},${e4.status}`);
  check('B7c', 'expired shop product count unchanged (8)', (await col('products').countDocuments({ shopId: oid(shops[EXPIRED_SHOP].id) })) === 8);
  // concurrent burst on maxProducts=5 shop stays at 5
  const cm = await ownerClient(MAXP_SHOP);
  await col('mediareservations').insertOne(mediaDoc(shops[MAXP_SHOP].id, `shops/${shops[MAXP_SHOP].id}/products/burst.jpg`));
  const burst = await Promise.all(Array.from({ length: 6 }, (_, k) => cm.post('/api/products', { name: `burst${k}`, sku: `BURST-${k}`, categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' })));
  check('B8', 'maxProducts=5: 6 concurrent creates all 403, count stays 5', burst.every((r) => r.status === 403) && (await col('products').countDocuments({ shopId: oid(shops[MAXP_SHOP].id) })) === 5, burst.map((r) => r.status).join());
}

// ================================================================= C. customers
const tally = {}; const custFail = [];
const failC = (s, c, step, why) => { if (custFail.length < 60) custFail.push(`shop${s}/c${c} ${step}: ${why}`); tally[s].fail[step] = (tally[s].fail[step] || 0) + 1; };
const exp = { visitors: {}, enq: {} };
const BAD_ENDPOINTS = ['http://fcm.googleapis.com/fcm/send/abc', 'https://localhost/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com:8443/x', 'https://u:p@fcm.googleapis.com/x', 'not-a-url', 'https://10.0.0.5/push', 'https://intranet.internal/push'];

async function customer(s, c) {
  const shop = shops[s]; const T = tok(s); const t = tally[s];
  const ua = UAS[(c * 7 + s) % UAS.length];
  const cl = new Client(`c${s}-${c}`, custIp(s, c));
  const H = { headers: { 'user-agent': ua } };
  const prods = pubProducts[s]; const prod = prods[c % prods.length];
  const limited = s === LIM_SHOP;
  // 1. storefront
  let d = timed('GET /shop/[slug]');
  let r = await cl.get(`/shop/${shop.slug}`, H); d(r.status, r.status === 200);
  const blocked = r.text.includes('Store Link Limit Reached');
  if (r.status !== 200) failC(s, c, 'storefront-status', String(r.status));
  else if (blocked) { t.blocked++; if (!limited) failC(s, c, 'unexpected-limit-page', ''); }
  else {
    t.admitted++;
    if (!r.text.includes(`data-storefront-template="${shop.template}"`)) failC(s, c, 'template-marker', `want ${shop.template}`);
    if (!r.text.includes(T)) failC(s, c, 'own-products-missing', '');
    const others = new Set([...r.text.matchAll(/SH(\d\d)x/g)].map((m) => m[1]).filter((x) => x !== ss(s)));
    if (others.size) failC(s, c, 'CROSS-SHOP-LEAK', [...others].join());
    if (r.text.includes('Draft Anklet')) failC(s, c, 'draft-visible', '');
    if (!r.text.includes(fmt(6000 + s * 10))) failC(s, c, 'gold-rate-missing', '');
    if (!r.text.includes(`${T} Festive Offer`) && !r.text.includes('Festive Offer')) failC(s, c, 'promo-ad-missing', '');
  }
  // 2. product page
  d = timed('GET /shop/[slug]/product/[id]');
  r = await cl.get(`/shop/${shop.slug}/product/${prod.id}`, H); d(r.status, r.status === 200);
  if (r.status !== 200) failC(s, c, 'product-status', String(r.status));
  else if (!r.text.includes('Store Link Limit Reached')) {
    if (!r.text.includes(prod.name)) failC(s, c, 'product-name-missing', prod.name);
    if (prod.priceType === 'FIXED_PRICE' && prod.price && !r.text.includes(fmt(prod.price))) failC(s, c, 'product-price-missing', fmt(prod.price));
    const others = new Set([...r.text.matchAll(/SH(\d\d)x/g)].map((m) => m[1]).filter((x) => x !== ss(s)));
    if (others.size) failC(s, c, 'CROSS-SHOP-LEAK-product', [...others].join());
  } else if (!limited) failC(s, c, 'product-limit-page-unexpected', '');
  // IDOR-ish: another shop's product through this shop's slug must 404 (1 in 20, not for limited shop)
  if (!limited && c % 20 === 3) {
    const other = (s + 1 + (c % 5)) % 18; const op = pubProducts[other][0];
    d = timed('GET other-shop product via wrong slug');
    const x = await cl.get(`/shop/${shop.slug}/product/${op.id}`, H); d(x.status, x.status === 404);
    if (x.status !== 404 || x.text.includes(tok(other))) failC(s, c, 'wrong-slug-product', `status ${x.status}`);
  }
  // 3. analytics
  d = timed('POST /api/analytics/track');
  r = await cl.post('/api/analytics/track', { shopId: shop.id, eventType: 'SHOP_VIEW' }, H); d(r.status, r.status === 201);
  if (r.status !== 201) failC(s, c, 'analytics-shop', String(r.status));
  d = timed('POST /api/analytics/track');
  r = await cl.post('/api/analytics/track', { shopId: shop.id, eventType: 'PRODUCT_VIEW', targetId: prod.id }, H); d(r.status, r.status === 201);
  if (r.status !== 201) failC(s, c, 'analytics-product', String(r.status));
  if (c % 5 === 0) { // dedupe replay
    d = timed('POST /api/analytics/track');
    r = await cl.post('/api/analytics/track', { shopId: shop.id, eventType: 'PRODUCT_VIEW', targetId: prod.id }, H); d(r.status, r.status === 202);
    if (r.status !== 202 || !r.data?.deduped) failC(s, c, 'analytics-dedupe', String(r.status));
  }
  if (c % 25 === 0) { // bot analytics ignored
    r = await cl.post('/api/analytics/track', { shopId: shop.id, eventType: 'SHOP_VIEW' }, { headers: { 'user-agent': 'curl/8.5.0' } });
    if (r.status !== 202 || !r.data?.ignored) failC(s, c, 'analytics-bot', String(r.status));
  }
  // 4. like (anonymous cookie actor)
  const likeBody = { shopId: shop.id, targetId: prod.id, targetType: 'PRODUCT', interactionType: 'LIKE' };
  d = timed('POST /api/interactions');
  r = await cl.post('/api/interactions', likeBody, H); d(r.status, r.status === 200 && r.data?.state === true);
  if (r.status !== 200 || r.data?.state !== true) failC(s, c, 'like', `${r.status} ${r.text.slice(0, 80)}`);
  if (c % 10 === 0) { // unlike then like again
    const u = await cl.post('/api/interactions', likeBody, H); const l = await cl.post('/api/interactions', likeBody, H);
    if (u.data?.state !== false || l.data?.state !== true) failC(s, c, 'like-toggle', `${u.text} ${l.text}`);
  }
  if (c % 7 === 0) {
    d = timed('GET /api/interactions');
    const g = await cl.get(`/api/interactions?shopId=${shop.id}&targetId=${prod.id}&targetType=PRODUCT&interactionType=LIKE`, H); d(g.status, g.data?.state === true);
    if (g.data?.state !== true) failC(s, c, 'like-state-get', g.text.slice(0, 80));
  }
  // 5. enquiries (25%)
  if (c % 4 === 0) {
    const k = c / 4; const kind = [3, 7, 5, 9].includes(k % 10) ? { 3: 'honeypot', 7: 'invalid', 5: 'duplicate', 9: 'wrongProduct' }[k % 10] : 'valid';
    const body = { shopId: shop.id, customerName: `Cust-S${ss(s)}-${pad(c, 3)}`, customerPhone: `9${ss(s)}${pad(c, 4)}000`, message: `Interested in ${prod.name} - please share details #${c}` };
    if (k % 2 === 0) body.productId = prod.id;
    if (kind === 'honeypot') body.website = 'http://spam.example';
    if (kind === 'invalid') body.customerPhone = 'abc';
    if (kind === 'wrongProduct') body.productId = pubProducts[(s + 1) % 18][0].id;
    d = timed('POST /api/enquiries');
    r = await cl.post('/api/enquiries', body, H);
    const want = kind === 'invalid' ? 400 : kind === 'wrongProduct' ? 404 : 201;
    d(r.status, r.status === want);
    if (r.status !== want) failC(s, c, `enquiry-${kind}`, `${r.status} ${r.text.slice(0, 80)}`);
    if (kind === 'duplicate') {
      const r2 = await cl.post('/api/enquiries', body, H);
      if (r2.status !== 201) failC(s, c, 'enquiry-dup-second', String(r2.status));
    }
    if (kind === 'valid' || kind === 'duplicate') t.enqExpected++;
  }
  // 6. push (10%) + invalid attempts
  if (c % 10 === 5) {
    const endpoint = `https://fcm.googleapis.com/fcm/send/${Math.random().toString(36).slice(2)}${s}x${c}`;
    const sub = { shopId: shop.id, subscription: { endpoint, expirationTime: null, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } } };
    d = timed('POST /api/notifications/subscriptions');
    r = await cl.post('/api/notifications/subscriptions', sub, H); d(r.status, r.status === 200 && r.data?.subscribed === true);
    if (r.status !== 200 || !r.data?.subscribed) failC(s, c, 'push', `${r.status} ${r.text.slice(0, 80)}`);
    else t.pushExpected++;
    if (c % 20 === 5) { const r2 = await cl.post('/api/notifications/subscriptions', sub, H); if (r2.status !== 200) failC(s, c, 'push-resub', String(r2.status)); }
  }
  if (c % 40 === 15) {
    const ep = BAD_ENDPOINTS[(c / 40 | 0) % BAD_ENDPOINTS.length + 0] ;
    for (const e of [ep, BAD_ENDPOINTS[(c + s) % BAD_ENDPOINTS.length]]) {
      d = timed('POST /api/notifications/subscriptions (invalid)');
      r = await cl.post('/api/notifications/subscriptions', { shopId: shop.id, subscription: { endpoint: e, keys: { p256dh: 'x', auth: 'y' } } }, H); d(r.status, r.status === 400);
      if (r.status !== 400) failC(s, c, 'push-invalid-accepted', `${e} -> ${r.status}`);
    }
    r = await cl.post('/api/notifications/subscriptions', { shopId: shop.id, subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/nokeys' } }, H);
    if (r.status !== 400) failC(s, c, 'push-nokeys', String(r.status));
  }
}

async function scenarioC() {
  section(`C. CUSTOMERS (${OK_SHOPS.length} shops x ${NCUST})`);
  for (const i of OK_SHOPS) tally[i] = { admitted: 0, blocked: 0, enqExpected: 0, pushExpected: 0, fail: {} };
  // bots / non-human must not consume visitor slots on the limited shop
  const L = shops[LIM_SHOP];
  let k = 0;
  for (const ua of BOT_UAS) for (let n = 0; n < 4; n++) { const r = await new Client('bot', `10.250.${k++}.1`).get(`/shop/${L.slug}`, { headers: { 'user-agent': ua } }); if (r.status !== 200) record('C0', `bot ${ua} status`, 'FAIL', String(r.status)); }
  const pf = await new Client('pf', '10.250.99.1').get(`/shop/${L.slug}`, { headers: { purpose: 'prefetch' } });
  const sd = await shopDoc(LIM_SHOP);
  check('C0', 'bots/curl/WhatsApp/prefetch consume no visitor slot (limited shop counter stays 0)', (sd.currentLinkOpens || 0) === 0 && (await col('shopvisitors').countDocuments({ shopId: oid(L.id) })) === 0, `counter=${sd.currentLinkOpens} prefetch status ${pf.status}`);

  const work = [];
  for (const i of OK_SHOPS) for (let c = 0; c < NCUST; c++) work.push([i, c]);
  // deterministic shuffle so shops interleave
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let a = work.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [work[a], work[b]] = [work[b], work[a]]; }
  const start = Date.now(); let done = 0;
  const prog = setInterval(() => console.log(`  ... ${done}/${work.length} customers, ${Math.round(done / ((Date.now() - start) / 1000))}/s`), 20000);
  const errs = await pool(work, CONC, async ([s, c]) => { await customer(s, c); done++; });
  clearInterval(prog);
  const secs = (Date.now() - start) / 1000;
  record('C1', `${work.length} customers finished`, 'INFO', `${secs.toFixed(1)}s wall, ${(work.length / secs).toFixed(1)} customers/s, ${(totalRequests() / secs).toFixed(1)} tracked req/s`);
  exp.customerSecs = secs;
  exp.logAfterC = scanServerLog(/Error: Unauthorized/);
  if (scanServerLog().issues.some((l) => /Error: Unauthorized/.test(l))) bug('B-DASH-UNAUTH', 'src/app/dashboard/page.tsx:21 -> src/lib/tenant.ts:59', 'Anonymous GET /dashboard redirects correctly (layout redirect) but the page body also runs requireOwnerTenant() and throws Error("Unauthorized"), logged as a server error (digest) on every unauthenticated hit. Fix: make the page tolerate/skip when the layout already redirected, or use redirect() in requireOwnerTenant.');
  check('C2a', 'server log clean during the pure-HTTP customer phase (3600-customer load)', exp.logAfterC.issues.length === 0, exp.logAfterC.issues.slice(0, 6).join(' || '));
  check('C2', 'no customer flow threw (network/timeouts)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const failSteps = {}; for (const i of OK_SHOPS) for (const [k2, v] of Object.entries(tally[i].fail)) failSteps[k2] = (failSteps[k2] || 0) + v;
  check('C3', 'all per-customer assertions passed (status, template marker, own products, no cross-shop leak, price, gold rate, ad, likes, enquiry kinds, push)', Object.keys(failSteps).length === 0, JSON.stringify(failSteps) + ' e.g. ' + custFail.slice(0, 6).join(' || '));
  const admittedOK = OK_SHOPS.every((i) => i === LIM_SHOP ? tally[i].admitted === 150 && tally[i].blocked === NCUST - 150 : tally[i].admitted === NCUST && tally[i].blocked === 0);
  check('C4', `visitor limit: shop ${LIM_SHOP} (maxLinkOpens=150) admits exactly 150, blocks ${NCUST - 150}; others admit all ${NCUST}`, admittedOK, OK_SHOPS.map((i) => `${i}:${tally[i].admitted}/${tally[i].blocked}`).join(' '));
}

// ================================================================= D. cross-checks
const dashNums = (text) => {
  const g = (label) => { const m = text.match(new RegExp(label + '\\s*\\n?\\s*([\\d,]+)')); return m ? Number(m[1].replace(/,/g, '')) : NaN; };
  return { products: g('Total Products'), views: g('Profile Views'), likes: g('Product Likes'), enq: g('New Enquiries') };
};
const browserIssues = [];
async function ownerDash(i) {
  const c = await ownerClient(i);
  return withPage(c, async (pg) => {
    pg.on('console', (m) => { if (/error|warn/.test(m.type())) { const t = m.text(); if (/hydrat|Minified React|418|423|425|Warning:/i.test(t) && !/Failed to update rates/.test(t)) browserIssues.push(`owner${i} ${t.slice(0, 200)}`); } });
    pg.on('pageerror', (e) => browserIssues.push(`owner${i} pageerror ${String(e).slice(0, 200)}`));
    await pg.goto('/dashboard'); await pg.waitForLoadState('networkidle').catch(() => {}); await sleep(1500);
    const body = await pg.locator('body').innerText(); return { ...dashNums(body), url: pg.url(), snippet: body.slice(0, 120) };
  });
}

async function scenarioD() {
  section('D. CROSS-CHECKS');
  // D1 exact per-shop counts
  const rows = [];
  for (const i of OK_SHOPS) {
    const sid = oid(shops[i].id); const lim = i === LIM_SHOP;
    const ids = (await col('products').find({ shopId: sid }, { projection: { _id: 1 } }).toArray()).map((p) => p._id);
    const a = {
      shop: i, visitors: await col('shopvisitors').countDocuments({ shopId: sid }), counter: (await shopDoc(i)).currentLinkOpens,
      shopViews: await col('analyticsevents').countDocuments({ shopId: sid, eventType: 'SHOP_VIEW' }),
      prodViews: await col('analyticsevents').countDocuments({ shopId: sid, eventType: 'PRODUCT_VIEW' }),
      viewsSum: (await col('products').aggregate([{ $match: { shopId: sid } }, { $group: { _id: null, v: { $sum: '$viewsCount' }, l: { $sum: '$likesCount' } } }]).toArray())[0] || {},
      likes: await col('interactions').countDocuments({ shopId: sid, interactionType: 'LIKE' }),
      enq: await col('enquiries').countDocuments({ shopId: sid }),
      foreignEnq: await col('enquiries').countDocuments({ shopId: sid, customerName: { $not: new RegExp(`^Cust-S${ss(i)}-`) } }),
      subs: await col('pushsubscriptions').countDocuments({ shopId: sid }),
      foreignLike: await col('interactions').countDocuments({ shopId: sid, targetId: { $nin: ids } }),
    };
    const want = { visitors: lim ? 150 : NCUST, shopViews: NCUST, prodViews: NCUST, views: NCUST, likes: NCUST, enq: tally[i].enqExpected, subs: tally[i].pushExpected };
    a.want = want; rows.push(a);
  }
  const bad = (f) => rows.filter((a) => !f(a)).map((a) => a.shop);
  check('D1a', 'shopvisitors == 200 (150 for limited shop) and currentLinkOpens matches', bad((a) => a.visitors === a.want.visitors && a.counter === a.want.visitors).length === 0, JSON.stringify(rows.filter((a) => a.visitors !== a.want.visitors || a.counter !== a.want.visitors).map((a) => [a.shop, a.visitors, a.counter])));
  check('D1b', 'SHOP_VIEW events == customers (deduped replays/bots excluded)', bad((a) => a.shopViews === a.want.shopViews).length === 0, JSON.stringify(rows.map((a) => a.shopViews)));
  check('D1c', 'PRODUCT_VIEW events == customers, product viewsCount sum matches', bad((a) => a.prodViews === a.want.prodViews && a.viewsSum.v === a.want.views).length === 0, JSON.stringify(rows.map((a) => [a.prodViews, a.viewsSum.v])));
  check('D1d', 'LIKE interactions == customers and likesCount sum matches rows', bad((a) => a.likes === a.want.likes && a.viewsSum.l === a.want.likes).length === 0, JSON.stringify(rows.map((a) => [a.likes, a.viewsSum.l])));
  check('D1e', `enquiries == expected non-spam unique (${rows[0].want.enq}/shop; honeypot/invalid/wrong-product/duplicates excluded)`, bad((a) => a.enq === a.want.enq).length === 0, JSON.stringify(rows.map((a) => [a.enq, a.want.enq])));
  check('D1f', 'push subscriptions == expected (invalid endpoints rejected)', bad((a) => a.subs === a.want.subs).length === 0, JSON.stringify(rows.map((a) => [a.subs, a.want.subs])));
  check('D1g', 'no cross-shop rows (foreign enquiries / likes on other shop products)', rows.every((a) => a.foreignEnq === 0 && a.foreignLike === 0), JSON.stringify(rows.filter((a) => a.foreignEnq || a.foreignLike).map((a) => [a.shop, a.foreignEnq, a.foreignLike])));
  const totals = rows.reduce((t, a) => ({ visitors: t.visitors + a.visitors, enq: t.enq + a.enq, likes: t.likes + a.likes, subs: t.subs + a.subs }), { visitors: 0, enq: 0, likes: 0, subs: 0 });
  record('D1i', 'platform totals', 'INFO', JSON.stringify(totals));
  exp.rows = rows; exp.totals = totals;
  const dupRows = await col('enquiries').aggregate([{ $group: { _id: { s: '$shopId', p: '$customerPhone', m: '$message' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]).toArray();
  check('D1h', 'no duplicate enquiry rows (dedupe held under concurrency)', dupRows.length === 0, `${dupRows.length} dup groups`);

  // D2 owner dashboards (Playwright)
  await guard('D2', async () => {
    for (const i of SAMPLES) {
      const n = await ownerDash(i);
      const dbProducts = await col('products').countDocuments({ shopId: oid(shops[i].id) });
      const dbNew = await col('enquiries').countDocuments({ shopId: oid(shops[i].id), status: 'NEW' });
      check('D2', `owner dashboard shop ${i}: Total Products ${n.products}=${dbProducts}, New Enquiries ${n.enq}=${dbNew}, Likes ${n.likes}=${NCUST}, Views ${n.views}=${NCUST}`, n.products === dbProducts && n.enq === dbNew && n.likes === NCUST && n.views === NCUST, JSON.stringify(n));
    }
  });
  // D2b inbox leakage via HTTP
  for (const i of SAMPLES) {
    const c = await ownerClient(i); const r = await c.get('/dashboard/enquiries?perPage=100');
    const others = new Set([...r.text.matchAll(/Cust-S(\d\d)-/g)].map((m) => m[1]).filter((x) => x !== ss(i)));
    check('D2b', `owner ${i} enquiry inbox shows own customers and no other shop's`, r.status === 200 && r.text.includes(`Cust-S${ss(i)}-`) && others.size === 0, `status ${r.status} foreign=${[...others]}`);
    const pr = await c.get('/dashboard/products');
    const foreign = new Set([...pr.text.matchAll(/SH(\d\d)x/g)].map((m) => m[1]).filter((x) => x !== ss(i)));
    check('D2c', `owner ${i} product list shows no other shop's products`, pr.status === 200 && foreign.size === 0, `foreign=${[...foreign]}`);
  }

  // D3 IDOR
  await guard('D3', async () => {
    const a = await ownerClient(IDOR_A); const bProd = allProducts[IDOR_B][0]; const bProd2 = allProducts[IDOR_B][1];
    const before = await col('products').findOne({ _id: oid(bProd.id) });
    const pr = await a.patch(`/api/products/${bProd.id}`, { name: 'HACKED', sku: bProd.sku, categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 1, isPublished: false });
    const after = await col('products').findOne({ _id: oid(bProd.id) });
    check('D3a', 'IDOR: owner A cannot PATCH owner B product (404, unchanged)', [403, 404].includes(pr.status) && after.name === before.name && after.isPublished === true, `status ${pr.status}`);
    const bPost = await col('posts').findOne({ shopId: oid(shops[IDOR_B].id) }); const bStory = await col('stories').findOne({ shopId: oid(shops[IDOR_B].id) }); const bAd = await col('advertisements').findOne({ shopId: oid(shops[IDOR_B].id) });
    const dp = await a.req('DELETE', `/api/posts/${bPost._id}`); const ds = await a.req('DELETE', `/api/stories/${bStory._id}`); const da = await a.req('DELETE', `/api/advertisements/${bAd._id}`);
    const pp = await a.patch(`/api/posts/${bPost._id}`, { isPublished: false }); const pa = await a.patch(`/api/advertisements/${bAd._id}`, { isActive: false });
    check('D3b', 'IDOR: A cannot delete B post/story/ad or patch post/ad', [dp, ds, da, pp, pa].every((r) => [403, 404].includes(r.status)) && (await col('posts').findOne({ _id: bPost._id })) && (await col('stories').findOne({ _id: bStory._id })) && (await col('advertisements').findOne({ _id: bAd._id })), [dp, ds, da, pp, pa].map((r) => r.status).join());
    check('D3b2', 'B post still published / ad still active', (await col('posts').findOne({ _id: bPost._id })).isPublished !== false && (await col('advertisements').findOne({ _id: bAd._id })).isActive !== false);
    const anon = new Client('anon', '172.30.0.1');
    const ra = await anon.patch(`/api/products/${bProd.id}`, { name: 'x' }); const rb = await anon.req('DELETE', `/api/posts/${bPost._id}`);
    check('D3c', 'anonymous PATCH/DELETE on owner content -> 401', ra.status === 401 && rb.status === 401, `${ra.status},${rb.status}`);
    // replayed server actions (delete product / mark contacted) with B's ids from owner A's session
    await withPage(a, async (pg) => {
      let delAction = null; let contAction = null;
      pg.on('request', (rq) => { const h = rq.headers()['next-action']; if (h && rq.url().includes('/dashboard/products')) delAction = h; if (h && rq.url().includes('/dashboard/enquiries')) contAction = h; });
      pg.on('dialog', (d) => d.accept());
      const ctl = (await a.post('/api/products', { name: `${tok(IDOR_A)} Control Del`, sku: 'CTL-DEL', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' })).data?.product;
      await pg.goto('/dashboard/products'); await sleep(2500);
      await pg.locator('article:visible, tr:visible').filter({ hasText: 'CTL-DEL' }).locator('button[title="Delete product"]').first().click();
      for (let t = 0; t < 40 && (await col('products').findOne({ _id: oid(ctl._id) })); t++) await sleep(500);
      const rep = (url, action, id) => a.req('POST', url, { body: JSON.stringify([id]), headers: { 'next-action': action, 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component' }, raw: true });
      if (delAction) {
        await rep('/dashboard/products', delAction, bProd2.id);
        check('D3d', 'replayed delete-product server action with B product id: B product survives', !!(await col('products').findOne({ _id: oid(bProd2.id) })), 'deleted!');
        const ctl2 = (await a.post('/api/products', { name: 'CtlTwo', sku: 'CTL-2', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' })).data?.product;
        await rep('/dashboard/products', delAction, ctl2._id);
        record('D3d2', 'positive control for replay (own product deleted by replay)', (await col('products').findOne({ _id: oid(ctl2._id) })) ? 'WARN' : 'PASS', 'if WARN, D3d is inconclusive');
      } else record('D3d', 'replay delete action', 'WARN', 'could not capture action id');
      await pg.goto('/dashboard/enquiries'); await sleep(2500);
      const btn = pg.getByRole('button', { name: /Contacted/ }).locator('visible=true').first();
      await btn.click().catch(() => {}); await sleep(2500);
      const bEnq = await col('enquiries').findOne({ shopId: oid(shops[IDOR_B].id), status: 'NEW' });
      if (contAction && bEnq) {
        await rep('/dashboard/enquiries', contAction, bEnq._id.toString());
        check('D3e', "replayed mark-contacted action with B's enquiry id: B enquiry stays NEW", (await col('enquiries').findOne({ _id: bEnq._id })).status === 'NEW', 'status flipped by foreign owner');
      } else record('D3e', 'replay mark-contacted', 'WARN', `no action captured (action=${!!contAction})`);
      // restore A's flipped enquiry so counts stay as expected for later checks
    });
    const aFlipped = await col('enquiries').updateMany({ shopId: oid(shops[IDOR_A].id), status: 'CONTACTED' }, { $set: { status: 'NEW' } });
    record('D3i', 'restored status on A enquiries after UI click', 'INFO', `${aFlipped.modifiedCount} reset`);
  });

  // D4 publish / unpublish -> customer reflects immediately
  await guard('D4', async () => {
    const s = PUBLISH_SHOP; const c = await ownerClient(s); const draft = allProducts[s].find((p) => !p.published);
    const cust = () => new Client('pub', custIp(s, 190 + Math.floor(Math.random() * 9)));
    const full = (pub) => ({ name: draft.name, sku: draft.sku, categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 31337, isPublished: pub });
    const b0 = await cust().get(`/shop/${shops[s].slug}`, { headers: { 'user-agent': UAS[0] } });
    const p0 = await cust().get(`/shop/${shops[s].slug}/product/${draft.id}`, { headers: { 'user-agent': UAS[0] } });
    check('D4a', 'draft product hidden from customers before publish (page list + product 404)', !b0.text.includes(draft.name) && p0.status === 404, `list=${b0.text.includes(draft.name)} product=${p0.status}`);
    const pub = await c.patch(`/api/products/${draft.id}`, full(true));
    const b1 = await cust().get(`/shop/${shops[s].slug}`, { headers: { 'user-agent': UAS[0] } });
    const p1 = await cust().get(`/shop/${shops[s].slug}/product/${draft.id}`, { headers: { 'user-agent': UAS[0] } });
    check('D4b', 'publish -> immediately visible on storefront + product page (31,337)', pub.status === 200 && b1.text.includes(draft.name) && p1.status === 200 && p1.text.includes('31,337'), `patch ${pub.status} list=${b1.text.includes(draft.name)} page=${p1.status}`);
    const like = await cust().post('/api/interactions', { shopId: shops[s].id, targetId: draft.id, targetType: 'PRODUCT', interactionType: 'LIKE' });
    check('D4c', 'newly published product can be liked', like.status === 200 && like.data?.state === true, `status ${like.status}`);
    const unp = await c.patch(`/api/products/${draft.id}`, full(false));
    const b2 = await cust().get(`/shop/${shops[s].slug}`, { headers: { 'user-agent': UAS[0] } });
    const p2 = await cust().get(`/shop/${shops[s].slug}/product/${draft.id}`, { headers: { 'user-agent': UAS[0] } });
    const like2 = await cust().post('/api/interactions', { shopId: shops[s].id, targetId: draft.id, targetType: 'PRODUCT', interactionType: 'LIKE' });
    check('D4d', 'unpublish -> immediately hidden (list, product 404, like 404)', unp.status === 200 && !b2.text.includes(draft.name) && p2.status === 404 && like2.status === 404, `patch ${unp.status} list=${b2.text.includes(draft.name)} page=${p2.status} like=${like2.status}`);
  });

  // D5 gold rate via dashboard server action
  await guard('D5', async () => {
    const i = GOLD_SHOP; const c = await ownerClient(i);
    const msgs = [];
    await withPage(c, async (pg) => {
      pg.on('console', (m) => { if (/error/.test(m.type()) && /hydrat|Minified React|418|423/i.test(m.text()) && !/Failed to update rates/.test(m.text())) browserIssues.push(`goldpage ${m.text().slice(0, 160)}`); });
      const rate = async (a, b) => {
        await pg.goto('/dashboard'); await sleep(4000);
        await pg.fill('#gold-rate-22k', a); await pg.fill('#gold-rate-24k', b);
        await pg.getByRole('button', { name: /Update Banner/ }).click();
        await pg.locator('[role=status]').first().waitFor({ timeout: 30000 }).catch(() => {});
        return (await pg.locator('[role=status]').first().innerText().catch(() => '')).trim();
      };
      msgs.push(await rate('999', '7100'));
      check('D5a', 'gold rate < 1000 rejected', /Could not/i.test(msgs[0]) && (await shopDoc(i)).goldRate22K === 6000 + i * 10, msgs[0]);
      msgs.push(await rate('6789', '7421'));
    });
    const d = await shopDoc(i);
    check('D5b', 'owner updates gold rate via dashboard action (6789/7421)', d.goldRate22K === 6789 && d.goldRate24K === 7421, msgs.join(' | '));
    const pg = await new Client('g', custIp(i, 191)).get(`/shop/${shops[i].slug}`, { headers: { 'user-agent': UAS[2] } });
    check('D5c', 'customer storefront shows new gold rate immediately', pg.text.includes('6,789') && pg.text.includes('7,421') && !pg.text.includes(fmt(6000 + i * 10) + '/g'), `has6789=${pg.text.includes('6,789')}`);
  });

  // D6 suspend / reactivate
  await guard('D6', async () => {
    const i = SUSPEND_SHOP; const s = shops[i]; const prod = pubProducts[i][0];
    const adminDash0 = await adminCounts();
    const rs = await adminEdit(s.id, { isActive: 'false' });
    check('D6a', 'admin suspends shop (form)', rs.saved && (await shopDoc(i)).isActive === false, JSON.stringify(rs));
    const cu = (n) => new Client('sus', custIp(i, 192 + n));
    const H = { headers: { 'user-agent': UAS[1] } };
    const sp = await cu(0).get(`/shop/${s.slug}`, H); const pp = await cu(1).get(`/shop/${s.slug}/product/${prod.id}`, H);
    check('D6b', 'suspended storefront + product page -> 403', sp.status === 403 && [403, 404].includes(pp.status), `shop ${sp.status} product ${pp.status}`);
    const eq = await cu(2).post('/api/enquiries', { shopId: s.id, customerName: 'Sus Pect', customerPhone: '9123456789', message: 'enquiry while suspended' });
    const lk = await cu(3).post('/api/interactions', { shopId: s.id, targetId: prod.id, targetType: 'PRODUCT', interactionType: 'LIKE' });
    const ps = await cu(4).post('/api/notifications/subscriptions', { shopId: s.id, subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/suspended1', keys: { p256dh: 'x', auth: 'y' } } });
    const an = await cu(5).post('/api/analytics/track', { shopId: s.id, eventType: 'SHOP_VIEW' });
    check('D6c', 'suspended: enquiry/like/push/analytics rejected (404)', [eq, lk, ps].every((r) => r.status === 404) && an.status === 404, `${eq.status},${lk.status},${ps.status},${an.status}`);
    const oc = await ownerClient(i); const op = await oc.post('/api/products', { name: 'NoWay', sku: 'NOWAY', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' });
    check('D6d', 'suspended owner cannot create products (403)', op.status === 403, `status ${op.status}`);
    const adminDash1 = await adminCounts();
    check('D6e', 'admin dashboard Active Tenants drops by 1 on suspension', adminDash1.active === adminDash0.active - 1, JSON.stringify([adminDash0, adminDash1]));
    const rr = await adminEdit(s.id, { isActive: 'true' });
    const sp2 = await cu(6).get(`/shop/${s.slug}`, H);
    const eq2 = await cu(7).post('/api/enquiries', { shopId: s.id, customerName: 'Back Again', customerPhone: '9123456780', message: 'enquiry after reactivation' });
    const lk2 = await cu(8).post('/api/interactions', { shopId: s.id, targetId: prod.id, targetType: 'PRODUCT', interactionType: 'LIKE' });
    check('D6f', 'reactivation restores storefront (200+marker), enquiry (201), like (200)', rr.saved && sp2.status === 200 && sp2.text.includes(`data-storefront-template="${s.template}"`) && eq2.status === 201 && lk2.status === 200, `shop ${sp2.status} enq ${eq2.status} like ${lk2.status}`);
    // those two extras changed this shop's counts; keep DB counts honest
    exp.suspendExtra = { enq: 1, likes: 1 };
  });

  // D7 admin limits
  await guard('D7', async () => {
    const i = LIMITS_SHOP; const id = shops[i].id;
    const e1 = await adminEdit(id, { maxProducts: 0 }, { bypassMin: true });
    check('D7a', 'invalid maxProducts=0 shows error, not saved', Boolean(e1.error) && (await shopDoc(i)).maxProducts !== 0, JSON.stringify(e1));
    const e2 = await adminEdit(id, { maxVideoDurationSeconds: 5000 }, { bypassMin: true });
    check('D7b', 'invalid video duration shows error, not saved', Boolean(e2.error), JSON.stringify(e2));
    const e3 = await adminEdit(id, { maxLinkOpens: -3 }, { bypassMin: true });
    check('D7c', 'negative maxLinkOpens shows error, not saved', Boolean(e3.error) && (await shopDoc(i)).maxLinkOpens !== -3, JSON.stringify(e3));
    const ok = await adminEdit(id, { maxProducts: 77, maxPhotosPerDay: 12, maxLinkOpens: 300 });
    const d = await shopDoc(i);
    check('D7d', 'valid limits saved (maxProducts 77, photos/day 12, linkOpens 300)', ok.saved && d.maxProducts === 77 && d.maxPhotosPerDay === 12 && d.maxLinkOpens === 300, JSON.stringify(d.maxProducts));
    // owner immediately subject to the new product limit
    const set5 = await adminEdit(id, { maxProducts: 8 });
    const c = await ownerClient(i);
    const r = await c.post('/api/products', { name: 'Ninth', sku: 'NINTH', categoryId: cats.rings, priceType: 'PRICE_ON_REQUEST' });
    check('D7e', 'admin lowers maxProducts to 8 -> owner (has 8) blocked 403 right away', set5.saved && r.status === 403, `status ${r.status}`);
    // raise limited shop 150 -> 155: exactly 5 more new visitors admitted, then blocked
    const rl = await adminEdit(shops[LIM_SHOP].id, { maxLinkOpens: 155 });
    const results = [];
    for (let n = 0; n < 8; n++) { const x = await new Client('late', `10.240.${n}.9`).get(`/shop/${shops[LIM_SHOP].slug}`, { headers: { 'user-agent': UAS[n % UAS.length] } }); results.push(!x.text.includes('Store Link Limit Reached')); }
    check('D7f', 'admin raises maxLinkOpens 150->155: exactly 5 new visitors admitted, rest blocked', rl.saved && results.filter(Boolean).length === 5 && results.slice(0, 5).every(Boolean), results.join());
  });

  // D8 admin dashboard counts
  await guard('D8', async () => {
    const a = await adminCounts();
    const dbTotal = await col('shops').countDocuments(); const dbPending = await col('shops').countDocuments({ isApproved: false });
    const dbActive = await col('shops').countDocuments({ isApproved: true, isActive: true }); const dbUsers = await col('users').countDocuments();
    check('D8', `admin overview matches DB: total ${a.total}=${dbTotal}, pending ${a.pending}=${dbPending}, active tenants ${a.active}=${dbActive}, users ${a.users}=${dbUsers}`, a.total === dbTotal && a.pending === dbPending && a.active === dbActive && a.users === dbUsers && dbTotal === 20 && dbActive === 18 && dbPending === 2, JSON.stringify(a));
    const rr = await adminClient.get('/admin/users?q=jny0');
    check('D8b', 'admin users page lists owners', rr.status === 200 && /jny00/.test(rr.text));
  });
}

async function adminCounts() {
  const r = await adminClient.get('/admin');
  const g = (label) => { const m = r.text.match(new RegExp(label + '[\\s\\S]*?text-2xl font-bold[^>]*>(?:<!-- -->)?(\\d+)<')); return m ? Number(m[1]) : NaN; };
  return { total: g('Total Shops'), pending: g('Pending Approval'), users: g('Total Users'), active: g('Active Tenants') };
}

// ================================================================= E. health
async function scenarioE(procStats, buildSecs) {
  section('E. HEALTH');
  const log = scanServerLog(/destination stream closed early|Error: Unauthorized/);
  const unauth = scanServerLog().issues.filter((l) => /Unauthorized|destination stream/.test(l));
  record('E1i', 'expected/benign server-log lines (Playwright aborts, anonymous /dashboard)', 'INFO', unauth.join(' || '));
  check('E1', `server log clean of unhandled errors/hydration warnings (${log.lines} lines scanned)`, log.issues.length === 0, log.issues.slice(0, 8).join(' || '));
  if (log.issues.length) for (const l of log.issues.slice(0, 15)) console.log('     log:', l);
  check('E2', 'browser console free of hydration/React errors on sampled owner pages', browserIssues.length === 0, browserIssues.slice(0, 4).join(' || '));
  record('E3', 'server memory/CPU (process group)', 'INFO', JSON.stringify(procStats));
  warn('E3b', 'server RSS stays under 1.5 GB during 3600-customer run', (procStats.rssMbMax || 0) < 1536, JSON.stringify(procStats));
  const errs = latencyTable().reduce((a, r) => a + 0, 0);
  const slow = latencyTable().filter((r) => r.p95 > 3000);
  warn('E4', 'every tracked endpoint has p95 < 3000 ms', slow.length === 0, slow.map((r) => `${r.step} p95=${r.p95}`).join(', '));
  record('E5', 'build time', 'INFO', `${buildSecs}s (mode ${MODE})`);
}

// ================================================================= main
async function main() {
  const t0 = Date.now();
  section(`SETUP (mode=${MODE}, port=${PORT}, mongo=${MONGO_PORT}, work=${WORK})`);
  if (!/jewellry-e2e-work|scratch|journey|tmp/i.test(WORK)) { console.error('Refusing: E2E_WORK must be a scratch dir'); process.exit(2); }
  prepareWorkdir();
  await startMongo();
  await seed();
  const { buildSecs } = await startJourneyServer(MODE);
  startSampler();
  console.log(`  server up (${MODE}) build=${buildSecs}s`);
  await guard('A', scenarioA);
  await guard('B', scenarioB);
  if (shops.length === 20 && Object.keys(pubProducts).length) await guard('C', scenarioC);
  await guard('D', scenarioD);
  const procStats = stopSampler();
  await guard('E', () => scenarioE(procStats, buildSecs));
  await finish(t0, procStats);
}

async function finish(t0, procStats) {
  const res = getResults();
  const count = (st) => res.filter((r) => r.status === st).length;
  const lat = latencyTable();
  const wall = (Date.now() - t0) / 1000;
  console.log('\n================ LATENCY (ms, client-side incl. localhost) ================');
  console.log('step'.padEnd(52), 'n'.padStart(6), 'p50'.padStart(6), 'p95'.padStart(6), 'p99'.padStart(6), 'max'.padStart(6), ' statuses');
  for (const r of lat) console.log(r.step.padEnd(52), String(r.n).padStart(6), String(r.p50).padStart(6), String(r.p95).padStart(6), String(r.p99).padStart(6), String(r.max).padStart(6), ' ' + r.statuses);
  console.log(`\nTracked requests: ${totalRequests()}  | total wall ${wall.toFixed(0)}s | customer phase ${exp.customerSecs?.toFixed(1)}s => ${(totalRequests() / (exp.customerSecs || wall)).toFixed(1)} req/s (all steps)`);
  console.log('\n================ SCENARIO RESULTS ================');
  for (const r of res.filter((x) => x.status !== 'INFO')) console.log(`${r.status.padEnd(5)} ${r.id.padEnd(6)} ${r.name}${r.detail ? '  -- ' + String(r.detail).slice(0, 260) : ''}`);
  console.log(`\nPASS ${count('PASS')}  FAIL ${count('FAIL')}  WARN ${count('WARN')}  INFO ${count('INFO')}`);
  if (bugs.length) { console.log('\nBUGS'); bugs.forEach((b) => console.log(` - ${b.id}: ${b.where}: ${b.text}`)); }
  const report = { mode: MODE, customersPerShop: NCUST, concurrency: CONC, wallSecs: wall, customerPhaseSecs: exp.customerSecs, totalRequests: totalRequests(), procStats, perShop: exp.rows, totals: exp.totals, results: res, latency: lat, bugs, custFail: custFail.slice(0, 60) };
  fs.writeFileSync(path.join(WORK, 'journey-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nJSON report: ${path.join(WORK, 'journey-report.json')}\nServer log: ${path.join(WORK, 'dev-server.log')}`);
  await closeBrowser();
  await mongoose.disconnect().catch(() => {});
  if (!process.env.E2E_KEEP) { freePort(PORT); await stopMongo(); freePort(MONGO_PORT); }
  process.exit(count('FAIL') ? 1 : 0);
}

main().catch(async (e) => { console.error('FATAL', e); try { freePort(PORT); await stopMongo(); freePort(MONGO_PORT); } catch { /* */ } process.exit(2); });
