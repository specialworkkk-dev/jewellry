#!/usr/bin/env node
// End-to-end test: shop owner -> customer -> platform admin, on a scratch copy + in-memory MongoDB.
//   node scripts/e2e/run.mjs            (full run: copy repo, start mongo + next dev, test, tear down)
//   E2E_KEEP=1 node scripts/e2e/run.mjs (leave servers up afterwards)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import {
  BASE, R2_PUBLIC, WORK, LOG, Client, check, warn, record, section, sleep,
  prepareWorkdir, startMongo, stopMongo, startServer, stopServer, logIssues, getResults,
  closeBrowser, withPage, MONGO_URI, nextIp,
} from './lib.mjs';

const PW = 'Passw0rd!xyz';
const ADMIN_PW = 'AdminPass#12345';
const oid = (s) => new mongoose.Types.ObjectId(String(s));
let db; const col = (n) => db.collection(n);
let skuN = 0; const sku = (p = 'SKU') => `${p}-${Date.now().toString(36)}-${skuN++}`;
const guard = async (name, fn) => {
  try { await fn(); } catch (e) { record(name, 'section crashed', 'FAIL', String(e?.stack || e).split('\n').slice(0, 4).join(' | ')); }
};

// ------------------------------------------------------------------ seed
let cats = {}; let adminClient;
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
  await col('users').insertOne({ name: 'E2E Super', username: 'e2eadmin', email: 'e2eadmin@example.test', mobile: '9999999999', passwordHash: await bcrypt.hash(ADMIN_PW, 10), role: 'SUPER_ADMIN', createdAt: now, updatedAt: now });
}

// ------------------------------------------------------------------ helpers
const shops = []; // {i, username, email, id, ownerId, slug, template, client}
const regBody = (i, over = {}) => ({
  name: `Owner ${i}`, username: `e2eown${String(i).padStart(2, '0')}`, email: `own${i}@example.test`,
  mobile: `98${String(10000000 + i)}`, password: PW, shopName: `E2E Jewel ${i}`, city: 'Surat', state: 'GJ', ...over,
});
async function ownerClient(i) {
  const s = shops[i];
  if (s.client?.sessionCookie()) return s.client;
  const c = new Client(`owner${i}`);
  const r = await c.login(s.username, PW);
  if (!r.ok) throw new Error(`owner ${i} login failed ${JSON.stringify(r.session)}`);
  s.client = c; return c;
}
async function adminLogin() {
  adminClient = new Client('admin');
  const r = await adminClient.login('e2eadmin', ADMIN_PW);
  return r.ok;
}
const prod = (over = {}) => ({ name: `Prod ${sku('N')}`, sku: sku(), categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 1000, isPublished: true, ...over });
async function mk(i, over) { const c = await ownerClient(i); return c.post('/api/products', prod(over)); }
async function adminEdit(shopId, fields, { bypassMin = false } = {}) {
  // Returns {url, error, saved}. Success redirects to /admin/shops; validation errors are
  // shown either as ?error= (older build) or an inline role=alert (useActionState build).
  return withPage(adminClient, async (page) => {
    await page.goto(`/admin/shops/${shopId}`);
    await page.waitForLoadState('load').catch(() => {});
    await sleep(2500); // let React hydrate so the server-action form handler is attached
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
    throw new Error('adminEdit: neither redirect nor error shown for ' + JSON.stringify(fields));
  });
}
const shopDoc = (i) => col('shops').findOne({ _id: oid(shops[i].id) });
const page = (client, url, o) => client.get(url, o);
const until = async (fn, ms = 30000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) return v; await sleep(400); } };
const names = (html, re) => [...new Set(html.match(re) || [])];

// ================================================================== A. registration
async function scenarioA() {
  section('A. Registration / auth');
  for (let i = 0; i < 20; i++) {
    const r = await new Client('reg').post('/api/auth/register', regBody(i));
    if (r.status !== 201) record('A1', `register shop ${i}`, 'FAIL', `${r.status} ${r.text.slice(0, 120)}`);
    const u = await col('users').findOne({ username: regBody(i).username });
    const s = u && await col('shops').findOne({ _id: u.shopId });
    shops.push({ i, username: regBody(i).username, email: regBody(i).email, id: s?._id?.toString(), ownerId: u?._id?.toString(), slug: s?.slug, template: s?.storefrontTemplate, approved: s?.isApproved });
  }
  check('A1', '20 shops registered with 201', shops.every((s) => s.id && s.slug));
  check('A2', 'every shop has storefrontTemplate in 1..5', shops.every((s) => Number.isInteger(s.template) && s.template >= 1 && s.template <= 5), JSON.stringify(shops.map((s) => s.template)));
  const dist = [0, 0, 0, 0, 0, 0]; shops.forEach((s) => dist[s.template]++);
  const distinct = dist.slice(1).filter(Boolean).length;
  check('A3', 'template distribution is spread (>=3 of 5 templates used in 20 shops)', distinct >= 3, `dist=${dist.slice(1)}`);
  record('A3i', 'template distribution', 'INFO', `counts for templates 1..5 = ${dist.slice(1)}`);
  check('A4', 'with allowAutoApproval=false new shops are unapproved', shops.every((s) => s.approved === false), JSON.stringify(shops.map((s) => s.approved)));
  check('A4b', 'slugs unique', new Set(shops.map((s) => s.slug)).size === 20);

  const dupU = await new Client().post('/api/auth/register', regBody(50, { username: regBody(0).username }));
  record('A5', 'duplicate username rejected', [400, 409].includes(dupU.status) ? (dupU.status === 409 ? 'PASS' : 'WARN') : 'FAIL', `status ${dupU.status} (spec expects 409)`);
  const dupE = await new Client().post('/api/auth/register', regBody(51, { email: regBody(0).email }));
  record('A6', 'duplicate email rejected', [400, 409].includes(dupE.status) ? (dupE.status === 409 ? 'PASS' : 'WARN') : 'FAIL', `status ${dupE.status} (spec expects 409)`);
  const dupCase = await new Client().post('/api/auth/register', regBody(52, { username: regBody(0).username.toUpperCase(), email: regBody(0).email.toUpperCase() }));
  check('A6b', 'duplicate differing only by case rejected', [400, 409].includes(dupCase.status), `status ${dupCase.status}`);

  const bad = {
    'missing name': { name: '' }, 'missing shopName': { shopName: '' }, 'short username': { username: 'ab' },
    'username bad chars': { username: 'bad user!' }, 'long username': { username: 'a'.repeat(21) }, 'bad email': { email: 'not-an-email' },
    'short password': { password: 'short' }, 'bad mobile': { mobile: 'abc' }, 'short mobile': { mobile: '123' },
    'name too long': { name: 'n'.repeat(101) }, 'shopName 1 char': { shopName: 'x' }, 'non-string password': { password: 12345678 },
    'password 73 ASCII bytes': { password: 'a'.repeat(73) }, 'password 74 bytes (multibyte)': { password: 'é'.repeat(37) },
  };
  let n = 100;
  for (const [label, over] of Object.entries(bad)) {
    const r = await new Client().post('/api/auth/register', regBody(n, { username: `bad${n}x`, email: `bad${n}@example.test`, ...over })); n++;
    check('A7', `bad input rejected 400: ${label}`, r.status === 400, `status ${r.status} ${r.text.slice(0, 100)}`);
  }
  const arr = await new Client().req('POST', '/api/auth/register', { json: [1, 2] });
  check('A7', 'bad input rejected 400: array body', arr.status === 400, `status ${arr.status}`);
  const nj = await new Client().req('POST', '/api/auth/register', { body: '{not json', headers: { 'content-type': 'application/json' } });
  check('A7', 'bad input rejected 400: malformed JSON', nj.status === 400, `status ${nj.status}`);
  const ok72 = await new Client().post('/api/auth/register', regBody(60, { password: 'a'.repeat(72) }));
  check('A8', 'exactly 72-byte password accepted', ok72.status === 201, `status ${ok72.status}`);
  const lg = await new Client().login(regBody(60).username, 'a'.repeat(72));
  check('A8b', '72-byte password can log in', lg.ok);

  // register rate limit: 5 / hour / IP (counted before validation)
  const rl = new Client('rl', '172.31.9.9'); const sts = [];
  for (let k = 0; k < 7; k++) sts.push((await rl.post('/api/auth/register', { x: 1 })).status);
  check('A9', 'register rate limit -> 429 after 5 attempts/IP/hour', sts[4] !== 429 && sts[5] === 429, `statuses ${sts}`);

  // login
  const good = new Client(); const gl = await good.login(shops[0].username, PW);
  check('A10', 'owner login works (username)', gl.ok && gl.session.user.role === 'SHOP_OWNER' && gl.session.user.shopId === shops[0].id, JSON.stringify(gl.session));
  const byEmail = new Client(); const el = await byEmail.req('POST', '/api/auth/callback/credentials', { form: { csrfToken: (await byEmail.get('/api/auth/csrf')).data.csrfToken, email: shops[1].email, password: PW, json: 'true' } });
  check('A10b', 'owner login works (email)', Boolean((await byEmail.get('/api/auth/session')).data?.user), `status ${el.status}`);
  const wrong = new Client(); const wl = await wrong.login(shops[0].username, 'WrongPass123');
  check('A11', 'wrong password does not create a session', !wl.ok);
  const rlu = shops[19].username; const target = new Client('rl2', '172.31.8.8'); const out = [];
  for (let k = 0; k < 12; k++) { const r = await target.login(rlu, 'WrongPass' + k); out.push(r.url || ''); }
  const limited = out.filter((u) => /Too%20many|Too many/i.test(decodeURIComponent(u))).length;
  check('A12', 'login rate limit triggers after repeated failures (per account)', limited >= 1, `urls: ${out.map((u) => decodeURIComponent(u).slice(-40))}`);
  const afterLimit = await new Client('rl3', '172.31.7.7').login(rlu, PW);
  check('A12b', 'correct password is also blocked while account is throttled', !afterLimit.ok, 'correct login succeeded during throttle');
  const other = await new Client('rl4', '172.31.7.7').login(shops[18].username, PW);
  check('A12c', 'other accounts unaffected by throttle on one account', other.ok);
  const long = new Client(); const ll = await long.login(shops[0].username, 'x'.repeat(1100));
  check('A13', 'oversized password rejected on login', !ll.ok);
  const sess = await new Client().get('/api/auth/session');
  check('A14', 'anonymous session empty', !sess.data?.user);
}

