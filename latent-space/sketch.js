// ─── State ───────────────────────────────────────────────────────────────────
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let words        = [];
let pointSets    = {};
let selected     = [];
let anchorPos    = {};
let dotPos       = { x: 0.5, y: 0.5 };
let interpMethod = 'linear';
let dragging     = null;
let showLines     = false;
let fillDots      = true;
let outlineWeight = 1.5;   // stroke thickness when fill is off
let dotShape      = 'circle';
let redrawSketch = () => {};

// set by SLIDERS in setup
let numPts, dotSize;

// ─── Slider configuration — edit ranges and defaults here ────────────────────
const SLIDERS = [
  {
    id: 'nPts',          lblId: 'lbl-pts',
    label: 'NO. OF POINTS', min: 10,  max: 300, step: 10, value: 200,
    apply: v => { numPts = v; for (const k of [...LETTERS, ...words]) pointSets[k] = sampleText(k, v); },
  },
  {
    id: 'dotSize',       lblId: 'lbl-dot',
    label: 'POINT SIZE',      min: 1,   max: 100,  step: 1,  value: 3,
    apply: v => dotSize = v,
  },
];

// ─── Auto-placement presets ───────────────────────────────────────────────────
const AUTO_POS = [
  [],
  [[.5,.5]],
  [[.1,.5],[.9,.5]],
  [[.1,.15],[.9,.15],[.5,.85]],
  [[.1,.1],[.9,.1],[.1,.9],[.9,.9]],
  [[.1,.1],[.9,.1],[.5,.5],[.1,.9],[.9,.9]],
  [[.1,.1],[.5,.1],[.9,.1],[.1,.9],[.5,.9],[.9,.9]],
  [[.1,.1],[.5,.1],[.9,.1],[.1,.5],[.9,.5],[.1,.9],[.9,.9]],
  [[.1,.1],[.5,.1],[.9,.1],[.1,.5],[.9,.5],[.1,.9],[.5,.9],[.9,.9]],
  [[.1,.1],[.5,.1],[.9,.1],[.1,.5],[.5,.5],[.9,.5],[.1,.9],[.5,.9],[.9,.9]],
];

function autoArrange() {
  const n = Math.min(selected.length, AUTO_POS.length - 1);
  AUTO_POS[n].forEach(([x, y], i) => { anchorPos[selected[i]] = { x, y }; });
}

