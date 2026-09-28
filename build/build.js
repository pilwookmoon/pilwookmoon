// Regenerates every SVG in ../assets and the featured-projects block in ../README.md.
// Usage:  cd build && npm install && node build.js        (details: build/README.md)
// All text is outlined to <path>, so viewers need no fonts, and no SVG references anything external.
// Dark-only: every image carries its own dark background, so the page looks the same whatever
// GitHub theme the visitor uses. Each full-width card comes in two cuts: a wide one (<name>.svg)
// and a phone one (<name>-m.svg), picked by <picture><source media> in README.md.
const fs = require('fs');
const path = require('path');
const T = require('./type');
const deps = require('./deps');
const si = deps.mod('simple-icons');
const si9 = deps.mod('si9'); // simple-icons v9: Tableau and Slack were removed from later versions

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const README = path.join(ROOT, 'README.md');
const PROJECTS = require(process.env.PROJECTS_FILE ? path.resolve(process.env.PROJECTS_FILE) : './projects');

// ── Palette ──────────────────────────────────────────────────────────────
// bg matches GitHub's default dark canvas, so on the dark theme the cards melt into the page.
const C = { bg: '#0D1117', ink: '#EDEDEA', body: '#C4C3BE', mute: '#9E9D99', faint: '#61646A', rule: '#2A2E35', accent: '#DC8570', paper: '#121316' };
// Viewports up to this width get the phone cut: below ~1100px GitHub's profile column is
// too narrow for the wide cut's type (the phone cut is never scaled up, so it just sits at 360px).
const BREAK = 1099;

// ── Helpers ──────────────────────────────────────────────────────────────
const r = (n, dp = 2) => +(+n).toFixed(dp);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function svg(w, h, body, { label, card = true } = {}) {
  label = esc(label);
  const bg = card ? `<rect width="${r(w)}" height="${r(h)}" rx="12" fill="${C.bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}" role="img" aria-label="${label}">` +
    `<title>${label}</title>${bg}${body}</svg>\n`;
}
const txt = (str, opts, fill) => { const t = T.text(str, opts); return { ...t, el: `<path fill="${fill}" d="${t.d}"/>` }; };
// A line made of runs with different weights/colours: [[text, font, colour], ...]
function runs(parts, x, y, size, ls = -0.01) {
  let el = '';
  for (const [s, font, fill] of parts) { const t = txt(s, { font, size, letterSpacing: ls, x, y, dp: 1 }, fill); el += t.el; x = t.x1; }
  return { el, x1: x };
}
const hair = (x1, x2, y, col) => `<path d="M${r(x1)} ${r(y)}H${r(x2)}" stroke="${col}" stroke-width="1" fill="none"/>`;
const tick = (x, y, w, col) => `<path d="M${r(x)} ${r(y)}H${r(x + w)}" stroke="${col}" stroke-width="1.5" fill="none"/>`;
const files = new Map();
const write = (name, s) => files.set(name, s);
const EYE = { font: 'pre-600', letterSpacing: 0.14 };

