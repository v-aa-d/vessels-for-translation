// Entropy Type — dot matrix
// A fixed grid of dots samples the current text's glyph fill (rasterized via
// the uploaded font, or the default font as a fallback). At zero entropy every
// dot just sits at its grid slot at its base size. Turning up the entropy
// slider doesn't move the dots at all — instead it grows the amplitude of a
// size oscillation built from two Catmull-Rom splines (p5's curvePoint())
// looping through their own keyframe sequences at different temporal and
// spatial frequencies, summed together. Splines swing at an uneven pace
// between keyframes rather than a sine's constant angular speed, and two of
// them at frequencies that never share a period beat against each other into
// an irregular, harder-to-predict swelling/shrinking pattern — all without
// needing actual randomness.

const SAMPLE_STEP = 7; // grid spacing in pixels — the matrix pitch
const MAX_PTS = 9000;

// Looped keyframe sequences the splines interpolate through — deliberately
// different lengths so the two curves' cycles never realign.
const CURVE_A = [0, 1, -0.7, 0.5, -1, 0.2];
const CURVE_B = [0.3, -0.9, 0.6, -0.4, 1, -0.6, 0.1, -1];

const CURVE_SPEED = 0.045; // keyframe-units/frame the primary spline advances
const CURVE_SPATIAL_FREQ = 0.02; // how fast the primary phase shifts across space
const CURVE2_SPEED = 0.083; // second layer's temporal speed — not a clean multiple of CURVE_SPEED
const CURVE2_SPATIAL_FREQ = 0.045; // second layer's spatial frequency, offset along the other diagonal (x - y) so its crests don't line up with the primary curve's
const CURVE2_WEIGHT = 0.55; // second layer's amplitude relative to the first
const ENTROPY_AMPLITUDE = 3; // multiplies the combined spline output, so max entropy swings size far more dramatically than the raw ~[-1, 1] spline range would

// Evaluates a Catmull-Rom spline looped through `points`, at any real-valued
// position `t` (not clamped to [0, len)) — integer part picks which keyframe
// segment, fractional part is curvePoint()'s own t along that segment.
function splinePoint(points, t) {
  const n = points.length;
  let i = Math.floor(t);
  const frac = t - i;
  i = ((i % n) + n) % n;
  const at = (k) => points[((k % n) + n) % n];
  return curvePoint(at(i - 1), at(i), at(i + 1), at(i + 2), frac);
}

let particles = [];
let pg;
let customFont = null;
let defaultFont = null;
let entropyLevel = 0.5; // 0 = static grid, 1 = full grow/shrink sine wave
let particleSize = 3; // base size for each dot
let particleShape = "line"; // 'ellipse' | 'square' | 'point' | 'line' — how each particle is drawn
let lineHeight = 1.15; // multiplier on fontSize for multi-line text spacing
let typeSize = 200; // base font size text is rasterized at, before the fit-to-canvas scale-down
let alignMode = "center"; // 'left' | 'center' | 'right' — horizontal alignment of the rasterized text

// Geometry shared by every particle renderer (live canvas, PNG export buffer,
// SVG export) so the line-angle/dot/rect math — and which shapes are stroked
// vs filled — lives in exactly one place instead of drifting across paths.
function particleGeometry(x, y, size, shape, angle) {
  if (shape === "line") {
    let len = size * 1.5;
    let dx = (Math.cos(angle) * len) / 2;
    let dy = (Math.sin(angle) * len) / 2;
    return { type: "line", strokeOnly: true, x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy };
  }
  if (shape === "point") return { type: "point", strokeOnly: true, x, y, size };
  if (shape === "square") return { type: "rect", strokeOnly: false, x, y, size };
  return { type: "dot", strokeOnly: false, x, y, size }; // 'ellipse'
}

// Sets the current stroke/fill mode for a shape's geometry. Shared so the
// live canvas and PNG export buffer can't disagree about which shapes stroke.
function applyParticleStyle(ctx, g, size) {
  if (g.strokeOnly) {
    ctx.stroke(0);
    ctx.strokeWeight(size);
    ctx.noFill();
  } else {
    ctx.noStroke();
    ctx.fill(0);
  }
}

// ctx is either the global p5 instance (`window`, in global mode) or a
// createGraphics() buffer, both of which expose the same rect/ellipse/etc API.
function drawParticleShape(ctx, x, y, size, shape, angle) {
  const g = particleGeometry(x, y, size, shape, angle);
  applyParticleStyle(ctx, g, size);
  if (g.type === "line") ctx.line(g.x1, g.y1, g.x2, g.y2);
  else if (g.type === "point") ctx.point(g.x, g.y);
  else if (g.type === "rect") ctx.rect(g.x, g.y, g.size, g.size);
  else ctx.ellipse(g.x, g.y, g.size, g.size);
}

// ── preload ──────────────────────────────────────────────────────────────────