// ─── Hershey stroke data ──────────────────────────────────────────────────────
const HERSHEY = {
'A': [[[-5,0],[0,21],[5,0]],[[-3,10],[3,10]]],
'B': [[[-5,21],[-5,0]],[[-5,21],[0,21],[3,19],[4,17],[4,15],[3,13],[0,12],[-5,12]],[[-5,12],[1,12],[4,9],[5,7],[5,4],[4,2],[1,0],[-5,0]]], 
'C': [[[6,17],[4,20],[1,21],[-2,21],[-5,18],[-6,15],[-6,6],[-5,3],[-2,0],[1,0],[4,2],[6,5]]],
  'D': [[[-5,21],[-5,0]],[[-5,21],[0,21],[3,19],[5,16],[6,12],[6,9],[5,5],[3,2],[0,0],[-5,0]]],
  'E': [[[-5,21],[-5,0]],[[-5,21],[5,21]],[[-5,12],[2,12]],[[-5,0],[5,0]]],
  'F': [[[-5,21],[-5,0]],[[-5,21],[5,21]],[[-5,12],[2,12]]],
  'G': [[[6,17],[4,20],[1,21],[-2,21],[-5,18],[-6,15],[-6,6],[-5,3],[-2,0],[1,0],[4,2],[6,5],[6,12],[2,12]]],
  'H': [[[-5,21],[-5,0]],[[5,21],[5,0]],[[-5,11],[5,11]]],
  'I': [[[0,21],[0,0]],[[-3,21],[3,21]],[[-3,0],[3,0]]],
  'J': [[[2,21],[2,4],[1,1],[-1,0],[-3,0],[-5,1],[-5,4]]],
  'K': [[[-5,21],[-5,0]],[[5,21],[-5,9]],[[-2,13],[5,0]]],
  'L': [[[-5,21],[-5,0],[5,0]]],
  'M': [[[-6,0],[-6,21],[0,9],[6,21],[6,0]]],
  'N': [[[-5,0],[-5,21],[5,0],[5,21]]],
  'O': [[[-1,21],[-4,20],[-6,17],[-6,4],[-4,1],[-1,0],[1,0],[4,1],[6,4],[6,17],[4,20],[1,21],[-1,21]]],
  'P': [[[-5,21],[-5,0]],[[-5,21],[0,21],[3,19],[4,17],[4,14],[3,12],[0,11],[-5,11]]],
  'Q': [[[-1,21],[-4,20],[-6,17],[-6,4],[-4,1],[-1,0],[1,0],[4,1],[6,4],[6,17],[4,20],[1,21],[-1,21]],[[2,5],[6,0]]],
  'R': [[[-5,21],[-5,0]],[[-5,21],[0,21],[3,19],[4,17],[4,14],[3,12],[0,11],[-5,11]],[[0,11],[5,0]]],
  'S': [[[6,17],[4,20],[1,21],[-2,21],[-5,18],[-5,15],[-2,12],[3,9],[6,6],[6,3],[3,0],[-1,0],[-4,1],[-6,4]]],
  'T': [[[0,21],[0,0]],[[-6,21],[6,21]]],
  'U': [[[-5,21],[-5,4],[-4,1],[-1,0],[1,0],[4,1],[5,4],[5,21]]],
  'V': [[[-6,21],[0,0],[6,21]]],
  'W': [[[-8,21],[-5,0],[0,10],[5,0],[8,21]]],
  'X': [[[-5,21],[5,0]],[[5,21],[-5,0]]],
  'Y': [[[-6,21],[0,11]],[[6,21],[0,11],[0,0]]],
  'Z': [[[-6,21],[6,21],[-6,0],[6,0]]],
  ' ': [],
  '0': [[[-3,0],[-4,4],[-4,17],[-3,21],[3,21],[4,17],[4,4],[3,0],[-3,0]]],
  '1': [[[-2,18],[0,21],[0,0]],[[-3,0],[3,0]]],
  '2': [[[-4,16],[-3,21],[3,21],[4,17],[4,13],[-4,4],[-4,0],[4,0]]],
  '3': [[[-4,21],[4,21],[4,14],[0,12]],[[0,10],[4,8],[4,3],[3,0],[-4,0]]],
  '4': [[[3,21],[3,0]],[[-4,8],[4,8]],[[-4,21],[-4,8]]],
  '5': [[[4,21],[-4,21],[-4,12],[2,12],[4,9],[4,3],[3,0],[-4,0]]],
  '6': [[[3,21],[-3,21],[-4,17],[-4,3],[-3,0],[3,0],[4,3],[4,10],[3,12],[-4,12]]],
  '7': [[[-4,21],[4,21],[0,0]]],
  '8': [
    [[-3,12],[3,12],[4,9],[4,3],[3,0],[-3,0],[-4,3],[-4,9],[-3,12]],
    [[-3,12],[3,12],[4,15],[4,18],[3,21],[-3,21],[-4,18],[-4,15],[-3,12]]
  ],
  '9': [
    [[-3,9],[-4,12],[-4,18],[-3,21],[3,21],[4,18],[4,12],[3,9],[-3,9]],
    [[3,9],[4,3],[3,0],[-2,0]]
  ],
  '-': [[[-3,10],[3,10]]],
  '.': [[[-1,2],[1,2],[1,0],[-1,0],[-1,2]]],
  '[': [[[2,21],[-1,21],[-1,0],[2,0]]],
  ']': [[[-1,21],[2,21],[2,0],[-1,0]]],
};

// ─── Char extent ──────────────────────────────────────────────────────────────
function _charExtent(ch) {
  const raw = HERSHEY[ch.toUpperCase()];
  if (!raw?.length) return null;
  let minX = Infinity, maxX = -Infinity;
  for (const stroke of raw) for (const [px] of stroke) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
  }
  return isFinite(minX) ? { minX, maxX } : null;
}

// ─── Sampling ─────────────────────────────────────────────────────────────────
function sampleStroke(pts, n) {
  if (n <= 1) return [{ ...pts[0] }];
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    segs.push(len); total += len;
  }
  if (total < 1e-6) return Array(n).fill({ ...pts[0] });
  const result = [];
  let acc = 0, si = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total;
    while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
    const t = segs[si] > 1e-6 ? Math.min((target - acc) / segs[si], 1) : 0;
    result.push({
      x: pts[si].x + (pts[si+1].x - pts[si].x) * t,
      y: pts[si].y + (pts[si+1].y - pts[si].y) * t,
    });
  }
  return result;
}