// ── Icons ────────────────────────────────────────────────────────────────
// MySQL: the Simple Icons mark includes the "MySQL" wordmark, which turns to noise at 16px, so the
// dolphin alone comes from Devicon (mysql-original, MIT, 128u grid).
const MYSQL = 'M117.688 98.242c-6.973-.191-12.297.461-16.852 2.379-1.293.547-3.355.559-3.566 2.18.711.746.82 1.859 1.387 2.777 1.086 1.754 2.922 4.113 4.559 5.352 1.789 1.348 3.633 2.793 5.551 3.961 3.414 2.082 7.223 3.27 10.504 5.352 1.938 1.23 3.859 2.777 5.75 4.164.934.684 1.563 1.75 2.773 2.18v-.195c-.637-.812-.801-1.93-1.387-2.777l-2.578-2.578c-2.52-3.344-5.719-6.281-9.117-8.719-2.711-1.949-8.781-4.578-9.91-7.73l-.199-.199c1.922-.219 4.172-.914 5.949-1.391 2.98-.797 5.645-.59 8.719-1.387l4.164-1.187v-.793c-1.555-1.594-2.664-3.707-4.359-5.152-4.441-3.781-9.285-7.555-14.273-10.703-2.766-1.746-6.184-2.883-9.117-4.363-.988-.496-2.719-.758-3.371-1.586-1.539-1.961-2.379-4.449-3.566-6.738-2.488-4.793-4.93-10.023-7.137-15.066-1.504-3.437-2.484-6.828-4.359-9.91-9-14.797-18.687-23.73-33.695-32.508-3.195-1.867-7.039-2.605-11.102-3.57l-6.543-.395c-1.332-.555-2.715-2.184-3.965-2.977C16.977 3.52 4.223-3.312.539 5.672-1.785 11.34 4.016 16.871 6.09 19.746c1.457 2.012 3.32 4.273 4.359 6.539.688 1.492.805 2.984 1.391 4.559 1.438 3.883 2.695 8.109 4.559 11.695.941 1.816 1.98 3.727 3.172 5.352.727.996 1.98 1.438 2.18 2.973-1.227 1.715-1.297 4.375-1.984 6.543-3.098 9.77-1.926 21.91 2.578 29.137 1.383 2.223 4.641 6.98 9.117 5.156 3.918-1.598 3.043-6.539 4.164-10.902.254-.988.098-1.715.594-2.379v.199l3.57 7.133c2.641 4.254 7.324 8.699 11.297 11.699 2.059 1.555 3.68 4.242 6.344 5.152v-.199h-.199c-.516-.805-1.324-1.137-1.98-1.781-1.551-1.523-3.277-3.414-4.559-5.156-3.613-4.902-6.805-10.27-9.711-15.855-1.391-2.668-2.598-5.609-3.77-8.324-.453-1.047-.445-2.633-1.387-3.172-1.281 1.988-3.172 3.598-4.164 5.945-1.582 3.754-1.789 8.336-2.375 13.082-.348.125-.195.039-.398.199-2.762-.668-3.73-3.508-4.758-5.949-2.594-6.164-3.078-16.09-.793-23.191.59-1.836 3.262-7.617 2.18-9.316-.516-1.691-2.219-2.672-3.172-3.965-1.18-1.598-2.355-3.703-3.172-5.551-2.125-4.805-3.113-10.203-5.352-15.062-1.07-2.324-2.875-4.676-4.359-6.738-1.645-2.289-3.484-3.977-4.758-6.742-.453-.984-1.066-2.559-.398-3.566.215-.684.516-.969 1.191-1.191 1.148-.887 4.352.297 5.547.793 3.18 1.32 5.832 2.578 8.527 4.363 1.289.855 2.598 2.512 4.16 2.973h1.785c2.789.641 5.914.195 8.523.988 4.609 1.402 8.738 3.582 12.488 5.949 11.422 7.215 20.766 17.48 27.156 29.734 1.027 1.973 1.473 3.852 2.379 5.945 1.824 4.219 4.125 8.559 5.941 12.688 1.816 4.113 3.582 8.27 6.148 11.695 1.348 1.801 6.551 2.766 8.918 3.766 1.66.699 4.379 1.43 5.949 2.379 3 1.809 5.906 3.965 8.723 5.945 1.402.992 5.73 3.168 5.945 4.957zm-88.605-75.52c-1.453-.027-2.48.156-3.566.395v.199h.195c.695 1.422 1.918 2.34 2.777 3.566l1.98 4.164.199-.195c1.227-.867 1.789-2.25 1.781-4.363-.492-.52-.562-1.164-.992-1.785-.562-.824-1.66-1.289-2.375-1.98zm0 0';
const icon = key => {
  if (key === 'mysql') return { d: MYSQL, grid: 128 };
  const ic = { tableau: si9.siTableau, slack: si9.siSlack }[key] || si['si' + key[0].toUpperCase() + key.slice(1)];
  if (!ic) throw new Error('icon ' + key);
  return { d: ic.path, grid: 24 };
};
// Marks built from thin strokes or dots read lighter than solid ones at 16px; thicken them.
const EMBOLDEN = { tableau: 1.0, weightsandbiases: 0.9, mysql: 1.5 };
function glyph(key, x, y, size, fill) {
  const { d, grid } = icon(key), k = size / grid;
  const tr = ` transform="translate(${r(x)} ${r(y)}) scale(${r(k, 4)})"`;
  const b = (EMBOLDEN[key] || 0) * grid / 24;
  return b ? `<path fill="${fill}" stroke="${fill}" stroke-width="${r(b)}" stroke-linejoin="round"${tr} d="${d}"/>` : `<path fill="${fill}"${tr} d="${d}"/>`;
}

