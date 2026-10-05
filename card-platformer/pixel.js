// Card Climber — the Pixel art style (Settings → Art style → Pixel).
// Every object is a small sprite placed pixel by pixel, 16 art-pixels per tile, with
// solid outlines on characters. The world is drawn on a small canvas, then scaled
// up with no smoothing (game.js draw()). Text stays at full resolution.
// Loaded after art.js and before game.js. Uses the same rules and level data as the
// smooth style; only the drawing differs.

const PIXELS_PER_TILE = 16;
const U = PIXELS_PER_TILE;
Art.style = () => window.settings?.artStyle || CONFIG.artStyle || 'classic';
Art.lowRes = false;            // true while a pixel frame is being drawn

/* =====================================================================
   PALETTES — based on Endesga 32 (bright and chunky), plus a few extras.
   Each theme: sky bands (top → bottom), sun, far + near mountain ranges,
   rolling hills with trees, ground (cap + dirt) and ambient motes.
   ===================================================================== */
const PIXEL_THEMES = {
  meadow: {
    sky: ['#4ab8f0', '#62c4f3', '#7bcff6', '#95daf8', '#b1e5fa', '#ccf0fc'], sun: ['#fff6c9', '#ffffff'],
    far: { lit: '#b9c7e2', shade: '#9eaed0', snow: '#ffffff', snowShade: '#dde5f2', rim: '#c9d5ec', snowDepth: 14, hMin: 62, hMax: 84, spacing: 62, slope: .92 },
    near: { lit: '#9fc6b9', shade: '#88b3a7', rim: '#b5d6c9', hMin: 42, hMax: 56, spacing: 64, slope: .72 },
    hills: { fill: '#5fb85a', rim: '#86d872', base: 100 }, tree: 'round',
    cap: ['#a8e66e', '#63c74d', '#3e8948', '#2b5e3a'], dirt: ['#c28569', '#a2614a', '#e0a27a', '#733e39'], stone: ['#8b9bb4', '#c0cbdc'],
    tufts: '#63c74d', flowers: true, cloud: ['#ffffff', '#d4e4f4'], motes: '#fff3a6',
  },
  canyon: {
    sky: ['#ea8a5c', '#f09a68', '#f4ac78', '#f7bf8c', '#fad2a3', '#fde3be'], sun: ['#fff1c9', '#ffffff'],
    far: { lit: '#dd9474', shade: '#c47a5d', snow: '#dd9474', snowShade: '#c47a5d', rim: '#eaa98a', snowDepth: 0, hMin: 52, hMax: 74, spacing: 70, slope: 2.2, mesa: true },
    near: { lit: '#c97a5c', shade: '#b0654a', rim: '#d98f70', hMin: 36, hMax: 50, spacing: 58, slope: 1.6, mesa: true },
    hills: { fill: '#b5623f', rim: '#d08055', base: 104 }, tree: 'cactus',
    cap: ['#fbe7ad', '#ecc66e', '#c99a3e', '#7a5520'], dirt: ['#c0623f', '#9a4a30', '#d98a5f', '#5e2a1c'], stone: ['#8b6a5a', '#b08a76'],
    strata: ['#c0623f', '#cf7349', '#b4573a', '#dc8e60', '#c96a43', '#a94f35'],   // rock layers (bands of 4 pixels)
    tufts: '#c99a3e', flowers: false, cloud: ['#fff1e0', '#f6cfae'], motes: '#ffc86b',
  },
  peaks: {
    sky: ['#7fa6e0', '#93b5e6', '#a8c4ec', '#bcd3f2', '#d1e2f7', '#e6f0fc'], sun: ['#ffffff', '#ffffff'],
    far: { lit: '#d6e2f3', shade: '#b8c8e4', snow: '#ffffff', snowShade: '#e6eef9', rim: '#e8eef8', snowDepth: 30, hMin: 72, hMax: 100, spacing: 58, slope: 1.05 },
    near: { lit: '#aebfdd', shade: '#97aacd', rim: '#c3d1e8', hMin: 46, hMax: 62, spacing: 54, slope: .9, snowDepth: 8, snow: '#eef4ff', snowShade: '#d6e2f3' },
    hills: { fill: '#c9d8ef', rim: '#e6eef9', base: 102 }, tree: 'pine',
    cap: ['#ffffff', '#f2f7ff', '#c8d6ee', '#7d8fb3'], dirt: ['#7a8fb5', '#5b6d94', '#b4d3ee', '#2f3b5c'], stone: ['#4a5878', '#8fa6c8'],
    frozen: true,   // frozen rock: icy flecks
    tufts: null, flowers: false, cloud: ['#ffffff', '#dde6f4'], motes: '#ffffff',
  },
};

/* ---------- sprites: one character per pixel ('.' = empty) ---------- */
const SPR = {
  slime: ['....oooooo....', '..ooLLLLLLoo..', '.oLwwLLLLLLLo.', '.oLwLLLLLLLLo.', 'oLLkWLLkWLLMMo', 'oLLkWLLkWLMMMo', 'oMLLLLLLLLMMMo', 'oMMMMMMMMMMMDo', '.oDDDDDDDDDDo.', '..oooooooooo..'],
  spring: ['.oooooooooooooo.', '.oPPPPPPPPPPPPo.', '.oRRRRRRRRRRRRo.', '.oDDDDDDDDDDDDo.', '..oooooooooooo..', '....oGGGGGGo....', '.....oHHHHo.....', '....oGGGGGGo....', '..oBBBBBBBBBBo..', '..oooooooooooo..'],
  gem: ['...ooo...', '..oCwCo..', '.oCwCCCo.', 'oCwCCCCBo', 'oCCCCCBBo', '.oCCCBBo.', '..oCBBo..', '...oBo...', '....o....'],
  key: ['.ooo........', 'owYYo.......', 'oYoYoooooooo', 'oYoYYYYYYYYo', 'oYYYoooYoYYo', '.ooo...ooooo'],
  spike: ['..o..', '.oLo.', '.oLDo', 'oLLDo', 'oLDDo', 'oLLDo'],
  stub: ['.o.', 'oLo'],
  tree: ['...oooooo...', '.ooTTTTTToo.', 'oTTtTTTTTTTo', 'oTttTTTTTTSo', 'oTTTTTTTTSSo', '.oTTTTTTSSo.', '..ooSSSSoo..', '.....kk.....', '.....kk.....'],
  pine: ['.....oo.....', '....oTTo....', '...oTtTTo...', '....oTTo....', '..oTtTTTTo..', '...oTTTSo...', '.oTtTTTTSSo.', 'oTTTTTTTSSSo', '.oooooooooo.', '.....kk.....'],
  saguaro: ['....oo....', '...oTTo...', '...oTto.oo', 'oo.oTtooTo', 'oTooTtoTSo', 'oTTTTtTTo.', '.ooTTtTo..', '...oTto...', '...oTto...', '...oTSo...'],
};
const SPAL = {
  hero: { o: '#2b1b24', Y: '#fee761', y: '#feae34', d: '#f77622', w: '#ffffff', k: '#181425' },
  heroDead: { o: '#2b1b24', Y: '#ff9a9a', y: '#e43b44', d: '#a22633', w: '#ffffff', k: '#181425' },
  slime: { o: '#2a1640', L: '#a884f3', M: '#7b4fd6', D: '#4b2a8a', w: '#ffffff', W: '#ffffff', k: '#181425' },
  spring: { o: '#2b1b24', P: '#f6757a', R: '#e43b44', D: '#a22633', G: '#c0cbdc', H: '#8b9bb4', B: '#5a6988' },
  gem: { o: '#124e89', C: '#2ce8f5', w: '#ffffff', B: '#0099db' },
  key: { o: '#5e3c08', Y: '#fee761', w: '#ffffff' },
  spike: { o: '#3a4466', L: '#ffffff', D: '#8b9bb4' },
  spikeHot: { o: '#7a3a1c', L: '#ffd08a', D: '#f77622' },
  spikeCold: { o: '#5e4a40', L: '#c9a38a', D: '#93603f' },
  tree: { o: '#1e4a3a', T: '#4aa84a', t: '#7fd36a', S: '#2f7a46', k: '#733e39' },
  pine: { o: '#28465a', T: '#5f8fa8', t: '#8db7cc', S: '#46728c', k: '#5e4a40' },
  saguaro: { o: '#5e3a2a', T: '#8a9a52', t: '#a9b86a', S: '#6e7c3e' },
};