// sample text into n normalized points
function sampleText(text, n) {
  const polylines = [];
  let cx = 0;
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') { cx += 7; continue; }
    const raw = HERSHEY[ch];
    if (!raw?.length) { cx += 7; continue; }
    const ext = _charExtent(ch);
    if (!ext) { cx += 7; continue; }
    const ox = cx - ext.minX;
    for (const stroke of raw) polylines.push(stroke.map(([x, y]) => ({ x: x + ox, y })));
    cx += ext.maxX - ext.minX + 3;
  }
  if (!polylines.length) return Array(n).fill({ x: 0, y: 0 });

  const lengths = polylines.map(pl => {
    let len = 0;
    for (let i = 0; i < pl.length - 1; i++) {
      const dx = pl[i+1].x - pl[i].x, dy = pl[i+1].y - pl[i].y;
      len += Math.sqrt(dx*dx + dy*dy);
    }
    return len;
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < 1e-6) return Array(n).fill({ x: 0, y: 0 });

  let pts = polylines.flatMap((pl, si) =>
    sampleStroke(pl, Math.max(2, Math.round(n * lengths[si] / total)))
  );
  while (pts.length < n) pts.push({ ...pts[pts.length - 1] });
  pts = pts.slice(0, n);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const cX = (minX + maxX) / 2, cY = (minY + maxY) / 2;
  const scale = Math.max(maxX - minX, maxY - minY, 1);
  return pts.map(p => ({ x: (p.x - cX) / scale, y: (p.y - cY) / scale }));
}

// ─── Interpolation helpers ────────────────────────────────────────────────────
function weightedBlend(anchors, weights, n) {
  const sumW = weights.reduce((s, w) => s + w, 0);
  return Array.from({ length: n }, (_, i) => ({
    x: anchors.reduce((s, a, ai) => s + a.pts[i].x * weights[ai], 0) / sumW,
    y: anchors.reduce((s, a, ai) => s + a.pts[i].y * weights[ai], 0) / sumW,
  }));
}

function idwBlend(anchors, dx, dy, n, power) {
  const dists = anchors.map(a => Math.hypot(a.pos.x - dx, a.pos.y - dy));
  const minD  = Math.min(...dists);
  if (minD < 0.006) return anchors[dists.indexOf(minD)].pts;
  return weightedBlend(anchors, dists.map(d => 1 / Math.pow(d, power)), n);
}

function smoothBlend(anchors, dx, dy, n) {
  const dists = anchors.map(a => Math.hypot(a.pos.x - dx, a.pos.y - dy));
  const maxD  = Math.max(...dists, 1e-6);
  const ws    = dists.map(d => { const u = 1 - d / maxD; return u * u * (3 - 2 * u); });
  const sumW  = ws.reduce((s, w) => s + w, 0);
  if (sumW < 1e-10) return anchors[0].pts;
  return weightedBlend(anchors, ws, n);
}

function gaussianBlend(anchors, dx, dy, n) {
  const sigma = 0.38;
  const ws  = anchors.map(a => Math.exp(-((a.pos.x-dx)**2 + (a.pos.y-dy)**2) / (2*sigma*sigma)));
  const sumW = ws.reduce((s, w) => s + w, 0);
  if (sumW < 1e-10) return idwBlend(anchors, dx, dy, n, 2);
  return weightedBlend(anchors, ws, n);
}

// ─── Extrapolation helpers ────────────────────────────────────────────────────
function solve3x3(M, b) {
  const A = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxR = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(A[r][col]) > Math.abs(A[maxR][col])) maxR = r;
    [A[col], A[maxR]] = [A[maxR], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c <= 3; c++) A[r][c] -= f * A[col][c];
    }
  }
  return [A[0][3]/A[0][0], A[1][3]/A[1][1], A[2][3]/A[2][2]];
}

function computeExtrapWeights(anchors, dx, dy) {
  const m = anchors.length;
  if (m === 1) return [1];
  if (m === 2) {
    const a = anchors[0].pos, b = anchors[1].pos;
    const abx = b.x - a.x, aby = b.y - a.y;
    const len2 = abx*abx + aby*aby;
    if (len2 < 1e-10) return [0.5, 0.5];
    const t = ((dx - a.x)*abx + (dy - a.y)*aby) / len2;
    return [1 - t, t];
  }
  const xs = anchors.map(a => a.pos.x), ys = anchors.map(a => a.pos.y);
  const sX  = xs.reduce((s, x) => s + x, 0),   sY  = ys.reduce((s, y) => s + y, 0);
  const sX2 = xs.reduce((s, x) => s + x*x, 0), sY2 = ys.reduce((s, y) => s + y*y, 0);
  const sXY = xs.reduce((s, x, i) => s + x*ys[i], 0);
  const lam = solve3x3([[m,sX,sY],[sX,sX2,sXY],[sY,sXY,sY2]], [1, dx, dy]);
  if (!lam) return anchors.map(() => 1 / m);
  return anchors.map((_, i) => lam[0] + lam[1]*xs[i] + lam[2]*ys[i]);
}