// ── Layout specs: wide (W 880) and phone (W 360) ─────────────────────────
const L = {
  w: { W: 880, P: 56, eye: 13, tag: 30, body: 18, lh: 31, h: { no: 12.5, ko: 28 } },
  m: { W: 360, P: 24, eye: 10.5, tag: 20, body: 15, lh: 25.5, h: { no: 11, ko: 23 } },
};

// ── 1. Hero: eyebrows, wordmark, tagline, intro ──────────────────────────
const TAGLINE = ['배운 것은 기록으로,', '기록은 작은 프로젝트로.'];
const INTRO = [
  [['디지털 컨설턴트', 'pre-700', C.ink], ['로 일하며,', 'pre-400', C.body]],
  [['개인적인 관심으로', 'pre-400', C.body]],
  [['머신러닝과 딥러닝', 'pre-700', C.ink], ['을 공부하고 있습니다.', 'pre-400', C.body]],
];
function hero(k) {
  const s = L[k], { W, P } = s;
  let b = '', y = P + s.eye * 0.75;
  if (k === 'w') {
    b += txt('DIGITAL CONSULTANT', { ...EYE, size: s.eye, x: P, y }, C.mute).el;
    b += txt('NOTES ON MACHINE LEARNING', { ...EYE, size: s.eye, x: W - P, y, anchor: 'end' }, C.mute).el;
  } else b += txt('DIGITAL CONSULTANT · ML NOTES', { ...EYE, size: s.eye, x: P, y }, C.mute).el;
  y += s.eye + 10;
  b += hair(P, W - P, y, C.rule);
  // wordmark: as large as the column allows
  const o = { font: 'serif', letterSpacing: -0.012 };
  const dotW = T.measure('.', { font: 'serif', size: 100 }) / 100;
  const size = Math.floor((W - 2 * P + 4) / (T.measure('pilwookmoon', { ...o, size: 100 }) / 100 + dotW + 0.02));
  const base = y + size * 0.8;
  const wm = txt('pilwookmoon', { ...o, size, x: P - size * 0.03, y: base, dp: 1 }, C.ink);
  b += wm.el + txt('.', { font: 'serif', size, x: wm.x1 + size * 0.015, y: base, dp: 1 }, C.accent).el;
  y = base + size * 0.24;
  // tagline: one line when it fits, else two
  const to = { font: 'pre-500', size: s.tag, letterSpacing: -0.028 };
  const one = TAGLINE.join(' ');
  const tl = T.measure(one, to) <= W - 2 * P ? [one] : TAGLINE;
  tl.forEach(line => { y += s.tag * 1.45; b += txt(line, { ...to, x: P, y }, C.ink).el; });
  y += s.tag * 0.6 + s.body * 0.9;
  INTRO.forEach((parts, i) => {
    y += i ? s.lh : s.body;
    const ln = runs(parts, P, y, s.body);
    if (ln.x1 > W - P) throw new Error('intro line too wide');
    b += ln.el;
  });
  return svg(W, Math.ceil(y + P * 0.9), b, { label: `pilwookmoon. Digital Consultant · Notes on Machine Learning. ${one} ${INTRO.map(p => p.map(x => x[0]).join('')).join(' ')}` });
}