const Pixel = {
  px(g, c, x, y, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x, y, w, h); },
  mix(a, b, f) {             // blend two #rrggbb colours (cached: called every frame)
    const key = a + b + f;
    if (Pixel.mixCache[key]) return Pixel.mixCache[key];
    const p = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), A = p(a), B = p(b);
    return (Pixel.mixCache[key] = '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''));
  },
  mixCache: {},
  // draw a sprite (rows of characters) with a palette; flip mirrors it
  spr(g, rows, pal, x, y, flip = false) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[flip ? r.length - 1 - i : i];
        if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + i, y + j, 1, 1); }
      }
    }
  },
  // build a sprite from a shape: inside(i, j) says which pixels are filled; filled pixels
  // that touch the outside become the outline 'o', the rest are coloured by paint(i, j)
  shape(w, h, inside, paint) {
    const rows = [];
    for (let j = 0; j < h; j++) {
      let r = '';
      for (let i = 0; i < w; i++) {
        if (!inside(i, j)) r += '.';
        else if (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) r += 'o';
        else r += paint(i, j);
      }
      rows.push(r);
    }
    return rows;
  },

  /* ---------- frame setup ---------- */
  start() {
    if (!Pixel.canvas) {
      Pixel.canvas = document.createElement('canvas');
      Pixel.canvas.width = W * U; Pixel.canvas.height = H * U;
      Pixel.g = Pixel.canvas.getContext('2d');
    }
    Art.lowRes = true;
    Pixel.g.setTransform(1, 0, 0, 1, 0, 0);
    Pixel.g.clearRect(0, 0, W * U, H * U);
    return Pixel.g;
  },
  end(screen) {
    Art.lowRes = false;
    screen.save(); screen.imageSmoothingEnabled = false;
    screen.drawImage(Pixel.canvas, 0, 0, W * TS, H * TS);
    screen.restore();
  },
  themeName(x) { return app.mode === 'time' ? ENDLESS_THEME_ORDER[Math.floor(x / ENDLESS_THEME_TILES) % 3] : Art.themeName(); },
  theme(x) { return PIXEL_THEMES[Pixel.themeName(x)]; },

  /* ---------- the hero: rebuilt at every squash/stretch size, so he moves exactly as before ---------- */
  heroRows(w, h, dir, status, blink) {
    const corner = (i, j) => { const a = Math.min(i, w - 1 - i), b = Math.min(j, h - 1 - j); return a < 2 && b < 2 && a + b < 2; };
    const rows = Pixel.shape(w, h, (i, j) => i >= 0 && j >= 0 && i < w && j < h && !corner(i, j),
      (i, j) => (j === h - 2 ? 'd' : j === h - 3 || i === w - 2 ? 'y' : (i === 2 && j <= 3) || (i === 3 && j === 2) ? 'w' : 'Y')).map((r) => r.split(''));
    const set = (i, j, c) => { if (rows[j] && rows[j][i] && rows[j][i] !== 'o' && rows[j][i] !== '.') rows[j][i] = c; };
    const ey = Math.max(2, Math.round(h * .36)), e1 = dir > 0 ? w - 6 : 3, e2 = e1 + 3;
    if (status === 'dead') {                                // x x
      for (const e of [e1, e2]) { set(e - 1, ey - 1, 'k'); set(e + 1, ey - 1, 'k'); set(e, ey, 'k'); set(e - 1, ey + 1, 'k'); set(e + 1, ey + 1, 'k'); }
    } else {
      const eh = blink || h < 10 ? 1 : 2, top = blink ? ey + 1 : ey;
      for (let k = 0; k < eh; k++) { set(e1, top + k, 'k'); set(e2, top + k, 'k'); }
      if (status === 'won' && h >= 11) { set(e1, ey + 3, 'k'); for (let i = e1 + 1; i < e2; i++) set(i, ey + 4, 'k'); set(e2, ey + 3, 'k'); }
    }
    return rows;
  },
  hero(g, x, y, dir, status, alpha, fx) {
    const w = Math.max(4, Math.round(12 * fx.sx)), h = Math.max(4, Math.round(12 * fx.sy));
    const rows = Pixel.heroRows(w, h, dir, status, fx.blink), pal = status === 'dead' ? SPAL.heroDead : SPAL.hero;
    const cx = Math.round((x + .5) * U), by = Math.round((y + 1 - (fx.lift || 0)) * U), lean = Math.sin(fx.rot || 0);
    g.globalAlpha = alpha;
    rows.forEach((r, j) => {
      const shift = Math.round((h - 1 - j) * lean);        // leaning: shift rows, so it stays pixel-crisp
      r.forEach((c, i) => { if (c !== '.') Pixel.px(g, pal[c], cx - Math.floor(w / 2) + i + shift, by - h + j); });
    });
    g.globalAlpha = 1;
  },
  signText(g, s) {
    const name = { meadow: 'Sunny Meadow', canyon: 'Dusk Canyon', peaks: 'Snowy Peaks' }[s.biome];
    g.font = `bold ${Math.max(9, Math.floor(TS * .26))}px system-ui`; g.textAlign = 'center';
    g.fillStyle = '#fff5df'; g.fillText(name, s.x * TS + TS / 2, s.y * TS + TS * .2);
  },
};

/* =====================================================================
   PixelArt — the same drawing calls as Art (art.js), in pixels.
   game.js draw() uses this object instead of Art when the style is Pixel.
   ===================================================================== */