function extrapBlend(anchors, dx, dy, n, amp) {
  const base = computeExtrapWeights(anchors, dx, dy);
  const mean = 1 / anchors.length;
  const weights = base.map(w => mean + amp * (w - mean));
  return Array.from({ length: n }, (_, i) => ({
    x: anchors.reduce((s, a, ai) => s + a.pts[i].x * weights[ai], 0),
    y: anchors.reduce((s, a, ai) => s + a.pts[i].y * weights[ai], 0),
  }));
}

function projectT() {
  const a = anchorPos[selected[0]], b = anchorPos[selected[selected.length - 1]];
  const abx = b.x - a.x, aby = b.y - a.y;
  const len2 = abx*abx + aby*aby;
  if (len2 < 1e-10) return 0.5;
  return Math.max(0, Math.min(1, ((dotPos.x - a.x)*abx + (dotPos.y - a.y)*aby) / len2));
}

function catmullRomPt(t, sets, i) {
  const n   = sets.length;
  const seg = Math.min(Math.floor(t * (n - 1)), n - 2);
  const lt  = t * (n - 1) - seg;
  const t2  = lt * lt, t3 = lt * t2;
  const s0 = sets[Math.max(0, seg - 1)], s1 = sets[seg];
  const s2 = sets[seg + 1], s3 = sets[Math.min(n - 1, seg + 2)];
  const m1x = (s2[i].x - s0[i].x) * 0.5, m1y = (s2[i].y - s0[i].y) * 0.5;
  const m2x = (s3[i].x - s1[i].x) * 0.5, m2y = (s3[i].y - s1[i].y) * 0.5;
  const h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + lt, h01 = -2*t3 + 3*t2, h11 = t3 - t2;
  return {
    x: h00*s1[i].x + h10*m1x + h01*s2[i].x + h11*m2x,
    y: h00*s1[i].y + h10*m1y + h01*s2[i].y + h11*m2y,
  };
}

function lagrangePt(t, sets, i) {
  let x = 0, y = 0;
  const n = sets.length;
  for (let k = 0; k < n; k++) {
    let L = 1;
    for (let j = 0; j < n; j++) if (j !== k) L *= (t - j/(n-1)) / ((k-j)/(n-1));
    x += L * sets[k][i].x; y += L * sets[k][i].y;
  }
  return { x, y };
}

function getInterpolated() {
  if (!selected.length) return [];
  const sets    = selected.map(k => pointSets[k]);
  const anchors = selected.map(k => ({ pts: pointSets[k], pos: anchorPos[k] || { x: .5, y: .5 } }));
  const n = sets[0].length, dx = dotPos.x, dy = dotPos.y;
  if (selected.length === 1) return sets[0];

  // IDW power variants
  const idwPow = { linear: 1, idw: 2 }[interpMethod];
  if (idwPow !== undefined) return idwBlend(anchors, dx, dy, n, idwPow);

  if (interpMethod === 'extrap') return extrapBlend(anchors, dx, dy, n, 1);

  switch (interpMethod) {
    case 'nearest': {
      let ni = 0, minD = Infinity;
      anchors.forEach((a, i) => { const d = Math.hypot(a.pos.x-dx, a.pos.y-dy); if (d < minD) { minD = d; ni = i; } });
      return sets[ni];
    }
    case 'smooth':   return smoothBlend(anchors, dx, dy, n);
    case 'gaussian': return gaussianBlend(anchors, dx, dy, n);
    case 'spline':   { const t = projectT(); return Array.from({length:n}, (_,i) => catmullRomPt(t, sets, i)); }
    case 'poly':     { const t = projectT(); return Array.from({length:n}, (_,i) => lagrangePt(t, sets, i)); }
    default:         return idwBlend(anchors, dx, dy, n, 1);
  }
}

