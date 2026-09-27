// Text -> outlined SVG path data, so every glyph renders the same without the viewer having the font.
// Manual layout (cmap + kerning) sidesteps opentype.js GSUB gaps in some fonts.
const fs = require('fs');
const deps = require('./deps');
const opentype = deps.mod('opentype.js');

const PRE = w => ['pretendard', `dist/public/static/Pretendard-${w}.otf`];
const FILES = {
  // Pretendard (Korean + Latin UI text), SIL OFL
  'pre-400': PRE('Regular'),
  'pre-500': PRE('Medium'),
  'pre-600': PRE('SemiBold'),
  'pre-700': PRE('Bold'),
  // Instrument Serif (SIL OFL): display wordmark only
  'serif': ['@fontsource/instrument-serif', 'files/instrument-serif-latin-400-normal.woff'],
};
const cache = {};
function font(key) {
  if (!cache[key]) {
    const buf = fs.readFileSync(deps.file(...FILES[key]));
    cache[key] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return cache[key];
}

// letterSpacing in em.
function layout(text, { font: key = 'pre-400', size = 16, letterSpacing = 0, kern = true } = {}) {
  const f = font(key);
  const s = size / f.unitsPerEm;
  const glyphs = [...text].map(c => f.charToGlyph(c));
  const pos = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    pos.push(x);
    x += g.advanceWidth * s;
    if (i < glyphs.length - 1) {
      if (kern) x += f.getKerningValue(g, glyphs[i + 1]) * s;
      x += letterSpacing * size;
    }
  });
  return { glyphs, pos, width: x };
}
const measure = (text, opts) => layout(text, opts).width;

// opentype.js 2.0's toPathData occasionally emits "NaN" when rounding; format ourselves.
function pathData(cmds, dp) {
  const f = v => { const n = +(+v).toFixed(dp); if (!isFinite(n)) throw new Error('bad coord ' + v); return String(n); };
  let out = '';
  for (const c of cmds) {
    if (c.type === 'M' || c.type === 'L') out += c.type + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'Q') out += 'Q' + f(c.x1) + ' ' + f(c.y1) + ' ' + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'C') out += 'C' + f(c.x1) + ' ' + f(c.y1) + ' ' + f(c.x2) + ' ' + f(c.y2) + ' ' + f(c.x) + ' ' + f(c.y);
    else if (c.type === 'Z') out += 'Z';
  }
  return out.replace(/(^|[^0-9.])0\./g, '$1.').replace(/ -/g, '-');
}
// anchor: 'start' | 'middle' | 'end'. Returns {d, width, x0, x1}
function text(str, { x = 0, y = 0, anchor = 'start', dp = 2, ...opts } = {}) {
  const L = layout(str, opts);
  let ox = x;
  if (anchor === 'middle') ox = x - L.width / 2;
  if (anchor === 'end') ox = x - L.width;
  let d = '';
  L.glyphs.forEach((g, i) => { d += pathData(g.getPath(ox + L.pos[i], y, opts.size || 16).commands, dp); });
  return { d, width: L.width, x0: ox, x1: ox + L.width };
}

// Greedy line wrap at spaces so no line is wider than maxW.
function wrap(str, maxW, opts) {
  const lines = [];
  let cur = '';
  for (const word of str.split(/\s+/).filter(Boolean)) {
    const next = cur ? cur + ' ' + word : word;
    if (cur && measure(next, opts) > maxW) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
module.exports = { text, measure, wrap, font };
