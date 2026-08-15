/*
  Quantum Grid Typography — Bloch Sphere Model
  ─────────────────────────────────────────────
  Each circle is a qubit with a genuine two-state superposition:

    |ψ(t)⟩ = cos(θ/2)|0⟩ + e^(iφ)·sin(θ/2)|1⟩

  Two independent physical processes drive each qubit:

    θ(t) = θ₀ + ωᵣ·t   — Rabi rotation: transfers population between |0⟩ and |1⟩
    φ(t) = φ₀ + ωz·t   — Larmor precession: evolves the complex phase

  P(filled) = sin²(θ/2)  — oscillates between 0 and 1 (full Rabi cycle)
  P(empty)  = cos²(θ/2)  = 1 − P(filled)

  Both eigenstates are shown through a visible Y-axis rotation (coin spin):
    • Front face visible (cos θ > 0) → empty circle     — the |0⟩ component
    • Back face visible  (cos θ < 0) → filled black disc — the |1⟩ component
    • Squish = |cos θ|: thin line at θ=π/2 = maximum superposition (50/50)
  ~8 adjacent cell pairs are Bell-entangled: |Φ+⟩ = (|00⟩ + |11⟩)/√2
    Entangled cells always collapse to the same outcome when measured.
    A faint blue line links each pair while in superposition.

  SPACE — wavefunction collapse → projects onto the next character pointer state (A→B→C…→Z→0→1…)
  CLICK — toggle any circle (auto-collapses first if needed)
*/

// ┌─────────────────────────────────────────────────────────────────────────────
// │  GRID CONFIG — edit these values and reload
// ├─────────────────────────────────────────────────────────────────────────────
// │  COLS / ROWS   number of circles
// │  R             circle radius in pixels
// │  OVERLAP       spacing fraction (0.5 = touching, <0.5 = gap, >0.5 = overlap)
// │
// │  GRID_SHAPE    layout of rows:
// │    'square'    — no row offset, orthogonal grid
// │    'triangle'  — alternating half-step offset (hex / brick lattice)
// │    'quad'      — each row shifts by half a step → parallelogram
// │
// │  CELL_SHAPE    shape drawn at each cell position:
// │    'circle'    — disc / ellipse (default)
// │    'square'    — rectangle
// │    'triangle'  — upward-pointing triangle
// │    'diamond'   — upright rhombus (squishes horizontally)
// │    'rhombus'   — parallelogram (flat top/bottom, slants right)
// └─────────────────────────────────────────────────────────────────────────────
const COLS = 5;
const ROWS = 10;
const R          = 46;
const OVERLAP    = 0.62;
const GRID_SHAPE = 'square';     // 'square' | 'triangle' | 'quad'
const CELL_SHAPE = 'square';     // 'circle' | 'square' | 'triangle' | 'diamond' | 'rhombus'
const SHOW_GRID  = false;         // false = draw only filled cells (letter only, no background grid)

const TWO_PI = Math.PI * 2;

let cells          = [];
let entangledPairs = [];
let collapsed      = false;