const PixelArt = {
  /* ---------- background: banded sky, sun, two mountain ranges, hills with trees, clouds ---------- */
  background(g, name, camX, px) {
    const th = PIXEL_THEMES[name], LW = W * U, LH = H * U, t = performance.now() / 1000, P = Pixel.px;
    th.sky.forEach((c, i) => P(g, c, 0, Math.round(i * LH / th.sky.length), LW, Math.ceil(LH / th.sky.length)));
    P(g, th.sun[0], 206, 12, 14, 14); P(g, th.sun[0], 204, 15, 18, 8); P(g, th.sun[1], 209, 15, 6, 6);
    const target = reducedMotion() || app.mode === 'time' ? 0 : (px - W / 2) * PARALLAX.followPlayer;
    Art.shiftNow += (target - Art.shiftNow) * .04;
    PixelArt.range(g, th.far, Math.round((camX * PARALLAX.far + Art.shiftNow * .3) * U), 11, th.sky[3]);
    PixelArt.clouds(g, th, (camX * PARALLAX.clouds + Art.shiftNow * .5) * U, t);
    PixelArt.range(g, th.near, Math.round((camX * (PARALLAX.far + PARALLAX.near) / 2 + Art.shiftNow * .6) * U), 23, th.sky[4]);
    PixelArt.hills(g, th, Math.round((camX * PARALLAX.near + Art.shiftNow) * U));
  },
  // a mountain range: real peaks (or flat-topped mesas), each drawn whole, back to front, so
  // nearer peaks overlap farther ones (farther ones are a little hazier). Lit on the left; the
  // shaded right face starts at a slanted, slightly ragged ridge line. Snowcaps follow the slopes.
  // Peaks come from a hash, so Endless never repeats.
  range(g, r, off, seed, haze) {
    const LW = W * U, LH = H * U, P = Pixel.px;
    const peaks = [];
    for (let k = Math.floor((off - 160) / r.spacing); k <= Math.floor((off + LW + 160) / r.spacing); k++) {
      peaks.push({ x: k * r.spacing + Art.hash(k, seed) * r.spacing * .5, h: r.hMin + Art.hash(k, seed + 1) * (r.hMax - r.hMin),
        s: r.slope * (.85 + Art.hash(k, seed + 2) * .3), w: r.mesa ? 6 + Art.hash(k, seed + 3) * 16 : 0,
        depth: Art.hash(k, seed + 4), ridge: 1.6 + Art.hash(k, seed + 5) * 1.4 });
    }
    peaks.sort((a, b) => a.depth - b.depth);               // farthest first
    for (const p of peaks) {
      const back = p.depth < .5, c = (col) => (back ? Pixel.mix(col, haze, .3) : col);
      const lit = c(r.lit), shade = c(r.shade), snow = c(r.snow || r.lit), snowShade = c(r.snowShade || r.shade), rim = c(r.rim);
      const apex = Math.round(LH - p.h), half = p.h / p.s + p.w;
      for (let sx = Math.max(0, Math.floor(p.x - half - off)); sx <= Math.min(LW - 1, Math.ceil(p.x + half - off)); sx++) {
        const wx = sx + off, dx = wx - p.x, hh = p.h - Math.max(0, Math.abs(dx) - p.w) * p.s;
        if (hh <= 0) continue;
        const top = Math.round(LH - hh);
        // the ridge runs from the summit (right edge of a mesa's top) down and to the right
        const rd = dx - p.w * .4, shadeTo = rd > 0 ? Math.round(apex + rd * p.ridge) + (Art.hash(wx, seed + 6) > .55 ? 1 : 0) : top;
        P(g, lit, sx, top, 1, LH - top);
        if (shadeTo > top) P(g, shade, sx, top, 1, Math.min(LH, shadeTo) - top);
        if (r.snowDepth) {
          const snowLine = Math.round(apex + r.snowDepth + (Art.hash(wx, 7) > .5 ? 1 : 0) + (Math.round(Math.abs(dx)) % 5 === 0 ? 2 : 0));
          if (top < snowLine) {
            P(g, snow, sx, top, 1, snowLine - top);
            if (shadeTo > top) P(g, snowShade, sx, top, 1, Math.min(snowLine, shadeTo) - top);
          }
        }
        P(g, rim, sx, top, 1, 1);
      }
    }
  },
  hills(g, th, off) {
    const LW = W * U, LH = H * U, P = Pixel.px, hl = th.hills;
    const top = (wx) => Math.round(hl.base + 5 * Math.sin(wx * .06 + 2) + 2 * Math.sin(wx * .19));
    const kind = th.tree === 'round' ? 'tree' : th.tree === 'pine' ? 'pine' : 'saguaro', rows = SPR[kind], pal = SPAL[kind];
    const trees = [];
    for (let k = Math.floor(off / 30) - 1; k <= Math.floor((off + LW) / 30) + 1; k++) {
      if (Art.hash(k, 51) < .35) continue;
      const tx = k * 30 + Math.round(Art.hash(k, 52) * 12);
      trees.push({ sx: tx - off, base: top(tx + 6), front: Art.hash(k, 54) > .55, sink: Math.round(Art.hash(k, 53) * 3) });
    }
    // some trees peek over the ridge from behind...
    for (const t of trees) if (!t.front) Pixel.spr(g, rows, pal, t.sx, t.base - rows.length + 2 + t.sink);
    for (let sx = 0; sx < LW; sx++) { const y = top(sx + off); P(g, hl.fill, sx, y, 1, LH - y); P(g, hl.rim, sx, y, 1, 1); }
    // ...and some stand on the near slope, in front of it
    for (const t of trees) if (t.front) Pixel.spr(g, rows, pal, t.sx, t.base - rows.length + 6 + t.sink * 2);
  },
  clouds(g, th, off, t) {
    const LW = W * U, span = LW + 60, P = Pixel.px;
    const one = (cx, cy, w) => {
      cx = Math.round(cx);
      for (let i = 0; i < w; i++) { const hh = Math.round(4 + 3 * Math.sin(i / w * Math.PI) + (i % 8 < 3 ? 1 : 0)); P(g, th.cloud[0], cx + i, cy - hh, 1, hh); P(g, th.cloud[1], cx + i, cy, 1, 2); }
    };
    const drift = reducedMotion() ? 0 : t * 4, wrap = (v) => ((v % span) + span) % span - 40;
    one(wrap(20 - drift - off), 30, 34); one(wrap(140 - drift * .7 - off), 20, 26); one(wrap(230 - drift * .85 - off), 42, 22);
  },

  /* ---------- planning grid: dotted lines on tile edges (drawn behind the terrain) ---------- */
  grid(g, x0, x1) {
    g.fillStyle = 'rgba(24,20,37,.16)';
    for (let x = x0 + 1; x < x1; x++) for (let y = 0; y < H * U; y += 2) g.fillRect(x * U, y, 1, 1);
    for (let y = 1; y < H; y++) for (let x = x0 * U; x < x1 * U; x += 2) g.fillRect(x, y * U, 1, 1);
  },

  /* ---------- tiles ---------- */
  cache: { key: '', canvas: null },
  tiles(g, map, x0, x1, turn) {
    if (map.w === W) {          // fixed screen: static tiles are drawn once into a cached picture
      const key = map.grid.map((r) => r.join('')).join('') + Art.themeName();
      if (PixelArt.cache.key !== key) {
        const c = PixelArt.cache.canvas || document.createElement('canvas');
        c.width = W * U; c.height = H * U;
        const cg = c.getContext('2d'); cg.clearRect(0, 0, c.width, c.height);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) PixelArt.staticTile(cg, map, x, y);
        PixelArt.cache = { key, canvas: c };
      }
      g.drawImage(PixelArt.cache.canvas, 0, 0);
    } else for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) PixelArt.staticTile(g, map, x, y);
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {    // moving parts, every frame
      const c = map.grid[y][x];
      if (c === 't') PixelArt.spikes(g, x, y, turn % 2 === 1 ? 'hot' : 'cold');
      else if (c === 'S') PixelArt.spring(g, x, y);
      else if (c === '>' || c === '<') PixelArt.bumper(g, x, y, c === '>' ? 1 : -1);
    }
  },
  staticTile(g, map, x, y) {
    const c = map.grid[y][x];
    if (c === '#') PixelArt.ground(g, map, x, y, Pixel.theme(x));
    else if (c === 'I') PixelArt.ice(g, x, y);
    else if (c === '=') PixelArt.plank(g, map, x, y);
    else if (c === '^') PixelArt.spikes(g, x, y, 'steel');
    else if (c === 'Y') PixelArt.cactus(g, map, x, y);
  },
  ground(g, map, x, y, th) {
    const X = x * U, Y = y * U, at = (dx, dy) => tileAt(map, x + dx, y + dy), P = (c, a, b, w = 1, h = 1) => Pixel.px(g, c, X + a, Y + b, w, h);
    const solidAt = (dx, dy) => { const c = at(dx, dy); return c === '#' || c === 'I' || c === 'S' || c === '>' || c === '<' || x + dx < 0 || x + dx >= map.w; };
    const [base, dark, light, edge] = th.dirt;
    P(base, 0, 0, U, U);
    if (th.strata) {              // canyon: horizontal rock layers that wander a pixel or two between tiles
      const n = th.strata.length, band = (i, j) => th.strata[((Math.floor((Y + j + Math.round(Math.sin((X + i) * .05) * 2)) / 4)) % n + n) % n];
      for (let j = 0; j < U; j++) for (let i = 0; i < U;) {          // each row in runs of the same colour, so the layers drift smoothly
        const c = band(i, j); let e = i + 1; while (e < U && band(e, j) === c) e++;
        P(c, i, j, e - i, 1); i = e;
      }
      for (let k = 0; k < 3; k++) P(dark, Math.floor(Art.hash(x, y, k) * 14), 3 + Math.floor(Art.hash(y, x, k + 3) * 12), 2 + Math.floor(Art.hash(k, x, y) * 3), 1);   // chips along the layers
    }
    if (th.frozen) {              // frozen rock: icy flecks
      for (let k = 0; k < 3; k++) { const fx = 1 + Math.floor(Art.hash(x, y, k + 33) * 13), fy = 3 + Math.floor(Art.hash(y, x, k + 36) * 11); P(light, fx, fy, 2, 1); P('#ffffff', fx, fy, 1, 1); }
    }
    if (!th.strata) for (let k = 0; k < 7; k++) P(dark, Math.floor(Art.hash(x, y, k) * 15), 4 + Math.floor(Art.hash(y, x, k + 3) * 11), Art.hash(x, k, y) > .5 ? 2 : 1, 1);
    for (let k = 0; k < 3; k++) P(light, Math.floor(Art.hash(x, y, k + 7) * 15), 5 + Math.floor(Art.hash(y, x, k + 9) * 9));
    if (Art.hash(x, y, 9) > .7) {
      const sx = 3 + Math.floor(Art.hash(x, y, 11) * 9), sy = 8 + Math.floor(Art.hash(x, y, 12) * 5);
      P(th.stone[0], sx, sy, 3, 2); P(th.stone[1], sx, sy, 2, 1); P(edge, sx, sy + 2, 3, 1);
    }
    if (!solidAt(-1, 0)) P(edge, 0, 0, 1, U);
    if (!solidAt(1, 0)) P(edge, U - 1, 0, 1, U);
    if (!solidAt(0, 1) && y < H - 1) P(edge, 0, U - 1, U, 1);
    if (!solidAt(0, -1) && at(0, -1) !== '=') {          // the grass (sand, snow) cap, with a jagged fringe
      const [hi, main, under, line] = th.cap;
      const l = !(at(-1, 0) === '#' && !solidAt(-1, -1)), r = !(at(1, 0) === '#' && !solidAt(1, -1));
      P(main, 0, 0, U, 4); P(under, 0, 4, U, 1);
      for (let i = 0; i < U; i++) { const d = Art.hash(x * 16 + i, y, 40); if (d > .4) P(under, i, 5, 1, d > .78 ? 2 : 1); }
      P(hi, 0, 0, U, 1);
      P(line, l ? 0 : -1, -1, U + (l ? 0 : 1) + (r ? 0 : 1), 1);
      if (l) P(line, -1, 0, 1, 5);
      if (r) P(line, U, 0, 1, 5);
      if (th.tufts && Art.hash(x, y, 20) > .55) {
        const tx = 2 + Math.floor(Art.hash(x, y, 21) * 11);
        P(th.tufts, tx, -2, 1, 2); P(th.tufts, tx + 2, -3, 1, 3); P(th.tufts, tx + 4, -2, 1, 2); P(hi, tx + 2, -3);
      }
      if (th.flowers && Art.hash(x, y, 22) > .7) { const fx = 3 + Math.floor(Art.hash(x, y, 23) * 10); P('#fee761', fx, -2); P('#f6757a', fx, -3); }
      if (!th.tufts && Art.hash(x, y, 24) > .6) { const sx = 2 + Math.floor(Art.hash(x, y, 25) * 10); P(hi, sx, -1, 3, 1); P(line, sx - 1, -1); P(line, sx + 3, -1); P(line, sx, -2, 3, 1); }   // snow lumps
    }
  },
  ice(g, x, y) {
    const X = x * U, Y = y * U, P = (c, a, b, w = 1, h = 1) => Pixel.px(g, c, X + a, Y + b, w, h);
    P('#3d7fae', 0, 0, U, U); P('#9fdcf7', 1, 1, 14, 14);
    P('#d8f4ff', 1, 1, 14, 2); P('#d8f4ff', 1, 1, 2, 14); P('#6fb2d9', 1, 13, 14, 2); P('#6fb2d9', 13, 1, 2, 14);
    for (let i = 0; i < 5; i++) P('#ffffff', 4 + i, 9 - i);
    for (let i = 0; i < 3; i++) P('#ffffff', 9 + i, 12 - i);
  },
  plank(g, map, x, y) {
    const X = x * U, Y = y * U, l = tileAt(map, x - 1, y) !== '=', r = tileAt(map, x + 1, y) !== '=', P = (c, a, b, w = 1, h = 1) => Pixel.px(g, c, X + a, Y + b, w, h);
    P('#4a2c14', 0, 0, U, 6); P('#c48b4f', 0, 1, U, 3); P('#e0a86a', 0, 1, U, 1); P('#8a5a2e', 0, 4, U, 1);
    P('#4a2c14', 7, 1, 1, 4); P('#3e2731', 3, 2); P('#3e2731', 12, 2);
    if (l) { P('#4a2c14', 0, 0, 1, 6); P('#4a2c14', 2, 6, 3, 3); P('#8a5a2e', 3, 6, 1, 2); }
    if (r) { P('#4a2c14', U - 1, 0, 1, 6); P('#4a2c14', U - 5, 6, 3, 3); P('#8a5a2e', U - 4, 6, 1, 2); }
  },
  spikes(g, x, y, kind) {
    const X = x * U, Y = y * U, pal = kind === 'hot' ? SPAL.spikeHot : kind === 'cold' ? SPAL.spikeCold : SPAL.spike;
    if (kind === 'cold') for (let k = 0; k < 3; k++) Pixel.spr(g, SPR.stub, pal, X + 2 + k * 5, Y + 13);
    else for (let k = 0; k < 3; k++) Pixel.spr(g, SPR.spike, pal, X + 1 + k * 5, Y + 9);
    Pixel.px(g, pal.o, X, Y + 15, U, 1);
    if (kind !== 'steel') {        // a tiny arrow: up now, or down now (they swap every turn)
      const c = kind === 'hot' ? '#d94b2b' : '#5b6b7a', cx = X + 8, ty = Y + 2, P = (a, b, w) => Pixel.px(g, c, cx + a, ty + b, w, 1);
      if (kind === 'hot') { P(-1, 0, 2); P(-2, 1, 4); P(-3, 2, 6); } else { P(-3, 0, 6); P(-2, 1, 4); P(-1, 2, 2); }
    }
  },
  spring(g, x, y) {
    const X = x * U, Y = y * U, n = Math.round(Math.max(0, Art.springSquash(x, y)) * 3), rows = SPR.spring;
    Pixel.spr(g, rows.slice(8), SPAL.spring, X, Y + 14);
    Pixel.spr(g, rows.slice(5 + n, 8), SPAL.spring, X, Y + 11 + n);
    Pixel.spr(g, rows.slice(0, 5), SPAL.spring, X, Y + 6 + n);
  },
  // bumper (side spring): wall plate, a zigzag coil, and a red pad with a big arrow the way it flings you
  bumper(g, x, y, face) {
    const X = x * U, Y = y * U, comp = Math.round(Math.max(0, Art.springSquash(x, y)) * 3);
    const P = (c, a, b, w = 1, h = 1) => Pixel.px(g, c, X + (face > 0 ? a : U - a - w), Y + b, w, h);   // drawn facing right, mirrored for left
    P('#2b1b24', 0, 1, 3, 14); P('#8b9bb4', 1, 2, 1, 12);                                // wall plate
    const padX = 10 - comp, a = 3, b = padX - 1;                                       // coil between plate and pad
    for (let k = 0; k < 4; k++) {                                                      // zigzag: four diagonal strokes
      const x0 = a + Math.round((b - a) * k / 4), x1 = a + Math.round((b - a) * (k + 1) / 4), down = k % 2 === 0;
      for (let r = 0; r < 8; r++) { const cx = x0 + Math.round((x1 - x0) * r / 7), cy = 4 + (down ? r : 7 - r); P('#5a6988', cx, cy + 1); P('#e6ecf5', cx, cy); }
    }
    P('#2b1b24', padX, 0, 5, U); P('#e43b44', padX + 1, 1, 3, 14); P('#f6757a', padX + 1, 1, 1, 14); P('#a22633', padX + 3, 1, 1, 14);
    [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]].forEach(([dx, dy]) => P('#ffffff', padX + 1 + dx, 6 + dy));   // arrow
  },
  cactus(g, map, x, y) {
    const above = tileAt(map, x, y - 1) === 'Y', below = tileAt(map, x, y + 1) === 'Y';
    const trunk = (i, j) => i >= 6 && i <= 9 && j >= (above ? -1 : 2) && j <= (below ? 16 : 15) && !(!above && j === 2 && (i === 6 || i === 9));
    const arms = (i, j) => !above && ((i >= 3 && i <= 6 && j >= 9 && j <= 10) || (i >= 3 && i <= 4 && j >= 5 && j <= 10) || (i >= 9 && i <= 12 && j >= 6 && j <= 7) || (i >= 11 && i <= 12 && j >= 3 && j <= 7));
    const rows = Pixel.shape(16, 16, (i, j) => trunk(i, j) || arms(i, j), (i, j) => (i === 7 || i === 3 || i === 11 ? 'g' : i === 8 && Art.hash(x, j) > .75 ? 'w' : i === 9 || i === 12 ? 'S' : 'G'));
    Pixel.spr(g, rows, { o: '#1e4a3a', G: '#4aa84a', g: '#7fd36a', S: '#2f7a46', w: '#e9f3c8' }, x * U, y * U);
  },
  sign(g, s) {
    const name = { meadow: 'Sunny Meadow', canyon: 'Dusk Canyon', peaks: 'Snowy Peaks' }[s.biome], w = name.length * 3 + 6, X = s.x * U, Y = s.y * U, P = Pixel.px;
    P(g, '#4a2c14', X + 6, Y + 4, 4, 12); P(g, '#8a5a2e', X + 7, Y + 4, 2, 12);
    const bx = X + 8 - Math.round(w / 2);
    P(g, '#4a2c14', bx, Y - 3, w, 10); P(g, '#c48b4f', bx + 1, Y - 2, w - 2, 8); P(g, '#e0a86a', bx + 1, Y - 2, w - 2, 1); P(g, '#8a5a2e', bx + 1, Y + 5, w - 2, 1);
  },

  /* ---------- things ---------- */
  shadow(g, map, crates, x, y, width) {
    const col = Math.round(x);
    let gy = Math.floor(y) + 1;
    while (gy < H && !(wall(map, col, gy) || tileAt(map, col, gy) === '=' || crates.some((c) => !c.gone && Math.round(c.x) === col && Math.round(c.y) === gy))) gy++;
    if (gy >= H) return;
    const dist = gy - (y + 1), a = Math.max(0, .32 - dist * .07), s = Math.max(.4, 1 - dist * .12);
    if (a <= 0) return;
    const hw = Math.round(U * width * s * .45);
    Pixel.px(g, `rgba(24,20,37,${a})`, Math.round((x + .5) * U) - hw, gy * U, hw * 2, 1);
  },
  crate(g, x, y) {
    const rows = Pixel.shape(14, 14, (i, j) => i >= 0 && j >= 0 && i < 14 && j < 14,
      (i, j) => ((i === 2 || i === 11) && (j === 2 || j === 11) ? 'n' : j === 1 ? 'h' : i === 1 || j === 12 || i === 12 ? 'f' : Math.abs(i - (13 - j)) <= 0 ? 'f' : 'B'));
    Pixel.spr(g, rows, { o: '#4a2c14', B: '#d79a52', h: '#ecc08a', f: '#a8702f', n: '#4a3216' }, Math.round(x * U) + 1, Math.round(y * U) + 1);
  },
  slime(g, x, y, dir, squash, stepT, seed, kind, flyDir = 1) {
    const X = Math.round((x + .5) * U) - 7, base = Math.round((y + 1) * U), t = squash;
    if (t >= 0 && kind === 'dash') {          // bowled over by a Dash: tumbles up and away (four tumble frames), fading out
      const dx = Math.round(flyDir * t * 30), dy = Math.round(-Math.sin(Math.min(1, t * 1.4) * Math.PI) * 15 + t * t * 14);
      const f = Math.floor(t * 10) % 4, rows = f >= 2 ? [...SPR.slime].reverse() : SPR.slime;
      g.globalAlpha = 1 - Math.max(0, t - .55) / .45;
      Pixel.spr(g, rows, SPAL.slime, X + dx, base - 10 + dy, (flyDir < 0) !== (f % 2 === 1));
      g.globalAlpha = 1; return;
    }
    if (t >= 0) {                             // stomped: flattens into a pancake, splats, then fades
      const [w, h] = t < .1 ? [15, 7] : t < .22 ? [17, 5] : [19, 3];
      const rows = Pixel.shape(w, h, (i, j) => i >= 0 && i < w && j >= 0 && j < h && ((i - (w - 1) / 2) ** 2) / ((w / 2) ** 2) + ((j - h) ** 2) / (h ** 2) <= 1,
        (i, j) => (j >= h - 2 ? 'D' : j <= 1 && i < w / 2 ? 'L' : 'M')).map((r) => r.split(''));
      if (h >= 5) { const ey = Math.floor(h / 2), c = Math.floor(w / 2); [c - 3, c - 2, c + 2, c + 3].forEach((i) => { if (rows[ey][i] !== 'o') rows[ey][i] = 'k'; }); }   // eyes squeezed shut
      g.globalAlpha = 1 - Math.max(0, t - .5) * 2;
      const left = Math.round((x + .5) * U - w / 2);
      Pixel.spr(g, rows.map((r) => r.join('')), SPAL.slime, left, base - h);
      const fly = 2 + Math.round(t * 7), up = Math.round(Math.sin(Math.min(1, t * 2) * Math.PI) * 4);   // droplets
      [[-1, 0], [1, 0], [-1, 3], [1, 2]].forEach(([d, k]) => Pixel.px(g, k ? '#7b4fd6' : '#a884f3', Math.round((x + .5) * U + d * (w / 2 + fly + k)), base - 2 - up - (k ? 1 : 0), 2, 2));
      g.globalAlpha = 1; return;
    }
    const bob = reducedMotion() ? 0 : Math.floor(performance.now() / 400 + seed) % 2;
    Pixel.spr(g, SPR.slime, SPAL.slime, X, base - 10 + bob, dir > 0);
  },
  key(g, px, py) { Pixel.spr(g, SPR.key, SPAL.key, Math.round(px) + 2, Math.round(py) + 5); },
  gem(g, px, py) { Pixel.spr(g, SPR.gem, SPAL.gem, Math.round(px) + 4, Math.round(py) + 3); },
  // locked door: a light stone arch, dark wood with iron bands and a big gold lock, so it reads on any ground
  door(g, px, py) {
    const arch = (i, j) => (i - 6.5) ** 2 + (j - 6) ** 2;
    const rows = Pixel.shape(14, 16, (i, j) => i >= 0 && i < 14 && j < 16 && (j >= 6 || arch(i, j) <= 44),
      (i, j) => {
        const frame = i <= 2 || i >= 11 || (j < 8 && arch(i, j) > 20);
        if (frame) return i <= 2 || (j < 5 && i < 7) ? 's' : 'S';
        if (i >= 5 && i <= 8 && j >= 8 && j <= 11) return (i === 6 || i === 7) && j === 10 ? 'k' : j === 8 ? 'l' : 'L';
        if (j === 7 || j === 13) return 'b';
        return i === 6 || i === 7 ? 'p' : 'W';
      });
    Pixel.spr(g, rows, { o: '#1a1220', s: '#f4f6fb', S: '#a9b8d6', W: '#8a4f2c', p: '#5e3420', b: '#3a4466', L: '#fee761', l: '#ffffff', k: '#2b1b24' }, Math.round(px) + 1, Math.round(py));
  },
  flag(g, px, py) {
    const fx = Math.round(px) + 4, fy = Math.round(py) - 6, P = (c, x, y, w = 1, h = 1) => Pixel.px(g, c, x, y, w, h);
    P('#2b1b24', fx - 1, fy, 4, 22); P('#c0cbdc', fx, fy + 1, 1, 21); P('#8b9bb4', fx + 1, fy + 1, 1, 21);
    P('#2b1b24', fx - 1, fy - 4, 4, 4); P('#fee761', fx, fy - 3, 2, 2); P('#feae34', fx + 1, fy - 2, 1, 1);
    // a solid banner, waved by shifting whole columns (4 frames), so it never shows gaps
    const frame = reducedMotion() ? 0 : Math.floor(performance.now() / 160) % 4, L = 12;
    for (let i = 0; i < L; i++) {
      const h = Math.max(3, 8 - Math.floor(i / 2.4)), dy = i < 2 ? 0 : (Math.round(Math.sin(i * .75 - frame * Math.PI / 2) + .2) > 0 ? 1 : 0);
      const x = fx + 3 + i, y = fy + 1 + dy + Math.floor((8 - h) / 2);
      P('#2b1b24', x, y - 1, 1, h + 2);
      if (i < L - 1) { P('#e43b44', x, y, 1, h); P('#f6757a', x, y, 1, 1); P('#a22633', x, y + h - 1, 1, 1); }
    }
  },

  /* ---------- particles, rings, twinkles and motes: square pixels ---------- */
  effects(g, map, got) {
    const now = performance.now();
    app.particles = app.particles.filter((p) => p.life > 0);
    for (const p of app.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g ?? .006; p.life -= p.decay ?? .02;
      const s = Math.max(1, Math.min(3, Math.round((p.size ?? .07) * U * (.6 + .4 * p.life))));
      g.globalAlpha = Math.max(0, p.life); Pixel.px(g, p.color, Math.round(p.x * U - s / 2), Math.round(p.y * U - s / 2), s, s);
    }
    g.globalAlpha = 1;
    Art.rings = Art.rings.filter((r) => now - r.t0 < 450);
    for (const r of Art.rings) {           // landing / spring puffs: two short dashes moving apart
      const t = (now - r.t0) / 450, d = Math.round(U * (.2 + t * .7) * r.size), cx = Math.round(r.x * U), cy = Math.round(r.y * U);
      g.globalAlpha = (1 - t) * .8; Pixel.px(g, r.color, cx - d - 2, cy, 3, 1); Pixel.px(g, r.color, cx + d, cy, 3, 1);
    }
    g.globalAlpha = 1;
    map.items.forEach((it, i) => {        // gems twinkle now and then: a little plus
      if (it.t !== '*' || got & (1 << i)) return;
      const ph = ((now / 1000 + Art.hash(i, 3) * 3) % 2.2) / .5;
      if (ph >= 1) return;
      const cx = Math.round((it.x + .3 + Art.hash(i, 8) * .4) * U), cy = Math.round((it.y + .25) * U), a = Math.round(Math.sin(ph * Math.PI) * 2);
      Pixel.px(g, '#ffffff', cx - a, cy, a * 2 + 1, 1); Pixel.px(g, '#ffffff', cx, cy - a, 1, a * 2 + 1);
    });
  },
  ambient(g, name) {
    const kind = THEMES[name].motes.kind, color = PIXEL_THEMES[name].motes, n = reducedMotion() ? 6 : 14;
    if (Art.motes.length !== n || Art.motes.kind !== kind) {
      Art.motes = Array.from({ length: n }, (_, i) => ({ x: Art.hash(i, 1) * W, y: Art.hash(i, 2) * H, p: Art.hash(i, 3) * 6, s: .03 + Art.hash(i, 4) * .04 }));
      Art.motes.kind = kind;
    }
    const t = performance.now() / 1000;
    for (const m of Art.motes) {
      const vy = kind === 'snow' ? .012 : kind === 'embers' ? -.01 : -.004;
      m.y += vy * (reducedMotion() ? .4 : 1); m.x += Math.sin(t + m.p) * .004 + (kind === 'snow' ? .002 : .003);
      if (m.y > H + .2) m.y = -.2; if (m.y < -.2) m.y = H + .2; if (m.x > W + .2) m.x = -.2;
      g.globalAlpha = kind === 'embers' ? .5 + .4 * Math.sin(t * 3 + m.p) : .8;
      const s = kind === 'snow' && m.s > .05 ? 2 : 1;
      Pixel.px(g, color, Math.round(m.x * U), Math.round(m.y * U), s, s);
    }
    g.globalAlpha = 1;
  },
};