// ─── Hershey text utilities ───────────────────────────────────────────────────
function hersheyTextSVG(text, pixelH) {
  const scale = pixelH / 21, sw = Math.max(1, pixelH / 14);
  const parts = [];
  let cx = 0;
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') { cx += 7 * scale; continue; }
    const ext = _charExtent(ch);
    if (!ext) { cx += 7 * scale; continue; }
    const ox = -ext.minX;
    for (const stroke of HERSHEY[ch]) {
      if (stroke.length < 2) continue;
      const pts = stroke.map(([px, py]) =>
        `${(cx + (px + ox) * scale).toFixed(2)},${((21 - py) * scale).toFixed(2)}`
      ).join(' ');
      parts.push(`<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    cx += (ext.maxX - ext.minX + 3) * scale;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(cx,1).toFixed(1)}" height="${pixelH}" style="display:block;overflow:visible">${parts.join('')}</svg>`;
}

function drawHersheyText(p, text, x, y, pixelH, col, align) {
  const scale = pixelH / 21, sw = Math.max(0.8, pixelH / 14);
  const str = text.toUpperCase();
  let totalW = 0;
  for (const ch of str) {
    const ext = _charExtent(ch);
    totalW += ext ? (ext.maxX - ext.minX + 3) * scale : 7 * scale;
  }
  let cx = align === 'center' ? x - totalW/2 : align === 'right' ? x - totalW : x;
  p.push();
  p.noFill(); p.stroke(col[0], col[1], col[2]);
  p.strokeWeight(sw); p.strokeCap(p.ROUND); p.strokeJoin(p.ROUND);
  for (const ch of str) {
    if (ch === ' ') { cx += 7 * scale; continue; }
    const ext = _charExtent(ch);
    if (!ext) { cx += 7 * scale; continue; }
    const ox = -ext.minX;
    for (const stroke of HERSHEY[ch]) {
      if (stroke.length < 2) continue;
      for (let i = 0; i < stroke.length - 1; i++) {
        p.line(
          cx + (stroke[i][0]   + ox) * scale, y - stroke[i][1]   * scale,
          cx + (stroke[i+1][0] + ox) * scale, y - stroke[i+1][1] * scale
        );
      }
    }
    cx += (ext.maxX - ext.minX + 3) * scale;
  }
  p.pop();
}

// ─── Shape list ───────────────────────────────────────────────────────────────
const SHAPES = [
  { val: 'circle',  label: 'CIRCLE'  },
  { val: 'square',  label: 'SQUARE'  },
  { val: 'diamond', label: 'DIAMOND' },
  { val: 'line',    label: 'LINE'    },
];

// tangent at pts[i], y flipped for screen space
function getTangent(pts, i) {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x, dy = -(b.y - a.y);
  const len = Math.sqrt(dx * dx + dy * dy);
  return len > 1e-6 ? [dx / len, dy / len] : [1, 0];
}

// ─── Interpolation method list ────────────────────────────────────────────────
const INTERP_METHODS = [
  { val: 'nearest',  label: 'NEAREST'  },
  { val: 'linear',   label: 'LINEAR'   },
  { val: 'smooth',   label: 'SMOOTH'   },
  { val: 'idw',      label: 'IDW'      },
  { val: 'gaussian', label: 'GAUSS'    },
  { val: 'poly',     label: 'POLY'     },
  { val: 'spline',   label: 'SPLINE'   },
  { val: 'extrap',   label: 'EXTRAP'   },
];

// ─── HTML UI helpers ──────────────────────────────────────────────────────────
// plain (non-Hershey) label, rendered in Diatype Mono
function setTextLabel(id, text) {
  document.getElementById(id).textContent = text;
}

function toggleAnchor(key) {
  const idx = selected.indexOf(key);
  if (idx !== -1) { selected.splice(idx, 1); delete anchorPos[key]; }
  else if (selected.length < 9) selected.push(key);
  autoArrange();
  dotPos = { x: 0.5, y: 0.5 };
  refreshGrid();
  redrawSketch();
}

function refreshGrid() {
  document.querySelectorAll('#grid-panel button[data-key]').forEach(btn => {
    const idx = selected.indexOf(btn.dataset.key);
    btn.classList.toggle('sel', idx !== -1);
    btn.querySelector('.ord').innerHTML = idx !== -1 ? hersheyTextSVG(String(idx + 1), 6) : '';
  });
}

function makeAnchorBtn(key, svgSize) {
  const btn = document.createElement('button');
  btn.dataset.key = key;
  const chSpan = document.createElement('span'); chSpan.className = 'ch';
  chSpan.innerHTML = hersheyTextSVG(key, svgSize);
  const ordSpan = document.createElement('span'); ordSpan.className = 'ord';
  btn.append(chSpan, ordSpan);
  btn.addEventListener('click', () => toggleAnchor(key));
  return btn;
}

function buildLetterGrid() {
  const panel = document.getElementById('grid-panel');
  for (const ch of LETTERS) panel.appendChild(makeAnchorBtn(ch, 12));
}

function addWord(raw) {
  const key = raw.trim().toUpperCase();
  if (!key || words.includes(key)) return;
  words.push(key);
  pointSets[key] = sampleText(key, numPts);

  const btn = makeAnchorBtn(key, 8);
  btn.classList.add('word-btn');
  const delSpan = document.createElement('span');
  delSpan.className = 'del';
  delSpan.textContent = '×';
  delSpan.addEventListener('click', e => {
    e.stopPropagation();
    words.splice(words.indexOf(key), 1);
    const si = selected.indexOf(key);
    if (si !== -1) { selected.splice(si, 1); delete anchorPos[key]; autoArrange(); }
    delete pointSets[key];
    btn.remove();
    refreshGrid(); redrawSketch();
  });
  btn.appendChild(delSpan);
  document.getElementById('word-buttons').appendChild(btn);
}

function buildInterpList() {
  const select = document.getElementById('interp-list');
  select.innerHTML = '';
  for (const m of INTERP_METHODS) {
    const opt = document.createElement('option');
    opt.value = m.val;
    opt.textContent = m.label;
    select.appendChild(opt);
  }
  select.value = interpMethod;
  select.addEventListener('change', () => {
    interpMethod = select.value;
    redrawSketch();
  });
}

function buildShapeList() {
  const select = document.getElementById('shape-list');
  select.innerHTML = '';
  for (const s of SHAPES) {
    const opt = document.createElement('option');
    opt.value = s.val;
    opt.textContent = s.label;
    select.appendChild(opt);
  }
  select.value = dotShape;
  select.addEventListener('change', () => {
    dotShape = select.value;
    redrawSketch();
  });
}

function initHTMLLabels() {
  for (const [id, text] of [
    ['fillBtn',     'FILL ON'],
    ['exportSvgBtn','EXPORT SVG'],
    ['exportPngBtn','EXPORT PNG'],
  ]) setTextLabel(id, text);
  setTextLabel('lbl-interp', 'INTERPOLATION TYPE');
  setTextLabel('lbl-shape', 'SHAPE');
  buildInterpList();
  buildShapeList();
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportSVG(p) {
  const pts = getInterpolated();
  if (!pts.length) return;
  const size = p.height, cx = size/2, cy = size/2, s = size * 0.72;
  let body = `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
  if (showLines) {
    const d = pts.map((pt, i) =>
      `${i===0?'M':'L'}${(cx+pt.x*s).toFixed(2)},${(cy-pt.y*s).toFixed(2)}`
    ).join(' ');
    body += `<path d="${d}" fill="none" stroke="#1e1e1e" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const fa = fillDots ? `fill="#1e1e1e"` : `fill="none" stroke="#1e1e1e" stroke-width="${outlineWeight}"`;
  const la = `stroke="#1e1e1e" stroke-width="${outlineWeight}" stroke-linecap="round"`;
  body += pts.map((pt, i) => {
    const x = cx + pt.x * s, y = cy - pt.y * s, r = dotSize / 2;
    const xf = x.toFixed(2), yf = y.toFixed(2), rf = r.toFixed(2);
    switch (dotShape) {
      case 'circle':  return `<circle cx="${xf}" cy="${yf}" r="${rf}" ${fa}/>`;
      case 'square':  return `<rect x="${(x-r).toFixed(2)}" y="${(y-r).toFixed(2)}" width="${dotSize}" height="${dotSize}" ${fa}/>`;
      case 'diamond': return `<polygon points="${xf},${(y-r).toFixed(2)} ${(x+r).toFixed(2)},${yf} ${xf},${(y+r).toFixed(2)} ${(x-r).toFixed(2)},${yf}" ${fa}/>`;
      case 'line': {
        const [tx, ty] = getTangent(pts, i);
        return `<line x1="${(x-tx*r).toFixed(2)}" y1="${(y-ty*r).toFixed(2)}" x2="${(x+tx*r).toFixed(2)}" y2="${(y+ty*r).toFixed(2)}" ${la}/>`;
      }
    }
  }).join('');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`], { type: 'image/svg+xml' }));
  a.download = 'letter-morph.svg'; a.click();
  URL.revokeObjectURL(a.href);
}

function exportPNG(p) {
  const pts = getInterpolated();
  if (!pts.length) return;
  const size = p.height * 2, cx = size/2, cy = size/2, s = size * 0.72;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ctx.strokeStyle = '#1e1e1e';
  if (showLines) {
    ctx.beginPath();
    pts.forEach((pt, i) => { const x = cx+pt.x*s, y = cy-pt.y*s; i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
    ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();
  }
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i], x = cx + pt.x * s, y = cy - pt.y * s, r = dotSize / 2;
    ctx.beginPath();
    switch (dotShape) {
      case 'circle':  ctx.arc(x, y, r, 0, Math.PI * 2); break;
      case 'square':  ctx.rect(x - r, y - r, dotSize, dotSize); break;
      case 'diamond': ctx.moveTo(x, y-r); ctx.lineTo(x+r, y); ctx.lineTo(x, y+r); ctx.lineTo(x-r, y); ctx.closePath(); break;
      case 'line': {
        const [tx, ty] = getTangent(pts, i);
        ctx.moveTo(x - tx*r, y - ty*r); ctx.lineTo(x + tx*r, y + ty*r);
        break;
      }
    }
    if (dotShape === 'line') { ctx.lineWidth = outlineWeight; ctx.lineCap = 'round'; ctx.stroke(); }
    else if (fillDots) ctx.fill();
    else { ctx.lineWidth = outlineWeight; ctx.stroke(); }
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'letter-morph.png'; a.click();
}

// ─── p5 sketch ────────────────────────────────────────────────────────────────
new p5(function(p) {
  const PAD = 34;
  let diatypeFont;

  p.preload = function() {
    diatypeFont = p.loadFont('diatype/ABCDiatypeSemi-Mono-Regular-Trial.otf');
  };

  function drawDiatypeText(p, text, x, y, pixelH, col, align) {
    p.push();
    p.noStroke();
    p.fill(col[0], col[1], col[2]);
    p.textFont(diatypeFont);
    p.textSize(pixelH);
    p.textAlign(align === 'center' ? p.CENTER : align === 'right' ? p.RIGHT : p.LEFT, p.BASELINE);
    p.text(text, x, y);
    p.pop();
  }

  function halfSize() {
    return Math.min(Math.floor((window.innerWidth - 358) / 2), window.innerHeight - 40, 560);
  }
  function n2s(nx, ny) { const i = p.height - 2*PAD; return [PAD + nx*i, PAD + ny*i]; }
  function s2n(sx, sy) { const i = p.height - 2*PAD; return [(sx-PAD)/i, (sy-PAD)/i]; }

  function drawNavGrid() {
    const h = p.height, inner = h - 2*PAD;
    p.noFill();
    p.stroke(210,210,205);
    p.strokeWeight(1);
    p.rect(PAD, PAD, inner, inner);

    if (!selected.length) {
      const hc = [178,176,170];
      drawDiatypeText(p, 'SELECT TWO OR MORE LETTERS/WORDS', h/2, h/2+5, 12, hc, 'center');
      return;
    }

    p.stroke(225,225,218);
    p.strokeWeight(1);
    for (const key of selected) {
      const pos = anchorPos[key]; if (!pos) continue;
      const [sx, sy] = n2s(pos.x, pos.y);
      p.line(sx, PAD, sx, PAD+inner); p.line(PAD, sy, PAD+inner, sy);
    }

    const lc  = [158,163,182];
    const abbr = k => k.length > 4 ? k.slice(0,3)+'.' : k;
    const fs   = k => k.length > 1 ? 7 : 9;
    const byX  = [...selected].sort((a,b) => (anchorPos[a]?.x??0) - (anchorPos[b]?.x??0));
    const byY  = [...selected].sort((a,b) => (anchorPos[a]?.y??0) - (anchorPos[b]?.y??0));

    for (const key of byX) {
      const [sx] = n2s(anchorPos[key].x, 0);
      drawHersheyText(p, abbr(key), sx, PAD-4, fs(key), lc, 'center');
    }
    for (const key of byY) {
      const [, sy] = n2s(0, anchorPos[key].y);
      drawHersheyText(p, abbr(key), PAD-5, sy+5, fs(key), lc, 'right');
    }

    const handleBg = p.color(230,230,226);
    const handleFg = [68,68,64];
    for (const key of selected) {
      const pos = anchorPos[key]; if (!pos) continue;
      const [sx, sy] = n2s(pos.x, pos.y);
      const label = key.slice(0, 5), isWord = key.length > 1;
      const hw = isWord ? Math.max(18, label.length*7) : 13;
      p.fill(handleBg); p.noStroke();
      if (isWord) p.rect(sx-hw/2, sy-7, hw, 14, 2); else p.ellipse(sx, sy, 13, 13);
      drawHersheyText(p, label, sx, sy+4, isWord ? Math.min(8, 36/label.length) : 8, handleFg, 'center');
    }

    const [dsx, dsy] = n2s(dotPos.x, dotPos.y);
    p.fill(30,30,40); p.noStroke(); p.ellipse(dsx, dsy, 9, 9);
  }

  function drawViewport() {
    const h = p.height, cx = h+h/2, cy = h/2, s = h*0.72;
    const pts = getInterpolated();
    if (!pts.length) {
      const hc = [178,176,170];
      drawDiatypeText(p, 'SELECT TWO OR MORE LETTERS/WORDS', cx, cy+5, 12, hc, 'center');
      return;
    }
    if (showLines) {
      p.stroke(30);
      p.strokeWeight(0.8); p.noFill();
      p.beginShape();
      for (const pt of pts) p.vertex(cx+pt.x*s, cy-pt.y*s);
      p.endShape();
    }
    if (dotShape === 'line' || !fillDots) {
      p.noFill(); p.stroke(30); p.strokeWeight(outlineWeight);
    } else {
      p.noStroke(); p.fill(30);
    }
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const sx = cx + pt.x * s, sy = cy - pt.y * s, r = dotSize / 2;
      switch (dotShape) {
        case 'circle':  p.ellipse(sx, sy, dotSize, dotSize); break;
        case 'square':  p.rect(sx - r, sy - r, dotSize, dotSize); break;
        case 'diamond': p.quad(sx, sy-r, sx+r, sy, sx, sy+r, sx-r, sy); break;
        case 'line': {
          const [tx, ty] = getTangent(pts, i);
          p.line(sx - tx*r, sy - ty*r, sx + tx*r, sy + ty*r);
          break;
        }
      }
    }
  }

  p.setup = function() {
    const h = halfSize();
    p.createCanvas(h*2, h).parent('sketch');
    p.noLoop();
    redrawSketch = () => p.redraw();

    // Initialize sliders from config (sets numPts, dotSize, etc.)
    for (const s of SLIDERS) {
      const el = document.getElementById(s.id);
      Object.assign(el, { min: s.min, max: s.max, step: s.step, value: s.value });
      setTextLabel(s.lblId, s.label);
      s.apply(s.value);
      el.addEventListener('input', function() {
        s.apply(+this.value);
        p.redraw();
      });
    }

    for (const ch of LETTERS) pointSets[ch] = sampleText(ch, numPts);
    buildLetterGrid();
    initHTMLLabels();

    const wordInput = document.getElementById('wordInput');
    document.getElementById('addWordBtn').addEventListener('click', () => {
      const v = wordInput.value.trim().toUpperCase();
      if (v) { addWord(v); wordInput.value = ''; }
    });
    wordInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('addWordBtn').click();
    });

    document.getElementById('fillBtn').addEventListener('click', function() {
      fillDots = !fillDots;
      this.textContent = fillDots ? 'FILL ON' : 'FILL OFF';
      p.redraw();
    });
    document.getElementById('exportSvgBtn').addEventListener('click', () => exportSVG(p));
    document.getElementById('exportPngBtn').addEventListener('click', () => exportPNG(p));

    p.redraw();
  };

  p.draw = function() {
    p.background(255,255,255);
    drawNavGrid();
    p.stroke(210,210,205);
    p.strokeWeight(1); p.line(p.height, 0, p.height, p.height);
    drawViewport();
  };

  p.mousePressed = function() {
    if (p.mouseX < 0 || p.mouseX >= p.height || p.mouseY < 0 || p.mouseY >= p.height) return;
    for (const key of selected) {
      const pos = anchorPos[key]; if (!pos) continue;
      const [sx, sy] = n2s(pos.x, pos.y);
      if (Math.hypot(p.mouseX-sx, p.mouseY-sy) < 12) { dragging = key; return; }
    }
    dragging = 'dot';
    const [nx, ny] = s2n(p.mouseX, p.mouseY);
    dotPos = { x: nx, y: ny };
    p.redraw();
  };

  p.mouseDragged = function() {
    if (!dragging) return;
    const [nx, ny] = s2n(p.mouseX, p.mouseY);
    if (dragging === 'dot') dotPos = { x: nx, y: ny };
    else if (anchorPos[dragging]) anchorPos[dragging] = { x: nx, y: ny };
    p.redraw();
  };

  p.mouseReleased = function() { dragging = null; };

  p.windowResized = function() { const h = halfSize(); p.resizeCanvas(h*2, h); p.redraw(); };
});
