// Card Climber — art: themes, parallax backgrounds, tiles, springs, the patroller,
// items, shadows and particles. Everything is drawn with code (no image files).
// The player character is drawn in game.js (drawPlayer) and isn't touched here.
// Loaded after levels.js and before game.js.

/* =====================================================================
   THEMES — tweak colours here. Levels 1–9 meadow, 10–18 dusk canyon,
   19+ snowy peaks; Endless cycles through them every few hundred tiles.
   ===================================================================== */
const THEMES = {
  meadow: {
    sky: ['#79c3f2', '#d9f1ff'], sun: '#fff6c9',
    far: '#a7cfe6', farShape: 'hills', mid: '#86c784', midDark: '#6aae68', decor: 'bush',
    cloud: '#ffffff',
    cap: ['#6fcf6a', '#4fa64c'], dirt: ['#94613a', '#6c4425'], speck: '#7b5030', stone: '#b08a68',
    motes: { kind: 'pollen', color: '#fff3a6' },
  },
  canyon: {
    sky: ['#f0a06a', '#fde3c0'], sun: '#ffe2a8',
    far: '#de9a73', farShape: 'mesas', mid: '#c27b55', midDark: '#a5633f', decor: 'cactus',
    cloud: '#ffe9d6',
    cap: ['#d8b25a', '#b38a35'], dirt: ['#b0623f', '#81412a'], speck: '#934d31', stone: '#d48f6b',
    motes: { kind: 'embers', color: '#ffc86b' },
  },
  peaks: {
    sky: ['#9db7e6', '#eef4ff'], sun: '#ffffff',
    far: '#c9d6ef', farShape: 'mountains', mid: '#adc2e3', midDark: '#94abd2', decor: 'pine',
    cloud: '#ffffff',
    cap: ['#ffffff', '#d6e2f3'], dirt: ['#7d8398', '#5c6175'], speck: '#696f84', stone: '#a7adc2',
    motes: { kind: 'snow', color: '#ffffff' },
  },
};
const THEME_BANDS = [{ upTo: 9, theme: 'meadow' }, { upTo: 18, theme: 'canyon' }, { upTo: Infinity, theme: 'peaks' }];
const ENDLESS_THEME_ORDER = ['meadow', 'canyon', 'peaks'];
const ENDLESS_THEME_TILES = CONFIG.timeAttack.biomeLength || 150;   // Endless changes scenery every N tiles (set in config.js)
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Parallax strength. Endless: how fast each layer scrolls relative to the ground (0 = fixed, 1 = with the ground).
// Fixed screens: how far (in tiles, per tile the player is off-centre) the near layer eases with the player.
const PARALLAX = { far: .1, clouds: .18, near: .3, followPlayer: .06 };