function preload() {
  loadFont(
    "fonts/Arial-Bold.ttf",
    (f) => {
      defaultFont = f;
    },
    () => {
      defaultFont = null;
    },
  ); // fine to fail — falls back to pixel-sampled fill only
}

// ── Particle ──────────────────────────────────────────────────────────────────

class Particle {
  constructor(home) {
    this.home = home.copy(); // fixed grid slot — doubles as current draw position
    this.targetHome = home.copy();
    // Phase offset by grid position — this is what makes the size oscillation
    // read as a wave traveling across the matrix rather than everything
    // pulsing in unison. The second layer uses a different axis (x - y
    // instead of x + y) and a different spatial frequency so its wavefronts
    // cross the first layer's at an angle instead of just riding on top of it.
    this.phase = (home.x + home.y) * CURVE_SPATIAL_FREQ;
    this.phase2 = (home.x - home.y) * CURVE2_SPATIAL_FREQ;
    this.size = particleSize;
  }

  // Soft retarget — used when the text changes, so a dot glides to its new
  // grid slot instead of snapping (which reads as a jump cut while typing).
  setTarget(h) {
    this.targetHome.set(h.x, h.y);
  }

  update() {
    this.home.lerp(this.targetHome, 0.2);

    let wave1 = splinePoint(CURVE_A, frameCount * CURVE_SPEED + this.phase);
    let wave2 = splinePoint(CURVE_B, frameCount * CURVE2_SPEED + this.phase2);
    // Normalize by the total weight so the combined wave still swings within
    // roughly [-1, 1], matching a single spline layer's range — then scale up
    // by ENTROPY_AMPLITUDE so full entropy reads as a much more extreme swing.
    let wave = ((wave1 + CURVE2_WEIGHT * wave2) / (1 + CURVE2_WEIGHT)) * ENTROPY_AMPLITUDE;
    this.size = Math.max(0.4, particleSize + wave * entropyLevel * particleSize);
  }

  show() {
    drawParticleShape(window, this.home.x, this.home.y, this.size, particleShape, this.phase);
  }
}

// ── textToPoints ──────────────────────────────────────────────────────────────

// Rasterizes txt into the offscreen buffer, then samples a regular grid
// (pitch = SAMPLE_STEP) over it — every grid cell landing on a lit pixel
// becomes a dot. That regular grid is the "matrix" the whole piece is built
// from: dots never sit at arbitrary glyph-outline positions, only at fixed
// lattice points, so text changes just toggle which lattice points are lit.
function textToPoints(txt) {
  txt = txt || " ";
  let f = customFont || defaultFont;

  let fontSize = typeSize;
  if (f) {
    textFont(f);
    textSize(fontSize);
    textLeading(fontSize * lineHeight);
    let bounds = f.textBounds(txt, 0, 0, fontSize);
    // Multi-line text needs a height check too, not just width — a few short
    // lines can still overflow the canvas vertically.
    let scale = Math.min(
      (width * 0.92) / bounds.w,
      (height * 0.7) / bounds.h,
      1,
    );
    if (scale < 1) fontSize *= scale;
  }

  const margin = pg.width * 0.04; // matches the 0.92 width-fit factor above, split across both sides
  const halign = alignMode === "left" ? LEFT : alignMode === "right" ? RIGHT : CENTER;
  const x = alignMode === "left" ? margin : alignMode === "right" ? pg.width - margin : pg.width / 2;

  pg.background(0);
  pg.fill(255);
  pg.noStroke();
  pg.textSize(fontSize);
  pg.textLeading(fontSize * lineHeight);
  pg.textStyle(BOLD);
  if (f) pg.textFont(f);
  pg.textAlign(halign, CENTER);
  pg.text(txt, x, pg.height / 2);
  pg.loadPixels();

  let pts = [];
  for (let x = 0; x < pg.width; x += SAMPLE_STEP) {
    for (let y = 0; y < pg.height; y += SAMPLE_STEP) {
      if (pg.pixels[(x + y * pg.width) * 4] > 128) {
        pts.push(createVector(x, y));
      }
    }
  }

  return pts;
}

// ── rebuild ───────────────────────────────────────────────────────────────────

function rebuildParticles(txt) {
  let pts = textToPoints(txt || " ");
  if (pts.length > MAX_PTS) {
    // Fisher-Yates shuffle then truncate — O(n), unlike repeatedly splicing
    // out a random element (O(n) per removal, O(n·overflow) overall).
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(random(i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    pts.length = MAX_PTS;
  }

  // Stable left-to-right, top-to-bottom order so re-assignment on text change
  // is visually coherent rather than random.
  pts.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));

  for (let i = 0; i < pts.length; i++) {
    if (i < particles.length) particles[i].setTarget(pts[i]);
    else particles.push(new Particle(pts[i]));
  }
  particles.length = pts.length;
}