// ── 2. Section heading (inside a card) → returns {el, y} (y = rule under it) ──
function heading(s, no, en, ko, y0) {
  const { P, W } = s;
  const n = txt(no, { font: 'pre-600', size: s.h.no, letterSpacing: 0.08, x: P, y: y0 + s.h.no }, C.accent);
  const rx = n.x1 + 10;
  const e = txt(en, { ...EYE, letterSpacing: 0.16, size: s.h.no, x: rx + 22, y: y0 + s.h.no }, C.mute);
  const k = txt(ko, { font: 'pre-700', size: s.h.ko, letterSpacing: -0.03, x: P + 1, y: y0 + s.h.no + 12 + s.h.ko }, C.ink);
  const y = y0 + s.h.no + 12 + s.h.ko + s.h.ko * 0.55;
  return { el: n.el + `<path d="M${r(rx)} ${r(y0 + s.h.no * 0.62)}H${r(rx + 14)}" stroke="${C.faint}" stroke-width="1" fill="none"/>` + e.el + k.el + hair(P, W - P, y, C.rule), y };
}

// ── 3. Toolkit card ─────────────────────────────────────────────────────
const STACK = [
  { title: 'LANGUAGE · DATABASE', items: [['Python', 'python'], ['MySQL', 'mysql']] },
  { title: 'ML · VISUALIZATION', items: [['TensorFlow', 'tensorflow'], ['Tableau', 'tableau'], ['Weights & Biases', 'weightsandbiases']] },
  { title: 'COLLABORATION', items: [['GitHub', 'github'], ['Notion', 'notion'], ['Slack', 'slack']] },
  // systems & hardware | web & cloud
  { title: 'ALSO USED', cols: [['C', 'Linux', 'Raspberry Pi', 'Arduino'], ['Flask', 'FastAPI', 'AWS', 'Google Cloud']] },
];
const ST = {
  w: { eye: 12, eyeLs: 0.14, item: 16, icon: 17, tx: 28, first: 44, pitch: 31, also: 14.5, alsoFirst: 43, alsoPitch: 25, alsoGap: 20 },
  m: { eye: 10, eyeLs: 0.12, item: 14.5, icon: 15, tx: 24, first: 40, pitch: 27, also: 13, alsoFirst: 39, alsoPitch: 22, alsoGap: 14 },
};
function column(t, x0, y0, colW, g) {
  const e = txt(g.title, { ...EYE, size: t.eye, letterSpacing: t.eyeLs, x: x0, y: y0 + t.eye, dp: 1 }, C.mute);
  if (e.x1 > x0 + colW - 6) throw new Error(`eyebrow "${g.title}" too wide`);
  let el = e.el + tick(x0, y0 + t.eye + 12.5, 24, g.cols ? C.faint : C.accent), bottom = 0;
  if (g.items) g.items.forEach(([name, key], i) => {
    const y = y0 + t.first + i * t.pitch;
    el += glyph(key, x0, y - 0.36 * t.item - t.icon / 2, t.icon, C.ink);
    const n = txt(name, { font: 'pre-500', size: t.item, letterSpacing: -0.01, x: x0 + t.tx, y, dp: 1 }, C.ink);
    if (n.x1 > x0 + colW - 4) throw new Error(`"${name}" too wide`);
    el += n.el; bottom = y;
  });
  else {
    const o = { font: 'pre-400', size: t.also, letterSpacing: -0.005, dp: 1 };
    const x2 = Math.ceil(Math.max(...g.cols[0].map(s => T.measure(s, o))) + t.alsoGap);
    g.cols.forEach((list, ci) => list.forEach((name, i) => {
      const y = y0 + t.alsoFirst + i * t.alsoPitch;
      const n = txt(name, { ...o, x: x0 + ci * x2, y }, C.mute);
      if (n.x1 > x0 + colW - 2) throw new Error(`"${name}" too wide`);
      el += n.el; bottom = Math.max(bottom, y);
    }));
  }
  return { el, bottom };
}
function toolkit(k) {
  const s = L[k], t = ST[k], { W, P } = s;
  const h = heading(s, '01', 'TOOLKIT', '기술 스택', P);
  let b = h.el, y = h.y + (k === 'w' ? 32 : 26), bottom = 0;
  // column widths (sum = W - 2P); ALSO USED holds two sub-columns, so it gets the most room
  const rows = k === 'w' ? [[184, 196, 164, 224]] : [[156, 156], [120, 192]];
  let i = 0;
  rows.forEach(widths => {
    let x = P, rowBottom = 0;
    widths.forEach(colW => {
      const c = column(t, x, y, colW, STACK[i++]);
      b += c.el; x += colW; rowBottom = Math.max(rowBottom, c.bottom);
    });
    bottom = rowBottom; y = rowBottom + 40;
  });
  return svg(W, Math.ceil(bottom + P * 0.9), b, { label: `기술 스택. ${STACK.map(g => `${g.title}: ${(g.items ? g.items.map(i => i[0]) : g.cols.flat()).join(', ')}`).join('. ')}` });
}