// ================================================================== B. admin
async function scenarioB() {
  section('B. Platform admin');
  check('B1', 'SUPER_ADMIN login', await adminLogin());
  const anonPaths = ['/admin', '/admin/shops', '/admin/users', '/admin/settings', '/admin/infrastructure', `/admin/shops/${shops[0].id}`];
  for (const p of anonPaths) {
    const r = await new Client().get(p);
    check('B2', `anonymous ${p} redirects to login`, [302, 303, 307, 308].includes(r.status) && /\/login/.test(r.location || ''), `status ${r.status} loc ${r.location}`);
  }
  const owner0 = await ownerClient(0);
  for (const p of ['/admin', '/admin/shops', '/admin/users', `/admin/shops/${shops[1].id}`]) {
    const r = await owner0.get(p);
    check('B3', `owner ${p} redirects away / denied`, [302, 303, 307, 308].includes(r.status) || r.status === 401 || r.status === 403 || r.status === 404, `status ${r.status} (body has shops? ${/E2E Jewel/.test(r.text)})`);
    check('B3b', `owner ${p} leaks no shop data`, !/E2E Jewel 1\b/.test(r.text));
  }
  const ap = await new Client().post(`/api/admin/shops/${shops[0].id}/approve`, {});
  check('B4', 'anonymous approve API -> 401', ap.status === 401, `status ${ap.status}`);
  const ap2 = await owner0.post(`/api/admin/shops/${shops[0].id}/approve`, {});
  check('B4b', 'owner approve API -> 401', ap2.status === 401, `status ${ap2.status}`);
  check('B4c', 'shop stays unapproved after denied approvals', (await shopDoc(0)).isApproved === false);
  // owner cannot hit cron either
  const cron = await new Client().get('/api/cron/infrastructure');
  check('B4d', 'cron endpoint rejects anonymous', [401, 403].includes(cron.status), `status ${cron.status}`);

  // lists
  const list = await adminClient.get('/admin/shops?size=100');
  const ids = (h) => [...new Set((h.match(/\/admin\/shops\/[0-9a-f]{24}/g) || []).map((x) => x.slice(-24)))];
  check('B5', 'admin shops list renders all registered shops', list.status === 200 && ids(list.text).length >= 20, `status ${list.status} ids ${ids(list.text).length}`);
  const q = await adminClient.get(`/admin/shops?q=${encodeURIComponent('E2E Jewel 7')}`);
  check('B6', 'search by name narrows to match', q.status === 200 && ids(q.text).includes(shops[7].id) && ids(q.text).length < 5, `ids ${ids(q.text).length}`);
  const qs = await adminClient.get(`/admin/shops?q=${shops[3].slug}`);
  check('B6b', 'search by slug', ids(qs.text).includes(shops[3].id));
  const qr = await adminClient.get(`/admin/shops?q=${encodeURIComponent('.*')}`);
  check('B6c', 'regex metacharacters in search are escaped (no match-all, no crash)', qr.status === 200 && ids(qr.text).length === 0, `status ${qr.status} ids ${ids(qr.text).length}`);
  const p1 = await adminClient.get('/admin/shops?size=7&page=1'); const p2 = await adminClient.get('/admin/shops?size=7&page=2'); const p4 = await adminClient.get('/admin/shops?size=7&page=4');
  const i1 = ids(p1.text), i2 = ids(p2.text);
  check('B7', 'pagination size=7 gives 7 rows/page', i1.length === 7 && i2.length === 7, `${i1.length}/${i2.length}`);
  check('B7b', 'page 1 and 2 disjoint', i1.every((x) => !i2.includes(x)));
  check('B7c', 'page past end shows empty state, not error', p4.status === 200 && ids(p4.text).length < 7, `status ${p4.status} ids ${ids(p4.text).length}`);
  const junk = await adminClient.get('/admin/shops?page=abc&size=-5');
  check('B7d', 'junk page/size params handled', junk.status === 200);
  const users = await adminClient.get('/admin/users?q=e2eown03');
  check('B8', 'admin users list + search', users.status === 200 && /e2eown03/.test(users.text) && !/e2eown04/.test(users.text), `status ${users.status}`);

  // approve (API) + reject (UI)
  const bad = await adminClient.post('/api/admin/shops/not-an-id/approve', {});
  check('B9', 'approve invalid id -> 400', bad.status === 400, `status ${bad.status}`);
  const nf = await adminClient.post(`/api/admin/shops/${oid('0'.repeat(24))}/approve`, {});
  check('B9b', 'approve unknown shop -> 404', nf.status === 404, `status ${nf.status}`);
  for (let i = 0; i < 17; i++) {
    const r = await adminClient.post(`/api/admin/shops/${shops[i].id}/approve`, {});
    if (r.status !== 200) record('B10', `approve shop ${i}`, 'FAIL', `status ${r.status}`);
  }
  const approvedCount = await col('shops').countDocuments({ _id: { $in: shops.slice(0, 17).map((s) => oid(s.id)) }, isApproved: true });
  check('B10', 'approve API approved shops 0..16', approvedCount === 17, `approved ${approvedCount}`);
  check('B10b', 'shops 17..19 still unapproved', (await col('shops').countDocuments({ _id: { $in: shops.slice(17).map((s) => oid(s.id)) }, isApproved: false })) === 3);

  // reject: storefront live, then reject via admin form, then storefront 404 (cache invalidation)
  const v = new Client('v');
  const live = await v.get(`/shop/${shops[16].slug}`);
  check('B11a', 'approved shop 16 storefront live (200)', live.status === 200, `status ${live.status}`);
  const rej = await adminEdit(shops[16].id, { isApproved: 'false' });
  check('B11', 'admin reject via form saved', (await shopDoc(16)).isApproved === false && rej.saved, JSON.stringify(rej));
  const dead = await new Client('v2').get(`/shop/${shops[16].slug}`);
  check('B11b', 'rejected shop storefront becomes 404 (cache invalidated)', dead.status === 404, `status ${dead.status}`);
  const ap3 = await adminClient.post(`/api/admin/shops/${shops[16].id}/approve`, {});
  check('B11c', 're-approve after reject', ap3.status === 200 && (await shopDoc(16)).isApproved === true);
  await adminEdit(shops[16].id, { isApproved: 'false' });

  // plan limits edit
  const url = (await adminEdit(shops[5].id, { maxProducts: 7, maxPhotosPerDay: 11, maxVideosPerDay: 3, videoUploadsEnabled: 'true', maxVideoDurationSeconds: 45, maxLinkOpens: 123, planPrice: 4999, planEndsAt: '2099-01-01' })).url;
  const d = await shopDoc(5);
  check('B12', 'edit plan limits persisted', d.maxProducts === 7 && d.maxPhotosPerDay === 11 && d.maxVideosPerDay === 3 && d.videoUploadsEnabled === true && d.maxVideoDurationSeconds === 45 && d.maxLinkOpens === 123 && d.planPrice === 4999 && d.planEndsAt && new Date(d.planEndsAt).getUTCFullYear() === 2099, JSON.stringify({ url, d: { m: d.maxProducts, p: d.planPrice, e: d.planEndsAt } }));
  const listP = await adminClient.get(`/admin/shops?q=${shops[5].slug}`);
  check('B12b', 'list shows Premium plan after edit', /Premium/.test(listP.text));
  const e1 = await adminEdit(shops[5].id, { maxProducts: 0 }, { bypassMin: true });
  check('B13', 'maxProducts=0 rejected with error message', Boolean(e1.error) && (await shopDoc(5)).maxProducts === 7, e1);
  const e2 = await adminEdit(shops[5].id, { maxVideoDurationSeconds: 500 }, { bypassMin: true });
  check('B13b', 'video duration 500 rejected', Boolean(e2.error) && (await shopDoc(5)).maxVideoDurationSeconds === 45, e2);
  const e3 = await adminEdit(shops[5].id, { planPrice: 100, planEndsAt: '2001-01-01' }, { bypassMin: true });
  check('B13c', 'premium plan with past end date rejected', Boolean(e3.error) && (await shopDoc(5)).planPrice === 4999, e3);
  const e4 = await adminEdit(shops[5].id, { maxLinkOpens: '5' }, { bypassMin: true });
  const e4b = await adminEdit(shops[5].id, { maxLinkOpens: '1.5' }, { bypassMin: true }).catch((e) => ({ error: null, noFeedback: String(e.message) }));
  check('B13d', 'fractional maxLinkOpens not saved', (await shopDoc(5)).maxLinkOpens === 5, JSON.stringify(e4b));
  warn('B13e', 'fractional maxLinkOpens shows an error message', Boolean(e4b.error), `no error/redirect shown (silent failure?) ${JSON.stringify(e4b)}`);
  await adminEdit(shops[5].id, { planPrice: 0, maxProducts: 50, maxLinkOpens: 500 });
  const d2 = await shopDoc(5);
  check('B14', 'planPrice 0 clears planEndsAt (back to Free)', d2.planPrice === 0 && !d2.planEndsAt, JSON.stringify(d2.planEndsAt));

  // deleted / demoted admin
  const now = new Date();
  const adm2 = await col('users').insertOne({ name: 'Plat', username: 'e2eplat', mobile: '9999999998', passwordHash: await bcrypt.hash(ADMIN_PW, 10), role: 'PLATFORM_ADMIN', createdAt: now, updatedAt: now });
  const c2 = new Client('adm2'); await c2.login('e2eplat', ADMIN_PW);
  const before = await c2.get('/admin/shops');
  check('B15', 'PLATFORM_ADMIN can open /admin/shops', before.status === 200);
  await col('users').deleteOne({ _id: adm2.insertedId });
  const after = await c2.get('/admin/shops');
  check('B15b', 'deleted admin loses page access (redirect)', [302, 303, 307, 308].includes(after.status), `status ${after.status}`);
  const afterApi = await c2.post(`/api/admin/shops/${shops[18].id}/approve`, {});
  check('B15c', 'deleted admin loses API access (401)', afterApi.status === 401, `status ${afterApi.status}`);
  check('B15d', 'unapproved shop 18 stays unapproved', (await shopDoc(18)).isApproved === false);
  const adm3 = await col('users').insertOne({ name: 'Dem', username: 'e2edemote', mobile: '9999999997', passwordHash: await bcrypt.hash(ADMIN_PW, 10), role: 'PLATFORM_ADMIN', createdAt: now, updatedAt: now });
  const c3 = new Client('adm3'); await c3.login('e2edemote', ADMIN_PW);
  await col('users').updateOne({ _id: adm3.insertedId }, { $set: { role: 'CUSTOMER' } });
  const dem = await c3.post(`/api/admin/shops/${shops[18].id}/approve`, {});
  check('B15e', 'demoted admin loses API access with stale JWT', dem.status === 401, `status ${dem.status}`);
}