// Each character (letter or digit) is a pointer state for the decoherence channel —
// a 5×8 pixel-font pattern. Collapse always projects onto the current character, then
// advances the sequence A→B→C→…→Z→0→1→…→9→A.  Rows are strings of length 5; 'X' = filled cell.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const ALPHABET_PATTERNS = [
  ['.XXX.', '.X.X.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'], // A
  ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'X...X', 'XXXX.'], // B
  ['.XXXX', 'X....', 'X....', 'X....', 'X....', 'X....', 'X....', '.XXXX'], // C
  ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'], // D
  ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....', 'XXXXX'], // E
  ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....', 'X....'], // F
  ['.XXXX', 'X....', 'X....', 'X.XXX', 'X...X', 'X...X', 'X...X', '.XXXX'], // G
  ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X', 'X...X'], // H
  ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'], // I
  ['....X', '....X', '....X', '....X', '....X', 'X...X', 'X...X', '.XXX.'], // J
  ['X...X', 'X..X.', 'X.X..', 'XX...', 'XX...', 'X.X..', 'X..X.', 'X...X'], // K
  ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'], // L
  ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X'], // M
  ['X...X', 'XX..X', 'XX..X', 'X.X.X', 'X.X.X', 'X..XX', 'X..XX', 'X...X'], // N
  ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'], // O
  ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....', 'X....'], // P
  ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..XX', 'X...X', '.XXXX'], // Q
  ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X', 'X...X'], // R
  ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', '....X', 'XXXX.'], // S
  ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'], // T
  ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'], // U
  ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..'], // V
  ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'], // W
  ['X...X', 'X...X', '.X.X.', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'], // X
  ['X...X', 'X...X', '.X.X.', '.X.X.', '..X..', '..X..', '..X..', '..X..'], // Y
  ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'X....', 'XXXXX'], // Z
  ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'], // 0
  ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '..X..', '.XXX.'], // 1
  ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'], // 2
  ['.XXX.', 'X...X', '....X', '..XX.', '....X', '....X', 'X...X', '.XXX.'], // 3
  ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.', '...X.'], // 4
  ['XXXXX', 'X....', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'], // 5
  ['.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', 'X...X', '.XXX.'], // 6
  ['XXXXX', '....X', '...X.', '..X..', '..X..', '.X...', '.X...', '.X...'], // 7
  ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'], // 8
  ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.'], // 9
];

// Scale each 5×8 pattern to fill the full COLS×ROWS grid via nearest-neighbor sampling.
const PAT_COLS = ALPHABET_PATTERNS[0][0].length; // 5
const PAT_ROWS = ALPHABET_PATTERNS[0].length;    // 8

const ALPHABET_SETS = ALPHABET_PATTERNS.map(function(pattern) {
  const s = new Set();
  for (let gr = 0; gr < ROWS; gr++) {
    const pr = Math.floor(gr * PAT_ROWS / ROWS);
    for (let gc = 0; gc < COLS; gc++) {
      const pc = Math.floor(gc * PAT_COLS / COLS);
      if (pattern[pr][pc] === 'X') s.add(gr * COLS + gc);
    }
  }
  return s;
});

let letterIndex   = 0;
let composedChars = [];   // [{char, angles}] — angles is Float32Array of collapseFrom per cell (letters only)

// ── Page layout ──────────────────────────────────────────────────────────────
const layout = document.createElement('div');
layout.id    = 'layout';
document.body.appendChild(layout);

const leftPanel = document.createElement('div');
leftPanel.id    = 'left-panel';
layout.appendChild(leftPanel);

const rightPanel = document.createElement('div');
rightPanel.id    = 'right-panel';
layout.appendChild(rightPanel);

const hint = document.createElement('div');
hint.id = 'hint';
hint.textContent = 'Type any letter or number';
leftPanel.appendChild(hint);

const exportRow = document.createElement('div');
exportRow.id = 'export-row';
leftPanel.appendChild(exportRow);

const exportPngBtn = document.createElement('button');
exportPngBtn.className = 'export-btn';
exportPngBtn.textContent = 'Export PNG';
exportPngBtn.disabled    = true;
exportRow.appendChild(exportPngBtn);

const exportSvgBtn = document.createElement('button');
exportSvgBtn.className = 'export-btn';
exportSvgBtn.textContent = 'Export SVG';
exportSvgBtn.disabled    = true;
exportRow.appendChild(exportSvgBtn);

// Shared shape renderer — ctx is a p5 instance or p5.Graphics; fill/stroke must be set before calling.
function drawShape(ctx, x, y, r, widthScale) {
  const w = r * widthScale;
  if (CELL_SHAPE === 'square') {
    ctx.rectMode(ctx.CENTER);
    ctx.rect(x, y, w * 2, r * 2);
  } else if (CELL_SHAPE === 'triangle') {
    ctx.triangle(x, y - r, x - w, y + r, x + w, y + r);
  } else if (CELL_SHAPE === 'diamond') {
    ctx.quad(x, y - r, x + w, y, x, y + r, x - w, y);
  } else if (CELL_SHAPE === 'rhombus') {
    const lean = w * 0.45;
    ctx.quad(x - w + lean, y - r, x + w + lean, y - r,
             x + w - lean, y + r, x - w - lean, y + r);
  } else {
    ctx.ellipse(x, y, w * 2, r * 2);
  }
}