// ── 4. Archive card ─────────────────────────────────────────────────────
const ARCHIVE = ['그동안의 작업과 자세한 소개는 노션에,', '공부하며 남긴 노트와 실습 코드는', '이곳 저장소에 정리해 두었습니다.'];
function archive(k) {
  const s = L[k], { W, P } = s;
  const h = heading(s, '02', 'ARCHIVE', '기록이 있는 곳', P);
  let b = h.el, y = h.y + s.body * 0.6;
  ARCHIVE.forEach((line, i) => {
    y += i ? s.lh : s.body * 1.4;
    const ln = runs([[line, 'pre-400', C.body]], P, y, s.body);
    if (ln.x1 > W - P) throw new Error('archive line too wide');
    b += ln.el;
  });
  return svg(W, Math.ceil(y + P * 0.9), b, { label: `기록이 있는 곳. ${ARCHIVE.join(' ')}` });
}

// ── 5. Link bar ─────────────────────────────────────────────────────────
// Two linked images placed edge to edge form one dark bar: [pad | button 1] [button 2 | pad].
// Wide cut: side by side, outer corners rounded. Phone cut: each half is a full-width bar of its
// own (they wrap), so each is fully rounded.
const BTN = { h: 48, gap: 6 };
function arrow(x, y, color, diag) {
  return diag
    ? `<path d="M${x} ${y + 9}L${x + 9} ${y}M${x + 1.5} ${y}H${x + 9}V${y + 7.5}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="square"/>`
    : `<path d="M${x} ${y + 5}H${x + 11}M${x + 6.5} ${y + 0.5}L${x + 11} ${y + 5}L${x + 6.5} ${y + 9.5}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="square"/>`;
}
// rect with only some corners rounded: tl tr br bl
function box(w, h, rad, [tl, tr, br, bl]) {
  const R = c => (c ? rad : 0);
  return `<path fill="${C.bg}" d="M${R(tl)} 0H${w - R(tr)}${tr ? `A${rad} ${rad} 0 0 1 ${w} ${rad}` : ''}V${h - R(br)}${br ? `A${rad} ${rad} 0 0 1 ${w - rad} ${h}` : ''}H${R(bl)}${bl ? `A${rad} ${rad} 0 0 1 0 ${h - rad}` : ''}V${R(tl)}${tl ? `A${rad} ${rad} 0 0 1 ${rad} 0` : ''}Z"/>`;
}
function button(x0, y0, label, { primary, iconKey, diag }) {
  const H = BTN.h, pad = 20, fg = primary ? C.paper : C.ink;
  let x = x0 + pad, el = '';
  if (iconKey) { el += glyph(iconKey, x, y0 + (H - 16) / 2, 16, fg); x += 26; }
  const t = txt(label, { font: 'pre-600', size: 15, letterSpacing: -0.01, x, y: y0 + H / 2 + 5.2 }, fg);
  const ax = r(t.x1 + 14), w = Math.ceil(ax + 11 + pad - x0);
  const bg = primary
    ? `<rect x="${x0}" y="${y0}" width="${w}" height="${H}" rx="6" fill="${C.ink}"/>`
    : `<rect x="${x0 + 0.5}" y="${y0 + 0.5}" width="${w - 1}" height="${H - 1}" rx="5.5" fill="none" stroke="${C.ink}" stroke-opacity=".55"/>`;
  return { el: bg + el + t.el + arrow(ax, y0 + (H - 10) / 2, primary ? fg : C.accent, diag), w };
}
const LINKS = [
  ['Notion 포트폴리오', { primary: true, iconKey: 'notion', diag: true }],
  ['저장소 둘러보기', { primary: false, iconKey: 'github' }],
];
function linkHalf(k, i) {
  const [label, opt] = LINKS[i];
  if (k === 'w') {
    const P = 53, padY = 26; // P ≈ the wide cards' 56u padding at their usual ~0.94 scale
    const x0 = i === 0 ? P : BTN.gap;
    const b = button(x0, padY, label, opt);
    const W = i === 0 ? x0 + b.w + BTN.gap : x0 + b.w + P, H = BTN.h + 2 * padY;
    return svg(W, H, box(W, H, 12, i === 0 ? [1, 0, 0, 1] : [0, 1, 1, 0]) + b.el, { label, card: false });
  }
  const W = L.m.W, P = L.m.P, H = BTN.h + 2 * 16;
  const b = button(P, 16, label, opt);
  return svg(W, H, box(W, H, 12, [1, 1, 1, 1]) + b.el, { label, card: false });
}