// ================================================================== C. owner
async function scenarioC() {
  section('C. Shop owner');
  const c = await ownerClient(0);
  const cat = await c.get('/api/categories');
  check('C1', 'categories API returns system categories', cat.status === 200 && cat.data.categories?.length >= 3, `status ${cat.status}`);
  const anon = await new Client().post('/api/products', prod());
  check('C2', 'anonymous create product -> 401', anon.status === 401, `status ${anon.status}`);
  const asAdmin = await adminClient.post('/api/products', prod());
  check('C2b', 'admin (no shop) create product -> 401', asAdmin.status === 401, `status ${asAdmin.status}`);

  const created = {};
  const okCase = async (id, label, over, verify) => {
    const r = await mk(0, over);
    const p = r.data?.product;
    const good = r.status === 201 && p && (!verify || verify(p));
    check(id, label, good, `status ${r.status} ${r.text.slice(0, 200)}`);
    if (p) created[id] = p;
    return p;
  };
  await okCase('C3a', 'FIXED_PRICE product', { priceType: 'FIXED_PRICE', price: 1000 }, (p) => p.price === 1000 && !p.originalPrice);
  await okCase('C3b', 'STARTING_FROM product', { priceType: 'STARTING_FROM', price: 500 }, (p) => p.price === 500 && p.priceType === 'STARTING_FROM');
  await okCase('C3c', 'PRICE_ON_REQUEST ignores supplied price', { priceType: 'PRICE_ON_REQUEST', price: 500 }, (p) => p.price === undefined);
  await okCase('C3d', 'CONTACT_FOR_PRICE ignores supplied price+discount', { priceType: 'CONTACT_FOR_PRICE', price: 500, discountType: 'PERCENTAGE', discountValue: 10 }, (p) => p.price === undefined && !p.discountValue);
  await okCase('C3e', '10% discount -> 900, original 1000', { price: 1000, discountType: 'PERCENTAGE', discountValue: 10 }, (p) => p.price === 900 && p.originalPrice === 1000 && p.discountPercentage === 10);
  await okCase('C3f', 'fixed 250 discount -> 750 (25%)', { price: 1000, discountType: 'FIXED_AMOUNT', discountValue: 250 }, (p) => p.price === 750 && p.discountPercentage === 25);
  await okCase('C3g', '100% discount edge -> price 0', { price: 1000, discountType: 'PERCENTAGE', discountValue: 100 }, (p) => p.price === 0);
  await okCase('C3h', 'making charges + 20% making discount stored', { makingCharges: 400, makingChargesDiscountType: 'PERCENTAGE', makingChargesDiscountValue: 20, goldPurity: '22K', goldWeight: 5.5 }, (p) => p.makingCharges === 400 && p.makingChargesDiscountValue === 20 && p.goldPurity === '22K');
  await okCase('C3i', 'draft product (isPublished false)', { isPublished: false }, (p) => p.isPublished === false);
  await okCase('C3j', 'string numerics ("1500") accepted', { price: '1500' }, (p) => p.price === 1500);
  await okCase('C3k', 'invalid goldPurity silently dropped', { goldPurity: '99K' }, (p) => !p.goldPurity);
  const ownKey = `shops/${shops[0].id}/products/confirmed.jpg`;
  await mk(0, { images: [`${R2_PUBLIC}/${ownKey}`] }).then((r) => check('C3l0', 'own-prefix image NOT confirmed by an upload is rejected (400)', r.status === 400, `status ${r.status} ${r.text.slice(0, 120)}`));
  await col('mediareservations').insertOne({ shopId: oid(shops[0].id), key: ownKey, kind: 'photos', day: '2026-10-07', contentType: 'image/jpeg', contentLength: 1000, state: 'confirmed', expiresAt: new Date(Date.now() + 86400e3), purgeAt: new Date(Date.now() + 86400e3 * 30) });
  await okCase('C3l', 'confirmed upload (reservation seeded in DB) under own R2 prefix accepted', { images: [`${R2_PUBLIC}/${ownKey}`] }, (p) => p.images.length === 1);
  await okCase('C3m', 'SKU upper-cased', { sku: sku('lower') }, (p) => p.sku === p.sku.toUpperCase());
  await okCase('C3n', 'XSS-ish name stored verbatim as text (rendering escaped later)', { name: '<script>alert(1)</script> Ring' }, null);

  const badCase = async (id, label, over, status = 400) => {
    const r = await mk(0, over);
    check(id, label, r.status === status, `status ${r.status} ${r.text.slice(0, 160)}`);
  };
  await badCase('C4a', '% discount > 100 -> 400', { discountType: 'PERCENTAGE', discountValue: 150 });
  await badCase('C4b', 'fixed discount > price -> 400', { price: 100, discountType: 'FIXED_AMOUNT', discountValue: 500 });
  await badCase('C4c', 'discount without type -> 400', { discountValue: 10 });
  await badCase('C4d', 'discount without price (STARTING_FROM no price) -> 400', { priceType: 'STARTING_FROM', price: '', discountType: 'PERCENTAGE', discountValue: 10 });
  await badCase('C4e', 'negative price -> 400', { price: -5 });
  await badCase('C4f', 'FIXED_PRICE without price -> 400', { price: '' });
  await badCase('C4g', 'FIXED_PRICE with price 0 -> 400', { price: 0 });
  await badCase('C4h', 'non-numeric price -> 400', { price: 'abc' });
  await badCase('C4i', 'unknown categoryId -> 400', { categoryId: oid('1'.repeat(24)).toString() });
  await badCase('C4j', 'malformed categoryId -> 400', { categoryId: 'xyz' });
  await badCase('C4k', 'missing name -> 400', { name: '' });
  await badCase('C4l', 'missing sku -> 400', { sku: '' });
  await badCase('C4m', 'making discount w/o making charges -> 400', { makingChargesDiscountType: 'PERCENTAGE', makingChargesDiscountValue: 10 });
  await badCase('C4n', 'making % discount >100 -> 400', { makingCharges: 100, makingChargesDiscountType: 'PERCENTAGE', makingChargesDiscountValue: 101 });
  await badCase('C4o', 'making fixed discount > charges -> 400', { makingCharges: 100, makingChargesDiscountType: 'FIXED_AMOUNT', makingChargesDiscountValue: 101 });
  await badCase('C4p', 'foreign-host image -> 400', { images: ['https://evil.example/x.jpg'] });
  await badCase('C4q', "other shop's R2 prefix image -> 400", { images: [`${R2_PUBLIC}/shops/${shops[3].id}/products/a.jpg`] });
  await badCase('C4r', 'R2 path traversal image -> 400', { images: [`${R2_PUBLIC}/shops/${shops[0].id}/products/../../${shops[3].id}/products/a.jpg`] });
  await badCase('C4s', 'video when videos disabled -> 403', { videos: [`${R2_PUBLIC}/shops/${shops[0].id}/products/a.mp4`] }, 403);
  const dupSku = sku('DUP'); await mk(0, { sku: dupSku });
  await badCase('C4t', 'duplicate SKU in same shop -> 400', { sku: dupSku });
  const arr = await c.req('POST', '/api/products', { json: [1] });
  check('C4u', 'array body -> 400', arr.status === 400, `status ${arr.status}`);
  const nj = await c.req('POST', '/api/products', { body: '{oops', headers: { 'content-type': 'application/json' } });
  check('C4v', 'malformed JSON body -> 400 (not 500)', nj.status === 400, `status ${nj.status}  [src/app/api/products/route.ts:46 await req.json() un-guarded inside try -> 500]`);
  const dupOther = await mk(3, { sku: dupSku });
  check('C4w', 'same SKU allowed in a different shop', dupOther.status === 201, `status ${dupOther.status}`);

  // edit
  const p = created.C3a;
  const patch = (id, body, client = c) => client.patch(`/api/products/${id}`, body);
  const full = (over = {}) => ({ name: 'Edited Ring', sku: p.sku, categoryId: cats.necklaces, priceType: 'FIXED_PRICE', price: 2000, discountType: 'PERCENTAGE', discountValue: 25, isPublished: true, ...over });
  const pe = await patch(p._id, full());
  const after = await col('products').findOne({ _id: oid(p._id) });
  check('C5', 'edit product persists (name, category, price, discount)', pe.status === 200 && after.name === 'Edited Ring' && after.price === 1500 && after.originalPrice === 2000 && after.categoryId.toString() === cats.necklaces, `status ${pe.status} ${pe.text.slice(0, 150)} price=${after?.price}`);
  const pe2 = await patch(p._id, full({ priceType: 'PRICE_ON_REQUEST' }));
  const after2 = await col('products').findOne({ _id: oid(p._id) });
  check('C5b', 'switching to PRICE_ON_REQUEST clears price/discount', pe2.status === 200 && after2.price === undefined && after2.discountValue === undefined, JSON.stringify({ s: pe2.status, price: after2.price }));
  const bads = [['% > 100', full({ discountValue: 120 })], ['fixed > price', full({ discountType: 'FIXED_AMOUNT', discountValue: 99999 })], ['no price', full({ price: '' })], ['neg price', full({ price: -1 })], ['no name', full({ name: '' })], ['bad cat', full({ categoryId: oid('2'.repeat(24)).toString() })]];
  for (const [l, b] of bads) { const r = await patch(p._id, b); check('C5c', `edit invalid -> 400: ${l}`, r.status === 400, `status ${r.status} ${r.text.slice(0, 100)}`); }
  const pj = await c.req('PATCH', `/api/products/${p._id}`, { body: '{oops', headers: { 'content-type': 'application/json' } });
  check('C5d', 'edit malformed JSON -> 400 (not 500)', pj.status === 400, `status ${pj.status}  [src/app/api/products/[id]/route.ts:50]`);
  const pbad = await patch('not-an-id', full());
  check('C5e', 'edit invalid id -> 400', pbad.status === 400, `status ${pbad.status}`);
  const pnf = await patch(oid('3'.repeat(24)).toString(), full());
  check('C5f', 'edit unknown id -> 404', pnf.status === 404, `status ${pnf.status}`);
  const pdup = await patch(p._id, full({ sku: created.C3b.sku }));
  check('C5g', 'edit to an existing SKU -> 400', pdup.status === 400, `status ${pdup.status}`);

  // IDOR: owner 0 attacks shop 3's product
  const victim = (await mk(3)).data.product;
  const idorEdit = await patch(victim._id, full({ name: 'HACKED' }));
  check('C6', "IDOR: edit another shop's product -> 404 and unchanged", idorEdit.status === 404 && (await col('products').findOne({ _id: oid(victim._id) })).name !== 'HACKED', `status ${idorEdit.status}`);
  const idorCat = await mk(0, { categoryId: (await col('categories').insertOne({ name: 'Private', slug: 'private', shopId: oid(shops[3].id), isSystemDefault: false })).insertedId.toString() });
  check('C6b', "IDOR: using another shop's private category -> 400", idorCat.status === 400, `status ${idorCat.status}`);
  const spoof = await c.post('/api/products', { ...prod(), shopId: shops[3].id });
  const sp = spoof.data?.product;
  check('C6c', 'body shopId spoof ignored (product lands in own shop)', spoof.status === 201 && sp.shopId === shops[0].id, `status ${spoof.status} shopId ${sp?.shopId}`);
  const idorPub = await patch(victim._id, { ...full(), isPublished: false });
  check('C6d', "IDOR: unpublish another shop's product denied", idorPub.status === 404 && (await col('products').findOne({ _id: oid(victim._id) })).isPublished === true);

  // UI actions: settings, gold rate, delete, IDOR delete via replayed server action
  await withPage(c, async (pg) => {
    // settings
    await pg.goto('/dashboard/settings'); await sleep(2000);
    await pg.locator('input[name=shortDescription]').fill('E2E tagline <b>x</b>');
    await pg.locator('input[name=instagramUrl]').fill('javascript:alert(1)');
    await pg.locator('input[name=websiteUrl]').fill('https://example.test/shop');
    await pg.getByRole('button', { name: /Save Changes/i }).click();
    await until(async () => (await shopDoc(0)).shortDescription);
    const s = await shopDoc(0);
    check('C7', 'settings update persisted', s.shortDescription === 'E2E tagline <b>x</b>' && s.websiteUrl === 'https://example.test/shop', JSON.stringify({ d: s.shortDescription, w: s.websiteUrl }));
    check('C7b', 'javascript: URL in social link sanitised', !s.instagramUrl, `instagramUrl=${s.instagramUrl}`);
    // gold rate
    await pg.goto('/dashboard'); await sleep(2000);
    const rate = async (a, b) => {
      await pg.goto('/dashboard'); await sleep(4000);
      await pg.fill('#gold-rate-22k', a); await pg.fill('#gold-rate-24k', b);
      await pg.getByRole('button', { name: /Update Banner/ }).click();
      await pg.locator('[role=status]').first().waitFor({ timeout: 30000 }).catch(() => {});
      return (await pg.locator('[role=status]').first().innerText().catch(() => '')).trim();
    };
    const g1 = await rate('6500', '7100');
    const sd = await shopDoc(0);
    check('C8', 'gold rate valid update persisted', sd.goldRate22K === 6500 && sd.goldRate24K === 7100, g1);
    const lowMsg = await rate('999', '7100'); check('C8b', 'gold rate below 1000 rejected', /Could not/.test(lowMsg) && (await shopDoc(0)).goldRate22K === 6500, lowMsg);
    const hiMsg = await rate('6500', '200001'); check('C8c', 'gold rate above 200000 rejected', /Could not/.test(hiMsg) && (await shopDoc(0)).goldRate24K === 7100, hiMsg);
    const invMsg = await rate('8000', '7000'); check('C8d', '22K > 24K rejected', /Could not/.test(invMsg) && (await shopDoc(0)).goldRate22K === 6500, invMsg);
    const edge1 = await rate('1000', '200000'); check('C8e', 'gold rate boundary values 1000/200000 accepted', (await shopDoc(0)).goldRate22K === 1000 && (await shopDoc(0)).goldRate24K === 200000, edge1);
    await rate('6500', '7100');
    // delete
    const del = (await mk(0, { name: 'DeleteMe Tiara', sku: sku('DEL') })).data.product;
    const ctl = (await mk(0, { name: 'ControlDel Tiara', sku: sku('CTL') })).data.product;
    let actionId = null;
    pg.on('request', (rq) => { const h = rq.headers()['next-action']; if (h) actionId = h; });
    pg.on('dialog', (d) => d.accept());
    await pg.goto('/dashboard/products'); await sleep(2000);
    await pg.locator('article:visible, tr:visible').filter({ hasText: del.sku }).locator('button[title="Delete product"]').first().click();
    await until(async () => (await col('products').findOne({ _id: oid(del._id) })) === null, 20000);
    check('C9', 'owner deletes product via UI (confirm dialog)', (await col('products').findOne({ _id: oid(del._id) })) === null, 'still in DB');
    // replay the server action with other ids
    if (actionId) {
      const replay = (id) => c.req('POST', '/dashboard/products', { body: JSON.stringify([id]), headers: { 'next-action': actionId, 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component' }, raw: true });
      await replay(victim._id);
      check('C10', "IDOR: delete another shop's product via replayed server action denied", (await col('products').findOne({ _id: oid(victim._id) })) !== null, 'victim product deleted by shop 0 owner!');
      await replay(ctl._id);
      const ctlGone = (await col('products').findOne({ _id: oid(ctl._id) })) === null;
      if (!ctlGone) record('C10c', 'positive control for replay (own product delete)', 'INFO', 'replay mechanism did not delete own product, so C10 is inconclusive');
      else record('C10c', 'positive control for replay (own product delete)', 'PASS');
    } else record('C10', 'IDOR delete replay', 'INFO', 'could not capture server action id');
  });
  const anonDel = await new Client().get('/dashboard/products');
  check('C11', 'anonymous dashboard redirects to login', [302, 303, 307, 308].includes(anonDel.status), `status ${anonDel.status}`);

  // plan limit via admin-edited maxProducts=3 on shop 1, concurrency
  await adminEdit(shops[1].id, { maxProducts: 3 });
  const c1 = await ownerClient(1);
  const burst = await Promise.all(Array.from({ length: 8 }, (_, k) => c1.post('/api/products', prod({ name: `Burst ${k}`, sku: sku('BUR') }))));
  const okN = burst.filter((r) => r.status === 201).length; const denied = burst.filter((r) => r.status === 403).length;
  const cnt = await col('products').countDocuments({ shopId: oid(shops[1].id) });
  check('C12', 'max-products=3: 8 concurrent creates -> exactly 3 succeed', okN === 3 && cnt === 3, `201s=${okN} 403s=${denied} others=${burst.map((r) => r.status)} dbCount=${cnt}`);
  check('C12b', 'excess creates return 403 with limit message', denied === 5 && burst.filter((r) => r.status === 403).every((r) => /maximum product limit/.test(r.data?.error || '')), `statuses ${burst.map((r) => r.status)}`);
  const seq = await c1.post('/api/products', prod());
  check('C12c', '4th sequential create -> 403', seq.status === 403, `status ${seq.status}`);
  await adminEdit(shops[1].id, { maxProducts: 4 });
  const seq2 = await c1.post('/api/products', prod());
  check('C12d', 'raising limit via admin allows one more create', seq2.status === 201, `status ${seq2.status}`);
  const seq3 = await c1.post('/api/products', prod());
  check('C12e', 'then blocked again at 4', seq3.status === 403 && (await col('products').countDocuments({ shopId: oid(shops[1].id) })) === 4);

  // expired plan
  const c2 = await ownerClient(2);
  const okBefore = await c2.post('/api/products', prod());
  check('C13a', 'shop 2 can create before expiry', okBefore.status === 201, `status ${okBefore.status}`);
  const pid2 = okBefore.data.product._id;
  await col('shops').updateOne({ _id: oid(shops[2].id) }, { $set: { planPrice: 999, planEndsAt: new Date(Date.now() - 86400_000) } });
  const exp = await c2.post('/api/products', prod());
  check('C13', 'expired plan blocks product creation (403)', exp.status === 403 && /expired/i.test(exp.data?.error || ''), `status ${exp.status} ${exp.text.slice(0, 120)}`);
  const expEdit = await c2.patch(`/api/products/${pid2}`, { name: 'x', sku: 'ABC', categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 10 });
  check('C13b', 'expired plan blocks product edit (403)', expEdit.status === 403, `status ${expEdit.status}`);
  const up = (folder) => c2.post('/api/upload/url', { filename: 'a.jpg', contentType: 'image/jpeg', contentLength: 1000, folder });
  const upP = await up('products'); const upL = await up('logos'); const upC = await up('covers');
  check('C13c', 'expired plan blocks product uploads (403)', upP.status === 403, `status ${upP.status}`);
  record('C13d', 'expired plan branding (logo/cover) upload exception', upL.status === 403 && upC.status === 403 ? 'INFO' : 'PASS',
    upL.status === 403 && upC.status === 403 ? `not implemented: logos=${upL.status} covers=${upC.status} (src/app/api/upload/url/route.ts getPlanBlock applies to every folder)` : `logos=${upL.status} covers=${upC.status} (503 = passed plan check, R2 intentionally unconfigured)`);
  const expSettings = await withPage(c2, async (pg) => { await pg.goto('/dashboard/settings'); await sleep(2000); await pg.locator('input[name=shortDescription]').fill('still editable'); await pg.getByRole('button', { name: /Save Changes/i }).click(); await until(async () => (await shopDoc(2)).shortDescription); return (await shopDoc(2)).shortDescription; });
  record('C13e', 'expired plan: settings still editable', expSettings === 'still editable' ? 'PASS' : 'INFO', `shortDescription=${expSettings}`);
  await col('shops').updateOne({ _id: oid(shops[2].id) }, { $set: { planEndsAt: new Date(Date.now() + 86400_000 * 30) } });
  const back = await c2.post('/api/products', prod());
  check('C13f', 'renewed plan allows creation again', back.status === 201, `status ${back.status}`);
  await col('shops').updateOne({ _id: oid(shops[2].id) }, { $set: { planPrice: 0 }, $unset: { planEndsAt: '' } });
  await col('shops').updateOne({ _id: oid(shops[2].id) }, { $set: { isActive: false } });
  const inactive = await c2.post('/api/products', prod());
  check('C13g', 'suspended (inactive) shop cannot create (403)', inactive.status === 403, `status ${inactive.status}`);
  await col('shops').updateOne({ _id: oid(shops[2].id) }, { $set: { isActive: true } });
  // uploads validation (no R2)
  const bad1 = await c.post('/api/upload/url', { filename: 'a.exe', contentType: 'application/x-msdownload', contentLength: 10, folder: 'products' });
  check('C14', 'upload url rejects disallowed content type (400)', bad1.status === 400, `status ${bad1.status}`);
  const bad2 = await c.post('/api/upload/url', { filename: 'a.jpg', contentType: 'image/jpeg', contentLength: 20 * 1024 * 1024, folder: 'products' });
  check('C14b', 'upload url rejects >10MB photo (413)', bad2.status === 413, `status ${bad2.status}`);
  const bad3 = await c.post('/api/upload/url', { filename: 'a.mp4', contentType: 'video/mp4', contentLength: 100, durationSeconds: 10, folder: 'products' });
  check('C14c', 'video upload denied when disabled (403)', bad3.status === 403, `status ${bad3.status}`);
  record('C14d', 'R2 uploads', 'INFO', 'presigned PUT not testable without R2; skipped');
}

// ================================================================== D. customer
let catalogue; // shop 4
async function scenarioD() {
  section('D. Customer storefront');
  // --- templates: one shop per template (1..5), forcing the template in DB only when the 20 random shops lack it
  const pool = [5, 6, 7, 8, 9, 10, 11]; const byT = {}; const used = new Set();
  for (const i of pool) { const t = shops[i].template; if (!byT[t]) { byT[t] = i; used.add(i); } }
  for (let t = 1; t <= 5; t++) if (!byT[t]) {
    const i = pool.find((x) => !used.has(x)); used.add(i); byT[t] = i;
    await col('shops').updateOne({ _id: oid(shops[i].id) }, { $set: { storefrontTemplate: t } }); shops[i].template = t;
    record('D0', `template ${t} not produced by registration in pool`, 'INFO', `forced on shop ${i} in DB`);
  }
  for (let t = 1; t <= 5; t++) {
    const i = byT[t]; const names = [];
    for (let k = 0; k < 2; k++) { const nm = `Tpl${t}Item${k} Bangle`; names.push(nm); const r = await mk(i, { name: nm, price: 1000 + k }); if (r.status !== 201) record('D1', `seed product tpl ${t}`, 'FAIL', r.text.slice(0, 100)); }
    const r = await new Client(`c${t}`).get(`/shop/${shops[i].slug}`);
    check('D1', `template ${t}: 200 + data-storefront-template="${t}"`, r.status === 200 && r.text.includes(`data-storefront-template="${t}"`), `status ${r.status} marker=${(r.text.match(/data-storefront-template="(\d)"/) || [])[1]}`);
    check('D1b', `template ${t}: products rendered`, names.every((n) => r.text.includes(n)), `missing: ${names.filter((n) => !r.text.includes(n))}`);
    check('D1c', `template ${t}: shop name rendered`, r.text.includes(`E2E Jewel ${i}`));
  }
  // --- catalogue shop 4: categories + pagination + draft
  const i4 = 4; catalogue = i4;
  const c4 = await ownerClient(i4);
  for (let k = 0; k < 20; k++) {
    const r = await c4.post('/api/products', prod({ name: `PagItem-${String(k).padStart(2, '0')}`, sku: sku('PAG'), categoryId: k % 4 === 0 ? cats.necklaces : cats.rings }));
    if (r.status !== 201) record('D2', `seed pag ${k}`, 'FAIL', r.text.slice(0, 100));
    await sleep(15);
  }
  const draft = (await c4.post('/api/products', prod({ name: 'DraftSecret-77', sku: sku('DR'), isPublished: false }))).data.product;
  const s4 = shops[i4].slug; const cust = new Client('cust4');
  const first = await cust.get(`/shop/${s4}`);
  const pg1 = names(first.text, /PagItem-\d\d/g);
  check('D2', 'catalogue page 1 shows 18 products (page size)', pg1.length === 18, `got ${pg1.length}`);
  check('D2b', 'newest first ordering (PagItem-19 on page 1, PagItem-00 not)', pg1.includes('PagItem-19') && !pg1.includes('PagItem-00'));
  check('D2c', 'draft product not visible to customers', !first.text.includes('DraftSecret-77'));
  const nextHref = (first.text.match(/href="([^"]*[?&]after=[^"]+)"/) || [])[1];
  check('D2d', 'next-page cursor link present', Boolean(nextHref));
  if (nextHref) {
    const second = await cust.get(nextHref.replace(/&amp;/g, '&'));
    const pg2 = names(second.text, /PagItem-\d\d/g);
    check('D2e', 'page 2 has remaining 2 products, no overlap', second.status === 200 && pg2.length === 2 && pg2.every((n) => !pg1.includes(n)), `pg2=${pg2}`);
  }
  const junkCursor = await cust.get(`/shop/${s4}?after=garbage`);
  check('D2f', 'garbage cursor does not crash (200)', junkCursor.status === 200, `status ${junkCursor.status}`);
  const catR = await cust.get(`/shop/${s4}?category=necklaces`); const nk = names(catR.text, /PagItem-\d\d/g);
  check('D3', 'category filter: necklaces only (5 of 20: 00,04,08,12,16)', catR.status === 200 && nk.length === 5 && nk.every((n) => Number(n.slice(-2)) % 4 === 0), `got ${nk}`);
  const catR2 = await cust.get(`/shop/${s4}?category=rings`); const rg = names(catR2.text, /PagItem-\d\d/g);
  check('D3b', 'category filter: rings page 1 contains no necklace items', rg.length > 0 && rg.every((n) => Number(n.slice(-2)) % 4 !== 0), `got ${rg}`);
  const catU = await cust.get(`/shop/${s4}?category=does-not-exist`);
  check('D3c', 'unknown category shows no products (not everything)', catU.status === 200 && names(catU.text, /PagItem-\d\d/g).length === 0);
  const catX = await cust.get(`/shop/${s4}?category=${encodeURIComponent('../../etc')}`);
  check('D3d', 'junk category slug handled (200, no products)', catX.status === 200 && names(catX.text, /PagItem-\d\d/g).length === 0, `status ${catX.status}`);
  const catNames = ['Rings', 'Necklaces'].every((n) => first.text.includes(n));
  check('D3e', 'category names rendered in storefront', catNames);

  // product page
  const prods = await col('products').find({ shopId: oid(shops[i4].id), isPublished: true }).toArray();
  const pp = prods[0];
  const pr = await cust.get(`/shop/${s4}/product/${pp._id}`);
  check('D4', 'product page 200 with product name + price', pr.status === 200 && pr.text.includes(pp.name) && /1,000/.test(pr.text), `status ${pr.status}`);
  const prD = await cust.get(`/shop/${s4}/product/${draft._id}`);
  check('D4b', 'draft product page -> 404', prD.status === 404, `status ${prD.status}`);
  const prX = await cust.get(`/shop/${shops[5].slug}/product/${pp._id}`);
  check('D4c', "product under another shop's slug -> 404", prX.status === 404, `status ${prX.status}`);
  const prI = await cust.get(`/shop/${s4}/product/not-an-id`);
  check('D4d', 'invalid product id -> 404', prI.status === 404, `status ${prI.status}`);
  const xss = await col('products').findOne({ name: /<script>alert/ });
  const xssPage = await cust.get(`/shop/${shops[0].slug}/product/${xss._id}`);
  check('D4e', 'XSS in product name is escaped on product page', xssPage.status === 200 && !xssPage.text.includes('<script>alert(1)</script> Ring') && xssPage.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), `status ${xssPage.status}`);

  // status codes for missing shops
  const unk = await new Client().get('/shop/no-such-shop-zzz');
  check('D5', 'unknown shop -> 404 status', unk.status === 404, `status ${unk.status}`);
  const unap = await new Client().get(`/shop/${shops[18].slug}`);
  check('D5b', 'unapproved shop -> 404 status', unap.status === 404, `status ${unap.status}`);
  const unapP = await new Client().get(`/shop/${shops[18].slug}/product/${oid('4'.repeat(24))}`);
  check('D5c', 'unapproved shop product page -> 404', unapP.status === 404, `status ${unapP.status}`);
  const demo = await new Client().get('/shop/demo');
  record('D5d', '/shop/demo route', 'INFO', `status ${demo.status}`);
  const sm = await new Client().get('/sitemap.xml'); const mf = await new Client().get(`/api/shop/${s4}/manifest.json`);
  check('D5e', 'sitemap + shop manifest respond', sm.status === 200 && mf.status === 200 && mf.data?.name, `sitemap ${sm.status} manifest ${mf.status}`);
  check('D5f', 'sitemap omits unapproved shops', !sm.text.includes(shops[18].slug), '');
  const mfU = await new Client().get(`/api/shop/${shops[18].slug}/manifest.json`);
  check('D5g', 'manifest of unapproved shop is 404', mfU.status === 404, `status ${mfU.status}`);

  // ---- enquiries
  const eq = (body, c = new Client('eq')) => c.post('/api/enquiries', body);
  const sid = shops[i4].id; const goodE = (o = {}) => ({ shopId: sid, customerName: 'Asha Patel', customerPhone: '9876543210', message: 'Is this available in 18K?', ...o });
  const ec = new Client('eqmain'); const dashBefore = await dashEnq(0);
  const e1 = await eq(goodE({ productId: pp._id.toString() }), ec);
  check('D6', 'enquiry valid -> 201 and stored', e1.status === 201 && (await col('enquiries').countDocuments({ shopId: oid(sid), customerPhone: '9876543210' })) === 1, `status ${e1.status} ${e1.text.slice(0, 100)}`);
  const stored = await col('enquiries').findOne({ shopId: oid(sid) });
  check('D6b', 'enquiry linked to product, status NEW', stored.productId?.toString() === pp._id.toString() && stored.status === 'NEW');
  const e2 = await eq(goodE({ productId: pp._id.toString() }), ec);
  check('D6c', 'duplicate enquiry deduped (201, still 1 row)', e2.status === 201 && (await col('enquiries').countDocuments({ shopId: oid(sid), customerPhone: '9876543210' })) === 1);
  const bots = await eq(goodE({ customerPhone: '9000000001', website: 'http://spam.example' }));
  check('D6d', 'honeypot -> 201 but nothing stored', bots.status === 201 && (await col('enquiries').countDocuments({ customerPhone: '9000000001' })) === 0, `status ${bots.status}`);
  for (const [l, o] of Object.entries({ 'short name': { customerName: 'A' }, 'bad phone': { customerPhone: 'call me' }, 'short phone': { customerPhone: '12345' }, 'short message': { message: 'hi' }, 'missing fields': { customerName: undefined } })) {
    const r = await eq(goodE(o)); check('D6e', `enquiry invalid -> 400: ${l}`, r.status === 400, `status ${r.status}`);
  }
  const r1 = await eq({ shopId: 'bad', customerName: 'Asha', customerPhone: '9876543210', message: 'hello there' }); check('D6f', 'bad shopId -> 400', r1.status === 400, `status ${r1.status}`);
  const r2 = await eq(goodE({ shopId: shops[18].id })); check('D6g', 'enquiry to unapproved shop -> 404', r2.status === 404, `status ${r2.status}`);
  const r3 = await eq(goodE({ productId: draft._id.toString() })); check('D6h', 'enquiry about unpublished product -> 404', r3.status === 404, `status ${r3.status}`);
  const r4 = await eq(goodE({ productId: prods.length ? (await col('products').findOne({ shopId: oid(shops[0].id) }))._id.toString() : '' })); check('D6i', "enquiry about another shop's product -> 404", r4.status === 404, `status ${r4.status}`);
  const r5 = await eq(goodE({ productId: 'zzz' })); check('D6j', 'invalid productId -> 400', r5.status === 400, `status ${r5.status}`);
  const r6 = await eq(goodE({ customerName: '<img src=x onerror=alert(1)> Bob', customerPhone: '+91 98765-43211', message: 'XSS test message' }));
  check('D6k', 'enquiry with markup name accepted, phone normalised', r6.status === 201, `status ${r6.status}`);
  const nj = await new Client().req('POST', '/api/enquiries', { body: '{oops', headers: { 'content-type': 'application/json' } });
  check('D6l', 'enquiry malformed JSON -> 400 (not 500)', nj.status === 400, `status ${nj.status}  [src/app/api/enquiries/route.ts:23 await req.json() un-guarded]`);
  const rlc = new Client('eqrl', '172.30.1.1'); const st = [];
  for (let k = 0; k < 10; k++) st.push((await eq(goodE({ customerPhone: `91000000${10 + k}`, message: `rate test ${k}` }), rlc)).status);
  check('D6m', 'enquiry rate limit -> 429 after 8/10min/IP', st.slice(0, 8).every((s) => s === 201) && st[8] === 429, `statuses ${st}`);
  const dashAfter = await dashEnq(0, true);
  record('D6n', 'dashboard new-enquiry count (checked in E)', 'INFO', `shop0 before=${dashBefore} after=${dashAfter}`);

  // ---- likes / favourites
  const L = (c, body) => c.post('/api/interactions', body);
  const tgt = { shopId: sid, targetId: pp._id.toString(), targetType: 'PRODUCT', interactionType: 'LIKE' };
  const v1 = new Client('v1'), v2 = new Client('v2');
  const l1 = await L(v1, tgt); check('D7', 'like -> state true, count 1', l1.status === 200 && l1.data.state === true && l1.data.likesCount === 1, `${l1.status} ${l1.text}`);
  check('D7b', 'anonymous visitor cookie issued', v1.jar.has('luxestore_visitor_id'));
  const g = await v1.get(`/api/interactions?shopId=${sid}&targetId=${tgt.targetId}&targetType=PRODUCT&interactionType=LIKE`);
  check('D7c', 'GET like state true for same visitor', g.data?.state === true && g.data?.likesCount === 1, g.text);
  const gOther = await v2.get(`/api/interactions?shopId=${sid}&targetId=${tgt.targetId}&targetType=PRODUCT&interactionType=LIKE`);
  check('D7d', 'GET like state false for another visitor', gOther.data?.state === false, gOther.text);
  const l2 = await L(v2, tgt); check('D7e', 'second visitor like -> count 2', l2.data?.likesCount === 2, l2.text);
  const l3 = await L(v1, tgt); check('D7f', 'toggle off -> state false, count 1', l3.data?.state === false && l3.data?.likesCount === 1, l3.text);
  const fav = await L(v1, { ...tgt, interactionType: 'FAVORITE' }); check('D7g', 'favourite add (no likesCount change)', fav.data?.state === true && (await col('products').findOne({ _id: pp._id })).likesCount === 1, fav.text);
  const follow = await L(v1, { shopId: sid, targetId: sid, targetType: 'SHOP', interactionType: 'FOLLOW' }); check('D7h', 'follow shop', follow.data?.state === true, follow.text);
  const badF = await L(v1, { ...tgt, interactionType: 'FOLLOW' }); check('D7i', 'FOLLOW on product -> 400', badF.status === 400, `status ${badF.status}`);
  const badL = await L(v1, { shopId: sid, targetId: sid, targetType: 'SHOP', interactionType: 'LIKE' }); check('D7j', 'LIKE on shop -> 400', badL.status === 400, `status ${badL.status}`);
  const draftL = await L(v1, { ...tgt, targetId: draft._id.toString() }); check('D7k', 'like unpublished product -> 404', draftL.status === 404, `status ${draftL.status}`);
  const xs = await L(v1, { ...tgt, shopId: shops[5].id }); check('D7l', "like product via other shop's id -> 404", xs.status === 404, `status ${xs.status}`);
  const bi = await L(v1, { ...tgt, targetId: 'nope' }); check('D7m', 'bad targetId -> 400', bi.status === 400, `status ${bi.status}`);
  const njl = await v1.req('POST', '/api/interactions', { body: '{oops', headers: { 'content-type': 'application/json' } }); check('D7n', 'interactions malformed JSON -> 400 (not 500)', njl.status === 400, `status ${njl.status}  [src/app/api/interactions/route.ts await req.json() un-guarded]`);
  const conc = await Promise.all(Array.from({ length: 6 }, () => L(new Client('cc'), { ...tgt, targetId: prods[1]._id.toString() })));
  check('D7o', '6 distinct visitors liking concurrently -> likesCount 6', (await col('products').findOne({ _id: prods[1]._id })).likesCount === 6, `count ${(await col('products').findOne({ _id: prods[1]._id })).likesCount} statuses ${conc.map((r) => r.status)}`);
  const sameConc = new Client('same'); await L(sameConc, { ...tgt, targetId: prods[2]._id.toString() }); // establishes visitor cookie (like on)
  const dbl = await Promise.all(Array.from({ length: 6 }, () => L(sameConc, { ...tgt, targetId: prods[2]._id.toString() })));
  const vid = sameConc.jar.get('luxestore_visitor_id');
  const ints = await col('interactions').countDocuments({ userId: oid(vid), targetId: prods[2]._id, interactionType: 'LIKE' });
  const lc = (await col('products').findOne({ _id: prods[2]._id })).likesCount;
  check('D7p', 'same visitor 6 concurrent toggles: <=1 interaction row and likesCount matches rows', ints <= 1 && lc === ints, `rows ${ints}, likesCount ${lc}, statuses ${dbl.map((r) => r.status)}`);

  // ---- analytics
  const A = (body, c) => c.post('/api/analytics/track', body, { headers: { 'user-agent': 'Mozilla/5.0 e2e' } });
  const ac = new Client('an', '10.99.0.1');
  const a1 = await A({ shopId: sid, eventType: 'PRODUCT_VIEW', targetId: pp._id.toString() }, ac);
  const a2 = await A({ shopId: sid, eventType: 'PRODUCT_VIEW', targetId: pp._id.toString() }, ac);
  check('D8', 'analytics PRODUCT_VIEW first=201, repeat deduped=202', a1.status === 201 && a2.status === 202 && a2.data?.deduped === true, `${a1.status}/${a2.status} ${a2.text}`);
  const vc1 = (await col('products').findOne({ _id: pp._id })).viewsCount;
  const a3 = await A({ shopId: sid, eventType: 'PRODUCT_VIEW', targetId: pp._id.toString() }, new Client('an2', '10.99.0.2'));
  check('D8b', 'different visitor counted (viewsCount +1)', a3.status === 201 && (await col('products').findOne({ _id: pp._id })).viewsCount === vc1 + 1 && vc1 === 1, `vc1=${vc1} status ${a3.status}`);
  const s1 = await A({ shopId: sid, eventType: 'SHOP_VIEW' }, ac); const s2 = await A({ shopId: sid, eventType: 'SHOP_VIEW' }, ac);
  check('D8c', 'SHOP_VIEW deduped', s1.status === 201 && s2.status === 202, `${s1.status}/${s2.status}`);
  const bad = await A({ shopId: sid, eventType: 'HACK' }, ac); check('D8d', 'invalid eventType -> 400', bad.status === 400, `status ${bad.status}`);
  const nos = await A({ shopId: shops[18].id, eventType: 'SHOP_VIEW' }, ac); check('D8e', 'analytics for unapproved shop -> 404', nos.status === 404, `status ${nos.status}`);
  const nod = await A({ shopId: sid, eventType: 'PRODUCT_VIEW', targetId: draft._id.toString() }, ac); check('D8f', 'view of draft product -> 404', nod.status === 404, `status ${nod.status}`);
  const nop = await A({ shopId: sid, eventType: 'PRODUCT_VIEW' }, ac); check('D8g', 'PRODUCT_VIEW without target -> 400', nop.status === 400, `status ${nop.status}`);
  const njA = await ac.req('POST', '/api/analytics/track', { body: '{oops', headers: { 'content-type': 'application/json' } }); record('D8h', 'analytics malformed JSON', njA.status === 400 || njA.status === 202 ? 'PASS' : 'FAIL', `status ${njA.status}`);

  // ---- push subscribe validation
  const P = (body, extra = {}) => new Client('push').post('/api/notifications/subscriptions', body, extra);
  const sub = (endpoint, keys = { p256dh: 'BPk', auth: 'au' }) => ({ shopId: sid, subscription: { endpoint, keys } });
  const pOk = await P(sub('https://fcm.googleapis.com/fcm/send/e2e-token-1')); check('D9', 'push subscribe valid public https endpoint -> 200', pOk.status === 200 && pOk.data?.subscribed === true, `${pOk.status} ${pOk.text}`);
  const pOk2 = await P(sub('https://fcm.googleapis.com/fcm/send/e2e-token-1')); check('D9b', 'resubscribe idempotent (1 row)', pOk2.status === 200 && (await col('pushsubscriptions').countDocuments({ endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-token-1' })) === 1);
  for (const ep of ['https://192.168.1.5/push', 'https://10.0.0.1/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest', 'https://localhost/x', 'https://[::1]/x', 'http://fcm.googleapis.com/x', 'https://user:pw@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://intranet.internal/x', 'https://2130706433/x', 'ftp://fcm.googleapis.com/x', 'not a url']) {
    const r = await P(sub(ep)); check('D9c', `push endpoint rejected 400: ${ep}`, r.status === 400, `status ${r.status}`);
  }
  const pk = await P({ shopId: sid, subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/z', keys: { p256dh: '' } } }); check('D9d', 'push missing keys -> 400', pk.status === 400, `status ${pk.status}`);
  const pu = await P({ ...sub('https://fcm.googleapis.com/fcm/send/q'), shopId: shops[18].id }); check('D9e', 'push for unapproved shop -> 404', pu.status === 404, `status ${pu.status}`);
  const po = await P(sub('https://fcm.googleapis.com/fcm/send/o'), { headers: { origin: 'https://evil.example' } }); check('D9f', 'push cross-origin -> 403', po.status === 403, `status ${po.status}`);
  const pj = await new Client().req('POST', '/api/notifications/subscriptions', { body: '{oops', headers: { 'content-type': 'application/json' } }); check('D9g', 'push malformed JSON -> 400', pj.status === 400, `status ${pj.status}`);
  const pd = await new Client().req('DELETE', '/api/notifications/subscriptions', { json: { shopId: sid, endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-token-1' } }); check('D9h', 'push unsubscribe removes row', pd.status === 200 && (await col('pushsubscriptions').countDocuments({ endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-token-1' })) === 0, `status ${pd.status}`);

  // ---- visitor limit
  await adminEdit(shops[14].id, { maxLinkOpens: 1 });
  await resetVisitors(14);
  const lim = (ip, ua) => new Client('lim', ip).get(`/shop/${shops[14].slug}`, ua ? { headers: { 'user-agent': ua } } : {});
  const f1 = await lim('203.0.113.1'); const f2 = await lim('203.0.113.2'); const f1b = await lim('203.0.113.1');
  const blocked = (r) => /Store Link Limit Reached/.test(r.text);
  check('D10', 'maxLinkOpens=1: first visitor allowed', f1.status === 200 && !blocked(f1) && f1.text.includes('data-storefront-template'), `status ${f1.status}`);
  check('D10b', 'second distinct visitor blocked', blocked(f2), `status ${f2.status} blocked=${blocked(f2)}`);
  check('D10c', 'first visitor still allowed on return (not double-counted)', !blocked(f1b) && f1b.status === 200);
  record('D10d', 'blocked page HTTP status', 'INFO', `status ${f2.status}`);
  check('D10e', 'currentLinkOpens == 1', (await shopDoc(14)).currentLinkOpens === 1, `${(await shopDoc(14)).currentLinkOpens}`);
  const ownerPrev = await (await ownerClient(14)).get(`/shop/${shops[14].slug}`);
  check('D10f', 'owner preview never blocked and shows owner banner', !blocked(ownerPrev) && /Owner preview/.test(ownerPrev.text), `status ${ownerPrev.status}`);
  await adminEdit(shops[12].id, { maxLinkOpens: 3 });
  await resetVisitors(12);
  const conc3 = await Promise.all(Array.from({ length: 8 }, (_, k) => new Client('r', `198.51.101.${k + 1}`).get(`/shop/${shops[12].slug}`)));
  const allowedN = conc3.filter((r) => !blocked(r)).length;
  check('D10g', 'maxLinkOpens=3 with 8 concurrent distinct visitors -> exactly 3 admitted', allowedN === 3 && (await shopDoc(12)).currentLinkOpens === 3, `admitted ${allowedN}, counter ${(await shopDoc(12)).currentLinkOpens}`);
  await adminEdit(shops[15].id, { maxLinkOpens: 1 });
  await resetVisitors(15);
  const bot = await lim2(shops[15], '203.0.113.50', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  const curlr = await lim2(shops[15], '203.0.113.52', 'curl/8.5.0');
  const prefetch = await new Client('p', '203.0.113.54').get(`/shop/${shops[15].slug}`, { headers: { purpose: 'prefetch' } });
  const afterBot = (await shopDoc(15)).currentLinkOpens;
  check('D11', 'bot/curl/prefetch requests do not consume a visitor slot', afterBot === 0, `counter after bot+curl+prefetch = ${afterBot}`);
  check('D11b', 'bot is still served the storefront (200, not blocked)', bot.status === 200 && !blocked(bot) && !blocked(curlr), `bot ${bot.status}`);
  const human = await lim2(shops[15], '203.0.113.51');
  const human2 = await lim2(shops[15], '203.0.113.55');
  await adminEdit(shops[3].id, { maxLinkOpens: 1 }); await resetVisitors(3);
  await new Client('h', '203.0.113.53').req('HEAD', `/shop/${shops[3].slug}`);
  warn('D11e', 'HEAD request does not consume a visitor slot', (await shopDoc(3)).currentLinkOpens === 0, `counter=${(await shopDoc(3)).currentLinkOpens}; src/app/shop/[slug]/layout.tsx:119 admitUniqueShopVisitor(...) never passes the 5th arg (method) so HEAD counts as a human visit`);
  check('D11c', 'real browser still gets the single slot; second real visitor blocked', !blocked(human) && blocked(human2), `human blocked=${blocked(human)} human2 blocked=${blocked(human2)}`);
  const ff = await new Client('ff', '203.0.113.51').get(`/shop/${shops[15].slug}`, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0' } });
  record('D11d', 'same IP, different browser/OS family counts as new visitor (NAT trade-off)', 'INFO', `blocked=${blocked(ff)}`);
}
async function resetVisitors(i) { await col('shops').updateOne({ _id: oid(shops[i].id) }, { $set: { currentLinkOpens: 0 } }); await col('shopvisitors').deleteMany({ shopId: oid(shops[i].id) }); }
async function lim2(shop, ip, ua) { return new Client('lim', ip).get(`/shop/${shop.slug}`, ua ? { headers: { 'user-agent': ua } } : {}); }
async function dashEnq(i, fresh) {
  const c = await ownerClient(i); const r = await c.get('/dashboard');
  const m = r.text.match(/New Enquiries<\/h3>[\s\S]*?<div class="text-2xl font-bold text-gray-900">(?:<!-- -->)?(\d+)</);
  return m ? Number(m[1]) : NaN;
}

// ================================================================== E. cross-flow
async function scenarioE() {
  section('E. Cross-flow');
  const i = 0; const c = await ownerClient(i); const slug = shops[i].slug;
  const cust = () => new Client('xf');
  const beforeHtml = (await cust().get(`/shop/${slug}`)).text;
  const nm = `CrossFlow Pendant ${Date.now() % 100000}`;
  const created = await c.post('/api/products', prod({ name: nm, price: 4321 }));
  const after = await cust().get(`/shop/${slug}`);
  check('E1', 'owner creates product -> customer sees it immediately (cache invalidated)', created.status === 201 && !beforeHtml.includes(nm) && after.text.includes(nm), `create ${created.status}, visible=${after.text.includes(nm)}`);
  const pid = created.data.product._id;
  const pp = await cust().get(`/shop/${slug}/product/${pid}`);
  check('E2', 'customer product page reachable + price shown', pp.status === 200 && /4,321/.test(pp.text), `status ${pp.status}`);
  const edit = await c.patch(`/api/products/${pid}`, { name: nm + ' EDITED', sku: created.data.product.sku, categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 5555, isPublished: true });
  const pe = await cust().get(`/shop/${slug}`); const pep = await cust().get(`/shop/${slug}/product/${pid}`);
  check('E3', 'owner edit -> customer list + product page updated', edit.status === 200 && pe.text.includes(nm + ' EDITED') && /5,555/.test(pep.text), `edit ${edit.status} list=${pe.text.includes(nm + ' EDITED')} page5555=${/5,555/.test(pep.text)}`);
  await c.patch(`/api/products/${pid}`, { name: nm, sku: created.data.product.sku, categoryId: cats.rings, priceType: 'FIXED_PRICE', price: 5555, isPublished: false });
  const hidden = await cust().get(`/shop/${slug}`); const hiddenP = await cust().get(`/shop/${slug}/product/${pid}`);
  check('E4', 'owner unpublishes -> hidden from list, product page 404', !hidden.text.includes(nm) && hiddenP.status === 404, `inList=${hidden.text.includes(nm)} pageStatus=${hiddenP.status}`);
  const gold = await cust().get(`/shop/${slug}`);
  check('E5', 'owner gold rate (set in C) visible in storefront banner', /22K: ₹1?,?6,500/.test(gold.text) || /6,500/.test(gold.text), 'banner missing');
  check('E5b', 'owner shortDescription visible, markup escaped', gold.text.includes('E2E tagline') && !gold.text.includes('<b>x</b>'));
  // enquiry -> dashboard count
  const before = await dashEnq(i);
  const e = await new Client('xe').post('/api/enquiries', { shopId: shops[i].id, customerName: 'Cross Flow', customerPhone: '9123456780', message: 'cross flow enquiry ' + Date.now() });
  const afterN = await dashEnq(i);
  check('E6', 'owner dashboard New Enquiries count increments after customer enquiry', e.status === 201 && Number.isFinite(before) && afterN === before + 1, `before=${before} after=${afterN} db NEW=${await col('enquiries').countDocuments({ shopId: oid(shops[i].id), status: 'NEW' })} enquiry status ${e.status}`);
  const inbox = await c.get('/dashboard/enquiries');
  check('E6b', 'enquiry visible in owner inbox', inbox.status === 200 && /Cross Flow/.test(inbox.text), `status ${inbox.status}`);
  const inboxOther = await (await ownerClient(3)).get('/dashboard/enquiries');
  check('E6c', "other shop's owner does not see this enquiry", !/Cross Flow/.test(inboxOther.text));

  // suspend / reactivate by admin
  const s = 12 + 0; // dedicated shop for suspend flow (shop 13)
  const sh = 13; const shopNm = `E2E Jewel ${sh}`;
  await mk(sh, { name: 'SuspendFlow Item' });
  const live = await cust().get(`/shop/${shops[sh].slug}`);
  check('E7a', 'shop 13 live before suspension', live.status === 200 && live.text.includes(shopNm), `status ${live.status}`);
  await adminEdit(shops[sh].id, { isActive: 'false' });
  const susp = await cust().get(`/shop/${shops[sh].slug}`);
  check('E7', 'admin suspends -> customer sees Account Suspended', /Account Suspended/.test(susp.text), `status ${susp.status}`);
  check('E7b', 'suspended storefront HTTP status is 403 (not 200)', susp.status === 403, `status ${susp.status}`);
  check('E7c', 'suspended storefront hides catalogue', !/Tpl\d+Item/.test(susp.text));
  const suspP = await cust().get(`/shop/${shops[sh].slug}/product/${(await col('products').findOne({ shopId: oid(shops[sh].id) }))?._id}`);
  check('E7d', 'suspended shop product page not served as product (403/404)', [403, 404].includes(suspP.status), `status ${suspP.status}`);
  const suspE = await cust().post('/api/enquiries', { shopId: shops[sh].id, customerName: 'Susp Test', customerPhone: '9123456781', message: 'enquiry to suspended' });
  check('E7e', 'enquiry to suspended shop rejected (404)', suspE.status === 404, `status ${suspE.status}`);
  const suspL = await cust().post('/api/interactions', { shopId: shops[sh].id, targetId: (await col('products').findOne({ shopId: oid(shops[sh].id) }))._id.toString(), targetType: 'PRODUCT', interactionType: 'LIKE' });
  check('E7f', 'like on suspended shop rejected (404)', suspL.status === 404, `status ${suspL.status}`);
  const suspO = await (await ownerClient(sh)).post('/api/products', prod());
  check('E7g', 'suspended owner cannot create products (403)', suspO.status === 403, `status ${suspO.status}`);
  const suspM = await new Client().get(`/api/shop/${shops[sh].slug}/manifest.json`);
  record('E7h', 'suspended shop manifest', 'INFO', `status ${suspM.status}`);
  await adminEdit(shops[sh].id, { isActive: 'true' });
  const re = await cust().get(`/shop/${shops[sh].slug}`);
  check('E8', 'admin reactivates -> storefront back (200 + template marker; note the forbidden() fallback markup is always present in the RSC payload so text-matching would false-positive)', re.status === 200 && re.text.includes(shopNm) && /data-storefront-template="\d"/.test(re.text), `status ${re.status} marker=${/data-storefront-template/.test(re.text)} hasName=${re.text.includes(shopNm)}`);
  // admin-driven plan limit reflects to owner (create blocked) tested in C12; reject->404 in B11
  const anonDash = await cust().get('/dashboard');
  check('E9', 'anonymous /dashboard redirects', [302, 303, 307, 308].includes(anonDash.status), `status ${anonDash.status}`);
  const adminDash = await adminClient.get('/dashboard');
  record('E9b', 'admin visiting /dashboard', 'INFO', `status ${adminDash.status} loc ${adminDash.location}`);
}

// ================================================================== main
(async () => {
  const t0 = Date.now(); let fatal = null;
  try {
    console.log('Preparing scratch copy at', WORK);
    prepareWorkdir();
    await startMongo();
    await seed();
    console.log('Starting next dev (webpack) on', BASE);
    await startServer();
    await guard('A', scenarioA);
    await guard('B', scenarioB);
    await guard('C', scenarioC);
    await guard('D', scenarioD);
    await guard('E', scenarioE);
  } catch (e) { fatal = e; console.error('FATAL', e); }
  finally {
    await closeBrowser();
    await sleep(500);
    const issues = logIssues();
    const res = getResults();
    const fails = res.filter((r) => r.status === 'FAIL'); const warns = res.filter((r) => r.status === 'WARN');
    console.log('\n================ SUMMARY ================');
    console.log(`PASS ${res.filter((r) => r.status === 'PASS').length}  FAIL ${fails.length}  WARN ${warns.length}  INFO ${res.filter((r) => r.status === 'INFO').length}  (${Math.round((Date.now() - t0) / 1000)}s)`);
    for (const r of [...fails, ...warns]) console.log(`  ${r.status} ${r.id} ${r.name} -- ${r.detail}`);
    console.log(`\nDev-server log: ${LOG}  (${issues.length} distinct error/warn lines)`);
    issues.slice(0, 40).forEach((l) => console.log('  ' + l));
    fs.writeFileSync(WORK + '/report.json', JSON.stringify({ results: res, issues }, null, 2));
    if (!process.env.E2E_KEEP) { stopServer(); await mongoose.disconnect().catch(() => {}); await stopMongo(); }
    process.exit(fatal || fails.length ? 1 : 0);
  }
})();
