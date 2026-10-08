// Reusable mobile-layout audit helpers for a Playwright page.
//   import { auditPage, auditWidths, formatFindings } from './mobile-audit-lib.mjs';
//   const findings = await auditPage(page, { widths: [320, 360, 390] });   // navigates nothing; audits current page
//   console.log(formatFindings(findings));
// Each finding: { type, width, selector, rect:{x,y,w,h}, detail }
// Types: page-overflow, outside-viewport, outside-parent, clipped-text, tiny-target,
//        overlap, header-covers-heading.

export const DEFAULT_WIDTHS = [320, 360, 390, 412, 768, 1280];

// Runs inside the browser. Must be self-contained.
function inPage({ minTarget, minLink, ignore }) {
  const out = [];
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const r2 = (r) => ({ x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  const path = (el) => {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 5) {
      let s = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(`${s}#${CSS.escape(el.id)}`); break; }
      const cls = [...el.classList].filter((c) => /^[a-z][\w-]*$/i.test(c)).slice(0, 2).join('.');
      if (cls) s += '.' + cls;
      const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName) : [];
      if (sib.length > 1) s += `:nth-of-type(${sib.indexOf(el) + 1})`;
      parts.unshift(s); el = el.parentElement;
    }
    return parts.join(' > ');
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    const d = el.closest('details:not([open])');
    if (d && !(el.tagName === 'SUMMARY' && el.parentElement === d)) return false; // collapsed content
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const skip = (el) => ignore && ignore.some((s) => el.closest(s));
  const add = (type, el, detail) => out.push({ type, selector: path(el), rect: r2(el.getBoundingClientRect()), detail });

  if (doc.scrollWidth > vw) out.push({ type: 'page-overflow', selector: 'html', rect: { x: 0, y: 0, w: doc.scrollWidth, h: 0 }, detail: `scrollWidth ${doc.scrollWidth} > innerWidth ${vw}` });

  const scrolls = (cs) => /(auto|scroll)/.test(cs.overflowX);
  const insideScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { if (scrolls(getComputedStyle(p))) return true; } return false; };
  const insideFixed = (el) => { for (let p = el; p; p = p.parentElement) { if (getComputedStyle(p).position === 'fixed') return true; } return false; };

  const all = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH', 'LINE', 'CIRCLE', 'RECT', 'POLYLINE', 'POLYGON', 'G', 'DEFS', 'TITLE'].includes(el.tagName.toUpperCase()) && !skip(el));
  let n = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.right < -1000 || r.left > 20000) continue; // deliberately off-screen (honeypot / skip links)
    // beyond viewport (right edge or left edge), unless in a horizontal scroller
    if ((r.right > vw + 1 || r.left < -1) && !insideScroller(el) && cs.position !== 'fixed' && !el.closest('[aria-hidden="true"]') && n < 60) {
      if (cs.position !== 'absolute' || el.matches('a,button,input,select,textarea,img,h1,h2,h3,p')) { add('outside-viewport', el, `right=${Math.round(r.right)} left=${Math.round(r.left)} vw=${vw}`); n++; }
    }
    // beyond non-scrolling parent that clips (overflow hidden) OR parent narrower than child
    const p = el.parentElement;
    if (p && p !== document.body && cs.position !== 'absolute' && cs.position !== 'fixed' && n < 80) {
      const pcs = getComputedStyle(p);
      if (!scrolls(pcs) && pcs.display !== 'contents') {
        const pr = p.getBoundingClientRect();
        const pad = parseFloat(pcs.paddingRight) || 0;
        if (r.right > pr.right + 1 && r.right <= vw + 1 && pr.width > 0 && !(pcs.overflowX === 'visible' && r.right <= vw)) { add('outside-parent', el, `child right ${Math.round(r.right)} > parent right ${Math.round(pr.right)} (pad ${pad})`); n++; }
        else if (r.right > pr.right + 1 && pcs.overflowX !== 'visible') { add('outside-parent', el, `clipped by parent: child right ${Math.round(r.right)} > ${Math.round(pr.right)}`); n++; }
      }
    }
    // clipped text (sr-only / 1px visually-hidden helpers are intentionally clipped)
    if (r.width <= 2 || r.height <= 2 || el.closest('.sr-only') || /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName)) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && /(hidden|clip)/.test(cs.overflowX) && !scrolls(cs) && el.children.length === 0 || (el.scrollWidth > el.clientWidth + 1 && cs.overflowX === 'hidden' && el.clientWidth > 0 && el.textContent.trim() && cs.textOverflow !== 'ellipsis')) {
      if (cs.textOverflow !== 'ellipsis') add('clipped-text', el, `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
    }
  }

  // interactive targets
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], summary';
  const ints = [...document.querySelectorAll(sel)].filter((e) => visible(e) && !skip(e));
  for (const el of ints) {
    const r = el.getBoundingClientRect();
    if (el.matches('input[type=checkbox],input[type=radio],input[type=file]') && el.closest('label')) continue;
    if (el.classList.contains('sr-only') || el.closest('.sr-only')) continue;
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
    // inline link inside a sentence (sibling text) is exempt, like WCAG's inline exception
    if (inline && [...el.parentNode.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
    const min = inline ? minLink : minTarget;
    const h = inline ? r.height : r.height;
    if (r.width < min - 0.5 && !inline || h < min - 0.5) add('tiny-target', el, `${Math.round(r.width)}x${Math.round(r.height)} (< ${min})${inline ? ' inline-link' : ''} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 24)}"`);
  }
  // overlaps among interactive elements
  const nested = (a, b) => a.contains(b) || b.contains(a);
  for (let i = 0; i < ints.length; i++) {
    const a = ints[i]; const ar = a.getBoundingClientRect();
    for (let j = i + 1; j < ints.length; j++) {
      const b = ints[j]; if (nested(a, b)) continue;
      // input adornment (e.g. show-password button inside the input's wrapper) is intentional
      const fieldA = a.matches('input,textarea,select'), fieldB = b.matches('input,textarea,select');
      if ((fieldA !== fieldB) && a.parentElement === b.parentElement && getComputedStyle(fieldA ? b : a).position === 'absolute') continue;
      const br = b.getBoundingClientRect();
      const w = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
      const h = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
      if (w > 0 && h > 0 && w * h > 4) {
        const fa = insideFixed(a), fb = insideFixed(b);
        if (fa !== fb) continue; // fixed bars legitimately overlay content
        out.push({ type: 'overlap', selector: path(a), rect: r2(ar), detail: `overlaps ${path(b)} by ${Math.round(w)}x${Math.round(h)}` });
      }
    }
  }
  // fixed/sticky headers covering headings (at scrollY=0 the top of page)
  const bars = [...document.body.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e); return (cs.position === 'fixed' || cs.position === 'sticky') && visible(e) && e.getBoundingClientRect().top <= 1 && e.getBoundingClientRect().height < 200 && e.getBoundingClientRect().width > vw * 0.5;
  });
  for (const bar of bars) {
    const br = bar.getBoundingClientRect();
    for (const h of document.querySelectorAll('h1,h2,h3')) {
      if (bar.contains(h) || !visible(h)) continue;
      const hr = h.getBoundingClientRect();
      const top = hr.top + 0; // at current scroll
      if (top < br.bottom - 1 && hr.bottom > br.top && hr.top >= -5 && scrollY === 0) add('header-covers-heading', h, `heading top ${Math.round(top)} < header bottom ${Math.round(br.bottom)} (${path(bar)})`);
    }
  }
  return out;
}