/* =====================================================================
   PixelFont — a tiny bitmap font (3×5, a few letters wider), placed pixel
   by pixel so text sits on the same grid as everything else.
   ===================================================================== */
const PixelFont = {
  glyphs: {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
    '/': ['..#', '..#', '.#.', '#..', '#..'], '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '!': ['#', '#', '#', '.', '#'],
    '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'], "'": ['#', '#', '.', '.', '.'], '?': ['##.', '..#', '.#.', '...', '.#.'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'], '·': ['.', '.', '#', '.', '.'], ':': ['.', '#', '.', '#', '.'], m: ['.....', '##.#.', '#.#.#', '#.#.#', '#.#.#'], x: ['...', '#.#', '.#.', '#.#', '...'],
  },
  width(s) { return [...s].reduce((a, ch) => a + (PixelFont.glyphs[ch] ? PixelFont.glyphs[ch][0].length : 2) + 1, -1); },
  // k = size of one font pixel in art pixels (2 = double size, still on the pixel grid)
  draw(g, s, x, y, col, k = 1) {
    let cx = x;
    for (const ch of s) {
      const gl = PixelFont.glyphs[ch];
      if (!gl) { cx += 3 * k; continue; }
      gl.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') Pixel.px(g, col, cx + i * k, y + j * k, k, k); });
      cx += (gl[0].length + 1) * k;
    }
  },
  outlined(g, s, x, y, col, k = 1, outline = '#2b1b24') {
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) PixelFont.draw(g, s, x + a * k, y + b * k, outline, k);
    PixelFont.draw(g, s, x, y, col, k);
  },
};

