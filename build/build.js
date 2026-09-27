// Regenerates every SVG in ../assets and the featured-projects block in ../README.md.
// Usage:  cd build && npm install && node build.js        (details: build/README.md)
// All text is outlined to <path>, so viewers need no fonts, and no SVG references anything external.
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
// halo = colour of the safety outline (see below). Light variants only: every GitHub light theme
// has a #ffffff canvas, but the dark ones differ (#0d1117 / dimmed #212830 / high-contrast #010409),
// so no outline colour is invisible on all of them and the dark variants carry none.
// Dark ink/rule sit close to GitHub's own dark text (#f0f6fc) and borders so SVG and Markdown match.
const PAL = {
  light: { ink: '#1B1A18', mute: '#6B665E', faint: '#A39D93', rule: '#DDD8CF', accent: '#8E2B20', paper: '#F7F4EE', halo: '#ffffff' },
  dark:  { ink: '#EDEDEA', mute: '#9E9D99', faint: '#61646A', rule: '#33373D', accent: '#DC8570', paper: '#121316', halo: null },
};

// ── Helpers ──────────────────────────────────────────────────────────────
const r = (n, dp = 2) => +(+n).toFixed(dp);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function svg(w, h, body, { label, style = '' } = {}) {
  label = esc(label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${r(w)} ${r(h)}" role="img" aria-label="${label}">` +
    `<title>${label}</title>${style ? `<style>${style}</style>` : ''}${body}</svg>\n`;
}
// Safety outline (light variants only): every glyph gets a thin white stroke painted *under* its
// fill. On GitHub's white canvas it is invisible; if a dark page ever shows the light variant
// (theme switch not honoured), it keeps the dark text legible. Kept thin: at most ~2px wide
// once rendered, i.e. about 1px showing outside the glyph.
const hw = (size, scale = 1) => Math.min(2, Math.max(1.2, size * 0.08)) / scale;
const halo = (c, w) => c && c.halo ? ` stroke="${c.halo}" stroke-width="${r(w)}" stroke-linejoin="round" paint-order="stroke"` : '';
// Outlined text as one <path>; opts as in type.js. Returns {el, x0, x1, width}.
function txt(str, opts, fill, c, scale = 1) {
  const t = T.text(str, opts);
  return { ...t, el: `<path fill="${fill}"${halo(c, hw(opts.size, scale))} d="${t.d}"/>` };
}
// Horizontal hairline that stays exactly 1px at any rendered size
const hair = (x1, x2, y, col) => `<path d="M${r(x1)} ${r(y)}H${r(x2)}" stroke="${col}" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/>`;
const tick = (x, y, w, col) => `<path d="M${r(x)} ${r(y)}H${r(x + w)}" stroke="${col}" stroke-width="1.5" fill="none"/>`;
// Everything is generated into memory first; files are touched only after every check passed.
const files = new Map();
const write = (name, s) => files.set(name, s);

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
// Marks built from thin strokes or dots read lighter than solid ones at 16px; thicken them
// (stroke width in 24u, whatever the icon's own grid).
const EMBOLDEN = { tableau: 1.0, weightsandbiases: 0.9, mysql: 1.5 };
function glyph(key, x, y, size, fill, c, scale = 1) {
  const { d, grid } = icon(key), k = size / grid;
  const tr = ` transform="translate(${r(x)} ${r(y)}) scale(${r(k, 4)})"`;
  const h = c && c.halo ? hw(size * 0.9, scale) / k : 0;
  const b = (EMBOLDEN[key] || 0) * grid / 24;
  if (!b) return `<path fill="${fill}"${tr}${halo(c, h)} d="${d}"/>`;
  const under = h ? `<path fill="none" stroke="${c.halo}" stroke-width="${r(b + h)}" stroke-linejoin="round"${tr} d="${d}"/>` : '';
  return under + `<path fill="${fill}" stroke="${fill}" stroke-width="${r(b)}" stroke-linejoin="round"${tr} d="${d}"/>`;
}

// ── Size tiers ───────────────────────────────────────────────────────────
// CSS media queries inside an SVG image measure the image's *rendered* width, so each wide
// image carries more than one cut of its type and shows the one that suits its current size.
const TIERS3 = `.t2,.t3{display:none}` +
  `@media (max-width:699.98px){.t1{display:none}.t2{display:inline}}` +
  `@media (max-width:459.98px){.t2{display:none}.t3{display:inline}}`;
const TIERS2 = `.n{display:none}@media (max-width:399.98px){.w{display:none}.n{display:inline}}`;

// Strings used in several tiers are outlined once (at 100u) in <defs> and placed with <use>.
function defsOf(map) {
  const w = {}, parts = [];
  for (const [id, [str, opts]] of Object.entries(map)) {
    const t = T.text(str, { ...opts, size: 100, x: 0, y: 0 });
    w[id] = t.width / 100;
    parts.push(`<path id="${id}" d="${t.d}"/>`);
  }
  return { defs: parts.join(''), w };
}
const use = (D, id, x, y, size, fill, c, scale, anchor) => {
  const ox = anchor === 'end' ? x - D.w[id] * size : x;
  return `<use href="#${id}" fill="${fill}"${halo(c, hw(size, scale) / (size / 100))} transform="translate(${r(ox)} ${r(y)}) scale(${r(size / 100, 4)})"/>`;
};
const EYE = { font: 'pre-600', letterSpacing: 0.14 };

// ── 1. Masthead ──────────────────────────────────────────────────────────
const TAGLINE = '배운 것은 기록으로, 기록은 작은 프로젝트로.';
function masthead(mode) {
  const c = PAL[mode];
  const W = 880, H = 348; // no closing rule: the intro paragraph in README.md follows the tagline directly
  const D = defsOf({
    l: ['DIGITAL CONSULTANT', EYE],
    r: ['NOTES ON MACHINE LEARNING', EYE],
    m: ['DIGITAL CONSULTANT · ML NOTES', EYE],
    g: [TAGLINE, { font: 'pre-500', letterSpacing: -0.028 }],
  });
  const WM = 176;
  const wm = T.text('pilwookmoon', { font: 'serif', size: WM, letterSpacing: -0.012, x: -6, y: 214, dp: 1 });
  const dot = T.text('.', { font: 'serif', size: WM, x: wm.x1 + 3, y: 214, dp: 1 });
  // desktop (≥700px) · narrow window (460–699px) · phone (<460px, one merged eyebrow)
  const tiers = [
    { cls: 't1', s: 0.9, eye: 13, eyeY: 26, rule: 48.5, tag: 30, tagY: 304 },
    { cls: 't2', s: 0.6, eye: 19, eyeY: 30, rule: 53.5, tag: 37, tagY: 307 },
    { cls: 't3', s: 0.36, eye: 31, eyeY: 34, rule: 58.5, tag: 46, tagY: 313, merged: true },
  ];
  let body = `<defs>${D.defs}</defs>`;
  for (const t of tiers) {
    if (!t.merged && D.w.l * t.eye + 40 > W - D.w.r * t.eye) throw new Error('masthead eyebrows overlap');
    if (D.w.g * t.tag > W) throw new Error('tagline too wide');
    body += `<g class="${t.cls}">` +
      (t.merged ? use(D, 'm', 0, t.eyeY, t.eye, c.mute, c, t.s)
        : use(D, 'l', 0, t.eyeY, t.eye, c.mute, c, t.s) + use(D, 'r', W, t.eyeY, t.eye, c.mute, c, t.s, 'end')) +
      hair(0, W, t.rule, c.rule) + use(D, 'g', 0, t.tagY, t.tag, c.ink, c, t.s) + `</g>`;
  }
  body += `<path fill="${c.ink}"${halo(c, 2.2)} d="${wm.d}"/><path fill="${c.accent}"${halo(c, 2.2)} d="${dot.d}"/>`;
  return svg(W, H, body, { label: `pilwookmoon. Digital Consultant · Notes on Machine Learning. ${TAGLINE}`, style: TIERS3 });
}

// ── 2. Section headings (natural size, never scaled) ─────────────────────
function heading(mode, no, en, ko) {
  const c = PAL[mode];
  const n = txt(no, { font: 'pre-600', size: 12, letterSpacing: 0.08, x: 0, y: 13 }, c.accent, c);
  const ruleX = n.x1 + 10;
  const e = txt(en, { ...EYE, letterSpacing: 0.16, size: 12, x: ruleX + 22, y: 13 }, c.mute, c);
  const k = txt(ko, { font: 'pre-700', size: 27, letterSpacing: -0.03, x: 1, y: 50 }, c.ink, c);
  const W = Math.ceil(Math.max(e.x1, k.x1) + 3), H = 58;
  return svg(W, H, n.el + `<path d="M${r(ruleX)} 8.5H${r(ruleX + 14)}" stroke="${c.faint}" stroke-width="1" fill="none"/>` + e.el + k.el,
    { label: `${no} ${en} — ${ko}` });
}

// ── 3. Stack: two 404u "pairs" of 200u columns ───────────────────────────
// Two pairs sit side by side when the column is ≥ 813px (4 across) and stack below that
// (2 × 2), so the grid never breaks into 3 + 1. On phones a pair scales down, and the
// larger "n" cut takes over so labels stay ≥ ~10px.
const PAIR_W = 404, COL_B = 204, COL_W = 200, PAIR_TOP = 12, PAIR_PAD = 16;
const ST = {
  w: { s: 1, eye: 12, eyeLs: 0.14, eyeY: 12, tick: 24.5, item: 15, icon: 16, tx: 27, first: 55, pitch: 29.5, also: 14, alsoFirst: 54, alsoPitch: 24.5, alsoGap: 21 },
  n: { s: 0.72, eye: 13.5, eyeLs: 0.1, eyeY: 14, tick: 28.5, item: 18, icon: 19, tx: 31, first: 60, pitch: 30.5, also: 15, alsoFirst: 58, alsoPitch: 24, alsoGap: 21 },
};
function colMain(c, t, x0, title, items) {
  const e = txt(title, { ...EYE, size: t.eye, letterSpacing: t.eyeLs, x: x0, y: t.eyeY, dp: 1 }, c.mute, c, t.s);
  if (e.x1 > x0 + COL_W - 8) throw new Error(`eyebrow "${title}" too wide`);
  let g = e.el + tick(x0, t.tick, 24, c.accent), bottom = 0;
  items.forEach(([name, key], i) => {
    const y = t.first + i * t.pitch;
    g += glyph(key, x0, y - 0.36 * t.item - t.icon / 2, t.icon, c.ink, c, t.s);
    const n = txt(name, { font: 'pre-500', size: t.item, letterSpacing: -0.01, x: x0 + t.tx, y, dp: 1 }, c.ink, c, t.s);
    if (n.x1 > x0 + COL_W - 4) throw new Error(`"${name}" too wide`);
    g += n.el; bottom = y;
  });
  return { g, bottom };
}
function colAlso(c, t, x0, title, cols) {
  const e = txt(title, { ...EYE, size: t.eye, letterSpacing: t.eyeLs, x: x0, y: t.eyeY, dp: 1 }, c.mute, c, t.s);
  let g = e.el + tick(x0, t.tick, 24, c.faint), bottom = 0;
  const o = { font: 'pre-400', size: t.also, letterSpacing: -0.005, dp: 1 };
  const x2 = Math.ceil(Math.max(...cols[0].map(s => T.measure(s, o))) + t.alsoGap);
  cols.forEach((list, ci) => list.forEach((name, i) => {
    const y = t.alsoFirst + i * t.alsoPitch;
    const n = txt(name, { ...o, x: x0 + ci * x2, y }, c.mute, c, t.s);
    if (n.x1 > x0 + COL_W - 2) throw new Error(`"${name}" too wide`);
    g += n.el; bottom = Math.max(bottom, y);
  }));
  return { g, bottom };
}
function pair(mode, a, b, label) {
  const c = PAL[mode];
  let body = '', bottom = 0;
  for (const [cls, t] of Object.entries(ST)) {
    const A = a.kind === 'also' ? colAlso(c, t, 0, a.title, a.cols) : colMain(c, t, 0, a.title, a.items);
    const B = b.kind === 'also' ? colAlso(c, t, COL_B, b.title, b.cols) : colMain(c, t, COL_B, b.title, b.items);
    body += `<g class="${cls}">${A.g}${B.g}</g>`;
    bottom = Math.max(bottom, A.bottom, B.bottom);
  }
  const H = Math.ceil(PAIR_TOP + bottom + PAIR_PAD);
  return svg(PAIR_W, H, `<g transform="translate(0 ${PAIR_TOP})">${body}</g>`, { label, style: TIERS2 });
}
const STACK = {
  lang: { title: 'LANGUAGE · DATABASE', items: [['Python', 'python'], ['MySQL', 'mysql']] },
  ml: { title: 'ML · VISUALIZATION', items: [['TensorFlow', 'tensorflow'], ['Tableau', 'tableau'], ['Weights & Biases', 'weightsandbiases']] },
  collab: { title: 'COLLABORATION', items: [['GitHub', 'github'], ['Notion', 'notion'], ['Slack', 'slack']] },
  // systems & hardware | web & cloud
  also: { kind: 'also', title: 'ALSO USED', cols: [['C', 'Linux', 'Raspberry Pi', 'Arduino'], ['Flask', 'FastAPI', 'AWS', 'Google Cloud']] },
};
const describe = x => `${x.title}: ${(x.items ? x.items.map(i => i[0]) : x.cols.flat()).join(', ')}`;

// ── 4. Link buttons ──────────────────────────────────────────────────────
// Buttons sit side by side in one paragraph and wrap on phones. Each image carries a transparent
// margin (right and bottom) so the pair keeps a gap either way. README uses height = BTN.h + BTN.m.
const BTN = { h: 46, m: 10 };
function arrow(x, y, color, diag) {
  return diag
    ? `<path d="M${x} ${y + 9}L${x + 9} ${y}M${x + 1.5} ${y}H${x + 9}V${y + 7.5}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="square"/>`
    : `<path d="M${x} ${y + 5}H${x + 11}M${x + 6.5} ${y + 0.5}L${x + 11} ${y + 5}L${x + 6.5} ${y + 9.5}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="square"/>`;
}
function button(mode, label, { primary, iconKey, diag }) {
  const c = PAL[mode];
  const H = BTN.h, pad = 20;
  const fg = primary ? c.paper : c.ink;
  const hc = primary ? null : c; // text sits on the button's own fill → no outline needed
  let x = pad, fgEls = '';
  if (iconKey) { fgEls += glyph(iconKey, x, (H - 16) / 2, 16, fg, hc); x += 26; }
  const t = txt(label, { font: 'pre-600', size: 15, letterSpacing: -0.01, x, y: 28.2 }, fg, hc);
  const ax = r(t.x1 + 14);
  const W = Math.ceil(ax + 11 + pad);
  const box = `x="1" y="1" width="${W - 2}" height="${H - 2}"`;
  const bg = primary
    ? `<rect ${box} rx="3" fill="${c.ink}"${c.halo ? ` stroke="${c.halo}" stroke-width="2" paint-order="stroke"` : ''}/>`
    : (c.halo ? `<rect ${box} rx="2.5" fill="none" stroke="${c.halo}" stroke-width="3"/>` : '') +
      `<rect ${box} rx="2.5" fill="none" stroke="${c.ink}" stroke-opacity=".9"/>`;
  return svg(W + BTN.m, H + BTN.m, bg + fgEls + t.el + arrow(ax, (H - 10) / 2, primary ? fg : c.accent, diag), { label });
}

// ── 5. Colophon (full width, mirrors the masthead, same three tiers) ─────
const THANKS = '읽어 주셔서 감사합니다.';
function footer(mode) {
  const c = PAL[mode];
  const W = 880, H = 96;
  const D = defsOf({
    w: ['pilwookmoon', { font: 'serif', letterSpacing: -0.01 }],
    n: [THANKS, { font: 'pre-400', letterSpacing: -0.015 }],
  });
  const dotD = T.text('.', { font: 'serif', size: 100, x: 0, y: 0 }).d;
  const tiers = [
    { cls: 't1', s: 0.9, mark: 40, markY: 62, note: 14, noteY: 58 },
    { cls: 't2', s: 0.6, mark: 48, markY: 66, note: 22, noteY: 62 },
    { cls: 't3', s: 0.36, mark: 64, markY: 76, note: 36, noteY: 72 },
  ];
  let body = `<defs>${D.defs}<path id="d" d="${dotD}"/></defs>` + hair(0, W, 0.5, c.rule);
  for (const t of tiers) {
    const dx = D.w.w * t.mark + t.mark * 0.02;
    if (dx + t.mark * 0.3 + 40 > W - D.w.n * t.note) throw new Error('footer overlap');
    body += `<g class="${t.cls}">` + use(D, 'w', 0, t.markY, t.mark, c.ink, c, t.s) +
      `<use href="#d" fill="${c.accent}"${halo(c, hw(t.mark, t.s) / (t.mark / 100))} transform="translate(${r(dx)} ${t.markY}) scale(${r(t.mark / 100, 4)})"/>` +
      use(D, 'n', W, t.noteY, t.note, c.mute, c, t.s, 'end') + `</g>`;
  }
  return svg(W, H, body, { label: `pilwookmoon. ${THANKS}`, style: TIERS3 });
}

// ── 6. Featured projects (optional; see projects.js) ─────────────────────
// Same 404u grid as the stack: two across on desktop, one column below 813px.
const WT = {
  w: { s: 1, no: 11.5, noY: 30, title: 19, titleY: 60, desc: 14.5, descY: 87, pitch: 22, stack: 11, stackGap: 28, wrapW: 376 },
  n: { s: 0.72, no: 15, noY: 33, title: 24, titleY: 66, desc: 19, descY: 95, pitch: 26.5, stack: 13.5, stackGap: 30, wrapW: 384 },
};
function work(mode, p, i) {
  const c = PAL[mode];
  const no = String(i + 1).padStart(2, '0');
  let body = hair(0, 388, 0.5, c.rule), bottom = 0;
  for (const [cls, t] of Object.entries(WT)) {
    let g = txt(no, { font: 'pre-600', size: t.no, letterSpacing: 0.08, x: 0, y: t.noY, dp: 1 }, c.accent, c, t.s).el;
    const ti = txt(p.name, { font: 'pre-700', size: t.title, letterSpacing: -0.02, x: 0, y: t.titleY, dp: 1 }, c.ink, c, t.s);
    if (ti.x1 + 26 > PAIR_W) throw new Error(`project name "${p.name}" is too long for the card; shorten it`);
    const a = t.title * 0.5, ax = ti.x1 + t.title * 0.45, ay = t.titleY - t.title * 0.36 - a / 2;
    g += ti.el + `<path d="M${r(ax)} ${r(ay + a)}L${r(ax + a)} ${r(ay)}M${r(ax + a * 0.2)} ${r(ay)}H${r(ax + a)}V${r(ay + a * 0.8)}" stroke="${c.accent}" stroke-width="${r(1.5 / t.s)}" fill="none" stroke-linecap="square"/>`;
    const o = { font: 'pre-400', size: t.desc, letterSpacing: -0.01, dp: 1 };
    const lines = T.wrap(p.description || '', t.wrapW, o);
    if (lines.length > 3) throw new Error(`description of "${p.name}" is longer than 3 lines; shorten it`);
    lines.forEach((ln, j) => { g += txt(ln, { ...o, x: 0, y: t.descY + j * t.pitch }, c.mute, c, t.s).el; });
    let y = t.descY + (lines.length - 1) * t.pitch;
    if (p.stack && p.stack.length) {
      y += t.stackGap;
      const s = txt(p.stack.join(' · ').toUpperCase(), { ...EYE, size: t.stack, x: 0, y, dp: 1 }, c.mute, c, t.s);
      if (s.x1 > PAIR_W - 4) throw new Error(`stack of "${p.name}" is too long`);
      g += s.el;
    }
    body += `<g class="${cls}">${g}</g>`;
    bottom = Math.max(bottom, y);
  }
  return svg(PAIR_W, Math.ceil(bottom + 24), body, { label: `${p.name}${p.description ? ': ' + p.description : ''}`, style: TIERS2 });
}
const pic = (base, alt, attrs) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg"><img alt="${esc(alt)}" src="assets/${base}-light.svg" ${attrs}></picture>`;
function projectsBlock() {
  if (!PROJECTS.length) return '\n';
  const rows = PROJECTS.map((p, i) => {
    if (!p.name || !p.url) throw new Error('each project needs name and url');
    return `  <a href="${esc(p.url)}">${pic(`work-${String(i + 1).padStart(2, '0')}`, `${p.name}${p.description ? ' — ' + p.description : ''}`, 'width="404" align="top"')}</a>`;
  });
  return `\n\n<p>\n${rows.join('\n')}\n</p>\n\n`;
}

// ── Emit ─────────────────────────────────────────────────────────────────
// 1) Generate every SVG and the new README text in memory; any check above throws here,
//    before a single file has been touched, so a failed build leaves assets/ and README.md as they were.
const HEADINGS = [['01', 'TOOLKIT', '기술 스택'], ['02', 'ARCHIVE', '기록이 있는 곳']];
for (const mode of ['light', 'dark']) {
  write(`masthead-${mode}.svg`, masthead(mode));
  HEADINGS.forEach(([no, en, ko]) => write(`h-${no}-${mode}.svg`, heading(mode, no, en, ko)));
  write(`stack-a-${mode}.svg`, pair(mode, STACK.lang, STACK.ml, `${describe(STACK.lang)}. ${describe(STACK.ml)}`));
  write(`stack-b-${mode}.svg`, pair(mode, STACK.collab, STACK.also, `${describe(STACK.collab)}. ${describe(STACK.also)}`));
  write(`btn-portfolio-${mode}.svg`, button(mode, 'Notion 포트폴리오', { primary: true, iconKey: 'notion', diag: true }));
  write(`btn-repos-${mode}.svg`, button(mode, '저장소 둘러보기', { primary: false, iconKey: 'github' }));
  write(`end-${mode}.svg`, footer(mode));
  PROJECTS.forEach((p, i) => write(`work-${String(i + 1).padStart(2, '0')}-${mode}.svg`, work(mode, p, i)));
}
// Featured projects → README (between the projects:start / projects:end markers)
const md = fs.readFileSync(README, 'utf8');
const re = /(<!-- projects:start -->)[\s\S]*?(<!-- projects:end -->)/;
if (!re.test(md)) throw new Error('README.md is missing the <!-- projects:start --> / <!-- projects:end --> markers');
const next = md.replace(re, (_, a, b) => a + projectsBlock() + b);
// Every image the README points at must be one this build produces.
for (const [, f] of next.matchAll(/(?:src|srcset)="assets\/([^"]+)"/g))
  if (!files.has(f)) throw new Error(`README.md refers to assets/${f}, which this build does not produce`);

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

for (const [f, s] of files) console.log(f.padEnd(26), (Buffer.byteLength(s) / 1024).toFixed(1) + 'KB');
console.log(PROJECTS.length ? `README: ${PROJECTS.length} featured project(s) written.` : 'README: no featured projects (section stays hidden).');