// ── 6. Colophon ─────────────────────────────────────────────────────────
const THANKS = '읽어 주셔서 감사합니다.';
function footer(k) {
  const s = L[k], { W, P } = s;
  const mark = k === 'w' ? 40 : 30, note = k === 'w' ? 14 : 12;
  const H = k === 'w' ? 124 : 96, y = H / 2 + mark * 0.28;
  const wm = txt('pilwookmoon', { font: 'serif', size: mark, letterSpacing: -0.01, x: P, y }, C.ink);
  const b = wm.el + txt('.', { font: 'serif', size: mark, x: wm.x1 + mark * 0.02, y }, C.accent).el +
    txt(THANKS, { font: 'pre-400', size: note, letterSpacing: -0.015, x: W - P, y: y - 3, anchor: 'end' }, C.mute).el;
  return svg(W, H, b, { label: `pilwookmoon. ${THANKS}` });
}

// ── 7. Featured projects (optional; see projects.js) — 404 wide, two across on wide screens ──
function work(p, i) {
  const W = 404, P = 26;
  const no = String(i + 1).padStart(2, '0');
  let b = txt(no, { font: 'pre-600', size: 11.5, letterSpacing: 0.08, x: P, y: P + 10 }, C.accent).el;
  const ti = txt(p.name, { font: 'pre-700', size: 19, letterSpacing: -0.02, x: P, y: P + 42, dp: 1 }, C.ink);
  if (ti.x1 + 26 > W - P) throw new Error(`project name "${p.name}" is too long for the card; shorten it`);
  const a = 9.5, ax = ti.x1 + 9, ay = P + 42 - 6.8 - a / 2;
  b += ti.el + `<path d="M${r(ax)} ${r(ay + a)}L${r(ax + a)} ${r(ay)}M${r(ax + a * 0.2)} ${r(ay)}H${r(ax + a)}V${r(ay + a * 0.8)}" stroke="${C.accent}" stroke-width="1.5" fill="none" stroke-linecap="square"/>`;
  const o = { font: 'pre-400', size: 14.5, letterSpacing: -0.01, dp: 1 };
  const lines = T.wrap(p.description || '', W - 2 * P, o);
  if (lines.length > 3) throw new Error(`description of "${p.name}" is longer than 3 lines; shorten it`);
  let y = P + 42;
  lines.forEach(ln => { y += 24; b += txt(ln, { ...o, x: P, y }, C.body).el; });
  if (p.stack && p.stack.length) {
    y += 28;
    const st = txt(p.stack.join(' · ').toUpperCase(), { ...EYE, size: 11, x: P, y, dp: 1 }, C.mute);
    if (st.x1 > W - P) throw new Error(`stack of "${p.name}" is too long`);
    b += st.el;
  }
  return svg(W, Math.ceil(y + P), b, { label: `${p.name}${p.description ? ': ' + p.description : ''}` });
}
function projectsBlock() {
  if (!PROJECTS.length) return '\n';
  const rows = PROJECTS.map((p, i) => {
    if (!p.name || !p.url) throw new Error('each project needs name and url');
    return `  <a href="${esc(p.url)}"><img alt="${esc(`${p.name}${p.description ? ' — ' + p.description : ''}`)}" src="assets/work-${String(i + 1).padStart(2, '0')}.svg" width="404" align="top"></a>`;
  });
  return `\n\n<p>\n${rows.join('\n')}\n</p>\n\n`;
}