new p5(function(p) {
  const dx  = R * 2 * OVERLAP;
  const dy  = R * Math.sqrt(3) * OVERLAP;
  const PAD = R * 1.2;

  function rowOffset(row) {
    if (GRID_SHAPE === 'triangle') return (row % 2 === 1) ? dx * 0.5 : 0;
    if (GRID_SHAPE === 'quad')     return row * dx * 0.5;
    return 0; // 'square'
  }

  const maxOff = GRID_SHAPE === 'quad' ? (ROWS - 1) * dx * 0.5
               : GRID_SHAPE === 'triangle' ? dx * 0.5
               : 0;
  const CW = (COLS - 1) * dx + 2 * R + PAD * 2 + maxOff;
  const CH = (ROWS - 1) * dy + 2 * R + PAD * 2;

  // ── Setup ───────────────────────────────────────────────────────────────────
  p.setup = function() {
    p.createCanvas(CW, CH).parent(leftPanel);
    leftPanel.appendChild(hint);     // move instruction text below the canvas
    leftPanel.appendChild(exportRow); // then move the export buttons below the instructions
    p.smooth();
    exportPngBtn.addEventListener('click', exportPNG);
    exportSvgBtn.addEventListener('click', exportSVG);
    buildGrid();
    buildEntanglement();
  };

  function buildGrid() {
    cells = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const xOff = rowOffset(row);
        cells.push({
          x:      PAD + R + col * dx + xOff,
          y:      PAD + R + row * dy,
          row, col,
          // Bloch sphere angles
          theta0: p.random(TWO_PI),          // initial polar angle
          omegaR: p.random(0.0005, 0.0022),  // Rabi frequency (|0⟩↔|1⟩ oscillation)
          phi0:   p.random(TWO_PI),          // initial azimuthal phase
          omegaZ: p.random(0.0009, 0.003),   // Larmor precession frequency
          // Post-collapse
          partner: -1,
          filled:  false,
        });
      }
    }
  }

  function buildEntanglement() {
    entangledPairs = [];
    // Collect all adjacent cell pairs
    const adj = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (p.dist(cells[i].x, cells[i].y, cells[j].x, cells[j].y) < R * 2.6) {
          adj.push([i, j]);
        }
      }
    }
    p.shuffle(adj, true);
    const used = new Set();
    for (const [i, j] of adj) {
      if (entangledPairs.length >= 8) break;
      if (!used.has(i) && !used.has(j)) {
        cells[i].partner = j;
        cells[j].partner = i;
        entangledPairs.push([i, j]);
        used.add(i);
        used.add(j);
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  p.draw = function() {
    p.background(255);
    const t = p.millis();

    // Entanglement links — drawn behind circles, visible only in superposition
    if (!collapsed) {
      p.strokeWeight(0.7);
      for (const [i, j] of entangledPairs) {
        p.stroke(55, 80, 220, 55);
        p.line(cells[i].x, cells[i].y, cells[j].x, cells[j].y);
      }
    }

    for (const c of cells) {
      collapsed ? drawCollapsed(c) : drawSuperposition(c, t);
    }
  };

  function drawCollapsed(c) {
    if (!SHOW_GRID && !c.filled) return;
    const widthScale = Math.abs(Math.cos(c.collapseFrom));
    p.strokeWeight(1.2);
    p.stroke(30);
    c.filled ? p.fill(20) : p.noFill();
    drawShape(p, c.x, c.y, R, widthScale);
  }

  function drawSuperposition(c, t) {
    const theta      = c.theta0 + c.omegaR * t;
    const cosT       = Math.cos(theta);
    const widthScale = Math.abs(cosT);
    const backFace   = cosT < 0;
    if (!SHOW_GRID && !backFace) return;
    p.strokeWeight(1.2);
    p.stroke(30);
    backFace ? p.fill(20) : p.noFill();
    drawShape(p, c.x, c.y, R, widthScale);
  }

  function exportPNG() {
    const g = p.createGraphics(CW, CH);
    g.background(255);
    g.strokeWeight(1.2);
    g.stroke(30);
    g.fill(20);
    for (const c of cells) {
      if (!c.filled) continue;
      const widthScale = Math.abs(Math.cos(c.collapseFrom));
      drawShape(g, c.x, c.y, R, widthScale);
    }
    p.save(g, 'letter.png');
    g.remove();
  }

  function svgShapeMarkup(x, y, r, widthScale) {
    const w = r * widthScale;
    if (CELL_SHAPE === 'square') {
      return `<rect x="${x - w}" y="${y - r}" width="${w * 2}" height="${r * 2}"/>`;
    } else if (CELL_SHAPE === 'triangle') {
      return `<polygon points="${x},${y - r} ${x - w},${y + r} ${x + w},${y + r}"/>`;
    } else if (CELL_SHAPE === 'diamond') {
      return `<polygon points="${x},${y - r} ${x + w},${y} ${x},${y + r} ${x - w},${y}"/>`;
    } else if (CELL_SHAPE === 'rhombus') {
      const lean = w * 0.45;
      return `<polygon points="${x - w + lean},${y - r} ${x + w + lean},${y - r} ${x + w - lean},${y + r} ${x - w - lean},${y + r}"/>`;
    }
    return `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${r}"/>`;
  }

  function exportSVG() {
    let shapes = '';
    for (const c of cells) {
      if (!c.filled) continue;
      const widthScale = Math.abs(Math.cos(c.collapseFrom));
      shapes += svgShapeMarkup(c.x, c.y, R, widthScale);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">`
              + `<rect width="${CW}" height="${CH}" fill="#ffffff"/>`
              + `<g fill="#141414" stroke="#1e1e1e" stroke-width="1.2">${shapes}</g></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'letter.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Measurement (Born rule) ─────────────────────────────────────────────────

  function recordCollapse(c, t) {
    c.collapseFrom = c.theta0 + c.omegaR * t;
  }

  function measureAll() {
    const t      = p.millis();
    const done   = new Set();
    const letter = ALPHABET_SETS[letterIndex];

    for (const [i, j] of entangledPairs) {
      cells[i].filled = letter.has(i);
      cells[j].filled = letter.has(j);
      recordCollapse(cells[i], t);
      recordCollapse(cells[j], t);
      done.add(i);
      done.add(j);
    }

    for (let k = 0; k < cells.length; k++) {
      if (done.has(k)) continue;
      cells[k].filled = letter.has(k);
      recordCollapse(cells[k], t);
    }
  }

  function enterSuperposition() {
    collapsed = false;
    for (const c of cells) {
      c.theta0 = p.random(TWO_PI);
      c.phi0   = p.random(TWO_PI);
    }
    exportPngBtn.disabled = true;
    exportSvgBtn.disabled = true;
  }

  function collapseToLetter(idx) {
    letterIndex = idx;
    collapsed   = true;
    measureAll();
    exportPngBtn.disabled = false;
    exportSvgBtn.disabled = false;
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  p.keyPressed = function() {
    if (p.key === ' ') {
      if (collapsed) enterSuperposition();
      composedChars.push({ char: ' ' });
      return false;
    }
    if (p.key === 'Enter') {
      if (collapsed) enterSuperposition();
      composedChars.push({ char: '\n' });
      return false;
    }
    if (p.key === 'Backspace') {
      composedChars.pop();
      const last = composedChars[composedChars.length - 1];
      const lastIdx = last ? CHARS.indexOf(last.char) : -1;
      if (lastIdx !== -1) collapseToLetter(lastIdx);
      else if (collapsed) enterSuperposition();
      return false;
    }
    const key = p.key.toUpperCase();
    const idx = CHARS.indexOf(key);
    if (idx !== -1) {
      collapseToLetter(idx);
      composedChars.push({ char: key, angles: cells.map(c => c.collapseFrom) });
    }
  };

  // ── Mouse — toggle circle ───────────────────────────────────────────────────
  p.mousePressed = function() {
    for (const c of cells) {
      if (p.dist(p.mouseX, p.mouseY, c.x, c.y) < R) {
        if (!collapsed) collapseToLetter(letterIndex);
        c.filled = !c.filled;
        break;
      }
    }
  };
});

// ── Composition canvas ───────────────────────────────────────────────────────
new p5(function(p) {
  // Mirror the left grid exactly — same COLS, ROWS, GRID_SHAPE, CELL_SHAPE, OVERLAP.
  // Scale down from R so multiple letters fit horizontally.
  const r   = Math.max(2, Math.round(R * 0.13));
  const cdx = r * 2 * OVERLAP;
  const cdy = r * Math.sqrt(3) * OVERLAP;

  // Max horizontal offset a single letter produces (matches left-canvas rowOffset logic)
  const letterMaxOff = GRID_SHAPE === 'quad'     ? (ROWS - 1) * cdx * 0.5
                     : GRID_SHAPE === 'triangle' ? cdx * 0.5
                     : 0;
  const LW     = (COLS - 1) * cdx + 2 * r + letterMaxOff;
  const LH     = (ROWS - 1) * cdy + 2 * r;
  const LSPC   = r * 2;
  const WSPC   = r * 2 * OVERLAP * COLS * 0.5;   // ~half a letter width for space
  const LINE_H = LH + r * 2;
  const PARA_H = LH * 0.4;
  const PAD_X  = r * 3;
  const PAD_Y  = r * 3;

  function rowOffset(row) {
    if (GRID_SHAPE === 'triangle') return (row % 2 === 1) ? cdx * 0.5 : 0;
    if (GRID_SHAPE === 'quad')     return row * cdx * 0.5;
    return 0;
  }

  let cw, ch, scrollY = 0, lastLen = -1;
  let glyphs = [];

  function reflow() {
    glyphs = [];
    let x = PAD_X, y = PAD_Y;
    const maxX = cw - PAD_X - LW;

    for (const entry of composedChars) {
      if (entry.char === '\n') {
        glyphs.push(null);
        x = PAD_X;
        y += LINE_H + PARA_H;
        continue;
      }
      if (entry.char === ' ') {
        glyphs.push(null);
        x += WSPC;
        if (x > maxX) { x = PAD_X; y += LINE_H; }
        continue;
      }
      const idx = CHARS.indexOf(entry.char);
      if (idx === -1) { glyphs.push(null); continue; }
      if (x > maxX) { x = PAD_X; y += LINE_H; }
      glyphs.push({ idx, angles: entry.angles, x, y });
      x += LW + LSPC;
    }
    glyphs.push({ cursor: true, x, y });
  }

  p.setup = function() {
    cw = rightPanel.offsetWidth || 400;
    ch = window.innerHeight;
    p.createCanvas(cw, ch).parent(rightPanel);
    reflow();
  };

  p.draw = function() {
    if (composedChars.length !== lastLen) {
      reflow();
      lastLen = composedChars.length;
      const cur = glyphs[glyphs.length - 1];
      if (cur) {
        const bottom = cur.y + LH - scrollY;
        if (bottom > ch - PAD_Y)     scrollY = cur.y + LH - ch + PAD_Y + LINE_H;
        if (cur.y - scrollY < PAD_Y) scrollY = cur.y - PAD_Y;
        if (scrollY < 0) scrollY = 0;
      }
    }

    p.background(255);
    p.push();
    p.translate(0, -scrollY);

    for (const g of glyphs) {
      if (!g || g.cursor) continue;
      const letterSet = ALPHABET_SETS[g.idx];
      p.strokeWeight(Math.max(0.3, r * 0.12));
      p.stroke(30);
      for (let gr = 0; gr < ROWS; gr++) {
        const xOff = rowOffset(gr);
        for (let gc = 0; gc < COLS; gc++) {
          const k  = gr * COLS + gc;
          const ws = Math.abs(Math.cos(g.angles[k]));
          const filled = letterSet.has(k);
          if (!SHOW_GRID && !filled) continue;
          filled ? p.fill(20) : p.noFill();
          drawShape(p, g.x + gc * cdx + xOff, g.y + gr * cdy, r, ws);
        }
      }
    }

    // blinking cursor
    const cur = glyphs[glyphs.length - 1];
    if (cur && cur.cursor && Math.floor(p.millis() / 530) % 2 === 0) {
      p.noStroke();
      p.fill(30);
      p.rectMode(p.CORNER);
      p.rect(cur.x, cur.y - r, Math.max(1, r * 0.3), LH);
    }

    p.pop();
  };
});