/* =====================================================================
   PixelCard — every card in the game is one 32×44 pixel picture, scaled up
   by a whole number: name at the top, the move's path in the middle. Extra
   squares from momentum are green (with a green border); the lucky card in
   Endless is gold. Turn, Wait, Echo and Climb get little pictures instead.
   ===================================================================== */
const CARD_W = 32, CARD_H = 44;
const PixelCard = {
  ink: (id) => (id.startsWith('walk') ? '#3e8948' : id === 'dash' ? '#b5262e' : id === 'hop' ? '#6a3fc4' : id === 'glide' ? '#2f6fb0' : ['turn', 'wait', 'echo'].includes(id) ? '#5a4a8a' : id === 'climb' ? '#7a5229' : '#c45a22'),
  canvas(id, d = CARDS[id], o = {}) {
    const c = document.createElement('canvas'); c.width = CARD_W; c.height = CARD_H; c.className = 'pcard';
    PixelCard.paint(c.getContext('2d'), id, d, o);
    return c;
  },
  // same picture as a data URL (for small inline pictures in hint text); cached
  urls: {},
  url(id, d = CARDS[id], o = {}) {
    const key = id + JSON.stringify(d.moves) + JSON.stringify(o);
    return PixelCard.urls[key] || (PixelCard.urls[key] = PixelCard.canvas(id, d, o).toDataURL());
  },
  paint(g, id, d, o) {
    const P = (c, x, y, w = 1, h = 1) => Pixel.px(g, c, x, y, w, h), W = CARD_W, H = CARD_H, ink = PixelCard.ink(id);
    const boosted = !!(d.combo || d.boosted), ring = boosted ? '#5cd18b' : o.lucky ? '#ffcc33' : '#2b1b24';
    const face = o.lucky ? '#fff6d6' : '#fbf7ee', frame = o.lucky ? '#f0cf6a' : '#e3d6b8';
    // outline with rounded corners (a second dark line inside a coloured ring)
    const rim = (col, k) => { P(col, 2 + k, k, W - 4 - 2 * k, 1); P(col, 2 + k, H - 1 - k, W - 4 - 2 * k, 1); P(col, k, 2 + k, 1, H - 4 - 2 * k); P(col, W - 1 - k, 2 + k, 1, H - 4 - 2 * k); P(col, 1 + k, 1 + k); P(col, W - 2 - k, 1 + k); P(col, 1 + k, H - 2 - k); P(col, W - 2 - k, H - 2 - k); };
    rim(ring, 0);
    const k = ring === '#2b1b24' ? 1 : 2;
    if (k === 2) rim('#2b1b24', 1);
    P(face, k + 1, k, W - 2 * k - 2, H - 2 * k); P(face, k, k + 1, W - 2 * k, H - 2 * k - 2);
    P(o.lucky ? '#f3e2b0' : '#ebdfc4', k + 1, H - k - 1, W - 2 * k - 2, 1);                 // a little shade at the bottom
    P(frame, 3, 3, W - 6, 1); P(frame, 3, H - 4, W - 6, 1); P(frame, 3, 3, 1, H - 6); P(frame, W - 4, 3, 1, H - 6);
    if (o.lucky) { P('#e0a91c', W - 8, 6, 3, 1); P('#e0a91c', W - 7, 5, 1, 3); }
    const name = (d.name || CARDS[id].name).toUpperCase(), nw = PixelFont.width(name);
    PixelFont.draw(g, name, Math.round((W - nw) / 2), 6, ink);
    const area = { x0: 4, y0: 13, x1: 27, y1: 39 };                      // picture area, inside the frame
    const m0 = d.moves[0];
    if (d.echo) return PixelCard.echoPic(P, ink, area);
    if (m0.type === 'turn') return PixelCard.turnPic(P, ink, area);
    if (m0.type === 'wait') return PixelCard.waitPic(P, ink, area);
    if (m0.type === 'climb') return PixelCard.path(P, ink, area, [[0, -1], [0, -1], [1, 0]], 0, 0, true);
    // the path: which steps are extra (from momentum)?
    const steps = d.moves.flatMap((m) => m.path || []), base = CARDS[id].moves.flatMap((m) => m.path || []).length, extra = Math.max(0, steps.length - base);
    const first = d.combo === 'Double jump' ? extra : 0, last = d.combo === 'Double jump' ? 0 : extra;
    PixelCard.path(P, ink, area, steps, first, last, false, id === 'dash');
  },
  // draw a path of steps on a little grid; `first`/`last` steps are momentum extras (green)
  path(P, ink, a, steps, first, last, climb, burst) {
    const pts = [{ x: 0, y: 0, extra: false }];
    let x = 0, y = 0;
    steps.forEach(([dx, dy], i) => { x += dx; y += dy; pts.push({ x, y, extra: i < first || i >= steps.length - last }); });
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x)), minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const cols = maxX - minX + 1, rows = maxY - minY + 1;
    const C = Math.max(3, Math.min(5, Math.floor((a.x1 - a.x0 + 2) / cols), Math.floor((a.y1 - a.y0 - 3) / rows)));   // squares shrink to fit, never past the frame
    const sq = C - 1, pw = cols * C - 1, ph = rows * C - 1, ox = a.x0 + Math.floor((a.x1 - a.x0 + 1 - pw) / 2), oy = a.y0 + Math.floor((a.y1 - a.y0 + 1 - ph) / 2);
    const at = (p) => [ox + (p.x - minX) * C, oy + (p.y - minY) * C], mid = Math.floor((sq - 1) / 2), lw = sq > 3 ? 2 : 1;
    if (climb) { const [wx, wy] = at({ x: 1, y: 0 }); P('#7a5229', wx, wy - C, sq, C + sq); P('#4a2c14', wx, wy - C, sq, 1); }   // the wall being climbed
    pts.forEach((p, i) => {
      const [X, Y] = at(p);
      if (!i) { P('#2b1b24', X, Y, sq, sq); P('#fee761', X + 1, Y + 1, sq - 2, sq - 2); }
      else if (!(climb && p.x === 1 && p.y === 0)) { P(p.extra ? '#5cd18b' : '#d8cdb2', X, Y, sq, sq); P(p.extra ? '#a6f0c0' : '#ece2ca', X + 1, Y + 1, sq - 2, sq - 2); }
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = at(pts[i]), [x1, y1] = at(pts[i + 1]);
      P(pts[i + 1].extra ? '#2f9e5c' : ink, Math.min(x0, x1) + mid, Math.min(y0, y1) + mid, Math.abs(x1 - x0) + lw, Math.abs(y1 - y0) + lw);
    }
    const end = pts[pts.length - 1], [lx, ly] = at(end);
    P('#2b1b24', lx, ly, sq, sq); P(end.extra ? '#5cd18b' : ink, lx + 1, ly + 1, sq - 2, sq - 2);
    if (burst) {     // Dash: an impact burst above and below its last square (it bowls patrollers over)
      P('#e43b44', lx + mid, ly - 3, 1, 2); P('#e43b44', lx + mid, ly + sq + 1, 1, 2);
      P('#e43b44', lx - 1, ly - 2); P('#e43b44', lx + sq, ly - 2); P('#e43b44', lx - 1, ly + sq + 1); P('#e43b44', lx + sq, ly + sq + 1);
    }
  },
  arrow(P, ink, x0, x1, y, dir) {          // a 2-pixel arrow from x0 to x1 with a head at the end
    P(ink, Math.min(x0, x1), y, Math.abs(x1 - x0), 2);
    for (let k = 0; k < 4; k++) P(ink, x1 - dir * k, y - 3 + k, 1, 8 - 2 * k);
  },
  turnPic(P, ink, a) { const cx = Math.round((a.x0 + a.x1) / 2); PixelCard.arrow(P, ink, cx - 8, cx + 7, 20, 1); PixelCard.arrow(P, ink, cx + 7, cx - 8, 30, -1); },
  waitPic(P, ink, a) {
    const cx = Math.round((a.x0 + a.x1) / 2), y = 17;
    P(ink, cx - 6, y, 13, 2); P(ink, cx - 6, y + 17, 13, 2);
    for (let k = 0; k < 7; k++) { const w = 11 - k * 2 < 1 ? 1 : 11 - k * 2; P(ink, cx - Math.floor(w / 2), y + 2 + k, 1, 1); P(ink, cx + Math.floor(w / 2), y + 2 + k, 1, 1); P(ink, cx - Math.floor(w / 2), y + 15 - k, 1, 1); P(ink, cx + Math.floor(w / 2), y + 15 - k, 1, 1); }
    P('#feae34', cx - 3, y + 4, 7, 1); P('#feae34', cx - 2, y + 5, 5, 1); P('#feae34', cx, y + 9, 1, 3); P('#feae34', cx - 2, y + 13, 5, 1); P('#feae34', cx - 3, y + 14, 7, 1);
  },
  echoPic(P, ink, a) {
    const cx = Math.round((a.x0 + a.x1) / 2), cy = 25, r = [[-2, -6, 5], [-4, -5, 2], [3, -5, 2], [-5, -4, 1], [5, -4, 1], [-6, -2, 1], [6, -2, 1], [-6, -1, 1], [-6, 0, 1], [-6, 1, 1], [-6, 2, 1], [6, 1, 1], [6, 2, 1], [-5, 3, 1], [5, 3, 1], [-4, 4, 2], [3, 4, 2], [-2, 5, 5]];
    r.forEach(([x, y, w]) => P(ink, cx + x, cy + y, w, 1));
    P(ink, cx + 5, cy - 2, 3, 1); P(ink, cx + 6, cy - 3, 1, 1); P('#fbf7ee', cx + 6, cy - 1, 1, 3);   // arrow head, with a gap in the ring
    const t = 'x2', tw = PixelFont.width(t);
    PixelCard.text(P, t, cx - Math.floor(tw / 2), cy - 2, ink);
  },
  text(P, s, x, y, col) {                  // PixelFont.draw for a P() painter
    let cx = x;
    for (const ch of s) { const gl = PixelFont.glyphs[ch]; if (!gl) { cx += 3; continue; } gl.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') P(col, cx + i, y + j); }); cx += gl[0].length + 1; }
  },
  // the ×n tag on a stack of matching cards
  badge(n) {
    const t = 'x' + n, w = PixelFont.width(t) + 4, c = document.createElement('canvas'); c.width = w; c.height = 9; c.className = 'pbadge';
    const g = c.getContext('2d'); Pixel.px(g, '#2b1b24', 0, 0, w, 9); Pixel.px(g, '#ffcc33', 1, 1, w - 2, 7); PixelFont.draw(g, t, 2, 2, '#2b1b24');
    return c;
  },
};

