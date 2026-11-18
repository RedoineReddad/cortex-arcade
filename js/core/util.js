// Small shared helpers used by the shell and every game.

export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const randf = (a, b) => Math.random() * (b - a) + a;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** pick n distinct items */
export const sample = (arr, n) => shuffle(arr).slice(0, n);

/** Seeded PRNG (mulberry32) for deterministic daily picks. */
export function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hyperscript element builder.
 * h('div.card#main', {onclick: fn, style: {...}}, 'text', child, [more])
 */
export function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    if (attrs != null) kids.unshift(attrs);
    attrs = {};
  }
  const m = sel.match(/^([a-z0-9-]*)/i);
  const tag = (m && m[1]) || 'div';
  const isSvg = ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'text', 'ellipse'].includes(tag);
  const el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  const id = sel.match(/#([\w-]+)/);
  if (id) el.id = id[1];
  const classes = [...sel.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
  if (classes.length) el.setAttribute('class', classes.join(' '));
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    }
    else if (k === 'class') el.setAttribute('class', ((el.getAttribute('class') || '') + ' ' + v).trim());
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && !isSvg && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (k) => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return el;
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