// ── setup / draw ──────────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  rectMode(CENTER);
  ellipseMode(CENTER);

  pg = createGraphics(width, height);
  pg.pixelDensity(1);

  // Text input — invisible overlay covering the canvas, so typing lands
  // directly on the rendered dot-matrix letters instead of a separate box.
  const txtInput = document.getElementById("txt-input");
  txtInput.addEventListener("input", (e) =>
    rebuildParticles(e.target.value || ""),
  );
  txtInput.focus();

  // Entropy slider
  document.getElementById("entropy-slider").addEventListener("input", (e) => {
    entropyLevel = e.target.value / 100;
  });

  // Size slider
  document.getElementById("size-slider").addEventListener("input", (e) => {
    particleSize = parseFloat(e.target.value);
  });

  // Type size slider
  document
    .getElementById("type-size-slider")
    .addEventListener("input", (e) => {
      typeSize = parseFloat(e.target.value);
      rebuildParticles(document.getElementById("txt-input").value || "");
    });

  // Line height slider
  document
    .getElementById("line-height-slider")
    .addEventListener("input", (e) => {
      lineHeight = parseFloat(e.target.value);
      rebuildParticles(document.getElementById("txt-input").value || "");
    });

  // Alignment toggle
  document.querySelectorAll(".align-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".align-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      alignMode = btn.dataset.align;
      rebuildParticles(document.getElementById("txt-input").value || "");
    });
  });

  // Font upload — load via blob URL so p5 loadFont can handle it
  document
    .getElementById("font-upload")
    .addEventListener("change", function () {
      let file = this.files[0];
      if (!file) return;
      let label = document.getElementById("font-label");
      label.dataset.name = file.name.replace(/\.[^.]+$/, "");
      label.classList.add("loaded");
      let url = URL.createObjectURL(file);
      loadFont(url, (font) => {
        customFont = font;
        let txt = document.getElementById("txt-input").value || "";
        rebuildParticles(txt);
      });
    });

  // Export
  document.getElementById("export-png").addEventListener("click", exportPNG);
  document.getElementById("export-svg").addEventListener("click", exportSVG);

  rebuildParticles("");
}

// ── export ────────────────────────────────────────────────────────────────────

// Canvas is raster-only, so an SVG export has to be built by hand: one shape
// element per currently visible particle, mirroring drawParticleShape() above.
// The shape name is stamped as a data-shape attribute (and a leading comment)
// on the root <svg> so the file itself records which particleShape produced it.
function shapeToSVG(x, y, size, shape, angle) {
  const g = particleGeometry(x, y, size, shape, angle);
  if (g.type === "line") {
    return `<line x1="${g.x1.toFixed(2)}" y1="${g.y1.toFixed(2)}" x2="${g.x2.toFixed(2)}" y2="${g.y2.toFixed(2)}" stroke="#000" stroke-width="${size.toFixed(2)}"/>`;
  }
  if (g.type === "rect") {
    return `<rect x="${(g.x - g.size / 2).toFixed(2)}" y="${(g.y - g.size / 2).toFixed(2)}" width="${g.size.toFixed(2)}" height="${g.size.toFixed(2)}" fill="#000"/>`;
  }
  return `<circle cx="${g.x.toFixed(2)}" cy="${g.y.toFixed(2)}" r="${(g.size / 2).toFixed(2)}" fill="#000"/>`;
}

function exportSVG() {
  let shapes = "";
  for (const p of particles) {
    shapes +=
      shapeToSVG(p.home.x, p.home.y, p.size, particleShape, p.phase) + "\n";
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-shape="${particleShape}">\n<!-- particleShape: ${particleShape} -->\n<rect width="100%" height="100%" fill="#fff"/>\n${shapes}</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "entropy-type.svg";
  a.click();
  URL.revokeObjectURL(url);
}

// Raster canvas exports at the screen's 1x/2x pixel density, which lands well
// under print-quality 300dpi. Redraw the current frame into an offscreen buffer
// scaled up to hit 300dpi (at CSS 96dpi baseline) before saving, so the PNG holds
// up in print rather than just on-screen.
const EXPORT_DPI = 300;
const SCREEN_DPI = 96;
const EXPORT_SCALE = EXPORT_DPI / SCREEN_DPI;

function exportPNG() {
  const g = createGraphics(
    Math.round(width * EXPORT_SCALE),
    Math.round(height * EXPORT_SCALE),
  );
  g.pixelDensity(1);
  g.background(255);
  g.rectMode(CENTER);
  g.ellipseMode(CENTER);

  for (const p of particles) {
    drawParticleShape(
      g,
      p.home.x * EXPORT_SCALE,
      p.home.y * EXPORT_SCALE,
      p.size * EXPORT_SCALE,
      particleShape,
      p.phase,
    );
  }

  g.save("entropy-type.png");
  g.remove();
}

function draw() {
  background(255);

  for (let p of particles) {
    p.update();
    p.show();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.pixelDensity(1);
  rebuildParticles(document.getElementById("txt-input").value || "");
}