/* =====================================================================
   Pixel HUD — drawn straight onto the level (no box behind it), in the
   pixel font with a dark outline. Endless: timer line along the top,
   hearts, the gem meter and distance. Puzzles: gems, the key, and the
   turn count on levels with timed spikes.
   ===================================================================== */
const HUD_ICONS = {
  heart: ['.oo.oo.', 'oRRoRRo', 'oRRRRRo', '.oRRRo.', '..oRo..', '...o...'],
  gem: ['.ooooo.', 'oCwCCCo', 'oCCCBBo', '.oCBBo.', '..oBo..', '...o...'],
  key: ['.ooo.....', 'oYwYoooo.', 'oYoYYYYYo', 'oYYYooYoY', '.ooo..o.o'],
};
// k: size of one HUD pixel in art pixels: 2 on small screens (phones), so it stays readable
Pixel.hud = function (g, map, v, k = 1) {
  const P = Pixel.px, LW = W * U, fw = (s) => PixelFont.width(s) * k;
  const icon = (rows, x, y, pal) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (pal[r[i]]) P(g, pal[r[i]], x + i * k, y + j * k, k, k); });
  const heart = (x, y, full) => icon(HUD_ICONS.heart, x, y, { o: '#2b1b24', R: full ? '#e43b44' : '#5a6988' });
  const gem = (x, y) => icon(HUD_ICONS.gem, x, y, { o: '#2b1b24', C: '#2ce8f5', w: '#ffffff', B: '#0099db' });
  const ta = app.mode === 'time' && app.ta;
  if (ta) {
    const T = CONFIG.timeAttack, N = T.gemsPerHeart;
    if (ta.deadline || ta.paused != null) {           // the timer: a line along the top edge
      const left = ta.paused ?? (ta.deadline - performance.now()), frac = ta.deadline === Infinity ? 1 : Math.max(0, Math.min(1, left / ta.limitMs));
      P(g, '#2b1b24', 0, 0, LW, 3); P(g, '#5a6988', 0, 0, LW, 2);
      P(g, frac < .3 ? '#e43b44' : ta.deadline === Infinity ? '#5cd18b' : '#ffcc33', 0, 0, Math.round(LW * frac), 2);
    }
    const top = 4 + 2 * k;
    for (let h = 0; h < T.hearts; h++) heart(4 + h * 9 * k, top, h < ta.hearts);
    let x = 6 + T.hearts * 9 * k;
    gem(x, top);
    const meter = N ? `${ta.gemMeter || 0}/${N}` : String(ta.gems);
    PixelFont.outlined(g, meter, x + 10 * k, top + k, '#ffffff', k);
    if (N && ta.gemMeter >= N) heart(x + 12 * k + fw(meter), top, true);   // a spare heart, waiting
    const dist = `${ta.dist}m`;
    PixelFont.outlined(g, dist, LW - 4 - k - fw(dist), top + k, '#ffffff', k);
    if (ta.deadline === Infinity) { const f = `FREE ${T.freeCards - ta.plays}`; PixelFont.outlined(g, f, LW - 4 - k - fw(f), top + 9 * k, '#a6f0c0', k); }
    return;
  }
  let x = 4, top = 4;
  const total = gemTotal(map);
  if (total) { const t = `${gemCount(map, v)}/${total}`; gem(x, top); PixelFont.outlined(g, t, x + 10 * k, top + k, '#ffffff', k); x += 10 * k + fw(t) + 6 * k; }
  if (map.keyMask) {
    const has = hasAllKeys(map, v);
    g.globalAlpha = has ? 1 : .45; icon(HUD_ICONS.key, x, top + k, { o: '#2b1b24', Y: '#fee761', w: '#ffffff' }); g.globalAlpha = 1;
    x += 15 * k;
  }
  if (map.grid.some((r) => r.includes('t'))) PixelFont.outlined(g, `TURN ${v.turn}`, x, top + k, '#ffffff', k);   // only matters with timed spikes
};