const Art = {
  // deterministic pseudo-random 0..1 for a position, so textures don't flicker between frames
  hash(x, y = 0, k = 0) { const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); },
  shade(hex, amt) {        // lighten (amt > 0) or darken (amt < 0) a #rrggbb colour
    const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) : c) * amt)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  },

  /* ---------- which theme ---------- */
  levelNumber() {
    if (app.levelKey?.[0] === 'b') return +app.levelKey.slice(1) + 1;
    const m = /^(\d+)\./.exec(app.level?.name || '');
    return m ? +m[1] : 1;
  },
  themeName() {
    if (app.mode === 'time') return ENDLESS_THEME_ORDER[Math.floor((app.cam + W / 2) / ENDLESS_THEME_TILES) % 3];
    const n = Art.levelNumber();
    return THEME_BANDS.find((b) => n <= b.upTo).theme;
  },
  // Endless: each column belongs to a band; tiles use their own band's colours
  themeAtColumn(x) { return app.mode === 'time' ? THEMES[ENDLESS_THEME_ORDER[Math.floor(x / ENDLESS_THEME_TILES) % 3]] : THEMES[Art.themeName()]; },

  /* ---------- background: sky, sun, far + near scenery, clouds (parallax) ---------- */
  background(g, name, camX, px) {
    const th = THEMES[name], w = W * TS, h = H * TS, t = performance.now() / 1000;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // sun with a soft glow
    const sx = w * .82, sy = h * .2, glow = g.createRadialGradient(sx, sy, 0, sx, sy, TS * 2);
    glow.addColorStop(0, th.sun); glow.addColorStop(.2, th.sun + 'aa'); glow.addColorStop(1, th.sun + '00');
    g.fillStyle = glow; g.fillRect(sx - TS * 2, sy - TS * 2, TS * 4, TS * 4);
    // Parallax. Endless: layers scroll slower the further away they are. Fixed screens: the
    // background eases a hair to follow the player, just enough to feel deep.
    const target = REDUCED_MOTION || app.mode === 'time' ? 0 : (px - W / 2) * PARALLAX.followPlayer;
    Art.shiftNow += (target - Art.shiftNow) * .04;
    Art.layer(g, th, camX * PARALLAX.far + Art.shiftNow * .3, 'far');
    Art.clouds(g, th, camX * PARALLAX.clouds + Art.shiftNow * .5, t);
    Art.layer(g, th, camX * PARALLAX.near + Art.shiftNow, 'mid');
  },
  shiftNow: 0,
  layer(g, th, off, which) {
    const w = W * TS, h = H * TS, poly = (f, color) => {
      g.fillStyle = color; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w + 4; x += 4) g.lineTo(x, f(x / TS + off) * h);
      g.lineTo(w, h); g.closePath(); g.fill();
    };
    if (which === 'far') {
      const far = (wx) => {
        if (th.farShape === 'hills') return .52 + .07 * Math.sin(wx * .33 + 1) + .04 * Math.sin(wx * .9 + 2);
        if (th.farShape === 'mesas') { const s = Math.sin(wx * .28); return .5 + (s > .25 ? -.1 : 0) + (s > .7 ? -.04 : 0) + .015 * Math.sin(wx * 2.1); }
        const tri = Math.abs(((wx * .2) % 2 + 2) % 2 - 1);   // mountains: zig-zag peaks
        return .3 + .3 * tri + .04 * Math.sin(wx * .9);
      };
      poly(far, th.far);
      if (th.farShape === 'mountains') {    // snowcaps: the same outline, clipped to the upper slopes
        g.save(); g.beginPath(); g.moveTo(0, 0);
        for (let x = 0; x <= w + 6; x += 6) g.lineTo(x, h * (.38 + .025 * Math.sin((x / TS + off) * 2.3) + .012 * Math.sin((x / TS + off) * 5.1)));   // wavy snow line
        g.lineTo(w, 0); g.closePath(); g.clip();
        poly(far, '#ffffffc8');
        g.restore();
      }
      return;
    }
    // Near layer: a darker tree-line (bushes / rock spires / pines) that is part of the ridge's
    // outline, drawn first, then the hill over it, so the scenery always sits on the hill.
    const mid = (wx) => .72 + .04 * Math.sin(wx * .45 + 3) + .025 * Math.sin(wx * 1.3);
    const zone = (wx) => Math.max(0, Math.min(1, Math.sin(wx * .37 + 1) + .6 * Math.sin(wx * .11 + 4) - .1));   // where the clumps are
    const canopy = (wx) => {
      const z = zone(wx);
      if (!z) return 0;
      if (th.decor === 'bush') return z * (.035 * Math.abs(Math.sin(wx * 2.2)) + .02 * Math.abs(Math.sin(wx * 5.1 + 1)) + .015);
      const f = ((wx * (th.decor === 'pine' ? 1.6 : .8)) % 1 + 1) % 1;
      if (th.decor === 'pine') return z * Math.max(0, .1 * (1 - Math.abs(f - .5) * 4));
      return z * (f < .16 ? .08 : .01);                              // canyon: the odd rock spire
    };
    poly((wx) => mid(wx) - canopy(wx), th.midDark);
    poly((wx) => mid(wx) + .012, th.mid);
  },
  // Soft clouds: built once from feathered puffs (cached), then just drawn
  cloudCache: {},
  cloudSprite(i, color) {
    const dpr = window.devicePixelRatio || 1, key = `${i}|${color}|${TS}|${dpr}`;
    if (Art.cloudCache[key]) return Art.cloudCache[key];
    const cw = TS * 3.4, ch = TS * 1.4, c = document.createElement('canvas');
    c.width = cw * dpr; c.height = ch * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    for (let k = 0; k < 9; k++) {
      const x = cw * (.18 + .64 * Art.hash(i, k)), y = ch * (.5 + .18 * Art.hash(i, k + 9)), r = TS * (.38 + .32 * Art.hash(i, k + 20));
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color + 'f0'); gr.addColorStop(.5, color + '9a'); gr.addColorStop(1, color + '00');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // flatten and soften the underside
    g.globalCompositeOperation = 'destination-out';
    const fade = g.createLinearGradient(0, ch * .55, 0, ch * .95);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade; g.fillRect(0, 0, cw, ch);
    return (Art.cloudCache[key] = c);
  },
  clouds(g, th, off, t) {
    const span = W + 8;
    for (let i = 0; i < 5; i++) {
      const base = Art.hash(i, 1) * span, speed = .06 + Art.hash(i, 2) * .08, s = .7 + Art.hash(i, 5) * .5;
      const cx = ((base + (REDUCED_MOTION ? 0 : t * speed) - off) % span + span) % span - 4, cy = .3 + Art.hash(i, 4) * 2;
      g.globalAlpha = .75 + Art.hash(i, 6) * .2;
      g.drawImage(Art.cloudSprite(i % 4, th.cloud), cx * TS, cy * TS, TS * 3.4 * s, TS * 1.4 * s);
    }
    g.globalAlpha = 1;
  },

  /* ---------- tiles ---------- */
  isGround: (c) => c === '#',
  ground(g, map, x, y, th) {
    const px = x * TS, py = y * TS, at = (dx, dy) => tileAt(map, x + dx, y + dy);
    const solidAt = (dx, dy) => { const c = at(dx, dy); return c === '#' || c === 'I' || c === 'S' || c === '>' || c === '<' || (x + dx < 0 || x + dx >= map.w); };
    const grad = g.createLinearGradient(0, TS * 2, 0, H * TS);     // shaded by height across the level, so stacked tiles don't show seams
    grad.addColorStop(0, th.dirt[0]); grad.addColorStop(1, th.dirt[1]);
    g.fillStyle = grad; g.fillRect(px, py, TS + .5, TS + .5);
    // a couple of quiet speckles, and now and then a small stone
    g.globalAlpha = .45; g.fillStyle = th.speck;
    for (let k = 0; k < 2; k++) {
      g.beginPath(); g.ellipse(px + TS * (.18 + Art.hash(x, y, k) * .64), py + TS * (.45 + Art.hash(y, x, k + 5) * .45), TS * .045, TS * .03, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    if (Art.hash(x, y, 9) > .82) {
      const sx = px + TS * (.25 + Art.hash(x, y, 11) * .5), sy = py + TS * (.55 + Art.hash(x, y, 12) * .3);
      g.fillStyle = th.stone; g.beginPath(); g.ellipse(sx, sy, TS * .085, TS * .06, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff30'; g.beginPath(); g.ellipse(sx - TS * .02, sy - TS * .02, TS * .04, TS * .022, 0, 0, 7); g.fill();
    }
    // softer edges where the ground meets open air
    g.fillStyle = '#00000018';
    if (!solidAt(-1, 0)) g.fillRect(px, py, TS * .05, TS);
    if (!solidAt(1, 0)) g.fillRect(px + TS * .95, py, TS * .05, TS);
    if (!solidAt(0, 1) && y < H - 1) g.fillRect(px, py + TS * .92, TS, TS * .08);
    // grass (or snow) cap: a smooth band with a gentle wavy underside, rounded at the ends
    if (!solidAt(0, -1) && at(0, -1) !== '=') {
      const capH = TS * .2, l = !(at(-1, 0) === '#' && !solidAt(-1, -1)), r = !(at(1, 0) === '#' && !solidAt(1, -1));
      const d1 = TS * (.03 + Art.hash(x, y, 30) * .04), d2 = TS * (.03 + Art.hash(x, y, 31) * .04);
      g.fillStyle = 'rgba(0,0,0,.12)';                     // soft shadow the cap casts on the dirt
      g.beginPath(); g.moveTo(px, py + capH); g.quadraticCurveTo(px + TS * .25, py + capH + d1 + TS * .05, px + TS * .5, py + capH + TS * .02);
      g.quadraticCurveTo(px + TS * .75, py + capH + d2 + TS * .05, px + TS, py + capH); g.lineTo(px + TS, py + capH - 1); g.lineTo(px, py + capH - 1); g.fill();
      const cap = g.createLinearGradient(0, py, 0, py + capH + TS * .05);
      cap.addColorStop(0, th.cap[0]); cap.addColorStop(1, th.cap[1]);
      g.fillStyle = cap; g.beginPath();
      g.moveTo(px + (l ? TS * .08 : 0), py);
      g.lineTo(px + TS - (r ? TS * .08 : 0), py);
      if (r) g.quadraticCurveTo(px + TS, py, px + TS, py + capH * .6);
      g.lineTo(px + TS, py + capH);
      g.quadraticCurveTo(px + TS * .75, py + capH + d2, px + TS * .5, py + capH - TS * .01);
      g.quadraticCurveTo(px + TS * .25, py + capH + d1, px, py + capH);
      if (l) { g.lineTo(px, py + capH * .6); g.quadraticCurveTo(px, py, px + TS * .08, py); }
      g.closePath(); g.fill();
      g.fillStyle = '#ffffff38'; g.fillRect(px + (l ? TS * .08 : 0), py, TS - (l ? TS * .08 : 0) - (r ? TS * .08 : 0), TS * .035);   // light catching the top edge
      if (th.cap[0] !== '#ffffff' && Art.hash(x, y, 20) > .78) {     // the odd little tuft
        const tx = px + TS * (.25 + Art.hash(x, y, 21) * .5);
        g.fillStyle = th.cap[1];
        [-1, 0, 1].forEach((k) => { g.beginPath(); g.moveTo(tx + k * TS * .05 - TS * .025, py + 1); g.quadraticCurveTo(tx + k * TS * .07, py - TS * (k ? .06 : .09), tx + k * TS * .05 + TS * .025, py + 1); g.fill(); });
      }
    }
  },
  ice(g, map, x, y) {
    const px = x * TS, py = y * TS, gr = g.createLinearGradient(px, py, px + TS, py + TS);
    gr.addColorStop(0, '#e2f6ff'); gr.addColorStop(.55, '#a9dcf5'); gr.addColorStop(1, '#7fbfe3');
    g.fillStyle = gr; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#ffffffaa'; g.fillRect(px, py, TS, TS * .08); g.fillRect(px, py, TS * .07, TS);   // bevel light
    g.fillStyle = '#4f93bb55'; g.fillRect(px, py + TS * .92, TS, TS * .08); g.fillRect(px + TS * .93, py, TS * .07, TS);
    g.strokeStyle = '#ffffffd0'; g.lineWidth = Math.max(1.5, TS / 18); g.lineCap = 'round'; g.beginPath();
    g.moveTo(px + TS * .22, py + TS * .58); g.lineTo(px + TS * .48, py + TS * .3);
    g.moveTo(px + TS * .5, py + TS * .74); g.lineTo(px + TS * .66, py + TS * .56);
    g.stroke(); g.lineCap = 'butt';
  },
  platform(g, map, x, y) {
    const px = x * TS, py = y * TS, l = tileAt(map, x - 1, y) !== '=', r = tileAt(map, x + 1, y) !== '=';
    g.fillStyle = '#00000018'; g.fillRect(px, py + TS * .22, TS, TS * .06);    // shadow under the plank
    const gr = g.createLinearGradient(0, py, 0, py + TS * .22);
    gr.addColorStop(0, '#c48b4f'); gr.addColorStop(1, '#8a5a2e');
    g.fillStyle = gr;
    g.beginPath(); g.roundRect ? g.roundRect(px + (l ? TS * .04 : 0), py, TS - (l ? TS * .04 : 0) - (r ? TS * .04 : 0), TS * .22, [l ? TS * .06 : 0, r ? TS * .06 : 0, r ? TS * .06 : 0, l ? TS * .06 : 0]) : g.rect(px, py, TS, TS * .22); g.fill();
    g.strokeStyle = '#6e4622'; g.lineWidth = Math.max(1, TS / 40); g.beginPath();
    g.moveTo(px + TS * .1, py + TS * .08); g.lineTo(px + TS * .45, py + TS * .08); g.moveTo(px + TS * .55, py + TS * .14); g.lineTo(px + TS * .9, py + TS * .14); g.stroke();
    g.fillStyle = '#4a3a2c'; [.2, .8].forEach((f) => { g.beginPath(); g.arc(px + TS * f, py + TS * .11, TS * .025, 0, 7); g.fill(); });
    g.fillStyle = '#7a5229'; if (l) g.fillRect(px + TS * .12, py + TS * .22, TS * .07, TS * .14); if (r) g.fillRect(px + TS * .81, py + TS * .22, TS * .07, TS * .14);
  },
  spikes(g, x, y, kind, up) {
    const px = x * TS, py = y * TS, h = up ? .55 : .12;
    g.fillStyle = kind === 't' ? '#6b4a3a' : '#5a6070'; g.fillRect(px + TS * .04, py + TS * .9, TS * .92, TS * .1);   // base plate
    for (let i = 0; i < 3; i++) {
      const l = px + TS * (.06 + i * .3), m = l + TS * .15, rr = l + TS * .3, top = py + TS * (.9 - h);
      g.fillStyle = kind === 't' ? (up ? '#ffa45c' : '#b97a52') : '#e3e7ee'; g.beginPath(); g.moveTo(l, py + TS * .9); g.lineTo(m, top); g.lineTo(m, py + TS * .9); g.fill();
      g.fillStyle = kind === 't' ? (up ? '#d9772e' : '#93603f') : '#a9b0bd'; g.beginPath(); g.moveTo(m, top); g.lineTo(rr, py + TS * .9); g.lineTo(m, py + TS * .9); g.fill();
    }
    if (kind === 't') {      // little up/down badge so you can plan around the timing
      g.fillStyle = up ? '#d94b2b' : '#5b6b7a'; g.font = `bold ${Math.floor(TS * .22)}px system-ui`; g.textAlign = 'center';
      g.fillText(up ? '▲' : '▼', px + TS / 2, py + TS * .32);
    }
  },
  // a cactus: trunk with arms and little spines; stacked cacti join into one tall one
  cactus(g, map, x, y) {
    const px = x * TS, py = y * TS, above = tileAt(map, x, y - 1) === 'Y', below = tileAt(map, x, y + 1) === 'Y';
    const gr = g.createLinearGradient(px + TS * .32, 0, px + TS * .68, 0);
    gr.addColorStop(0, '#6fbf5f'); gr.addColorStop(1, '#3f8a3c');
    g.fillStyle = gr; g.strokeStyle = '#2d6a2c'; g.lineWidth = Math.max(1.2, TS / 26);
    const top = above ? py : py + TS * .12, bottom = py + TS;
    g.beginPath(); g.roundRect ? g.roundRect(px + TS * .33, top, TS * .34, bottom - top + (below ? 1 : 0), above ? 0 : [TS * .17, TS * .17, 0, 0]) : g.rect(px + TS * .33, top, TS * .34, bottom - top); g.fill(); g.stroke();
    if (!above) {           // arms on the top segment
      const arm = (dir, h) => {
        const ax = px + TS * (.5 + dir * .17), ay = py + TS * h;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + dir * TS * .18, ay); g.lineTo(ax + dir * TS * .18, ay - TS * .2);
        g.lineWidth = TS * .12; g.lineCap = 'round'; g.strokeStyle = '#4f9a4a'; g.stroke(); g.lineCap = 'butt';
      };
      arm(-1, .55); arm(1, .38);
    }
    g.strokeStyle = '#e9f3c8'; g.lineWidth = Math.max(1, TS / 40); g.beginPath();      // spines
    for (let k = 0; k < 4; k++) { const sy = py + TS * (.25 + k * .2); g.moveTo(px + TS * .33, sy); g.lineTo(px + TS * .27, sy - TS * .03); g.moveTo(px + TS * .67, sy + TS * .08); g.lineTo(px + TS * .73, sy + TS * .05); }
    g.stroke();
  },
  // a wooden signpost at each Endless rest stop, naming the biome you're entering
  sign(g, s) {
    const px = s.x * TS, py = s.y * TS, name = { meadow: 'Meadow', canyon: 'Dusk Canyon', peaks: 'Snowy Peaks' }[s.biome];
    g.fillStyle = '#7a5229'; g.fillRect(px + TS * .45, py + TS * .3, TS * .1, TS * .7);
    g.font = `bold ${Math.max(9, Math.floor(TS * .26))}px system-ui`; g.textAlign = 'center';
    const w = g.measureText(name).width + TS * .4;
    const gr = g.createLinearGradient(0, py - TS * .1, 0, py + TS * .4);
    gr.addColorStop(0, '#c48b4f'); gr.addColorStop(1, '#94612f');
    g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(px + TS / 2 - w / 2, py - TS * .12, w, TS * .46, TS * .08) : g.rect(px + TS / 2 - w / 2, py - TS * .12, w, TS * .46); g.fill();
    g.strokeStyle = '#6e4622'; g.lineWidth = Math.max(1, TS / 30); g.stroke();
    g.fillStyle = '#fff5df'; g.fillText(name, px + TS / 2, py + TS * .19);
  },
  // how squashed a spring is right now (it rings a little after firing)
  springSquash(x, y) {
    const hit = app.springHit;
    if (!hit || hit.x !== x || hit.y !== y) return 0;
    const ms = performance.now() - hit.t0;
    return ms > 700 ? 0 : Math.exp(-ms / 160) * Math.cos(ms / 45);
  },
  spring(g, x, y) {
    const px = x * TS, py = y * TS, q = Art.springSquash(x, y), top = py + TS * (.14 + .28 * Math.max(0, q) - .06 * Math.max(0, -q));
    g.fillStyle = '#4d5363'; g.beginPath(); g.roundRect ? g.roundRect(px + TS * .08, py + TS * .78, TS * .84, TS * .22, TS * .04) : g.rect(px + TS * .08, py + TS * .78, TS * .84, TS * .22); g.fill();
    g.fillStyle = '#6b7385'; g.fillRect(px + TS * .08, py + TS * .78, TS * .84, TS * .05);
    Art.coil(g, px + TS * .5, top + TS * .12, py + TS * .78, 'v');
    const pad = g.createLinearGradient(0, top, 0, top + TS * .16);
    pad.addColorStop(0, '#ff6a6a'); pad.addColorStop(1, '#c42f36');
    g.fillStyle = pad; g.beginPath(); g.roundRect ? g.roundRect(px + TS * .04, top, TS * .92, TS * .16, TS * .06) : g.rect(px + TS * .04, top, TS * .92, TS * .16); g.fill();
    g.fillStyle = '#ffffff70'; g.fillRect(px + TS * .14, top + TS * .03, TS * .4, TS * .03);
  },
  // a side spring: plate on the wall side, coil, and the red pad on the face (the arrow's side)
  sideSpring(g, x, y, face) {
    const px = x * TS, py = y * TS, q = Art.springSquash(x, y), comp = TS * (.28 * Math.max(0, q) - .06 * Math.max(0, -q));
    const plateX = face > 0 ? px : px + TS * .78, padX = face > 0 ? px + TS * .8 - comp : px + TS * .04 + comp;
    g.fillStyle = '#4d5363'; g.fillRect(plateX, py + TS * .06, TS * .22, TS * .88);
    g.fillStyle = '#6b7385'; g.fillRect(plateX + (face > 0 ? 0 : TS * .17), py + TS * .06, TS * .05, TS * .88);
    Art.coil(g, py + TS * .5, face > 0 ? plateX + TS * .22 : padX + TS * .16, face > 0 ? padX : plateX, 'h');
    const pad = g.createLinearGradient(padX, 0, padX + TS * .16, 0);
    pad.addColorStop(0, face > 0 ? '#c42f36' : '#ff6a6a'); pad.addColorStop(1, face > 0 ? '#ff6a6a' : '#c42f36');
    g.fillStyle = pad; g.beginPath(); g.roundRect ? g.roundRect(padX, py + TS * .04, TS * .16, TS * .92, TS * .06) : g.rect(padX, py + TS * .04, TS * .16, TS * .92); g.fill();
    // arrow on the pad
    g.fillStyle = '#ffffffcc'; g.beginPath();
    const ax = padX + TS * .08, ay = py + TS * .5;
    g.moveTo(ax + face * TS * .05, ay); g.lineTo(ax - face * TS * .03, ay - TS * .08); g.lineTo(ax - face * TS * .03, ay + TS * .08); g.fill();
  },
  coil(g, c, a, b, dir) {      // zig-zag spring coil between a and b, centred on c
    const n = 4, span = b - a, amp = TS * .2;
    g.strokeStyle = '#c9d0dc'; g.lineWidth = Math.max(2, TS / 13); g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const t = a + span * (i / (n * 2)), o = i === 0 || i === n * 2 ? 0 : (i % 2 ? amp : -amp);
      dir === 'v' ? (i ? g.lineTo(c + o, t) : g.moveTo(c + o, t)) : (i ? g.lineTo(t, c + o) : g.moveTo(t, c + o));
    }
    g.stroke();
    g.strokeStyle = '#8e97a8'; g.lineWidth = Math.max(1, TS / 30); g.stroke();
  },

  // Static tiles are drawn once into a cached image (fixed-size levels); Endless draws them live.
  cache: { key: '', canvas: null },
  staticTile(g, map, x, y, turn) {
    const c = map.grid[y][x], th = Art.themeAtColumn(x);
    if (c === '#') Art.ground(g, map, x, y, th);
    else if (c === 'I') Art.ice(g, map, x, y);
    else if (c === '=') Art.platform(g, map, x, y);
    else if (c === '^') Art.spikes(g, x, y, '^', true);
    else if (c === 'Y') Art.cactus(g, map, x, y);
  },
  tiles(g, map, x0, x1, turn) {
    if (map.w === W) {         // fixed screen: use (or build) the cached picture of the static tiles
      const dpr = window.devicePixelRatio || 1, key = map.grid.map((r) => r.join('')).join('') + TS + dpr + Art.themeName();
      if (Art.cache.key !== key) {
        const c = Art.cache.canvas || document.createElement('canvas');
        c.width = W * TS * dpr; c.height = H * TS * dpr;
        const cg = c.getContext('2d'); cg.setTransform(dpr, 0, 0, dpr, 0, 0); cg.clearRect(0, 0, W * TS, H * TS);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) Art.staticTile(cg, map, x, y, turn);
        Art.cache = { key, canvas: c };
      }
      g.drawImage(Art.cache.canvas, 0, 0, W * TS, H * TS);
    } else for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) Art.staticTile(g, map, x, y, turn);
    // moving parts are drawn every frame
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
      const c = map.grid[y][x];
      if (c === 't') Art.spikes(g, x, y, 't', turn % 2 === 1);
      else if (c === 'S') Art.spring(g, x, y);
      else if (c === '>' || c === '<') Art.sideSpring(g, x, y, c === '>' ? 1 : -1);
    }
  },
  grid(g, x0, x1) {             // faint planning grid
    g.strokeStyle = '#0000000b'; g.lineWidth = 1;
    for (let x = x0 + 1; x < x1; x++) { g.beginPath(); g.moveTo(x * TS + .5, 0); g.lineTo(x * TS + .5, H * TS); g.stroke(); }
    for (let y = 1; y < H; y++) { g.beginPath(); g.moveTo(x0 * TS, y * TS + .5); g.lineTo(x1 * TS, y * TS + .5); g.stroke(); }
  },

  /* ---------- shadows: a soft oval on whatever is underneath ---------- */
  shadow(g, map, crates, x, y, width) {
    const col = Math.round(x);
    let gy = Math.floor(y) + 1;
    while (gy < H && !(wall(map, col, gy) || tileAt(map, col, gy) === '=' || crates.some((c) => !c.gone && Math.round(c.x) === col && Math.round(c.y) === gy))) gy++;
    if (gy >= H) return;
    const dist = gy - (y + 1), a = Math.max(0, .28 - dist * .06), s = Math.max(.4, 1 - dist * .12);
    if (a <= 0) return;
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.beginPath(); g.ellipse((x + .5) * TS, gy * TS + TS * .02, TS * width * s * .5, TS * .08 * s, 0, 0, 7); g.fill();
  },

  /* ---------- things ---------- */
  crate(g, x, y) {
    const px = x * TS, py = y * TS, i = TS * .05;
    const gr = g.createLinearGradient(0, py, 0, py + TS);
    gr.addColorStop(0, '#d79a52'); gr.addColorStop(1, '#a8702f');
    g.fillStyle = gr; g.fillRect(px + i, py + i, TS - 2 * i, TS - 2 * i);
    g.strokeStyle = '#6b4416'; g.lineWidth = Math.max(1.5, TS / 16); g.strokeRect(px + i, py + i, TS - 2 * i, TS - 2 * i);
    g.strokeStyle = '#8a5a22'; g.lineWidth = Math.max(1, TS / 22);
    g.beginPath(); g.moveTo(px + i, py + TS * .5); g.lineTo(px + TS - i, py + TS * .5); g.stroke();
    g.strokeStyle = '#6b4416'; g.lineWidth = Math.max(1.5, TS / 14);
    g.beginPath(); g.moveTo(px + i * 2, py + TS - i * 2); g.lineTo(px + TS - i * 2, py + i * 2); g.stroke();
    g.fillStyle = '#4a3216'; [[.15, .15], [.85, .15], [.15, .85], [.85, .85]].forEach(([fx, fy]) => { g.beginPath(); g.arc(px + TS * fx, py + TS * fy, TS * .03, 0, 7); g.fill(); });
  },
  // The patroller: a glossy slime. Wobbles while idle, leans into its steps,
  // blinks now and then, and splats when squashed (squash 0..1).
  slime(g, x, y, dir, squash, stepT, seed) {
    const now = performance.now(), cx = (x + .5) * TS, base = (y + 1) * TS - TS * .02;
    const wob = squash >= 0 ? 0 : Math.sin(now / 260 + seed * 2) * .05;
    const sx = (squash >= 0 ? 1 + squash * .5 : 1 - wob) * (1 + Math.sin((stepT || 0) * Math.PI) * .08);
    const sy = squash >= 0 ? 1 - squash * .78 : 1 + wob;
    const w = TS * .8 * sx, h = TS * .6 * sy;
    g.save();
    if (squash >= 0) g.globalAlpha = 1 - Math.max(0, squash - .6) * 2.5;
    // body
    const gr = g.createLinearGradient(0, base - h, 0, base);
    gr.addColorStop(0, '#b487f0'); gr.addColorStop(1, '#6d3bbf');
    g.fillStyle = gr; g.strokeStyle = '#3d1c73'; g.lineWidth = Math.max(1.5, TS / 20);
    g.beginPath(); g.moveTo(cx - w / 2, base);
    g.bezierCurveTo(cx - w / 2, base - h * 1.15, cx + w / 2, base - h * 1.15, cx + w / 2, base);
    g.quadraticCurveTo(cx, base + TS * .04, cx - w / 2, base); g.fill(); g.stroke();
    // shine
    g.fillStyle = '#ffffff66'; g.beginPath(); g.ellipse(cx - w * .18, base - h * .7, w * .12, h * .1, -.5, 0, 7); g.fill();
    if (squash < 0) {
      const blink = (now + seed * 900) % 3100 < 110;
      const ex = cx + dir * w * .1, ey = base - h * .52;
      g.fillStyle = '#fff'; g.beginPath();
      g.ellipse(ex - w * .14, ey, TS * .075, blink ? TS * .012 : TS * .085, 0, 0, 7); g.ellipse(ex + w * .14, ey, TS * .075, blink ? TS * .012 : TS * .085, 0, 0, 7); g.fill();
      if (!blink) { g.fillStyle = '#1d1030'; g.beginPath(); g.arc(ex - w * .14 + dir * TS * .03, ey + TS * .01, TS * .04, 0, 7); g.arc(ex + w * .14 + dir * TS * .03, ey + TS * .01, TS * .04, 0, 7); g.fill(); }
      g.strokeStyle = '#1d1030'; g.lineWidth = Math.max(1.5, TS / 22); g.beginPath();
      g.moveTo(ex - w * .26, ey - TS * .12); g.lineTo(ex - w * .05, ey - TS * .07); g.moveTo(ex + w * .26, ey - TS * .12); g.lineTo(ex + w * .05, ey - TS * .07); g.stroke();
    }
    g.restore();
  },
  key(g, px, py) {
    const gr = g.createLinearGradient(px, py, px + TS, py + TS);
    gr.addColorStop(0, '#ffe58a'); gr.addColorStop(1, '#e0a91c');
    g.strokeStyle = '#8a6400'; g.fillStyle = gr; g.lineWidth = Math.max(1.5, TS / 18);
    g.beginPath(); g.arc(px + TS * .32, py + TS * .5, TS * .16, 0, 7); g.fill(); g.stroke();
    g.fillRect(px + TS * .46, py + TS * .45, TS * .38, TS * .1); g.strokeRect(px + TS * .46, py + TS * .45, TS * .38, TS * .1);
    g.fillRect(px + TS * .66, py + TS * .55, TS * .07, TS * .14); g.fillRect(px + TS * .77, py + TS * .55, TS * .07, TS * .1);
    g.fillStyle = '#8a6400'; g.beginPath(); g.arc(px + TS * .32, py + TS * .5, TS * .06, 0, 7); g.fill();
    g.fillStyle = '#ffffffaa'; g.beginPath(); g.arc(px + TS * .27, py + TS * .44, TS * .04, 0, 7); g.fill();
  },
  gem(g, px, py) {
    const cx = px + TS / 2, cy = py + TS / 2, r = TS * .27;
    const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    gr.addColorStop(0, '#a8f4ff'); gr.addColorStop(.5, '#4fd8e8'); gr.addColorStop(1, '#1f9fb3');
    g.fillStyle = gr; g.strokeStyle = '#13606d'; g.lineWidth = Math.max(1.5, TS / 20);
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * .8, cy - r * .2); g.lineTo(cx, cy + r); g.lineTo(cx - r * .8, cy - r * .2); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#ffffff80'; g.lineWidth = Math.max(1, TS / 40); g.beginPath(); g.moveTo(cx - r * .8, cy - r * .2); g.lineTo(cx + r * .8, cy - r * .2); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
    g.fillStyle = '#ffffffd0'; g.beginPath(); g.moveTo(cx - r * .35, cy - r * .3); g.lineTo(cx - r * .05, cy - r * .75); g.lineTo(cx + r * .05, cy - r * .3); g.fill();
  },
  door(g, px, py) {
    g.fillStyle = '#7d8292'; g.beginPath(); g.moveTo(px + TS * .12, py + TS); g.lineTo(px + TS * .12, py + TS * .32); g.arc(px + TS * .5, py + TS * .32, TS * .38, Math.PI, 0); g.lineTo(px + TS * .88, py + TS); g.fill();
    const gr = g.createLinearGradient(px, 0, px + TS, 0);
    gr.addColorStop(0, '#8a5a30'); gr.addColorStop(1, '#6b4322');
    g.fillStyle = gr; g.beginPath(); g.moveTo(px + TS * .2, py + TS); g.lineTo(px + TS * .2, py + TS * .34); g.arc(px + TS * .5, py + TS * .34, TS * .3, Math.PI, 0); g.lineTo(px + TS * .8, py + TS); g.fill();
    g.strokeStyle = '#4e3018'; g.lineWidth = Math.max(1, TS / 30); g.beginPath();
    g.moveTo(px + TS * .4, py + TS * .1); g.lineTo(px + TS * .4, py + TS); g.moveTo(px + TS * .6, py + TS * .1); g.lineTo(px + TS * .6, py + TS); g.stroke();
    g.fillStyle = '#3c3f48'; g.fillRect(px + TS * .2, py + TS * .38, TS * .6, TS * .05); g.fillRect(px + TS * .2, py + TS * .78, TS * .6, TS * .05);
    g.fillStyle = '#f2c230'; g.beginPath(); g.roundRect ? g.roundRect(px + TS * .39, py + TS * .52, TS * .22, TS * .18, TS * .03) : g.rect(px + TS * .39, py + TS * .52, TS * .22, TS * .18); g.fill();
    g.strokeStyle = '#f2c230'; g.lineWidth = Math.max(1.5, TS / 18); g.beginPath(); g.arc(px + TS * .5, py + TS * .52, TS * .07, Math.PI, 0); g.stroke();
    g.fillStyle = '#3c3f48'; g.fillRect(px + TS * .485, py + TS * .58, TS * .03, TS * .07);
  },
  flag(g, px, py) {
    g.fillStyle = '#5c6070'; g.fillRect(px + TS * .28, py + TS * .1, TS * .07, TS * .9);
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(px + TS * .315, py + TS * .09, TS * .06, 0, 7); g.fill();
    const t = performance.now() / 260;
    g.fillStyle = '#e8434b'; g.beginPath(); g.moveTo(px + TS * .35, py + TS * .13);
    for (let k = 0; k <= 6; k++) { const f = k / 6; g.lineTo(px + TS * (.35 + .52 * f), py + TS * (.13 + .02 * f) + Math.sin(t - f * 3) * TS * .035 * f); }
    for (let k = 6; k >= 0; k--) { const f = k / 6; g.lineTo(px + TS * (.35 + .52 * f), py + TS * (.43 - .13 * f) + Math.sin(t - f * 3) * TS * .035 * f); }
    g.closePath(); g.fill();
    g.fillStyle = '#ffffff30'; g.fillRect(px + TS * .37, py + TS * .16, TS * .25, TS * .05);
  },

  /* ---------- particles & effects (subtle) ---------- */
  rings: [],
  ring(x, y, color = '#ffffff', size = 1) { Art.rings.push({ x, y, color, size, t0: performance.now() }); },
  sparkle(g, x, y, s, a) {
    g.globalAlpha = a; g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .25, y); g.lineTo(x, y + s); g.lineTo(x - s * .25, y); g.closePath();
    g.moveTo(x - s, y); g.lineTo(x, y + s * .25); g.lineTo(x + s, y); g.lineTo(x, y - s * .25); g.closePath(); g.fill(); g.globalAlpha = 1;
  },
  // world-space effects: particles, spring/landing rings, gem twinkles
  effects(g, map, got) {
    const now = performance.now();
    app.particles = app.particles.filter((p) => p.life > 0);
    for (const p of app.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g ?? .006; p.life -= p.decay ?? .02;
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x * TS, p.y * TS, (p.size ?? .07) * TS * (.6 + .4 * p.life), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    Art.rings = Art.rings.filter((r) => now - r.t0 < 450);
    for (const r of Art.rings) {
      const t = (now - r.t0) / 450;
      g.strokeStyle = r.color; g.globalAlpha = (1 - t) * .7; g.lineWidth = Math.max(1.5, TS / 16) * (1 - t);
      g.beginPath(); g.ellipse(r.x * TS, r.y * TS, TS * (.2 + t * .7) * r.size, TS * (.08 + t * .2) * r.size, 0, 0, 7); g.stroke();
    }
    g.globalAlpha = 1;
    map.items.forEach((it, i) => {        // gems twinkle now and then
      if (it.t !== '*' || got & (1 << i)) return;
      const ph = ((now / 1000 + Art.hash(i, 3) * 3) % 2.2) / .5;
      if (ph < 1) Art.sparkle(g, (it.x + .25 + Art.hash(i, 8) * .5) * TS, (it.y + .25) * TS, TS * .12 * Math.sin(ph * Math.PI), Math.sin(ph * Math.PI));
    });
  },
  // screen-space ambient motes: pollen in the meadow, embers in the canyon, snow on the peaks
  motes: [],
  ambient(g, name) {
    const th = THEMES[name], kind = th.motes.kind, n = REDUCED_MOTION ? 6 : 14;
    if (Art.motes.length !== n || Art.motes.kind !== kind) {
      Art.motes = Array.from({ length: n }, (_, i) => ({ x: Art.hash(i, 1) * W, y: Art.hash(i, 2) * H, p: Art.hash(i, 3) * 6, s: .03 + Art.hash(i, 4) * .04 }));
      Art.motes.kind = kind;
    }
    const t = performance.now() / 1000;
    g.fillStyle = th.motes.color;
    for (const m of Art.motes) {
      const vy = kind === 'snow' ? .012 : kind === 'embers' ? -.01 : -.004;
      m.y += vy * (REDUCED_MOTION ? .4 : 1); m.x += Math.sin(t + m.p) * .004 + (kind === 'snow' ? .002 : .003);
      if (m.y > H + .2) m.y = -.2; if (m.y < -.2) m.y = H + .2; if (m.x > W + .2) m.x = -.2;
      g.globalAlpha = kind === 'embers' ? .5 + .4 * Math.sin(t * 3 + m.p) : .75;
      g.beginPath(); g.arc(m.x * TS, m.y * TS, m.s * TS, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  },
  vignette(g) {
    const w = W * TS, h = H * TS, vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,15,35,.22)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  },
  // a tiny screen shake for deaths and stomps (off if the device asks for reduced motion)
  shakeUntil: 0, shakeMag: 0,
  shake(mag, ms) { if (REDUCED_MOTION) return; Art.shakeMag = mag; Art.shakeUntil = performance.now() + ms; },
  shakeOffset() {
    const left = Art.shakeUntil - performance.now();
    if (left <= 0) return [0, 0];
    const m = Art.shakeMag * TS * Math.min(1, left / 120);
    return [(Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m];
  },
};