// ── Emit ─────────────────────────────────────────────────────────────────
// 1) Generate every SVG and the new README text in memory; any check above throws here,
//    before a single file has been touched, so a failed build leaves assets/ and README.md as they were.
for (const k of ['w', 'm']) {
  const sfx = k === 'm' ? '-m' : '';
  write(`hero${sfx}.svg`, hero(k));
  write(`toolkit${sfx}.svg`, toolkit(k));
  write(`archive${sfx}.svg`, archive(k));
  write(`end${sfx}.svg`, footer(k));
  write(`link-portfolio${sfx}.svg`, linkHalf(k, 0));
  write(`link-repos${sfx}.svg`, linkHalf(k, 1));
}
PROJECTS.forEach((p, i) => write(`work-${String(i + 1).padStart(2, '0')}.svg`, work(p, i)));

const md = fs.readFileSync(README, 'utf8');
const re = /(<!-- projects:start -->)[\s\S]*?(<!-- projects:end -->)/;
if (!re.test(md)) throw new Error('README.md is missing the <!-- projects:start --> / <!-- projects:end --> markers');
const next = md.replace(re, (_, a, b) => a + projectsBlock() + b);
for (const [, f] of next.matchAll(/(?:src|srcset)="assets\/([^"]+)"/g))
  if (!files.has(f)) throw new Error(`README.md refers to assets/${f}, which this build does not produce`);
if (!next.includes(`max-width: ${BREAK}px`)) throw new Error(`README.md <source media> should use max-width: ${BREAK}px`);

// 2) All checks passed: write into a staging folder, then swap it in with renames.
fs.mkdirSync(OUT, { recursive: true });
const STAGE = fs.mkdtempSync(path.join(ROOT, '.assets-'));
try {
  for (const [name, s] of files) fs.writeFileSync(path.join(STAGE, name), s);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.svg') && !files.has(f)) fs.unlinkSync(path.join(OUT, f)); // stale
  for (const name of files.keys()) fs.renameSync(path.join(STAGE, name), path.join(OUT, name));
} finally {
  fs.rmSync(STAGE, { recursive: true, force: true });
}
if (next !== md) fs.writeFileSync(README, next);

for (const [f, s] of files) console.log(f.padEnd(22), (Buffer.byteLength(s) / 1024).toFixed(1) + 'KB');
console.log(PROJECTS.length ? `README: ${PROJECTS.length} featured project(s) written.` : 'README: no featured projects (section stays hidden).');