/* =====================================================================
   PixelUI — pixel titles, button labels, icons and badges for the HTML
   parts of the game (message boxes, buttons). Each is a little canvas
   drawn in PixelFont and scaled up by a whole number.
   ===================================================================== */
const PIXEL_ICONS = {
  play: ['#....', '###..', '#####', '###..', '#....'], retry: ['.###.', '#...#', '#..##', '#...#', '.##..'], hint: ['.###.', '#####', '#####', '.###.', '.###.'],
  next: ['#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'], grid: ['##.##', '##.##', '.....', '##.##', '##.##'], pause: ['##.##', '##.##', '##.##', '##.##', '##.##'],
  redraw: ['###.#', '#...#', '#.#.#', '#...#', '#.###'], back: ['..#..', '.#...', '#####', '.#...', '..#..'], edit: ['...##', '..###', '.###.', '###..', '##...'],
  flag: ['#....', '####.', '####.', '#....', '#....'], gem: ['.###.', '#####', '.###.', '..#..', '.....'],
  infinity: ['.##.##.', '#..#..#', '#..#..#', '#..#..#', '.##.##.'],
  gear: ['..#.#..', '.#####.', '##...##', '.#...#.', '##...##', '.#####.', '..#.#..'],
  trash: ['.###.', '#####', '.#.#.', '.#.#.', '.###.'],
};
const PixelUI = {
  supported: (s) => [...s].every((ch) => ch === ' ' || PixelFont.glyphs[ch]),
  // a line of pixel text as a canvas, k screen pixels per pixel, with an optional 1-pixel outline
  text(s, col, k = 2, outline) {
    const pad = outline ? 1 : 0, c = document.createElement('canvas');
    c.width = PixelFont.width(s) + pad * 2; c.height = 5 + pad * 2; c.className = 'ptext';
    const g = c.getContext('2d');
    if (outline) PixelFont.outlined(g, s, pad, pad, col, 1, outline); else PixelFont.draw(g, s, 0, 0, col);
    c.style.width = c.width * k + 'px'; c.style.height = c.height * k + 'px';
    return c;
  },
  icon(name, col, k = 2) {
    const rows = PIXEL_ICONS[name], c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; c.className = 'picon';
    const g = c.getContext('2d');
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') Pixel.px(g, col, i, j); });
    c.style.width = c.width * k + 'px'; c.style.height = c.height * k + 'px';
    return c;
  },
  // pixel text wrapped onto lines no wider than maxW (in pixels), centred
  lines(s, col, k = 2, maxW = 40) {
    const out = [];
    for (const w of s.split(' ')) { const last = out[out.length - 1]; if (last && PixelFont.width(last + ' ' + w) <= maxW) out[out.length - 1] = last + ' ' + w; else out.push(w); }
    const c = document.createElement('canvas'), wid = Math.max(...out.map((l) => PixelFont.width(l)));
    c.width = wid; c.height = out.length * 7 - 2; c.className = 'ptext';
    const g = c.getContext('2d');
    out.forEach((l, i) => PixelFont.draw(g, l, Math.floor((wid - PixelFont.width(l)) / 2), i * 7, col));
    c.style.width = c.width * k + 'px'; c.style.height = c.height * k + 'px';
    return c;
  },
  // put pixel text into an element (falls back to plain text for characters the font can't draw)
  set(elm, s, col, k = 2, outline) {
    const up = s.toUpperCase(); elm.textContent = '';
    if (PixelUI.supported(up)) elm.appendChild(PixelUI.text(up, col, k, outline)); else elm.textContent = s;
    elm.setAttribute('aria-label', s);
    return elm;
  },
  // an icon-only pixel button (e.g. Back)
  iconButton(b, icon, label) {
    b.classList.add('pb'); b.textContent = ''; b.title = label; b.setAttribute('aria-label', label);
    b.appendChild(PixelUI.icon(icon, '#ffffff'));
    return b;
  },
  // which icon goes with a button label
  iconFor(label) {
    const l = label.toLowerCase();
    return /^(play|start|resume)/.test(l) ? 'play' : /hint/.test(l) ? 'hint' : /^next/.test(l) ? 'next' : /levels|menu/.test(l) ? 'grid'
      : /pause/.test(l) ? 'pause' : /redraw/.test(l) ? 'redraw' : /undo/.test(l) ? 'back' : /editor/.test(l) ? 'edit'
      : /reset|restart|replay|try again|again/.test(l) ? 'retry' : null;
  },
  // turn a button into a chunky pixel button with a pixel label (labels the font can't draw stay as text)
  button(b, label, primary) {
    const clean = label.replace(/^[^A-Za-z0-9]+\s*/, '').replace(/\s*[→←]$/, '').trim(), up = clean.toUpperCase();
    b.classList.add('pb'); if (primary) b.classList.add('pri');
    b.textContent = ''; b.title = clean; b.setAttribute('aria-label', clean);
    if (!PixelUI.supported(up)) { b.textContent = label; return b; }
    const col = primary ? '#2b1b24' : '#ffffff', ic = PixelUI.iconFor(clean);
    if (ic) b.appendChild(PixelUI.icon(ic, ic === 'hint' && !primary ? '#fee761' : col));
    b.appendChild(PixelUI.text(up, col));
    return b;
  },
};
