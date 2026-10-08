// Screenshots + audit of owner pages at phone widths. env: E2E_PORT, SHOTS (out dir), ONLY (substring filter)
import fs from 'node:fs';
import mongoose from 'mongoose';
import { Client, withPage, closeBrowser, MONGO_URI } from './lib.mjs';
import { auditPage, DEFAULT_WIDTHS as WIDTHS, formatFindings } from './mobile-audit-lib.mjs';
const formatIssues = (n, w, f) => f.length ? `## ${n} @${w}\n` + formatFindings(f) : '';
const A = (page, w) => auditPage(page, { widths: [w], reload: false });
const OUT = process.env.SHOTS; fs.mkdirSync(OUT, { recursive: true });
await mongoose.connect(MONGO_URI); const db = mongoose.connection.db;
const prod = (await db.collection('products').findOne({ name: /Sculpted/ })) || { _id: '000000000000000000000000' };
const c = new Client('o'); const l = await c.login(process.env.OWNER || 'mobowner', 'OwnerPass#12345'); if (!l.ok) throw new Error('login');
const PAGES = [
  ['home', '/dashboard'], ['list', '/dashboard/products'], ['list2', '/dashboard/products?page=2&perPage=5'],
  ['create', '/dashboard/products/create'], ['edit', `/dashboard/products/${prod._id}/edit`],
];
const only = process.env.ONLY; const widths = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : WIDTHS;
const all = [];
await withPage(c, async (page) => {
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const [name, url] of PAGES) {
      if (only && !(name + (process.env.TAG||'')).includes(only)) continue;
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(800);
      const iss = await A(page, w); all.push(formatIssues(name, w, iss));
      await page.screenshot({ path: `${OUT}/${process.env.TAG || ''}${name}-${w}.png`, fullPage: true });
      if (w < 768 && name === 'list') {
        await page.getByLabel('Open navigation').click(); await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/${process.env.TAG || ''}nav-${w}.png` });
        all.push(formatIssues('nav', w, await A(page, w)));
        await page.keyboard.press('Escape'); await page.reload();
        await page.waitForTimeout(500);
        const del = page.getByRole('button', { name: /delete/i }).first();
        await del.click(); await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${process.env.TAG || ''}delete-${w}.png` });
        all.push(formatIssues('delete', w, await A(page, w)));
      }
    }
  }
});
console.log(all.filter(Boolean).join('\n'));
await closeBrowser(); await mongoose.disconnect();