export async function auditPage(page, { widths = DEFAULT_WIDTHS, height = 800, minTarget = 40, minLink = 32, ignore = [], settleMs = 250, reload = true } = {}) {
  const findings = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height });
    if (reload && width !== widths[0]) await page.reload({ waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(settleMs);
    await page.evaluate(() => window.scrollTo(0, 0));
    const list = await page.evaluate(inPage, { minTarget, minLink, ignore });
    // scrolled-down pass: sticky headers may cover headings only at top; skip
    for (const f of list) findings.push({ ...f, width, url: page.url() });
  }
  return findings;
}

// Convenience: navigate then audit. Returns findings with url set to path.
export async function auditUrl(page, url, opts = {}) {
  await page.goto(url, { waitUntil: 'load' }).catch(() => {});
  return auditPage(page, { ...opts, reload: opts.reload ?? true });
}

// Dedupe by type+selector (collapsing widths) and return printable table.
export function formatFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const u = (() => { try { return new URL(f.url).pathname; } catch { return f.url || ''; } })();
    const k = `${u}|${f.type}|${f.selector}`;
    const e = map.get(k) || { path: u, type: f.type, selector: f.selector, widths: [], rect: f.rect, detail: f.detail };
    if (!e.widths.includes(f.width)) e.widths.push(f.width);
    map.set(k, e);
  }
  const rows = [...map.values()];
  if (!rows.length) return 'No mobile layout findings.';
  return rows.map((e) => `${e.path.padEnd(28)} ${e.type.padEnd(20)} w=${e.widths.join(',').padEnd(18)} ${e.selector}  [${e.rect.x},${e.rect.y} ${e.rect.w}x${e.rect.h}] ${e.detail}`).join('\n');
}

export function summarize(findings) {
  const by = {};
  for (const f of findings) by[f.type] = (by[f.type] || 0) + 1;
  return by;
}
