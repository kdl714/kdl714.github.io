// Deckhop — the game itself: modes (Plan & Run, Endless, Roguelite),
// drawing, animation, cards UI, drag & drop, editor and wiring.

/* =====================================================================
   App state & helpers
   ===================================================================== */
const $ = (id) => document.getElementById(id);
const cv = $('cv');
let ctx = cv.getContext('2d');   // swapped for a small canvas while a pixel-art frame is drawn
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// player settings (Settings screen); `var` so art.js can see them too
var settings = Object.assign({ artStyle: CONFIG.artStyle || 'classic', speed: 1, hints: true, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches },
  store.get('cardclimber.settings', {}));
if (!settings.artStyleChosen) settings.artStyle = CONFIG.artStyle || 'classic';   // follow the default until the player picks a style
const saveSettings = () => store.set('cardclimber.settings', settings);
const clone = (o) => JSON.parse(JSON.stringify(o));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let uidSeq = 1;

const app = {
  custom: store.get('cardclimber.custom', []),
  levelKey: 'b0',          // 'b<i>' built-in, 'c<i>' custom
  level: null, map: null,
  mode: store.get('cardclimber.mode', CONFIG.turnMode),
  run: null,                // roguelite run state (Experiment 2)
  ta: null,                 // time attack state
  q: null,                  // shop-run roguelite state
  cam: 0,                   // camera x (tiles) for maps wider than the screen
  fails: 0, hintsUsed: 0, hintText: '', hintHtml: null, hintNext: null, hintReveal: 0,
  flash: null,              // floating text above the player
  state: null,
  view: null,               // what the renderer draws (animated)
  hand: [], seq: [],        // [{uid,id}]
  played: [], history: [],  // instant-mode
  cursor: 0,                // plan-mode: next card index when stepping
  running: false,
  gen: 0,                   // bumped when you leave a screen, so a run that's still animating stops
  editing: false, playtesting: false, paint: '#',
  particles: [],
};

function allLevels() {
  return [
    ...BUILTIN_LEVELS.map((l, i) => ({ key: 'b' + i, level: l })),
    ...app.custom.map((l, i) => ({ key: 'c' + i, level: l })),
  ];
}

function loadLevel(key, levelObj) {
  app.levelKey = key;
  app.level = clone(levelObj || allLevels().find((l) => l.key === key)?.level || BUILTIN_LEVELS[0]);
  app.level.cards = app.level.cards.filter((id) => CARDS[id]);
  app.hand = app.level.cards.map((id) => ({ uid: uidSeq++, id }));
  app.seq = []; app.played = []; app.history = [];
  app.fails = 0; app.hintsUsed = 0; app.hintText = ''; app.hintHtml = null; app.hintNext = null; app.hintReveal = 0; app.hintSols = null;
  resetRun();
  refreshLevelSelect();
}

// level sizes the editor offers (width × height in tiles)
const LEVEL_SIZES = [['Small', 12, 7], ['Medium', 16, 9], ['Large', 20, 11], ['Wide', 28, 11]];
function blankLevel(w, h) {
  return { name: 'My Level', map: [...Array(h - 2).fill('.'.repeat(w)), 'P' + '.'.repeat(w - 3) + 'G.', '#'.repeat(w)], cards: ['walk3'] };
}
// resize a level's map, keeping its bottom-left corner where it is (so the ground stays put)
function resizeLevel(level, w, h) {
  const rows = level.map.slice(-h).map((r) => r.padEnd(w, '.').slice(0, w));
  while (rows.length < h) rows.unshift('.'.repeat(w));
  level.map = rows;
}

function resetRun() {
  app.camHold = null;                        // wide levels: the camera follows the hero again
  app.map = parseLevel(app.level);
  if (app.mode === 'quest' && app.q) app.map.mods = Quest.mods();
  app.state = initialState(app.map);
  app.view = { ...clone(app.state), ox: 0, oy: 0 };
  app.cam = 0;
  app.cursor = 0; app.particles = [];
  hideBanner();
  renderDeck();
}

/* =====================================================================
   Animation — plays the event list from runCard on the view
   ===================================================================== */
const animSpeed = () => (app.mode === 'time' ? CONFIG.timeAttack.animSpeed : 1) / settings.speed;   // multiplies durations
const nap = (ms) => sleep(ms * animSpeed());
function tween(ms, fn) {
  ms *= animSpeed();
  const gen = app.gen;
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = (now) => {
      if (gen !== app.gen) return res();          // left the screen: stop here
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      t < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
}
const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------------------------------------------------------------------
// Fluid playback. The rules move in whole tiles; here we turn each card's
// run of moves into one continuous, curved motion (Catmull-Rom spline through
// the tiles), with walking at a steady pace and falls accelerating like
// gravity. Pickups, crate falls and the turn tick fire as the path reaches
// them instead of stopping the motion. Bumps, turns, waits, death and the
// win still play as their own little beats.
// ---------------------------------------------------------------------
const MOTION = new Set(['move', 'fall', 'push']);
const SLIME_DEATH_MS = 700;   // how long a squashed or bowled-over patroller stays on screen
const ALONG = new Set(['collect', 'tick', 'double', 'cfall', 'cgone', 'spring', 'stomp', 'smash', 'bumper', 'combo']);   // happen mid-motion
const deathText = (why) => (why === 'pit' ? 'Fell in a pit!' : why === 'enemy' ? 'Caught by a patroller!' : why === 'cactus' ? 'Ouch, a cactus!' : 'Spiked!');

async function animate(ev) {
  let i = 0;
  while (i < ev.length) {
    if (MOTION.has(ev[i].k)) {
      const run = [];
      while (i < ev.length && (MOTION.has(ev[i].k) || ALONG.has(ev[i].k))) run.push(ev[i++]);
      await glide(run);
    } else if (ev[i].k === 'emove') {
      const steps = [];                                  // all patrollers step together
      while (i < ev.length && ev[i].k === 'emove') steps.push(ev[i++]);
      await patrol(steps);
    } else await beat(ev[i++]);
  }
}

const groundBelow = (x, y) => y + 1 >= app.map.h ? false : wall(app.map, x, y + 1) || tileAt(app.map, x, y + 1) === '=' || app.view.crates.some((c) => !c.gone && Math.round(c.x) === x && Math.round(c.y) === y + 1);

function glide(run) {
  const v = app.view, speed = animSpeed(), gen = app.gen;
  const pts = [{ x: v.x, y: v.y }], segs = [], along = [];   // along[j]: events to fire on reaching point j
  let falls = 0;
  for (const e of run) {
    if (!MOTION.has(e.k)) { (along[pts.length - 1] = along[pts.length - 1] || []).push(e); continue; }
    const from = pts[pts.length - 1];
    let ms;
    if (e.k === 'fall') { falls++; ms = CONFIG.gravityMs * (Math.sqrt(falls) - Math.sqrt(falls - 1)); }
    else { falls = 0; ms = CONFIG.stepMs * (e.k === 'push' ? 1.3 : e.y < from.y ? .95 : 1); }
    segs.push({ ms: ms * speed, kind: e.k, push: e.k === 'push' ? e : null, slide: !!e.slide,
      ground: e.k !== 'fall' && e.y === from.y && groundBelow(e.x, e.y) && groundBelow(from.x, from.y) });
    pts.push({ x: e.x, y: e.y });
  }
  // the top of a rise slows down, like gravity pulling against it
  segs.forEach((g, j) => {
    const up = pts[j + 1].y < pts[j].y, nextUp = segs[j + 1] && pts[j + 2].y < pts[j + 1].y;
    if (up && !nextUp) { g.ms *= 1.25; g.apex = true; }
    else if (up && j > 0 && !(pts[j].y < pts[j - 1].y)) g.ms *= .8;     // quick take-off
  });
  const total = segs.reduce((a, g) => a + g.ms, 0);
  // Rounded corners: wherever the path changes direction, swap the sharp corner
  // for a quadratic curve ~half a tile across (it cuts the corner by ~1/6 tile).
  const R = .45, dirOf = (a, b) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) });
  const corner = (j) => {
    if (j <= 0 || j >= pts.length - 1) return null;
    const di = dirOf(pts[j - 1], pts[j]), dout = dirOf(pts[j], pts[j + 1]);
    if (di.x === dout.x && di.y === dout.y) return null;
    const P = pts[j];
    return { A: { x: P.x - di.x * R, y: P.y - di.y * R }, P, B: { x: P.x + dout.x * R, y: P.y + dout.y * R } };
  };
  const bez = (c, u) => ({ x: (1 - u) * (1 - u) * c.A.x + 2 * u * (1 - u) * c.P.x + u * u * c.B.x, y: (1 - u) * (1 - u) * c.A.y + 2 * u * (1 - u) * c.P.y + u * u * c.B.y });
  // Mid-air sideways stretches (e.g. across a gap) get a gentle arc on top,
  // so a long jump reads as a jump rather than a flat glide.
  const hump = [];
  for (let j = 0; j < segs.length;) {
    const flatAir = (q) => segs[q] && !segs[q].ground && pts[q + 1].y === pts[q].y;
    if (!flatAir(j)) { j++; continue; }
    let k = j; while (flatAir(k)) k++;
    for (let q = j; q < k; q++) hump[q] = { start: j, len: k - j, h: Math.min(.45, .2 + .08 * (k - j)) };
    j = k;
  }
  const at = (j, t) => {
    const a = pts[j], b = pts[j + 1], cs = corner(j), ce = corner(j + 1);
    let p;
    if (cs && t < R) p = bez(cs, .5 + .5 * t / R);                     // leaving the previous corner
    else if (ce && t > 1 - R) p = bez(ce, .5 * (t - (1 - R)) / R);     // entering the next one
    else p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const hm = hump[j];
    if (hm) p.y -= hm.h * Math.sin(Math.PI * (j - hm.start + t) / hm.len);
    return p;
  };
  const fire = (j) => {
    const evs = along[j]; along[j] = null;
    if (!evs) return;
    const drops = {};
    for (const e of evs) {
      if (e.k === 'cfall') drops[e.i] = e;            // a crate falling several tiles: one smooth drop
      else beatNow(e);
    }
    for (const i in drops) dropCrate(+i, drops[i].y);
  };
  fire(0);
  return new Promise((resolve) => {
    const t0 = performance.now();
    let lastSeg = -1, prev = { x: v.x, y: v.y, t: t0 };
    const frame = (now) => {
      if (gen !== app.gen) return resolve();      // left the screen: stop here
      let el = Math.min(total, now - t0), j = 0;
      while (j < segs.length - 1 && el > segs[j].ms) { el -= segs[j].ms; j++; }
      for (let q = lastSeg + 1; q <= j; q++) if (q > 0) {          // reached point q
        fire(q);
        if (!segs[q - 1].ground && segs[q].ground) land();          // came down onto solid ground
      }
      lastSeg = Math.max(lastSeg, j);
      const g = segs[j];
      let t = g.ms ? Math.min(1, el / g.ms) : 1;
      if (g.apex) t = 1 - (1 - t) * (1 - t);                                     // slowing at the top of a rise
      else if (j === segs.length - 1 && g.ground) t = 1 - (1 - t) * (1 - t);     // ease to a stop when walking
      const p = at(j, t);
      v.x = p.x; v.y = p.y;
      if (g.push) { const c = v.crates[g.push.i]; c.x = g.push.cx - Math.sign(g.push.cx - g.push.x) * (1 - t); }
      if (g.ground) v.bob = (v.bob || 0) + Math.abs(p.x - prev.x) * Math.PI;   // footsteps
      if (g.slide && Math.random() < .6) app.particles.push({ x: p.x + .5 - v.dir * .3, y: p.y + .95, vx: -v.dir * (.01 + Math.random() * .02), vy: -.02 - Math.random() * .02, life: .7, color: '#eaf8ff', size: .045 });
      const dt = Math.max(1, now - prev.t) / 1000;
      v.vx = (p.x - prev.x) / dt; v.vy = (p.y - prev.y) / dt;
      v.air = !g.ground;
      prev = { x: p.x, y: p.y, t: now };
      if (now - t0 < total) return requestAnimationFrame(frame);
      const end = pts[pts.length - 1];
      v.x = end.x; v.y = end.y; v.vx = v.vy = 0; v.air = false;
      fire(pts.length - 1);
      if (!segs[segs.length - 1].ground && end.y < app.map.h && groundBelow(end.x, end.y)) land();
      resolve();
    };
    requestAnimationFrame(frame);
  });
}

function land() {
  const v = app.view;
  v.landT = performance.now();
  Art.ring(v.x + .5, v.y + 1, '#ffffff', .8);
  for (let i = 0; i < 8; i++) {      // a puff of dust at the feet
    const side = i % 2 ? 1 : -1;
    app.particles.push({ x: v.x + .5 + side * .2, y: v.y + .95, vx: side * (.02 + Math.random() * .03), vy: -Math.random() * .03, life: .6, color: '#d9c7a3', size: .05 });
  }
}

function dropCrate(i, toY) {
  const c = app.view.crates[i], fy = c.y, n = Math.max(1, toY - fy);
  tween(CONFIG.gravityMs * Math.sqrt(n), (t) => { c.y = fy + (toY - fy) * t * t; }).then(() => { c.y = toY; });
}

function patrol(steps) {
  const v = app.view, from = steps.map((e) => ({ ...v.enemies[e.i] }));
  steps.forEach((e) => { v.enemies[e.i].dir = e.dir; });
  return tween(CONFIG.stepMs * .9, (t) => {
    steps.forEach((e, k) => { const en = v.enemies[e.i]; en.x = from[k].x + (e.x - from[k].x) * t; en.step = t; });
  }).then(() => steps.forEach((e) => { v.enemies[e.i].x = e.x; }));
}

// Events that just happen (no waiting)
function beatNow(e) {
  const v = app.view;
  if (e.k === 'tick') v.turn = e.turn;
  else if (e.k === 'combo') {
    app.flash = { text: e.name + '!', t0: performance.now() };
    if (app.mode === 'time' && app.ta) app.ta.combos = (app.ta.combos || 0) + 1;
  } else if (e.k === 'spring') {
    app.springHit = { x: e.x, y: e.y, t0: performance.now() }; app.flash = { text: 'Boing!', t0: performance.now() };
    Art.ring(e.x + .5, e.y + .1, '#ffffff', 1.2);
  } else if (e.k === 'bumper') {            // side spring: pad squashes, you turn and fly
    app.springHit = { x: e.tx, y: e.ty, t0: performance.now() }; app.flash = { text: 'Boing!', t0: performance.now() };
    v.dir = e.dir; Art.ring(e.tx + .5 - e.dir * .4, e.ty + .5, '#ffffff', 1);
  } else if (e.k === 'smash') {           // a Dash bowls a patroller over: it tumbles away
    const en = v.enemies[e.i]; en.dead = true; en.deadT = performance.now(); en.deadKind = 'dash'; en.flyDir = e.dir;
    for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2; app.particles.push({ x: e.x + .5 - e.dir * .3, y: e.y + .55, vx: Math.cos(a) * .05 + e.dir * .02, vy: Math.sin(a) * .05 - .02, life: 1, color: k % 3 ? '#ffffff' : '#9b6ae0', size: .07, decay: .035 }); }
    app.flash = { text: 'Bowled over!', t0: performance.now() }; Art.shake(.06, 180);
  } else if (e.k === 'stomp') {
    const en = v.enemies[e.i]; en.dead = true; en.deadT = performance.now(); en.deadKind = 'stomp';
    for (let k = 0; k < 10; k++) { const a = Math.PI + Math.random() * Math.PI; app.particles.push({ x: e.x + .5, y: e.y + .9, vx: Math.cos(a) * .05, vy: Math.sin(a) * .06, life: 1, color: '#9b6ae0', size: .06, decay: .03 }); }
    app.flash = { text: 'Squash!', t0: performance.now() }; Art.shake(.05, 160);
  }
  else if (e.k === 'cgone') v.crates[e.i].gone = true;
  else if (e.k === 'cfall') dropCrate(e.i, e.y);
  else if (e.k === 'double') app.flash = { text: 'Head Start: ×2', t0: performance.now() };
  else if (e.k === 'collect') {
    v.got |= 1 << e.i;
    burst(e.x, e.y, e.t === 'K' ? '#ffcc33' : '#4fd8e8');
    app.flash = { text: e.t === 'K' ? 'Got the key!' : 'Gem!', t0: performance.now() };
  }
}

// Events that are their own little moment
async function beat(e) {
  const v = app.view;
  if (ALONG.has(e.k)) return beatNow(e);
  if (e.k === 'bump') {
    await tween(CONFIG.stepMs * 1.1, (t) => { const k = Math.sin(t * Math.PI) * .18; v.ox = e.dx * k; v.oy = e.dy * k; });
    v.ox = v.oy = 0; v.landT = performance.now() - 80;     // a little wobble from the knock
  } else if (e.k === 'turn') {
    await tween(150, (t) => { v.flip = Math.abs(1 - 2 * t); if (t >= .5) v.dir = e.dir; });
    v.flip = 1; v.dir = e.dir;
  } else if (e.k === 'wait') {
    await tween(CONFIG.stepMs * 2.2, (t) => { v.oy = -Math.abs(Math.sin(t * Math.PI * 2)) * .1; });
    v.oy = 0;
  } else if (e.k === 'shield') {
    app.flash = { text: 'Spike Guard!', t0: performance.now() }; burst(e.x, e.y, '#4fd8e8');
    await nap(CONFIG.stepMs);
  } else if (e.k === 'locked') {
    app.flash = { text: 'Locked — find the key', t0: performance.now() };
    await nap(CONFIG.stepMs);
  } else if (e.k === 'echo') {
    app.flash = { text: e.of ? 'Echo!' : 'Echo: nothing to repeat', t0: performance.now() };
    await nap(CONFIG.stepMs * 1.2);
  } else if (e.k === 'die') {
    v.status = 'dead'; Art.shake(.08, 260);
    burst(e.x, Math.min(e.y, app.map.h - 1), '#ff6b6b');
    await tween(260, (t) => { v.ox = Math.sin(t * Math.PI * 6) * .08 * (1 - t); });   // a shudder
    v.ox = 0;
    await nap(250);
  } else if (e.k === 'win') {
    v.status = 'won';
    burst(e.x, e.y, '#ffcc33'); burst(e.x, e.y, '#5cd18b'); burst(e.x, e.y, '#4fd8e8'); burst(e.x, e.y, '#ff7aa2');
    await tween(420, (t) => { v.oy = -Math.sin(t * Math.PI) * .6; });          // a hop of joy
    v.oy = 0; v.landT = performance.now();
    await nap(150);
  }
}

async function playCard(id) {
  const r = runCard(app.map, app.state, id), gen = app.gen;
  await animate(r.ev);
  if (gen !== app.gen) return 'aborted';           // you left mid-run; the new screen owns the state now
  app.state = r.state;
  Object.assign(app.view, { x: r.state.x, y: r.state.y, dir: r.state.dir, turn: r.state.turn, status: r.state.status, got: r.state.got, crates: clone(r.state.crates),
    enemies: (r.state.enemies || []).map((e, i) => { const was = app.view.enemies?.[i]; return { ...e, deadT: was?.deadT, deadKind: was?.deadKind, flyDir: was?.flyDir }; }) });
  return r.state.status;
}

/* =====================================================================
   Controllers — one per turn mode
   ===================================================================== */
// Plan & Run sequence = fixed slots (one per card in the level). app.seq may
// contain nulls (empty slots); Play needs the cards to be contiguous from slot 1.
const Slots = {
  filled: () => app.seq.filter(Boolean),
  lastFilled: () => app.seq.map(Boolean).lastIndexOf(true),
  gap() { const last = Slots.lastFilled(); for (let i = 0; i < last; i++) if (!app.seq[i]) return i; return -1; },
  trim() { while (app.seq.length && !app.seq[app.seq.length - 1]) app.seq.pop(); },
  firstEmpty() { return app.seq.filter(Boolean).length; },
  // The plan is a list: insert a card at position i (the cards after it move along one).
  place(card, i) {
    const s = app.seq;
    for (let k = s.length - 1; k >= 0; k--) if (!s[k]) s.splice(k, 1);    // never any holes
    s.splice(Math.max(0, Math.min(s.length, i)), 0, card);
  },
};

const Plan = {
  clickHand(uid, at = Slots.firstEmpty()) {
    if (app.running) return;
    const i = app.hand.findIndex((c) => c.uid === uid);
    Slots.place(app.hand.splice(i, 1)[0], at);
    if (app.cursor) resetRun(); else renderDeck();
  },
  moveTo(uid, at) {
    if (app.running) return;
    const i = app.seq.findIndex((c) => c && c.uid === uid), card = app.seq[i];
    app.seq.splice(i, 1);                     // `at` already counts the other cards only
    Slots.place(card, at);
    if (app.cursor || app.state.status !== 'playing') resetRun(); else renderDeck();
  },
  // tapping a planned card takes it back to your hand; the cards after it slide along to close the gap
  clickSeq(uid) {
    if (app.running) return;
    const i = app.seq.findIndex((c) => c && c.uid === uid);
    app.hand.push(app.seq.splice(i, 1)[0]);   // back to the end of your hand (or onto its matching stack)
    if (app.cursor) resetRun(); else renderDeck();
  },
  async play() {
    if (app.running || !Slots.filled().length) return;
    app.camHold = null;                      // stop looking around: follow the hero
    if (Slots.gap() >= 0) { renderDeck(); return; }      // an empty slot between cards: fill it first
    Slots.trim();
    hideBanner();
    if (app.cursor || app.state.status !== 'playing') resetRun();
    const gen = app.gen;
    while (gen === app.gen && app.cursor < app.seq.length && await Plan.step(true) === 'playing') await sleep(CONFIG.pauseBetweenCards);
  },
  async step(fromPlay) {
    if (app.running && !fromPlay) return;
    if (app.state.status !== 'playing') resetRun();
    if (app.cursor >= app.seq.length) return;
    app.running = true; renderDeck();
    const status = await playCard(app.seq[app.cursor].id);
    if (status === 'aborted') return status;
    app.cursor++; app.running = false;
    finishCheck(status, app.cursor >= app.seq.length, app.hand.length);
    renderDeck();
    return status;
  },
  // Reset = start the level over: cards back in your hand, character back at the start
  reset() { if (app.running) return; app.hand.push(...Slots.filled()); app.seq = []; app.hand.sort((a, b) => a.uid - b.uid); resetRun(); },
  actions() {
    return [
      ['▶ Play', 'primary', Plan.play, !Slots.filled().length || Slots.gap() >= 0 || app.running],
      ['↺ Reset', '', Plan.reset, app.running || (!Slots.filled().length && !app.cursor && app.state.status === 'playing')],
      ...(CONFIG.features.hints && settings.hints && app.fails > 0 ? [['💡 Hint', '', Hints.next, app.running]] : []),
    ];
  },
};

// Hints (Plan & Run): unlocked after a failed run; free to use.
// First hint is the level's own nudge (if it has one); after that, compare
// the player's sequence with the closest solution and reveal one more card.
const Hints = {
  available: () => CONFIG.features.hints && settings.hints && app.mode === 'plan' && app.fails > 0 && !app.running,
  next() {
    if (!Hints.available()) return;
    app.hintsUsed++;
    if (app.hintsUsed === 1 && app.level.hint) { app.hintText = app.level.hint; app.hintHtml = null; renderDeck(); return; }
    if (!app.hintSols) app.hintSols = solve(app.level, 2000).solutions.sort((a, b) => a.length - b.length);
    const sols = app.hintSols;
    if (!sols.length) { app.hintText = "These cards can't reach the flag — the level may need editing."; renderDeck(); return; }
    const seq = app.seq.map((c) => c && c.id);
    const prefix = (sol) => { let k = 0; while (k < seq.length && k < sol.length && sol[k] === seq[k]) k++; return k; };
    const sol = sols.reduce((best, x) => (prefix(x) > prefix(best) ? x : best), sols[0]);
    const k = prefix(sol);
    app.hintReveal = Math.min(sol.length, Math.max(k + 1, app.hintReveal + 1));
    const shown = sol.slice(0, app.hintReveal).map(cardChip);
    app.hintHtml = (k > 1 ? `Your first ${k} cards are right. ` : k ? 'Your first card is right. ' : seq.length ? 'Your first card is off. ' : '')
      + `A working start: ${shown.join(' → ')}${app.hintReveal < sol.length ? ' → …' : ' (that\'s the whole solution)'}`;
    app.hintText = 'cards';
    app.hintNext = sol[k] || null;
    renderDeck();
  },
};

const Instant = {
  async clickHand(uid) {
    if (app.running || app.state.status !== 'playing') return;
    app.history.push({ state: { ...app.state }, hand: [...app.hand], played: [...app.played] });
    const i = app.hand.findIndex((c) => c.uid === uid);
    const card = app.hand.splice(i, 1)[0];
    app.played.push(card);
    app.running = true; renderDeck();
    const status = await playCard(card.id);
    app.running = false;
    finishCheck(status, !app.hand.length, 0);
    renderDeck();
  },
  clickSeq() {},
  undo() {
    if (app.running || !app.history.length) return;
    const h = app.history.pop();
    app.state = h.state; app.hand = h.hand; app.played = h.played;
    app.view = { ...clone(app.state), ox: 0, oy: 0 }; app.particles = [];
    hideBanner(); renderDeck();
  },
  restart() {
    if (app.running) return;
    app.hand.push(...app.played); app.played = []; app.history = [];
    app.hand.sort((a, b) => a.uid - b.uid);
    resetRun();
  },
  actions() {
    return [
      ['↶ Undo', '', Instant.undo, app.running || !app.history.length],
      ['↺ Restart', '', Instant.restart, app.running || !app.played.length],
    ];
  },
};
// Endless (Time Attack): endless runner. Cards come from a weighted random pool; you
// have a few seconds per pick (less the further you get). Too slow or a
// fatal move costs a heart; dying puts you back where you were before the card.
const TimeAttack = {
  start() {
    const T = CONFIG.timeAttack;
    app.level = { name: 'Endless', map: [], cards: [] }; app.levelKey = 'time';
    document.body.classList.remove('paused');
    app.map = makeEndlessMap();
    app.map.start.y = app.map.grid.findIndex((r) => r[1] === '#') - 1;
    app.state = initialState(app.map);
    app.view = { ...clone(app.state), ox: 0, oy: 0 }; app.cam = 0; app.particles = [];
    app.ta = { hearts: T.hearts, dist: 0, gems: 0, deadline: null, limitMs: 0, paused: null, over: false, plays: 0, nextHeart: T.heartEvery,
      next: TimeAttack.pick(), band: 0, gemMeter: 0 };
    $('hand').style.setProperty('--hand', T.handSize);
    $('hand').style.setProperty('--pic', T.handSize >= 5 ? .92 : 1.25);   // card pictures sized to fit the row
    app.hand = []; app.played = []; app.seq = [];
    TimeAttack.fill(true);
    renderDeck();
    showBanner('Endless', `Go as far as you can. Your first ${T.freeCards} moves are free; after that, pick each card before the timer runs out.\nA bad move or running out of time costs a heart.${T.restHeal ? ' Rest stops' : ''}${T.restHeal && T.gemsPerHeart ? ' and' : ''}${T.gemsPerHeart ? ` every ${T.gemsPerHeart} gems` : ''}${T.restHeal || T.gemsPerHeart ? ' heal one.' : ''}`
      + (matchMedia('(pointer: fine)').matches ? ` Keys 1–${T.handSize} pick cards.` : ''),
      [['Start', () => { hideBanner(); TimeAttack.arm(); renderDeck(); }]]);
  },
  pick() {
    const pool = Object.entries(CONFIG.timeAttack.pool).filter(([id]) => CARDS[id]);
    let r = Math.random() * pool.reduce((a, [, w]) => a + w, 0);
    for (const [id, w] of pool) if ((r -= w) < 0) return id;
    return pool[0][0];
  },
  // Deal cards into the hand. Normally the previewed "Next" card comes in. Fair deal: if nothing in
  // your hand (counting that card) would move you forward safely, a lucky card cuts in ahead of it
  // instead, so cards you've already seen never change. fresh = a whole new hand (start, redraw, timeout).
  fill(fresh = false) {
    const T = CONFIG.timeAttack, ta = app.ta, ids = Object.keys(T.pool).filter((id) => CARDS[id]);
    const outcome = (id) => app.state && runCard(app.map, app.state, id).state;
    const forward = (id) => { const st = outcome(id); return st && st.status !== 'dead' && st.x > app.state.x; };
    const safe = (id) => { const st = outcome(id); return st && st.status !== 'dead'; };
    const luckyCard = () => {                    // something that moves you on, or at least won't kill you
      const opts = ids.filter(forward), pool = opts.length ? opts : ids.filter(safe);
      return pool.length ? { uid: uidSeq++, id: pool[Math.floor(Math.random() * pool.length)], lucky: true } : null;
    };
    app.enter = new Set();
    while (app.hand.length < T.handSize) {
      let card = null;
      if (!fresh && ta?.next) {
        const last = app.hand.length === T.handSize - 1;
        if (T.fairDeal && last && !app.hand.some((c) => forward(c.id)) && !forward(ta.next)) card = luckyCard();
        if (!card) { card = { uid: uidSeq++, id: ta.next }; ta.next = TimeAttack.pick(); }
      } else card = { uid: uidSeq++, id: TimeAttack.pick() };
      app.hand.push(card); app.enter.add(card.uid);
    }
    if (fresh && T.fairDeal && app.state && !app.hand.some((c) => forward(c.id))) {
      const lucky = luckyCard();                  // the whole hand is brand new, so the last card can be the lucky one
      if (lucky) { app.hand[app.hand.length - 1] = lucky; app.enter.add(lucky.uid); }
    }
  },
  arm() {
    const T = CONFIG.timeAttack, ta = app.ta;
    if (!ta || ta.over) return;
    ta.limitMs = 1000 * Math.max(T.minSeconds, T.startSeconds - ta.dist / 100 * T.secondsLostPer100Tiles);
    ta.deadline = ta.plays < T.freeCards ? Infinity : performance.now() + ta.limitMs;   // warm-up picks are untimed
  },
  // called every frame from draw(): updates the timer bar, checks for timeouts
  tick() {
    const ta = app.ta, bar = $('timerFill');
    if (!ta) return;
    const left = ta.paused ?? (ta.deadline ? ta.deadline - performance.now() : 0);
    const frac = ta.deadline || ta.paused ? Math.max(0, Math.min(1, left / ta.limitMs)) : 0;
    bar.style.width = (frac * 100) + '%';
    bar.style.background = frac < .3 ? 'var(--bad)' : 'var(--accent)';
    if (ta.deadline && !ta.paused && !app.running && left <= 0) TimeAttack.timeout();
  },
  timeout() {
    app.ta.deadline = null;
    app.flash = { text: 'Too slow! −♥', t0: performance.now() };
    app.state.streak = 0; app.state.lastKind = null;           // so does running out of time
    app.hand = []; TimeAttack.fill(true);
    if (TimeAttack.loseHeart()) TimeAttack.arm();
    renderDeck();
  },
  loseHeart() {
    const ta = app.ta, N = CONFIG.timeAttack.gemsPerHeart;
    ta.hearts--;
    if (N && ta.gemMeter >= N) {               // a full gem meter (saved up at full hearts) refills the heart you just lost
      ta.hearts++; ta.gemMeter = 0;
      app.flash = { text: 'Gems to the rescue! +♥', t0: performance.now() };
    }
    if (ta.hearts > 0) return true;
    ta.over = true; ta.deadline = null;
    const best = recordBest('endless distance', ta.dist);   // Endless is scored by distance alone
    showBanner('Out of hearts', `You made it ${ta.dist} tiles` + (best.isNew ? (best.prev ? ` — a new best! (was ${best.prev})` : ' — your first best!') : ` (best ${best.prev})`)
      + `\n◆ ${ta.gems} gem${ta.gems === 1 ? '' : 's'} collected`,
      [['Play again', TimeAttack.start], ['Menu', Router.up, true]]);
    return false;
  },
  async clickHand(uid) {
    const ta = app.ta;
    if (app.running || !ta || !ta.deadline || ta.paused) return;
    ta.deadline = null;
    const card = app.hand.splice(app.hand.findIndex((c) => c.uid === uid), 1)[0];
    app.played.push(card);
    const before = clone(app.state);
    app.running = true; renderDeck();
    const status = await playCard(card.id);
    if (status === 'aborted') return;
    // bank collected gems and drop them from the map (keeps the bitmask small)
    const got = app.state.got;
    if (got) {
      const n = app.map.items.filter((it, i) => got & (1 << i)).length, N = CONFIG.timeAttack.gemsPerHeart;
      ta.gems += n;
      if (N) for (let k = 0; k < n; k++) {      // every N gems restores a heart; at full hearts the meter waits, full
        ta.gemMeter = Math.min(N, (ta.gemMeter || 0) + 1);
        if (ta.gemMeter >= N && ta.hearts < CONFIG.timeAttack.hearts) { ta.hearts++; ta.gemMeter = 0; app.flash = { text: '◆ ×' + N + '  +♥', t0: performance.now() }; }
      }
      app.map.items = app.map.items.filter((it, i) => !(got & (1 << i)));
      app.state.got = app.view.got = 0;
    }
    let alive = true;
    if (status === 'dead') {
      app.flash = { text: (app.state.why === 'pit' ? 'Fell!' : app.state.why === 'enemy' ? 'Caught!' : app.state.why === 'cactus' ? 'Ouch!' : 'Spiked!') + ' −♥', t0: performance.now() };
      alive = TimeAttack.loseHeart();
      if (alive) { app.state = { ...before, got: 0, streak: 0, lastKind: null }; app.view = { ...clone(app.state), ox: 0, oy: 0 }; }   // back where you were, but losing a heart breaks your momentum
    }
    ta.plays++;
    ta.dist = Math.max(ta.dist, app.state.x - app.map.start.x);
    const T = CONFIG.timeAttack;
    if (T.heartEvery && alive) while (ta.dist >= ta.nextHeart) {          // a heart back every N tiles
      ta.nextHeart += T.heartEvery;
      if (ta.hearts < T.hearts) { ta.hearts++; app.flash = { text: '+♥', t0: performance.now() }; }
    }
    // reached a new biome's rest stop: say where you are, and heal a heart
    const band = Math.floor(app.state.x / (T.biomeLength || 150));
    if (alive && band > ta.band) {
      ta.band = band;
      let text = { meadow: 'Sunny Meadow', canyon: 'Dusk Canyon', peaks: 'Snowy Peaks' }[biomeAt(app.state.x)];
      if (T.restHeal && ta.hearts < T.hearts) { ta.hearts++; text += '  +♥'; }
      app.flash = { text, t0: performance.now() };
    }
    for (const e of extendTerrain(app.map, app.state.x + W + 6)) {          // patrollers in newly built terrain
      app.state.enemies.push({ ...e }); (app.view.enemies = app.view.enemies || []).push({ ...e });
    }
    app.running = false;
    TimeAttack.fill();
    if (alive) TimeAttack.arm();
    renderDeck();
  },
  clickSeq() {},
  // swap the whole hand; the clock keeps running
  redraw() {
    if (app.running || !app.ta?.deadline || app.ta.paused) return;
    app.state.streak = 0; app.state.lastKind = null;           // a redraw breaks your momentum
    app.hand = []; TimeAttack.fill(true); renderDeck();
  },
  pause() {
    const ta = app.ta;
    if (!ta || ta.over || app.running) return;
    if (ta.paused != null) { ta.deadline = performance.now() + ta.paused; ta.paused = null; hideBanner(); document.body.classList.remove('paused'); }
    else if (ta.deadline) {
      ta.paused = ta.deadline - performance.now();
      document.body.classList.add('paused');            // hide the level and your cards: no planning while paused
      showBanner('Paused', 'Take a breather.', [['Resume', TimeAttack.pause]]);
    }
    renderDeck();
  },
  actions() {
    const ta = app.ta, live = ta && ta.deadline && !ta.paused && !app.running;
    return [
      ['↻ Redraw', '', TimeAttack.redraw, !live],
      [ta?.paused != null ? '▶ Resume' : '⏸ Pause', '', TimeAttack.pause, !ta || ta.over || (!ta.deadline && ta.paused == null)],
      ['↺ Restart', '', TimeAttack.start, app.running],
    ];
  },
};

// Shop-run roguelite: pick a route (previewed levels), buy a hand of cards
// with gems, then solve the level Plan & Run style. Perks change the rules.
const Quest = {
  start() {
    const Q = CONFIG.quest;
    app.q = { depth: 0, cleared: 0, hearts: Q.hearts, maxHearts: Q.hearts, gems: Q.startGems, perks: [], route: null, earned: 0 };
    app.hand = []; app.seq = []; app.played = [];
    app.level = { name: 'Roguelite', map: Array(BOARD_H).fill('.'.repeat(BOARD_W)), cards: [] }; app.levelKey = 'quest';
    resetRun();
    Quest.showRoutes();
  },
  has: (p) => !!app.q?.perks.includes(p),
  mods() { const m = {}; for (const p of app.q.perks) if (CONFIG.quest.perks[p].mod) m[CONFIG.quest.perks[p].mod] = true; return m; },
  handLimit: () => CONFIG.quest.handLimit + (Quest.has('pockets') ? 2 : 0),
  owned: () => app.seq.length,
  basePrices() { const p = {}; for (const [id, c] of Object.entries(CONFIG.quest.prices)) if (CARDS[id]) p[id] = c; return p; },
  price(id) {
    let c = CONFIG.quest.prices[id];
    if (Quest.has('thrifty') && id.startsWith('walk')) c--;
    if (Quest.has('echoes') && id === 'echo') c = 0;
    return Math.max(0, c);
  },
  makeRoute(kind) {
    const Q = CONFIG.quest, q = app.q, risky = kind === 'risky';
    const pool = Object.keys(Quest.basePrices()), deck = pool.flatMap((id) => [id, id, id]);
    for (let tries = 0; tries < 8; tries++) {
      const depth = Math.max(1, q.depth + 1 + (risky ? 2 : 0) - Math.floor(tries / 3));
      const g = generateLevel(depth, deck, Math.random, { skipOdds: true, keepGems: true, extraGems: risky ? 2 : 0 });
      if (!g) continue;
      // must be solvable with YOUR perks (Long Legs can make exact steps impossible)…
      const modded = parseLevel(g.level); modded.mods = Quest.mods();
      const withPerks = cheapestSolution(modded, Quest.basePrices(), Quest.handLimit());
      if (!withPerks) continue;
      // budget = that solution at normal prices: movement perks change HOW you solve,
      // price perks (Thrifty, Echo Discount) are where the savings come from
      const cheap = withPerks;
      const ramp = Math.min(1, q.depth / Q.budgetRamp);
      const mult = Q.budgetStart + (Q.budgetEnd - Q.budgetStart) * ramp - (risky ? Q.riskyTighter : 0);
      const budget = Math.max(cheap.cost, Math.ceil(cheap.cost * mult));
      // drop gems you can't reach with your perks; make sure the shop sells what the reachable ones need
      const pruned = pruneGems(g.level, Quest.basePrices(), Quest.handLimit(), Quest.mods());
      const stock = [...new Set([...cheap.seq, ...pruned.routes.flat()])];
      for (const id of shuffle([...pool])) if (stock.length < Q.shopSize && !stock.includes(id)) stock.push(id);
      return { kind, level: pruned.level, cheapest: cheap.cost, budget, stock: pool.filter((id) => stock.includes(id)) };
    }
    return null;
  },
  showRoutes() {
    const q = app.q, Q = CONFIG.quest;
    const routes = [Quest.makeRoute('safe'), Quest.makeRoute('risky'), q.hearts < q.maxHearts ? { kind: 'rest' } : { kind: 'shrine' }].filter(Boolean);
    const box = document.createElement('div'); box.className = 'routes';
    const info = {
      safe: (r) => [`Budget +${r.budget}◆`, 'A comfortable margin'],
      risky: (r) => [`Budget +${r.budget}◆ (tighter)`, `More gems on the map`, '+ a perk if you clear it'],
      rest: () => ['Heal 1 ♥', 'No level'],
      shrine: () => [`Pay ${Q.shrineCost}◆ for a perk`, q.gems < Q.shrineCost ? `You have ${q.gems}◆` : 'No level'],
    };
    const titles = { safe: 'Safe', risky: 'Risky', rest: 'Rest', shrine: 'Shrine' };
    for (const r of routes) {
      const tile = document.createElement('button'); tile.className = 'route ' + r.kind;
      tile.appendChild(Object.assign(document.createElement('b'), { textContent: titles[r.kind] }));
      if (r.level) { const m = document.createElement('canvas'); drawMini(r.level, m, 7); tile.appendChild(m); }
      else tile.appendChild(Object.assign(document.createElement('div'), { className: 'icon', textContent: r.kind === 'rest' ? '♥' : '✦' }));
      for (const line of info[r.kind](r)) tile.appendChild(Object.assign(document.createElement('small'), { textContent: line }));
      tile.disabled = r.kind === 'shrine' && q.gems < Q.shrineCost;
      tile.onclick = () => Quest.enter(r);
      box.appendChild(tile);
    }
    showBanner(q.depth ? 'Choose your next route' : 'Choose your route',
      `Level ${q.depth + 1}  ·  ${'♥'.repeat(q.hearts)}${'♡'.repeat(q.maxHearts - q.hearts)}  ·  ◆ ${q.gems}`, [['Give up run', Quest.over, true]], box);
  },
  enter(r) {
    const q = app.q;
    if (r.kind === 'rest') { q.hearts = Math.min(q.maxHearts, q.hearts + 1); return Quest.showRoutes(); }
    if (r.kind === 'shrine') { q.gems -= CONFIG.quest.shrineCost; return Quest.perkChoice(Quest.showRoutes); }
    q.route = r; q.depth++; q.gems += r.budget;
    app.level = { ...r.level, name: `Level ${q.depth}`, cards: [] };
    app.hand = []; app.seq = []; app.played = [];
    resetRun();
    app.flash = { text: `Budget +${r.budget}◆`, t0: performance.now() };
  },
  buy(id, at = app.seq.length) {
    const q = app.q, price = Quest.price(id);
    if (app.running || q.gems < price || Quest.owned() >= Quest.handLimit()) return;
    q.gems -= price;
    app.seq.splice(at, 0, { uid: uidSeq++, id, paid: price });   // straight into your plan (end, or where you dropped it)
    if (app.cursor || app.state.status !== 'playing') resetRun(); else renderDeck();
  },
  // clicking a planned card sells it back for what you paid
  sell(uid) {
    if (app.running) return;
    const i = app.seq.findIndex((c) => c.uid === uid);
    app.q.gems += app.seq[i].paid;
    app.seq.splice(i, 1);
    if (app.cursor || app.state.status !== 'playing') resetRun(); else renderDeck();
  },
  moveTo(uid, at) {                                   // the shop plan has no fixed slots: just reorder
    if (app.running) return;
    const card = app.seq.splice(app.seq.findIndex((c) => c.uid === uid), 1)[0];
    app.seq.splice(at, 0, card);
    if (app.cursor || app.state.status !== 'playing') resetRun(); else renderDeck();
  },
  sellAll() {
    if (app.running) return;
    app.q.gems += app.seq.reduce((a, c) => a + c.paid, 0); app.seq = []; resetRun();
  },
  clickHand() {},
  clickSeq: (uid) => Quest.sell(uid),
  finish(status, outOfCards) {
    const q = app.q, Q = CONFIG.quest;
    if (status === 'won') {
      const gems = gemCount(app.map, app.state), pickup = gems * Q.gemValue * (Quest.has('magnet') ? 2 : 1);
      const unused = Quest.owned() - app.cursor;
      q.gems += pickup;
      const piggy = Quest.has('piggy') && q.gems >= 5 ? 2 : 0;
      q.gems += piggy; q.cleared++;
      const lines = [`Cleared with ${app.cursor} card${app.cursor === 1 ? '' : 's'}.`];
      if (pickup) lines.push(`Gems picked up: +${pickup}◆`);
      if (piggy) lines.push('Piggy Bank: +2◆');
      if (unused) lines.push(`${unused} unused card${unused > 1 ? 's' : ''} left behind.`);
      if (q.gems > Q.carryCap) { lines.push(`You can only carry ${Q.carryCap}◆ (${q.gems - Q.carryCap}◆ left behind).`); q.gems = Q.carryCap; }
      lines.push(`You carry ${q.gems}◆ to the next route.`);
      const nextStep = q.route.kind === 'risky' ? ['Choose a perk →', () => Quest.perkChoice(Quest.showRoutes)] : ['Choose next route →', Quest.showRoutes];
      showBanner(`Level ${q.depth} cleared!`, lines.join('\n'), [nextStep]);
    } else if (status === 'dead' || outOfCards) {
      q.hearts--;
      if (q.hearts <= 0) return Quest.over();
      const why = status === 'dead' ? deathText(app.state.why)
        : app.map.keyMask && !hasAllKeys(app.map, app.state) ? 'The door stayed locked' : "Didn't reach the flag";
      showBanner(why, `−1 ♥ (${q.hearts} left). Your cards are still in your plan: drag to reorder, tap to sell, or buy more, then press Play again.`, [['Try again', resetRun]]);
    }
  },
  perkChoice(then) {
    const q = app.q, all = CONFIG.quest.perks;
    const offers = shuffle(Object.keys(all).filter((p) => !q.perks.includes(p))).slice(0, 3);
    if (!offers.length) return then();
    const box = document.createElement('div'); box.className = 'routes';
    for (const p of offers) {
      const tile = document.createElement('button'); tile.className = 'route perk';
      tile.append(Object.assign(document.createElement('b'), { textContent: all[p].name }), Object.assign(document.createElement('small'), { textContent: all[p].desc }));
      tile.onclick = () => {
        q.perks.push(p);
        if (p === 'heart') { q.maxHearts++; q.hearts = q.maxHearts; }
        then();
      };
      box.appendChild(tile);
    }
    showBanner('Choose a perk', 'Perks last for the rest of the run.', [['Skip', then]], box);
  },
  over() {
    const q = app.q, score = q.cleared * 100 + q.gems;
    const best = recordBest('shop run', score);
    showBanner('Run over', `You cleared ${q.cleared} level${q.cleared === 1 ? '' : 's'} with ${q.perks.length} perk${q.perks.length === 1 ? '' : 's'}.\nScore ${score}`
      + (best.isNew ? (best.prev ? ` — new best! (was ${best.prev})` : '') : ` (best ${best.prev})`), [['New run', Quest.start]]);
  },
  actions() {
    return [
      ['▶ Play', 'primary', Plan.play, !app.seq.length || app.running],
      ['↺ Reset', '', resetRun, app.running],              // back to the start; your cards stay in the plan
      ['Sell all', '', Quest.sellAll, app.running || !app.seq.length],
      ['Give up run', '', () => { if (!app.running && confirm('Give up this run?')) Quest.over(); }, app.running]];
  },
};

// Experiment 2: roguelite run. Deck → shuffled draw pile → hand of N.
// Playing a card plays it immediately and draws a replacement. Each level
// has a step budget (shortest solution + spare). Die or run out of steps →
// lose a heart. Clear a level → pick a new card for the deck.
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const Run = {
  start() {
    app.run = { depth: 0, cleared: 0, hearts: CONFIG.run.hearts, score: 0, cycling: false, nextGen: null,
      deck: CONFIG.run.startingDeck.filter((id) => CARDS[id]).map((id) => ({ uid: uidSeq++, id })) };
    Run.next();
  },
  next() {
    const r = app.run;
    r.depth++;
    const types = [...new Set(r.deck.map((c) => c.id))];
    // use the previewed level if there was one (its par may change with the new deck)
    const path = r.nextGen && shortestPath(r.nextGen.level, types, 14);
    r.gen = path ? { ...r.nextGen, par: path.length, path } : generateLevel(r.depth, r.deck.map((c) => c.id));
    r.nextGen = null;
    if (!r.gen) { showBanner('Could not build a level', 'The generator gave up — try a new run.', [['New run', Run.start]]); return; }
    app.level = r.gen.level; app.levelKey = 'run';
    Run.retry();
  },
  retry() {
    const r = app.run;
    r.draw = shuffle([...r.deck]); r.discard = [];
    r.steps = r.gen.par + CONFIG.run.spareSteps;
    r.swaps = CONFIG.run.freeSwaps; r.cycling = false;
    app.hand = []; app.played = []; app.seq = []; app.history = [];
    Run.fill(); resetRun();
  },
  fill() {
    const r = app.run;
    while (app.hand.length < CONFIG.run.handSize) {
      if (!r.draw.length) { if (!r.discard.length) break; r.draw = shuffle(r.discard); r.discard = []; }
      app.hand.push(r.draw.pop());
    }
  },
  async clickHand(uid) {
    const r = app.run;
    if (app.running || app.state.status !== 'playing' || r.steps <= 0) return;
    if (r.cycling) return Run.cycle(uid);
    const card = app.hand.splice(app.hand.findIndex((c) => c.uid === uid), 1)[0];
    app.played.push(card); r.discard.push(card); r.steps--;
    app.running = true; renderDeck();
    const status = await playCard(card.id);
    app.running = false;
    Run.fill(); Run.after(status);
  },
  clickSeq() {},
  // Swap one card from your hand for the next one in the draw pile. Free, a few times per level.
  cycle(uid) {
    const r = app.run;
    r.cycling = false; r.swaps--;
    r.discard.push(app.hand.splice(app.hand.findIndex((c) => c.uid === uid), 1)[0]);
    Run.fill(); renderDeck();
  },
  toggleCycle() {
    const r = app.run;
    if (app.running || app.state.status !== 'playing' || r.swaps <= 0) return;
    r.cycling = !r.cycling; renderDeck();
  },
  // Throw the hand away and draw a new one. Costs a step and a turn.
  async mulligan() {
    const r = app.run;
    if (app.running || app.state.status !== 'playing' || r.steps <= 0) return;
    r.discard.push(...app.hand); app.hand = []; r.steps--;
    app.running = true; renderDeck();
    const last = app.state.last;
    const status = await playCard('wait');
    app.state.last = last;      // a mulligan isn't something Echo can repeat
    app.running = false;
    Run.fill(); Run.after(status);
  },
  after(status) {
    const r = app.run;
    if (status === 'won') Run.reward();
    else if (status === 'dead') Run.loseHeart(deathText(app.state.why));
    else if (r.steps <= 0) Run.loseHeart('Out of steps');
    else if (status === 'playing' && !canFinish(app.map, app.state, [...new Set(r.deck.map((c) => c.id))], r.steps)) {
      // soft-lock: no combination of your cards reaches the flag any more, so say so now
      const noKey = app.map.keyMask && !hasAllKeys(app.map, app.state);
      Run.loseHeart('Stuck!', noKey ? "You can't get back to the key from here." : "You can't reach the flag from here any more.");
    }
    renderDeck();
  },
  loseHeart(title, why = '') {
    const r = app.run;
    r.hearts--;
    r.cycling = false;
    if (r.hearts <= 0) {
      let text = `You made it to level ${r.depth} with a ${r.deck.length}-card deck.`;
      if (CONFIG.features.gems) {
        const best = recordBest('roguelite run', r.score);
        text += `\nScore: ${r.score}` + (best.isNew ? (best.prev ? ` — new best! (was ${best.prev})` : '') : ` (best ${best.prev})`);
      }
      showBanner('Run over', text, [['New run', Run.start]]);
    }
    else showBanner(title, (why ? why + '\n' : '') + `${r.hearts} heart${r.hearts === 1 ? '' : 's'} left. The level stays the same; your deck is reshuffled.`, [['Retry level', Run.retry]]);
  },
  reward() {
    const r = app.run, C = CONFIG.run;
    r.cleared++;
    let text = '';
    if (CONFIG.features.gems) {
      const sc = scoreFor(app.map, app.state, r.steps);
      r.score += sc.points;
      text += `${sc.text}\nRun total: ${r.score}\n`;
    }
    if (C.healEvery && r.cleared % C.healEvery === 0 && r.hearts < C.hearts) { r.hearts++; text += '+1 ♥ for clearing ' + C.healEvery + ' levels!\n'; }
    if (C.preview) r.nextGen = generateLevel(r.depth + 1, r.deck.map((c) => c.id));
    r.rewardText = text;
    r.addPicks = shuffle(C.rewardPool.filter((id) => CARDS[id])).slice(0, 3);
    if (C.rewardStyle === 'trade') { r.offers = Run.pickOffers(); Run.tradeView(); }
    else Run.rewardView('add');
  },
  // Steps the next level needs with these cards (null = impossible)
  parWith(ids) {
    const n = app.run.nextGen;
    const p = n && shortestPath(n.level, [...new Set(ids)], 14);
    return p ? p.length : null;
  },
  // What a card would do for the next level, in plain words
  offerNote(id) {
    const ids = app.run.deck.map((c) => c.id);
    if (!app.run.nextGen) return ids.includes(id) ? 'More copies = drawn more often' : 'New move for your deck';
    const base = Run.parWith(ids), withIt = Run.parWith([...ids, id]);
    if (base == null && withIt != null) return 'Makes the next level possible!';
    if (withIt != null && withIt < base) return `Next level: ${base - withIt} step${base - withIt > 1 ? 's' : ''} shorter`;
    return ids.includes(id) ? 'More copies = drawn more often' : 'Not needed for the next level';
  },
  // Three offers; at least one helps the next level if any card can
  pickOffers() {
    const pool = shuffle(CONFIG.run.rewardPool.filter((id) => CARDS[id]));
    const ids = app.run.deck.map((c) => c.id), base = Run.parWith(ids);
    const helpful = pool.filter((id) => { const w = Run.parWith([...ids, id]); return w != null && (base == null || w < base); });
    const offers = helpful.slice(0, 1);
    for (const id of pool) if (offers.length < 3 && !offers.includes(id)) offers.push(id);
    return shuffle(offers);
  },
  // 'trade' reward screen: pick a card; if the deck is full, then pick one to give up
  tradeView(pickId) {
    const r = app.run, C = CONFIG.run;
    const ids = r.deck.map((c) => c.id), types = [...new Set(ids)];
    const box = document.createElement('div'); box.className = 'reward';
    const label = (t) => box.appendChild(Object.assign(document.createElement('div'), { className: 'label', innerHTML: t }));
    if (r.nextGen) { const m = document.createElement('canvas'); drawMini(r.nextGen.level, m); label('Next level:'); box.appendChild(m); }
    label(`Your deck (${ids.length}/${C.deckLimit}): ` + types.map((t) => cardChip(t) + (ids.filter((x) => x === t).length > 1 ? `×${ids.filter((x) => x === t).length}` : '')).join(' '));
    const row = document.createElement('div'); row.className = 'extra';
    const offer = (id, note, ok, fn, why) => {
      const wrap = document.createElement('div'); wrap.className = 'offer';
      const el = cardEl({ id });
      if (ok) el.onclick = fn; else { el.style.opacity = .35; el.style.cursor = 'not-allowed'; }
      wrap.append(el, Object.assign(document.createElement('small'), { textContent: ok ? note : why }));
      row.appendChild(wrap);
    };
    let buttons;
    if (!pickId) {
      const full = ids.length >= C.deckLimit;
      label(full ? 'Your deck is full: pick a card, then choose one to give up for it.' : 'Pick a card to add:');
      for (const id of r.offers) offer(id, Run.offerNote(id), true, () => {
        if (!full) { r.deck.push({ uid: uidSeq++, id }); Run.next(); } else Run.tradeView(id);
      });
      buttons = [['Skip', Run.next]];
    } else {
      label(`Give up one card for ${cardChip(pickId)}:`);
      for (const t of types) {
        if (t === pickId) continue;
        const rest = [...ids]; rest.splice(rest.indexOf(t), 1); rest.push(pickId);
        const n = ids.filter((x) => x === t).length;
        offer(t, `You have ${n}`, Run.parWith(rest) != null || !r.nextGen, () => {
          r.deck.find((c) => c.id === t).id = pickId; Run.next();
        }, 'Needed for the next level');
      }
      buttons = [['← Back', () => Run.tradeView()]];
    }
    box.appendChild(row);
    showBanner(`Level ${r.depth} cleared!`, r.rewardText, buttons, box);
  },
  // Reward screen: add one of three cards, or (deckEditing) remove / upgrade one.
  rewardView(view) {
    const r = app.run, C = CONFIG.run;
    const box = document.createElement('div'); box.className = 'reward';
    if (r.nextGen) {
      const cv2 = document.createElement('canvas'); drawMini(r.nextGen.level, cv2);
      box.append(Object.assign(document.createElement('div'), { className: 'label', textContent: 'Next level:' }), cv2);
    }
    const row = document.createElement('div'); row.className = 'extra';
    const deckIds = r.deck.map((c) => c.id), types = [...new Set(deckIds)];
    // a removal/upgrade is only offered if the next level can still be finished
    const stillOk = (newIds) => !r.nextGen || !!shortestPath(r.nextGen.level, [...new Set(newIds)], 14);
    const add = (el, ok, fn, note) => {
      if (!ok) { el.style.opacity = .35; el.style.cursor = 'not-allowed'; el.title = note; } else el.onclick = fn;
      row.appendChild(el);
    };
    let label = 'Add a card to your deck:', buttons = [];
    if (view === 'add') {
      for (const id of r.addPicks) add(cardEl({ id }), true, () => { r.deck.push({ uid: uidSeq++, id }); Run.next(); });
      if (C.rewardStyle === 'edit') buttons.push(['Remove a card…', () => Run.rewardView('remove')], ['Upgrade a card…', () => Run.rewardView('upgrade')]);
      buttons.push(['Skip', Run.next]);
    } else if (view === 'remove') {
      label = `Remove one card (deck: ${r.deck.length}):`;
      for (const id of types) {
        const rest = [...deckIds]; rest.splice(rest.indexOf(id), 1);
        const el = cardEl({ id }); el.insertAdjacentHTML('afterbegin', `<span class="key">×${deckIds.filter((x) => x === id).length}</span>`);
        add(el, r.deck.length > C.minDeck && stillOk(rest), () => { r.deck.splice(r.deck.findIndex((c) => c.id === id), 1); Run.next(); },
          r.deck.length <= C.minDeck ? 'Deck is already at its minimum size' : 'You need this card for the next level');
      }
      buttons.push(['← Back', () => Run.rewardView('add')]);
    } else {
      label = 'Upgrade one card:';
      for (const id of types.filter((t) => CARDS[C.upgrades[t]])) {
        const to = C.upgrades[id], rest = deckIds.map((x, i) => (i === deckIds.indexOf(id) ? to : x));
        const el = cardEl({ id: to }); el.insertAdjacentHTML('afterbegin', `<span class="key">from ${cardChip(id)}</span>`);
        add(el, stillOk(rest), () => { r.deck.find((c) => c.id === id).id = to; Run.next(); }, 'You need this card for the next level');
      }
      buttons.push(['← Back', () => Run.rewardView('add')]);
    }
    box.append(Object.assign(document.createElement('div'), { className: 'label', textContent: label }), row);
    showBanner(`Level ${r.depth} cleared!`, r.rewardText, buttons, box);
  },
  actions() {
    const r = app.run, busy = app.running || app.state.status !== 'playing';
    return [
      ...(CONFIG.run.freeSwaps ? [[r?.cycling ? '✕ Cancel swap' : `♻ Swap a card (${r?.swaps ?? 0} free)`, r?.cycling ? 'primary' : '', Run.toggleCycle, busy || !r || r.swaps <= 0]] : []),
      ['Mulligan (−1 step)', '', Run.mulligan, busy || !r || r.steps <= 0],
      ['New run', '', () => { if (!app.running && confirm('Abandon this run?')) Run.start(); }, app.running],
    ];
  },
};
const ctrl = () => (app.mode === 'quest' ? Quest : app.mode === 'run' ? Run : app.mode === 'time' ? TimeAttack : app.mode === 'instant' ? Instant : Plan);

// Roguelite only: score = (flag + gems + spare steps) × multiplier if every gem was collected.
function scoreFor(map, st, spare) {
  const sc = CONFIG.score, gems = gemCount(map, st), total = gemTotal(map);
  const parts = [['Flag', sc.clear]];
  if (gems) parts.push([`${gems} gem${gems > 1 ? 's' : ''}`, gems * sc.gem]);
  if (spare > 0) parts.push([`${spare} spare`, spare * sc.spare]);
  const mult = total && gems === total ? sc.allGemsMultiplier : 1;
  const points = parts.reduce((a, [, v]) => a + v, 0) * mult;
  const text = parts.map(([k, v]) => `${k} ${v}`).join(' + ') + (mult > 1 ? ` × ${mult} (all gems!)` : '') + ` = ${points}`;
  return { points, text, gems, total };
}
function recordBest(name, points) {
  const best = store.get('cardclimber.best', {});
  const prev = best[name] || 0;
  if (points > prev) { best[name] = points; store.set('cardclimber.best', best); }
  return { prev, isNew: points > prev };
}

function finishCheck(status, outOfCards, unused) {
  if (app.mode === 'quest') return Quest.finish(status, outOfCards);
  const retry = app.mode === 'instant' ? [['↶ Undo', Instant.undo], ['↺ Restart', Instant.restart]] : [['↺ Try again', resetRun]];
  if (status === 'won') {
    const all = allLevels(), idx = all.findIndex((l) => l.key === app.levelKey);
    const next = all[idx + 1]?.key[0] === app.levelKey[0] ? all[idx + 1] : null;   // the next level in the same list (built-in or yours)
    const used = app.mode === 'instant' ? app.played.length : app.cursor;
    // puzzles: cleared or not, plus every gem (if the level has any). No points.
    const total = CONFIG.features.gems ? gemTotal(app.map) : 0, gems = total ? gemCount(app.map, app.state) : 0;
    const text = total > gems ? `${total - gems} gem${total - gems > 1 ? 's' : ''} left behind — there's a harder way.` : total ? 'Every gem collected!' : `Reached the flag in ${used} card${used === 1 ? '' : 's'}.`;
    const run = { flag: true, gems: !!total && gems === total };
    if (!app.playtesting) Progress.earn(app.level.name, run);
    const badges = badgeRow(run, total > 0);
    const replay = ['Replay', retry[retry.length - 1][1]];
    showBanner('Level complete!', text, app.playtesting ? [replay]
      : [...(next ? [['Next →', () => Router.go('#/play/' + next.key)]] : []), replay, ['Levels', Router.up, true]], badges);
  } else if (status === 'dead') {
    if (app.mode === 'plan') app.fails++;
    const hint = Hints.available() ? [[`💡 Hint`, () => { hideBanner(); Hints.next(); }]] : [];
    showBanner(deathText(app.state.why), 'Rearrange your cards and try again.' + (hint.length ? '\nStuck? A hint is available (optional).' : ''), [...retry, ...hint]);
  } else if (outOfCards) {
    if (app.mode === 'plan') app.fails++;
    const hint = Hints.available() ? [[`💡 Hint`, () => { hideBanner(); Hints.next(); }]] : [];
    const locked = app.map.keyMask && !hasAllKeys(app.map, app.state);
    showBanner('Out of cards', (locked ? "You never picked up the key, so the door stayed locked. " : "You haven't reached the flag. ") + (unused ? `${unused} card(s) still in your hand.` : '')
      + (hint.length ? '\nStuck? A hint is available (optional).' : ''), [...retry, ...hint]);
  }
}

/* =====================================================================
   Rendering — canvas world
   ===================================================================== */
let TS = 40; // tile size in CSS px
// How much of the level is on screen: the whole level up to VIEW_MAX_W tiles wide (it zooms to
// fit); wider levels scroll sideways and follow the hero (drag the level to look around while
// planning). The editor always shows the whole level.
const VIEW_MAX_W = 20;
function setView(map) {
  const w = app.editing || app.mode === 'time' ? (app.mode === 'time' ? BOARD_W : map.w) : Math.min(map.w, VIEW_MAX_W), h = map.h || BOARD_H;
  if (w !== W || h !== H) { W = w; H = h; resize(); }
}
// The UI pixel (CSS --px): how many CSS pixels one pixel of the interface takes. Always a whole number
// of the screen's own pixels (so edges stay crisp): 1.5 on very narrow phones, 2 on phones and laptops,
// 3 on big screens. Everything outside the level is built in multiples of it (style.css, pixel.js).
function uiPixel() {
  const dpr = window.devicePixelRatio || 1, want = innerWidth < 360 ? 1.5 : innerWidth < 1100 ? 2 : 3;
  const px = Math.max(1, Math.round(want * dpr)) / dpr;
  document.documentElement.style.setProperty('--px', px + 'px'); document.documentElement.style.setProperty('--pxn', px);
  Drag.GAP = 8 * px;
}
function resize() {
  uiPixel();
  const st = $('stage'), cs = getComputedStyle(st);
  const aw = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  // In phone portrait the stage hugs the canvas, so size against the screen instead
  const ah = matchMedia('(max-width: 600px)').matches ? innerHeight * .5
    : st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  TS = Math.max(8, Math.floor(Math.min(aw / W, ah / H)));
  const dpr = window.devicePixelRatio || 1;
  // pixel art: a whole number of screen pixels per art-pixel, so every pixel is the same size
  // (unless that would shrink the game by more than 15%, e.g. on low-density screens)
  if (Art.style() === 'pixel') {
    const snapped = Math.floor(TS * dpr / PIXELS_PER_TILE) * PIXELS_PER_TILE / dpr;
    if (snapped >= TS * .85) TS = snapped;
  }
  cv.style.width = TS * W + 'px'; cv.style.height = TS * H + 'px';
  cv.width = TS * W * dpr; cv.height = TS * H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burst(x, y, color) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
    app.particles.push({ x: x + .5, y: y + .5, vx: Math.cos(a) * sp / 40, vy: Math.sin(a) * sp / 40 - .05, life: 1, color });
  }
}

function draw() {
  // nothing to show yet (opened straight onto a menu), or a menu that hides the game: just wait
  if (!app.view || (document.body.classList.contains('menu') && !document.body.classList.contains('home'))) { requestAnimationFrame(draw); return; }
  // pixel art: draw the world small with the pixel sprites (pixel.js), then scale it up crisply
  const pixel = Art.style() === 'pixel', A = pixel ? PixelArt : Art, screen = ctx, fullTS = TS;
  if (pixel) { ctx = Pixel.start(); TS = PIXELS_PER_TILE; }
  const map = app.editing ? parseLevel(app.level) : app.map;
  const v = app.view;
  setView(map);
  const turn = app.editing ? 0 : v.turn;
  // camera: follows the player on maps wider than the screen (Endless)
  const follow = app.mode === 'time' ? v.x - 4 : v.x - W / 2 + .5;          // Endless looks ahead; wide puzzles keep the hero centred
  const camTarget = Math.max(0, Math.min(map.w - W, app.editing ? 0 : app.camHold ?? follow));
  app.cam += (camTarget - app.cam) * .12;
  if (Math.abs(camTarget - app.cam) < .01) app.cam = camTarget;
  const x0 = Math.floor(app.cam), x1 = Math.min(map.w, x0 + W + 1);
  // background (art.js): themed sky + parallax layers; Endless cross-fades between themes
  const tname = Art.themeName(), px = app.editing ? W / 2 : v.x;
  if (app.mode === 'time') {
    const pos = app.cam + W / 2, f = pos % ENDLESS_THEME_TILES, band = Math.floor(pos / ENDLESS_THEME_TILES);
    if (band > 0 && f < 12) { A.background(ctx, ENDLESS_THEME_ORDER[(band - 1) % 3], app.cam, px); ctx.globalAlpha = f / 12; }
  }
  A.background(ctx, tname, app.cam, px);
  ctx.globalAlpha = 1;
  const [shx, shy] = Art.shakeOffset();
  ctx.save(); ctx.translate((pixel ? -Math.round(app.cam * TS) : -app.cam * TS) + shx, shy);   // pixel art: scroll by whole pixels
  A.grid(ctx, x0, x1);
  A.tiles(ctx, map, x0, x1, turn);
  for (const sg of map.signs || []) if (sg.x >= x0 - 2 && sg.x <= x1 + 2) A.sign(ctx, sg);
  // keys and gems (collected ones disappear)
  const got = app.editing ? 0 : v.got;
  const bob = Math.sin(performance.now() / 300) * TS * .05;
  map.items.forEach((it, i) => { if (!(got & (1 << i))) (it.t === 'K' ? A.key : A.gem)(ctx, it.x * TS, it.y * TS + bob); });
  // goal: a locked door while keys are missing, otherwise the flag
  if (map.goal.x >= 0 && map.keyMask && !hasAllKeys(map, { got })) A.door(ctx, map.goal.x * TS, map.goal.y * TS);
  else if (map.goal.x >= 0) A.flag(ctx, map.goal.x * TS, map.goal.y * TS);
  // soft shadows, then crates, patrollers and the player
  const crates = app.editing ? map.crates : v.crates, enemies = app.editing ? map.enemies || [] : v.enemies || [];
  for (const c of crates) if (!c.gone) A.shadow(ctx, map, [], c.x, c.y, .9);
  for (const en of enemies) if (!en.dead) A.shadow(ctx, map, crates, en.x, en.y, .8);
  if (!app.editing) A.shadow(ctx, map, crates, v.x + v.ox, v.y + v.oy, .7);
  for (const c of crates) if (!c.gone) A.crate(ctx, c.x, c.y);
  enemies.forEach((en, i) => {
    if (en.dead && (!en.deadT || performance.now() - en.deadT > SLIME_DEATH_MS)) return;
    A.slime(ctx, en.x, en.y, en.dir, en.dead ? Math.min(1, (performance.now() - en.deadT) / SLIME_DEATH_MS) : -1, en.step || 0, i, en.deadKind, en.flyDir);
  });
  if (app.editing) drawPlayer(map.start.x, map.start.y, 1, 'playing', .9);
  else drawPlayer(v.x + v.ox, v.y + v.oy, v.dir, v.status, 1, playerFx(v));
  A.effects(ctx, map, got);
  ctx.restore();
  A.ambient(ctx, tname);
  const pixelHud = pixel && !app.editing && (app.mode === 'plan' || app.mode === 'time') && !document.body.classList.contains('home');
  if (pixel) { ctx = screen; TS = fullTS; Pixel.end(ctx); }
  if (pixelHud) Pixel.hud(ctx, map, v);             // status drawn straight onto the level at the UI pixel size (pixel.js)
  else Art.vignette(ctx);
  // text and the editor cursor go on at full resolution, so they stay sharp in every style
  ctx.save(); ctx.translate(-app.cam * TS, 0);
  if (pixel) for (const sg of map.signs || []) if (sg.x >= x0 - 2 && sg.x <= x1 + 2) Pixel.signText(ctx, sg);
  // floating text (e.g. what Echo repeated)
  if (app.flash && !app.editing) {
    const age = (performance.now() - app.flash.t0) / 1100;
    if (age >= 1) app.flash = null;
    else {
      ctx.globalAlpha = 1 - age * age; ctx.fillStyle = '#5b3fd1'; ctx.font = `bold ${Math.floor(TS * .34)}px system-ui`; ctx.textAlign = 'center';
      const half = ctx.measureText(app.flash.text).width / 2 + 4;   // keep the text on screen near the edges
      const fx = Math.max(app.cam * TS + half, Math.min((app.cam + W) * TS - half, (v.x + .5) * TS));
      ctx.fillText(app.flash.text, fx, Math.max(TS * .4, (v.y - .25 - age * .6) * TS)); ctx.globalAlpha = 1;
    }
  }
  // editor hover cell
  if (app.editing && hover) {
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2; ctx.strokeRect(hover.x * TS + 1, hover.y * TS + 1, TS - 2, TS - 2);
  }
  ctx.restore();
  const run = app.mode === 'run' && app.run, ta = app.mode === 'time' && app.ta, q = app.mode === 'quest' && app.q;
  if (ta) TimeAttack.tick();
  if (ta) {
    // the timer lives on the game itself, so it's visible however the page is laid out (pixel style: drawn by Pixel.hud)
    if (ta.deadline || ta.paused != null) {
      const left = ta.paused ?? (ta.deadline - performance.now()), frac = Math.max(0, Math.min(1, left / ta.limitMs));
      const low = frac < .3;
      if (!pixelHud) {
        ctx.fillStyle = '#0006'; ctx.fillRect(0, 0, W * TS, Math.max(6, TS * .18));
        ctx.fillStyle = low ? '#ff4d4d' : '#ffcc33'; ctx.fillRect(0, 0, W * TS * frac, Math.max(6, TS * .18));
      }
      if (low && !ta.paused) {                       // pulsing red edge as a second warning
        ctx.strokeStyle = `rgba(255,77,77,${.45 + .4 * Math.sin(performance.now() / 70)})`; ctx.lineWidth = Math.max(4, TS * .15);
        ctx.strokeRect(0, 0, W * TS, H * TS);
      }
    }
  }
  $('hud').style.display = pixelHud ? 'none' : '';
  $('hud').textContent = app.editing ? 'Editing — click/drag to paint'
    : q ? `Level ${q.depth}  ·  ${'♥'.repeat(q.hearts)}${'♡'.repeat(Math.max(0, q.maxHearts - q.hearts))}  ·  ◆ ${q.gems}`
        + (app.map.keyMask ? (hasAllKeys(app.map, v) ? '  ·  🔑 ✓' : '  ·  🔑 needed') : '') + (gemTotal(map) ? `  ·  gems ${gemCount(map, v)}/${gemTotal(map)}` : '')
    : ta ? (ta.deadline === Infinity ? `Free moves: ${CONFIG.timeAttack.freeCards - ta.plays}  ·  ` : '') + `Distance ${ta.dist}  ·  ${'♥'.repeat(Math.max(0, ta.hearts))}${'♡'.repeat(Math.max(0, CONFIG.timeAttack.hearts - ta.hearts))}`
      + (CONFIG.timeAttack.gemsPerHeart ? `  ·  ◆ ${ta.gemMeter || 0}/${CONFIG.timeAttack.gemsPerHeart}${ta.gemMeter >= CONFIG.timeAttack.gemsPerHeart ? ' spare ♥' : ''}` : `  ·  ◆ ${ta.gems}`)
    : (run ? `Level ${run.depth}  ·  ${'♥'.repeat(run.hearts)}${'♡'.repeat(Math.max(0, CONFIG.run.hearts - run.hearts))}  ·  Steps left ${run.steps}  ·  `
        + (CONFIG.features.gems ? `Score ${run.score}  ·  ` : '') : '')
      + (map.keyMask ? (hasAllKeys(map, v) ? '🔑 ✓  ·  ' : '🔑 needed  ·  ') : '')
      + (gemTotal(map) ? `◆ ${gemCount(map, v)}/${gemTotal(map)}  ·  ` : '')
      + `Turn ${v.turn}  ·  facing ${v.dir > 0 ? '→' : '←'}`;
  requestAnimationFrame(draw);
}

// Squash/stretch, lean and idle life for the player, from the animated view
function playerFx(v) {
  const now = performance.now(), clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
  let sx = 1, sy = 1, rot = 0, lift = 0, blink = false;
  if (v.air) { const st = clamp(Math.abs(v.vy || 0) * .02, 0, .2); sy += st; sx -= st * .6; }     // stretch in the air
  const ls = clamp(1 - (now - (v.landT || 0)) / 240, 0, 1);                                         // squash on landing
  if (ls) { const w = Math.sin(ls * Math.PI) * ls; sy -= .26 * w; sx += .2 * w; }
  rot = clamp((v.vx || 0) * .025, -.16, .16);                                                      // lean into the move
  if (!v.air && v.bob) lift = Math.abs(Math.sin(v.bob)) * .07;                                      // footsteps
  if (!app.running && v.status === 'playing') {
    sy += Math.sin(now / 520) * .018; sx -= Math.sin(now / 520) * .01;                              // breathing
    blink = now % 3400 < 120;
  }
  sx *= Math.max(.15, v.flip ?? 1);                                                                 // turning around
  return { sx, sy, rot, lift, blink };
}

function drawPlayer(x, y, dir, status, alpha, fx = { sx: 1, sy: 1, rot: 0, lift: 0 }) {
  if (Art.lowRes) return Pixel.hero(ctx, x, y, dir, status, alpha, fx);   // pixel art: rebuilt in pixels at this squash/stretch (pixel.js)
  const s = TS * .72;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate((x + .5) * TS, (y + 1 - fx.lift) * TS);   // pivot at the feet
  ctx.rotate(fx.rot); ctx.scale(fx.sx, fx.sy);
  ctx.fillStyle = status === 'dead' ? '#ff6b6b' : '#ffcc33';
  ctx.strokeStyle = '#3a2e10'; ctx.lineWidth = Math.max(1.5, TS / 20);
  roundRect(-s / 2, -s, s, s, TS * .14); ctx.fill(); ctx.stroke();
  // eyes look in facing direction
  const ex = dir * s * .14, ey = -s * .62;
  ctx.fillStyle = '#3a2e10';
  if (status === 'dead') {
    ctx.font = `bold ${Math.floor(TS * .25)}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText('x x', ex, ey + TS * .08);
  } else {
    const eh = fx.blink ? s * .03 : s * .2;
    ctx.fillRect(ex - s * .2, ey - eh / 2, s * .1, eh);
    ctx.fillRect(ex + s * .08, ey - eh / 2, s * .1, eh);
    if (status === 'won') { ctx.beginPath(); ctx.arc(ex, ey + s * .22, s * .14, 0, Math.PI); ctx.stroke(); }
  }
  ctx.restore();
}
// Small static picture of a level (used for the roguelite "next level" preview).
function drawMini(level, canvas, t = 9) {
  const m = parseLevel(level), c = canvas.getContext('2d');
  canvas.width = m.w * t; canvas.height = m.h * t; canvas.className = 'mini';
  c.fillStyle = '#9fd6fa'; c.fillRect(0, 0, m.w * t, m.h * t);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const ch = m.grid[y][x];
    if (ch === '#') { c.fillStyle = y && m.grid[y - 1][x] !== '#' ? '#5cb85c' : '#8b5a2b'; c.fillRect(x * t, y * t, t, t); }
    if (ch === 'I') { c.fillStyle = '#bfe8ff'; c.fillRect(x * t, y * t, t, t); }
    if (ch === 'S') { c.fillStyle = '#e8434b'; c.fillRect(x * t, y * t + t * .2, t, t * .8); }
    if (ch === '=') { c.fillStyle = '#a0703c'; c.fillRect(x * t, y * t, t, t * .3); }
    if (ch === 'Y') { c.fillStyle = '#4f9a4a'; c.fillRect(x * t + t * .3, y * t, t * .4, t); }
    if (ch === '>' || ch === '<') { c.fillStyle = '#4d5363'; c.fillRect(x * t, y * t, t, t); c.fillStyle = '#e8434b'; c.fillRect(x * t + (ch === '>' ? t * .7 : 0), y * t, t * .3, t); }
    if (ch === '^' || ch === 't') { c.fillStyle = ch === '^' ? '#cfd5df' : '#ff8c42'; c.beginPath(); c.moveTo(x * t, y * t + t); c.lineTo(x * t + t / 2, y * t + t * .3); c.lineTo(x * t + t, y * t + t); c.fill(); }
  }
  const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(x * t + t * .2, y * t + t * .2, t * .6, t * .6); };
  m.crates.forEach((k) => dot(k.x, k.y, '#c68a3f'));
  (m.enemies || []).forEach((k) => dot(k.x, k.y, '#8e5bd6'));
  m.items.forEach((it) => dot(it.x, it.y, it.t === 'K' ? '#ffcc33' : '#4fd8e8'));
  dot(m.goal.x, m.goal.y, m.keyMask ? '#7a4d23' : '#e8434b');
  dot(m.start.x, m.start.y, '#ffcc33');
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* =====================================================================
   Rendering — cards (DOM)
   ===================================================================== */
function cardIcon(id, card = CARDS[id]) {
  if (card.echo) return '<svg width="44" height="40" viewBox="0 0 44 40"><path d="M32 12a12 12 0 1 0 3 10" fill="none" stroke="#5b3fd1" stroke-width="3" stroke-linecap="round"/><path d="M34 4v9h-9" fill="none" stroke="#5b3fd1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="22" y="25" font-size="10" font-weight="700" text-anchor="middle" fill="#5b3fd1">×2</text></svg>';
  if (card.moves[0].type === 'climb') return '<svg width="44" height="40" viewBox="0 0 44 40"><rect x="22" y="14" width="14" height="25" rx="2" fill="#8b5a2b"/><rect x="22" y="14" width="14" height="4" fill="#5cb85c"/><rect x="8" y="29" width="10" height="10" rx="2" fill="#ffcc33"/><path d="M13 29V7h16v3" fill="none" stroke="#2a2a2a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="29" cy="10" r="2.5" fill="#2a2a2a"/></svg>';
  if (card.moves[0].type === 'turn') return '<svg width="44" height="40" viewBox="0 0 44 40"><path d="M10 14h22l-6-6M34 26H12l6 6" fill="none" stroke="#2a2a2a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (card.moves[0].type === 'wait') return '<svg width="44" height="40" viewBox="0 0 44 40"><path d="M14 6h16M14 34h16M16 6c0 10 12 10 12 14S16 24 16 34M28 6c0 10-12 10-12 14s12 4 12 14" fill="none" stroke="#2a2a2a" stroke-width="2.5" stroke-linecap="round"/></svg>';
  // trace the path on a mini grid
  const pts = [[0, 0]]; let x = 0, y = 0;
  for (const m of card.moves) for (const [dx, dy] of m.path) { x += dx; y += dy; pts.push([x, y]); }
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1])), maxX = Math.max(...pts.map((p) => p[0]));
  const cols = maxX + 1, rows = maxY - minY + 1, c = Math.min(17, 64 / cols, 52 / rows);
  const wpx = cols * c, hpx = rows * c;
  let cells = '';
  pts.forEach(([px, py], i) => {
    cells += `<rect x="${px * c + 1}" y="${(py - minY) * c + 1}" width="${c - 2}" height="${c - 2}" rx="2" fill="${i === 0 ? '#ffcc33' : '#d8cfb8'}"/>`;
  });
  const line = pts.map(([px, py]) => `${px * c + c / 2},${(py - minY) * c + c / 2}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  // Dash: a little impact burst at the end, hinting that it bowls patrollers over
  const ex = lx * c + c / 2, ey = (ly - minY) * c + c / 2;
  const burst = card.moves.some((m) => m.plow) ? `<g stroke="#e43b44" stroke-width="2" stroke-linecap="round">${[[0, -1], [.8, -.8], [1, 0], [.8, .8], [0, 1]].map(([a, b]) => `<line x1="${ex + a * 5}" y1="${ey + b * 5}" x2="${ex + a * 8}" y2="${ey + b * 8}"/>`).join('')}</g>` : '';
  return `<svg width="${wpx + (burst ? 8 : 0)}" height="${hpx}" viewBox="${burst ? -4 : 0} 0 ${wpx + (burst ? 8 : 0)} ${hpx}" overflow="visible">${cells}${burst}
    <polyline points="${line}" fill="none" stroke="#2a2a2a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${lx * c + c / 2}" cy="${(ly - minY) * c + c / 2}" r="3" fill="#2a2a2a"/></svg>`;
}

// What a card does once perks are applied (shop-run roguelite); plain CARDS otherwise
function effectiveCard(id, live = true) {
  const d = CARDS[id], mods = app.mode === 'quest' && app.q ? Quest.mods() : {};
  if (live && app.mode === 'time' && app.map?.momentum && app.state) {      // Endless: show what momentum would do right now
    const m = momentumMoves(app.map, app.state, id);
    if (m.combo) return { ...d, moves: m.moves, boosted: true, combo: m.combo };
  }
  if (mods.walkExtra && id.startsWith('walk')) return { ...d, moves: [...d.moves, step], boosted: true };
  if (mods.jumpExtra && id === 'jump') return { ...d, moves: [{ path: [...d.moves[0].path, [1, 0]] }], boosted: true };
  return d;
}
// A small inline picture of a card (the pixel card itself), for text that refers to specific cards
const cardChip = (id) => `<img class="chip" alt="${CARDS[id].name}" title="${CARDS[id].name}" src="${PixelCard.url(id, effectiveCard(id))}">`;   // sized in style.css (.chip)
// A card: the pixel card picture (pixel.js), plus its slot number in the sequence
function cardEl(c, cls = '', idx, def) {
  const d = def || effectiveCard(c.id, !cls.includes('preview') && !cls.includes('last'));   // Next/Last cards aren't affected by the current momentum
  const el = document.createElement('div');
  el.className = 'card ' + cls;
  el.title = d.combo ? `${d.name} (${d.combo})` : d.name;
  el.appendChild(PixelCard.canvas(c.id, d, { lucky: app.mode === 'time' && c.lucky }));
  if (d.combo || d.boosted) el.classList.add('boosted');
  return el;
}
// Plan & Run hand: matching cards share one stack with a ×n tag; tapping or dragging takes the top one
function stackEl(cards, cls) {
  const el = cardEl(cards[0], cls + ' stack');
  for (let k = 1; k < Math.min(3, cards.length); k++) {     // the cards underneath peek out behind
    const under = PixelCard.canvas(cards[k].id); under.className = 'pcard under'; under.style.setProperty('--k', k);
    el.prepend(under);
  }
  if (cards.length > 1) { const b = PixelCard.badge(cards.length); el.appendChild(b); }
  return el;
}

function renderDeck() {
  const seqBox = $('seq'), handBox = $('hand'), act = $('seqActions');
  seqBox.innerHTML = ''; handBox.innerHTML = ''; act.innerHTML = '';
  const C = ctrl();
  const quest = app.mode === 'quest';
  const instant = app.mode !== 'plan' && !quest;
  const time = app.mode === 'time';
  if (time) $('seqLabel').innerHTML = '';
  else $('seqLabel').innerHTML = quest ? `Your plan<small>${Quest.owned()}/${Quest.handLimit()} cards · drag to reorder, tap to sell</small>`
    : instant ? 'Played'
    : 'Sequence<small>tap a card to remove · drag to reorder</small>';
  const r = app.mode === 'run' && app.run;
  const peekN = r && r.draw ? CONFIG.run.peek : 0;
  const peek = peekN ? r.draw.slice(-peekN).reverse().map((c) => cardChip(c.id)) : [];
  while (peek.length < peekN) peek.push('<b>?</b>');   // will come from a reshuffle
  if (quest) $('handLabel').innerHTML = `Hand<small>${Quest.owned()}/${Quest.handLimit()} cards</small>`;
  else if (time) {
    const st = app.state || {}, mom = app.map?.momentum;
    const tip = !mom ? '' : (st.streak || 0) >= 2 ? '▶▶▶ next Walk sprints' : st.lastKind === 'run' ? '▶ run-up: jumps go further' : st.lastKind === 'jump' ? '⤴ next jump goes higher' : '';
    $('handLabel').innerHTML = 'Hand' + (tip ? `<small class="mom">${tip}</small>` : '');
  }
  else if (app.mode === 'plan') $('handLabel').innerHTML = 'Hand<small>tap or drag into a slot</small>';
  else $('handLabel').innerHTML = r && r.draw
    ? `Hand<small>draw ${r.draw.length} · discard ${r.discard.length} · deck ${r.deck.length}</small>`
      + (peekN ? `<small>Next up:</small><span class="peek">${peek.join('')}</span>` : '')
      + (r.cycling ? '<small style="color:var(--bad)">Tap the card to swap out</small>' : '')
    : 'Hand';
  $('levelSel').style.visibility = app.mode === 'run' || time || quest ? 'hidden' : '';
  $('editBtn').disabled = app.mode === 'run' || time || quest;
  const list = time ? [] : instant ? app.played : app.seq;   // Endless shows the Next card instead
  if (time) {                    // Endless: the card you just played on the left, the next one on the right
    const side = (label, card, cls) => {
      const box = Object.assign(document.createElement('div'), { className: 'pile ' + cls });
      box.innerHTML = `<div class="pile-label">${label}</div>`;
      if (card) box.appendChild(cardEl(card, cls));
      else box.insertAdjacentHTML('beforeend', '<div class="slot"></div>');
      seqBox.appendChild(box);
    };
    side('Last', app.played[app.played.length - 1], 'last');
    if (app.ta?.next) side('Next', { id: app.ta.next }, 'preview');
  }
  if (app.mode === 'plan') {
    // the plan in order, then dashed outlines for the cards still to place
    // walk through the sequence so each card shows what it will really do, momentum included
    let sim = app.map && initialState(app.map);
    for (let i = 0; i < app.level.cards.length; i++) {
      const c = app.seq[i];
      if (!c) {
        sim = null;                                  // a gap: we can't tell what comes after
        const sl = Object.assign(document.createElement('div'), { className: 'slot' });
        sl.dataset.slot = i; seqBox.appendChild(sl); continue;
      }
      let cls = '';
      if (i < app.cursor) cls = (i === app.cursor - 1 && app.state.status === 'dead') ? 'failed' : 'done';
      if (app.running && i === app.cursor) cls = 'active';
      let def;
      if (sim) {
        const mm = momentumMoves(app.map, sim, c.id);
        if (mm.combo) def = { ...CARDS[c.id], moves: mm.moves, boosted: true, combo: mm.combo };
        if (sim.status === 'playing') sim = runCard(app.map, sim, c.id).state;
        else {
          // the run would already be over, but keep showing momentum from the card order alone
          // (so the preview never gives away where a plan fails)
          const resolved = CARDS[c.id].echo ? (sim.last || 'wait') : c.id;
          sim = { ...sim, last: CARDS[c.id].echo ? sim.last : c.id };
          carryMomentum(sim, resolved);
        }
      }
      const el = cardEl(c, cls, i + 1, def);
      el.dataset.slot = i;
      el.onclick = Drag.tap(() => C.clickSeq(c.uid));
      Drag.attach(el, { src: 'seq', uid: c.uid, id: c.id });
      seqBox.appendChild(el);
    }
  } else list.forEach((c, i) => {
    let cls = '';
    if (!instant) {
      if (i < app.cursor) cls = (i === app.cursor - 1 && app.state.status === 'dead') ? 'failed' : 'done';
      if (app.running && i === app.cursor) cls = 'active';
    } else if (app.running && i === list.length - 1) cls = 'active';
    const el = cardEl(c, cls, time ? app.played.length : i + 1);
    el.onclick = Drag.tap(() => C.clickSeq(c.uid));
    Drag.attach(el, { src: 'seq', uid: c.uid, id: c.id });
    seqBox.appendChild(el);
  });
  $('timer').style.display = time && Art.style() !== 'pixel' ? 'block' : 'none';   // pixel style: the timer is drawn on the level (Pixel.hud)
  document.body.classList.toggle('endless', time);
  $('hintBox').style.display = app.mode === 'plan' && app.hintText ? 'block' : 'none';
  if (app.hintHtml && app.hintText === 'cards') $('hintBox').innerHTML = `💡 ${app.hintHtml}`;
  else $('hintBox').textContent = app.hintText ? `💡 ${app.hintText}` : '';
  if (quest && !list.length) seqBox.innerHTML = '<span style="color:var(--muted)">Tap or drag cards from the shop to add them to your plan.</span>';
  if (quest) seqBox.querySelectorAll('.card').forEach((el, i) => {
    const c = list[i];
    el.insertAdjacentHTML('afterbegin', `<span class="price">${c.paid}◆</span>`);
    el.title = `${el.title}\nDrag to reorder · tap or drag off to sell back for ${c.paid}◆`;
  });
  if (app.mode === 'plan') {      // matching cards stack, in the order they first appear
    const groups = [];
    for (const c of app.hand) { const g = groups.find((x) => x[0].id === c.id); g ? g.push(c) : groups.push([c]); }
    for (const g of groups) {
      const top = g[g.length - 1], el = stackEl(g, top.id === app.hintNext ? 'hinted' : '');   // take the last one, so the stack keeps its place
      el.onclick = Drag.tap(() => C.clickHand(top.uid)); handBox.appendChild(el);
      Drag.attach(el, { src: 'hand', uid: top.uid, id: top.id });
    }
  } else app.hand.forEach((c, i) => {
    const el = cardEl(c, app.mode === 'run' && app.run?.cycling ? 'cycling' : '');
    if (time && c.lucky) { el.classList.add('lucky'); el.title = 'Lucky card: dealt so you always have a way forward'; }   // drawn gold by PixelCard
    if (time && app.enter?.has(c.uid)) el.classList.add('enter');
    if (time) el.insertAdjacentHTML('afterbegin', `<span class="key">${i + 1}</span>`);
    el.onclick = Drag.tap(() => C.clickHand(c.uid)); handBox.appendChild(el);
    Drag.attach(el, { src: 'hand', uid: c.uid, id: c.id });
    if (quest && !app.running) {
      const sell = Object.assign(document.createElement('span'), { className: 'sell', textContent: `sell ${c.paid}◆` });
      sell.onclick = (e) => { e.stopPropagation(); Quest.sell(c.uid); };
      el.appendChild(sell);
    }
  });
  app.enter = null;                    // new cards animate in once, not on every redraw
  // shop lane + perks (shop-run roguelite)
  $('shopLane').style.display = quest && app.q?.route ? 'flex' : 'none';
  $('shopLane').style.order = quest ? -2 : '';   // shop → hand → sequence, in the order you use them
  $('handLane').style.order = quest ? -1 : '';
  $('handLane').style.display = quest ? 'none' : '';   // shop run: cards go straight into the plan
  $('perkBar').style.display = quest && app.q?.perks.length ? 'flex' : 'none';
  if (quest && app.q) {
    const q = app.q, shop = $('shop'); shop.innerHTML = '';
    for (const id of q.route?.stock || []) {
      const price = Quest.price(id), ok = q.gems >= price && Quest.owned() < Quest.handLimit() && !app.running;
      const el = cardEl({ id }, ok ? '' : 'cant');
      el.insertAdjacentHTML('afterbegin', `<span class="price">${price}◆</span>`);
      el.onclick = Drag.tap(() => Quest.buy(id));
      if (ok) Drag.attach(el, { src: 'shop', id });
      shop.appendChild(el);
    }
    $('shopLabel').innerHTML = `Shop<small>◆ ${q.gems} to spend</small>`;
    $('perkBar').innerHTML = 'Perks: ' + q.perks.map((p) => `<span title="${CONFIG.quest.perks[p].desc}">${CONFIG.quest.perks[p].name}</span>`).join('');
  }
  if (!app.hand.length) handBox.innerHTML = `<span style="color:var(--muted)">${quest && !Quest.owned() ? 'Buy cards from the shop below.' : 'No cards left in hand.'}</span>`;
  $('play').classList.toggle('locked', app.running);
  for (const [label, cls, fn, disabled] of C.actions()) {
    const b = PixelUI.button(document.createElement('button'), label, cls === 'primary'); b.disabled = disabled; b.onclick = fn; act.appendChild(b);
  }
  if (app.playtesting) { const b = PixelUI.button(document.createElement('button'), '✎ Back to editor'); b.onclick = () => setEditing(true); act.appendChild(b); }
  document.querySelectorAll('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === app.mode));
}

/* =====================================================================
   Drag & drop for cards (Plan & Run and shop-run Roguelite)
   Pointer events, so mouse and touch behave the same. On touch a card lifts
   after a short hold, so a quick swipe still scrolls the card area.
   - hand/shop → plan: add (buy) at the drop position
   - plan → plan: reorder
   - plan → anywhere else: back to hand (Plan) / sell (Roguelite)
   Taps still work; a tap right after a drag is ignored.
   ===================================================================== */
const Drag = {
  HOLD_MS: 150, MOVE_PX: 6, lastDrop: 0,
  GAP: 16,                                   // how far the plan's cards move aside (CSS px): 8 UI pixels, set by uiPixel(); matches .make-room in style.css
  cur: null,
  attach(el, info) {
    if (!(app.mode === 'plan' || app.mode === 'quest') || app.running) return;
    el.addEventListener('pointerdown', (e) => Drag.down(e, el, info));
  },
  // wraps a tap handler so the click that follows a drop is ignored
  tap: (fn) => () => { if (performance.now() - Drag.lastDrop > 350) fn(); },
  down(e, el, info) {
    if (e.button > 0 || Drag.cur) return;
    const d = Drag.cur = { el, info, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', live: false, id: e.pointerId };
    if (d.touch) d.timer = setTimeout(() => Drag.cur === d && Drag.lift(), Drag.HOLD_MS);
  },
  move(e) {
    const d = Drag.cur;
    if (!d || e.pointerId !== d.id) return;
    d.x = e.clientX; d.y = e.clientY;
    const dist = Math.hypot(d.x - d.x0, d.y - d.y0);
    if (!d.live) {
      if (d.touch) { if (dist > 10) Drag.cancel(); }            // moved before the hold finished: it's a scroll
      else if (dist > Drag.MOVE_PX) Drag.lift();
      return;
    }
    Drag.position();
  },
  lift() {
    const d = Drag.cur, r = d.el.getBoundingClientRect();
    d.live = true; d.dx = d.x0 - r.left; d.dy = d.y0 - r.top + (d.touch ? 56 : 0);   // on touch, float the card above your finger
    d.ghost = d.el.cloneNode(true);
    d.ghost.classList.add('drag-ghost');
    const planned = app.seq.find((c) => c && c.uid === d.info.uid);
    d.ghost.dataset.out = app.mode === 'quest' ? `Sell ${planned?.paid ?? ''}◆` : 'Back to hand';   // shown when dragged off the plan
    Object.assign(d.ghost.style, { width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(d.ghost);
    d.el.classList.add('dragging');
    // measure the plan's cards once, now (with the lifted card out of the row), so the drop point and the
    // bar never chase the cards as they move aside
    if (d.info.src === 'seq') d.el.classList.add('lifted');
    const row = $('seq');
    d.snap = { scroll: row.scrollLeft, cards: [...row.querySelectorAll('.card')].filter((c) => c !== d.el).map((el) => ({ el, r: el.getBoundingClientRect() })) };
    if (navigator.vibrate) navigator.vibrate(10);
    // keep scrolling the plan row while the card is held near its left/right edge (phones)
    d.auto = setInterval(() => {
      const row = $('seq'), r = row.getBoundingClientRect();
      if (d.y < r.top - 30 || d.y > r.bottom + 30) return;
      const dx = d.x < r.left + 36 ? -8 : d.x > r.right - 36 ? 8 : 0;
      if (dx) { row.scrollLeft += dx; Drag.position(); }
    }, 16);
    Drag.position();
  },
  // where in the plan would the card land? (index among the other planned cards)
  slot() {
    const d = Drag.cur, lane = $('seq').getBoundingClientRect();
    const over = d.x >= lane.left - 20 && d.x <= lane.right + 20 && d.y >= lane.top - 30 && d.y <= lane.bottom + 30;
    if (!over) return null;
    const shift = d.snap.scroll - $('seq').scrollLeft;      // the row may have scrolled since we measured
    const cards = d.snap.cards.map(({ el, r }) => ({ el, left: r.left + shift, right: r.right + shift, top: r.top, bottom: r.bottom }));
    let at = 0;
    for (const c of cards) if (d.y > c.bottom + 4 || (d.y >= c.top - 4 && d.x > (c.left + c.right) / 2)) at++;
    return { at, cards };
  },
  position() {
    const d = Drag.cur, marker = $('dropMarker');
    d.ghost.style.left = (d.x - d.dx) + 'px'; d.ghost.style.top = (d.y - d.dy) + 'px';
    const s = Drag.slot();
    $('seq').classList.toggle('drop-target', !!s);
    d.ghost.classList.toggle('out', !s && d.info.src === 'seq');
    if (!s) {
      marker.style.display = 'none';
      d.snap.cards.forEach(({ el }) => el.classList.remove('make-room'));
      return;
    }
    // every card from the drop point on slides right together, opening a gap (so nothing overlaps)
    d.snap.cards.forEach(({ el }, i) => el.classList.toggle('make-room', i >= s.at));
    const prev = s.cards[s.at - 1], next = s.cards[s.at], gap = Drag.GAP;
    let x, top, h;
    if (prev && next) { x = (prev.right + next.left + gap) / 2 - 2; top = next.top; h = next.bottom - next.top; }
    else if (next) { x = next.left + gap / 2 - 2; top = next.top; h = next.bottom - next.top; }
    else if (prev) { x = prev.right + gap / 2; top = prev.top; h = prev.bottom - prev.top; }
    else { const lane = $('seq').getBoundingClientRect(); x = lane.left + 4; top = lane.top; h = 88; }
    Object.assign(marker.style, { display: 'block', left: x + 'px', top: top + 'px', height: h + 'px' });
  },
  up(e) {
    const d = Drag.cur;
    if (!d || e.pointerId !== d.id) return;
    clearTimeout(d.timer);
    if (!d.live) { Drag.cur = null; return; }    // never lifted: let the normal tap happen
    const s = Drag.slot(), { src, uid, id } = d.info;
    Drag.cleanup();
    Drag.lastDrop = performance.now();
    if (src === 'seq') {
      if (s) (app.mode === 'quest' ? Quest.moveTo : Plan.moveTo)(uid, s.at);
      else app.mode === 'quest' ? Quest.sell(uid) : Plan.clickSeq(uid);
    } else if (s) {
      if (src === 'shop') Quest.buy(id, s.at); else Plan.clickHand(uid, s.at);
    }
  },
  cancel() { clearTimeout(Drag.cur?.timer); Drag.cleanup(); },
  cleanup() {
    const d = Drag.cur;
    if (d) { clearInterval(d.auto); d.ghost?.remove(); d.el.classList.remove('dragging', 'lifted'); }
    document.querySelectorAll('.make-room').forEach((n) => n.classList.remove('make-room'));
    $('dropMarker').style.display = 'none'; $('seq').classList.remove('drop-target');
    document.querySelectorAll('.drop-here').forEach((n) => n.classList.remove('drop-here'));
    Drag.cur = null;
  },
};
document.addEventListener('pointermove', Drag.move);
document.addEventListener('pointerup', Drag.up);
document.addEventListener('pointercancel', () => Drag.cancel());   // the browser took over (e.g. started scrolling): put the card back
// while a card is lifted, stop the page from scrolling under your finger (iOS needs a non-passive listener)
document.addEventListener('touchmove', (e) => { if (Drag.cur?.live) e.preventDefault(); }, { passive: false });

function showBanner(title, text, buttons, extra) {
  const b = $('banner'), h2 = b.querySelector('h2'), up = title.toUpperCase();
  // the title in the pixel font: green for a win, yellow otherwise (the big font if it fits, else the small one)
  h2.textContent = '';
  if (PixelUI.supported(up, 'big')) {
    const win = /complete|cleared|best/i.test(title), size = (PixelFont.width(up, 'big') + 2) * UI.px() + 40 < Math.min(innerWidth - 40, 560) ? 'big' : 'small';
    h2.appendChild(PixelUI.text(up, win ? '#a6f0c0' : '#fee761', size, '#181425'));
  } else h2.textContent = title;
  h2.setAttribute('aria-label', title);
  b.querySelector('p').textContent = text;
  b.querySelectorAll(':scope > .extra, :scope > .reward, :scope > .routes, :scope > .badges').forEach((n) => n.remove());
  if (extra) b.querySelector('.row').before(extra);
  b.classList.toggle('wide', !!extra && !extra.classList.contains('badges'));   // card choices get the whole screen, not just the game area
  const row = b.querySelector('.row'); row.innerHTML = '';
  buttons.forEach(([label, fn, plain], i) => { const btn = PixelUI.button(document.createElement('button'), label, !i && !plain); btn.onclick = fn; row.appendChild(btn); });
  b.style.display = 'block';
  b.classList.remove('float');
  if (b.scrollHeight > $('stage').clientHeight - 8) b.classList.add('float');   // too tall for the game area (small phones): centre it on the screen
  document.body.classList.add('banner-on');          // dims the level a little behind the message
}
function hideBanner() { $('banner').style.display = 'none'; document.body.classList.remove('banner-on'); }

function refreshLevelSelect() {
  const sel = $('levelSel'); sel.innerHTML = '';
  for (const { key, level } of allLevels()) {
    const o = document.createElement('option'); o.value = key; o.textContent = (key[0] === 'c' ? '★ ' : '') + level.name; sel.appendChild(o);
  }
  if (!allLevels().some((l) => l.key === app.levelKey)) {   // a new level you haven't saved yet
    const o = document.createElement('option'); o.value = app.levelKey; o.textContent = 'New: ' + (app.level?.name || 'level'); sel.prepend(o);
  }
  sel.value = app.levelKey;
}

/* =====================================================================
   Editor
   ===================================================================== */
const TILES = [
  ['.', 'Empty', '#7ec8f7'], ['#', 'Ground', '#8b5a2b'], ['^', 'Spikes', '#cfd5df'],
  ['t', 'Timed spikes', '#ff8c42'], ['P', 'Player start', '#ffcc33'], ['G', 'Goal', '#e8434b'],
  ...(CONFIG.features.crates ? [['C', 'Crate', '#c68a3f']] : []),
  ...(CONFIG.features.keys ? [['K', 'Key', '#ffcc33']] : []),
  ...(CONFIG.features.gems ? [['*', 'Gem', '#4fd8e8']] : []),
  ...(CONFIG.features.ice ? [['I', 'Ice', '#bfe8ff']] : []),
  ...(CONFIG.features.platforms ? [['=', 'Platform', '#a0703c']] : []),
  ...(CONFIG.features.springs ? [['S', 'Spring', '#e8434b']] : []),
  ...(CONFIG.features.sideSprings ? [['>', 'Bumper →', '#e8434b'], ['<', 'Bumper ←', '#e8434b']] : []),
  ...(CONFIG.features.cacti ? [['Y', 'Cactus', '#4f9a4a']] : []),
  ...(CONFIG.features.enemies ? [['E', 'Patroller', '#8e5bd6']] : []),
];
let hover = null, painting = false;
function setEditing(on) {
  app.editing = on; app.playtesting = false;
  $('play').style.display = on ? 'none' : '';
  $('editor').style.display = on ? 'flex' : 'none';
  document.body.classList.toggle('editing', on);
  setTitle();
  if (on) { hideBanner(); renderEditor(); }
  else { app.hand = app.level.cards.map((id) => ({ uid: uidSeq++, id })); app.seq = []; app.played = []; app.history = []; resetRun(); }
}
function playtest() {
  setEditing(false);
  app.playtesting = true; // shows a "back to editor" button
  setTitle();
  renderDeck();
}

function renderEditor() {
  $('edName').value = app.level.name;
  $('edTheme').value = Art.themeName();
  const lw = Math.max(...app.level.map.map((r) => r.length)), lh = app.level.map.length;
  $('edSize').value = LEVEL_SIZES.find(([, w, h]) => w === lw && h === lh)?.[0] || '';
  const tiles = $('edTiles'); tiles.innerHTML = '';
  for (const [ch, label, col] of TILES) {
    const b = document.createElement('button');
    b.innerHTML = `<i style="background:${col}"></i>${label}`;
    b.classList.toggle('on', app.paint === ch);
    b.onclick = () => { app.paint = ch; renderEditor(); };
    tiles.appendChild(b);
  }
  const cc = $('edCards'); cc.innerHTML = '';
  for (const id in CARDS) {
    const n = app.level.cards.filter((c) => c === id).length;
    const name = document.createElement('span'); name.textContent = CARDS[id].label;
    const minus = document.createElement('button'); minus.textContent = '−';
    const num = document.createElement('span'); num.className = 'n'; num.textContent = n;
    const plus = document.createElement('button'); plus.textContent = '+';
    minus.onclick = () => { const i = app.level.cards.lastIndexOf(id); if (i >= 0) app.level.cards.splice(i, 1); renderEditor(); };
    plus.onclick = () => { if (app.level.cards.length < 12) app.level.cards.push(id); renderEditor(); };
    cc.append(name, minus, num, plus);
  }
  $('edDelete').disabled = app.levelKey[0] !== 'c';
}

function paintAt(x, y) {
  const lw = Math.max(...app.level.map.map((r) => r.length)), lh = app.level.map.length;
  const rows = app.level.map.map((r) => r.padEnd(lw, '.').slice(0, lw).split(''));
  while (rows.length < lh) rows.push('.'.repeat(lw).split(''));
  if (app.paint === 'P' || app.paint === 'G') rows.forEach((r) => r.forEach((c, i) => { if (c === app.paint) r[i] = '.'; }));
  rows[y][x] = app.paint;
  app.level.map = rows.map((r) => r.join(''));
  $('solveOut').textContent = '';
}
function cellFromEvent(e) {
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / TS), y = Math.floor((e.clientY - r.top) / TS);
  return x >= 0 && x < W && y >= 0 && y < H ? { x, y } : null;
}
// wide levels: drag the level sideways to look around while planning
let look = null;
cv.addEventListener('pointerdown', (e) => {
  if (app.editing || app.running || app.mode !== 'plan' || !app.map || app.map.w <= W) return;
  look = { x: e.clientX, cam: app.cam }; cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => { if (look) app.camHold = Math.max(0, Math.min(app.map.w - W, look.cam - (e.clientX - look.x) / TS)); });
cv.addEventListener('pointerup', () => { look = null; });
cv.addEventListener('pointercancel', () => { look = null; });
cv.addEventListener('pointerdown', (e) => { if (!app.editing) return; painting = true; cv.setPointerCapture(e.pointerId); const c = cellFromEvent(e); if (c) paintAt(c.x, c.y); });
cv.addEventListener('pointermove', (e) => {
  if (!app.editing) { hover = null; return; }
  hover = cellFromEvent(e); if (painting && hover) paintAt(hover.x, hover.y);
});
cv.addEventListener('pointerup', () => { painting = false; });
cv.addEventListener('pointerleave', () => { hover = null; });

$('edName').oninput = (e) => { app.level.name = e.target.value; };
$('edTheme').onchange = (e) => { app.level.theme = e.target.value; };
$('edSize').innerHTML = LEVEL_SIZES.map(([n, w, h]) => `<option value="${n}">${n} · ${w}×${h}${w > VIEW_MAX_W ? ' (scrolls)' : ''}</option>`).join('');
$('edSize').onchange = (e) => {
  const [, w, h] = LEVEL_SIZES.find(([n]) => n === e.target.value);
  resizeLevel(app.level, w, h); $('solveOut').textContent = '';
};   // saved with the level; any tile works in any location
$('edPlay').onclick = playtest;
$('edSolve').onclick = () => {
  const t0 = performance.now();
  const { solutions, explored, gemTotal: gems } = solve(app.level);
  const ms = Math.round(performance.now() - t0);
  const names = (s) => s.map((id) => CARDS[id].label).join(' → ') + (gems ? `  (◆${s.gems})` : '');
  solutions.sort((a, b) => b.gems - a.gems || a.length - b.length);   // gem routes first
  const allGems = solutions.filter((x) => x.gems === gems).length;
  $('solveOut').textContent = solutions.length
    ? `${solutions.length}${solutions.length >= 200 ? '+' : ''} solution(s) (${explored} card plays checked, ${ms}ms).\n` +
      (gems ? `${allGems} of them collect all ${gems} gem(s)${allGems && allGems < solutions.length ? ' — a proper "hard way"' : allGems ? ' — gems are unavoidable, so no challenge' : ' — gems are unreachable'}.\n` : '') +
      solutions.slice(0, 4).map((s, i) => `${i + 1}. ${names(s)}`).join('\n') + (solutions.length > 4 ? '\n…' : '')
    : `No solution found (${explored} card plays checked).`;
};
$('edSave').onclick = () => {
  if (app.levelKey[0] === 'c') app.custom[+app.levelKey.slice(1)] = clone(app.level);
  else { if (BUILTIN_LEVELS.some((l) => l.name === app.level.name)) app.level.name += ' (copy)'; app.custom.push(clone(app.level)); app.levelKey = 'c' + (app.custom.length - 1); }
  store.set('cardclimber.custom', app.custom);
  refreshLevelSelect(); renderEditor();
  $('solveOut').textContent = 'Saved to this browser.';
};
$('edNew').onclick = () => {
  app.level = blankLevel(16, 9);
  app.levelKey = 'new'; refreshLevelSelect(); renderEditor();
};
$('edDelete').onclick = () => {
  if (app.levelKey[0] !== 'c' || !confirm(`Delete "${app.level.name}"?`)) return;
  app.custom.splice(+app.levelKey.slice(1), 1); store.set('cardclimber.custom', app.custom);
  loadLevel('b0'); renderEditor();
};
$('edIO').onclick = () => {
  $('ioText').value = JSON.stringify(app.level, null, 1).replace(/\n\s+"(?=[^\n]*",?\n)/g, '\n  "').replace(/\[\n\s+/g, '[\n  ');
  $('ioDlg').showModal();
};
$('ioClose').onclick = () => $('ioDlg').close();
$('ioCopy').onclick = () => { navigator.clipboard?.writeText($('ioText').value); };
$('ioImport').onclick = () => {
  try {
    const l = JSON.parse($('ioText').value);
    if (!Array.isArray(l.map) || !Array.isArray(l.cards)) throw new Error('needs "map" and "cards" arrays');
    const bad = l.cards.find((c) => !CARDS[c]); if (bad) throw new Error('unknown card "' + bad + '"');
    app.level = { name: l.name || 'Imported', map: l.map, cards: l.cards, ...(THEMES[l.theme] ? { theme: l.theme } : {}) };
    app.levelKey = 'new'; refreshLevelSelect(); renderEditor(); $('ioDlg').close();
  } catch (err) { alert('Could not import: ' + err.message); }
};

/* =====================================================================
   Wiring
   ===================================================================== */
$('levelSel').onchange = (e) => { app.playtesting = false; loadLevel(e.target.value); if (app.editing) setEditing(true); };
$('editBtn').onclick = () => setEditing(!app.editing);
document.querySelectorAll('#modeSeg button').forEach((b) => b.onclick = () => {
  if (app.running) return;
  const was = app.mode;
  app.mode = b.dataset.mode; store.set('cardclimber.mode', app.mode);
  if (was === 'time') { app.ta = null; document.body.classList.remove('paused'); }
  if (app.mode === 'run') return Run.start();
  if (app.mode === 'time') return TimeAttack.start();
  if (app.mode === 'quest') return Quest.start();
  if (was === 'run' || was === 'time' || was === 'quest') return loadLevel(BUILTIN_LEVELS.length ? 'b0' : 'c0');
  app.hand = app.level.cards.map((id) => ({ uid: uidSeq++, id })); app.seq = []; app.played = []; app.history = [];
  resetRun();
});
document.querySelector(CONFIG.features.shopRun ? '[data-mode=run]' : '[data-mode=quest]').remove();
if (!CONFIG.features.runMode) document.querySelector('[data-mode=run], [data-mode=quest]')?.remove();
document.querySelector(CONFIG.features.timeAttack ? '[data-mode=instant]' : '[data-mode=time]').remove();
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea') || app.editing || document.body.classList.contains('menu')) return;
  if (e.key === 'Enter' && app.mode === 'plan') Plan.play();
  if (e.key === 'r' && (app.mode === 'plan' || app.mode === 'instant')) app.mode === 'plan' ? Plan.reset() : Instant.restart();
  if (app.mode === 'time') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && app.hand[n - 1]) TimeAttack.clickHand(app.hand[n - 1].uid);
    if (e.key === ' ') { e.preventDefault(); TimeAttack.redraw(); }
    if (e.key === 'p' || e.key === 'Escape') TimeAttack.pause();
  }
  if (e.key === 'Backspace' && app.mode === 'plan' && Slots.filled().length) Plan.clickSeq(app.seq[Slots.lastFilled()].uid);
  if ((e.key === 'z' || e.key === 'u') && app.mode === 'instant') Instant.undo();
});
new ResizeObserver(resize).observe($('stage'));

/* =====================================================================
   Screens — Start, Puzzles (level sets), a set's levels, Settings.
   The address bar hash says where you are (#/, #/puzzles, #/set/0, #/play/b4,
   #/endless, #/editor, #/settings), so Back and the phone's swipe-back work.
   ===================================================================== */
// badges per level, saved by name: flag (cleared) and gems (every gem in one run)
const Progress = {
  all() {
    let b = store.get('cardclimber.badges', null);
    if (!b) {   // first time: anything with a best score was cleared
      b = {};
      for (const name in store.get('cardclimber.best', {})) if (!['time attack', 'endless distance', 'shop run', 'roguelite run'].includes(name)) b[name] = { flag: true };
      store.set('cardclimber.badges', b);
    }
    return b;
  },
  of: (name) => Progress.all()[name] || {},
  earn(name, run) {
    const all = Progress.all(), cur = all[name] || {};
    for (const k in run) if (run[k]) cur[k] = true;
    all[name] = cur; store.set('cardclimber.badges', all);
  },
};
const BADGES = [['flag', '⚑', 'Cleared'], ['gems', '◆', 'Every gem']];
function badgeRow(got, hasGems) {
  const row = document.createElement('div'); row.className = 'badges';
  for (const [k, icon, label] of BADGES) {     // pixel tags: an icon and the label, faded if not earned
    if (k === 'gems' && !hasGems) continue;
    const tag = Object.assign(document.createElement('span'), { className: `badge b-${k}${got[k] ? ' on' : ''}`, title: label });
    tag.append(PixelUI.icon(k === 'flag' ? 'flag' : 'gem', k === 'flag' ? '#e43b44' : '#2ce8f5'), PixelUI.text(label.toUpperCase(), got[k] ? '#ffffff' : '#8b9bb4'));
    row.appendChild(tag);
  }
  return row;
}
const levelHasGems = (l) => l.map.some((r) => r.includes('*'));
const shortName = (name) => name.replace(/^\d+\.\s*/, '');      // "7. Crate Expectations" → "Crate Expectations"
const setOf = (key) => setPos(+key.slice(1)).set;
const sets = () => Array.from({ length: setCount() }, (_, i) => ({
  i, ...setInfo(i), levels: allLevels().filter((l) => l.key[0] === 'b' && setOf(l.key) === i),
}));
const version = () => /[?&]v=([^&]+)/.exec(document.querySelector('script[src*="game.js"]')?.src || '')?.[1] || 'dev';

function setTitle() {
  const k = app.levelKey || '';
  const t = app.editing ? 'Level editor'
    : app.mode === 'time' ? 'Endless'
    : k[0] === 'b' ? `${setOf(k) + 1}-${setPos(+k.slice(1)).n + 1} ${shortName(app.level.name)}`
    : app.level?.name || '';
  // pixel font, 3× when it fits beside the back button, otherwise 2×
  PixelUI.set($('gameTitle'), t, '#ffffff', PixelFont.width(t.toUpperCase(), 'big') * UI.px() + 90 < innerWidth ? 'big' : 'small');
}

// leave whatever was running: stop animations, the Endless clock and the editor
function leaveGame() {
  app.gen++; app.running = false; app.ta = null; app.playtesting = false;
  document.body.classList.remove('paused', 'editing');
  if (app.editing) { app.editing = false; $('play').style.display = ''; $('editor').style.display = 'none'; }
  hideBanner();
}

const HOME_SCENE = { name: 'Deckhop', cards: [], map: [
  '................', '................', '................', '................', '.........*......',
  '................', '................', '...P.........G..', '################'] };

const Router = {
  trail: [],
  go(hash) { if (location.hash === hash) Router.show(); else location.hash = hash; },
  // the screen "above" this one: a level → its set → Puzzles → Start
  parent() {
    const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (page === 'play') return app.playtesting ? '#/editor' : arg?.[0] === 'c' ? '#/set/mine' : '#/set/' + setOf(arg);
    if (page === 'set') return '#/puzzles';
    return '#/';
  },
  // Back: step back in history when that's where we came from, so swipe-back stays in step
  up() {
    if (app.playtesting) { leaveGame(); setEditing(true); return; }
    const to = Router.parent();
    if (Router.trail[Router.trail.length - 2] === to) history.back(); else Router.go(to);
  },
  show() {
    const hash = location.hash || '#/', [page, arg] = hash.replace(/^#\/?/, '').split('/');
    if (Router.trail[Router.trail.length - 2] === hash) Router.trail.pop(); else Router.trail.push(hash);
    leaveGame();
    const body = document.body;
    body.classList.remove('menu', 'home');
    if (page === 'play' && allLevels().some((l) => l.key === arg)) { app.mode = 'plan'; loadLevel(arg); setTitle(); return; }
    if (page === 'endless' && CONFIG.features.timeAttack) { app.mode = 'time'; TimeAttack.start(); setTitle(); return; }
    if (page === 'editor') {
      app.mode = 'plan';
      if (app.custom.length) loadLevel('c0');
      else { loadLevel('b0'); app.level = blankLevel(16, 9); app.levelKey = 'new'; refreshLevelSelect(); }
      setEditing(true); return;
    }
    const screen = Screens[page] ? page : 'home';
    body.classList.add('menu');
    if (screen === 'home') { body.classList.add('home'); app.mode = 'plan'; loadLevel('home', HOME_SCENE); }
    const m = $('menu'); m.innerHTML = '';
    m.append(Screens[screen](arg));
    m.scrollTop = 0;
  },
};

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
// a big Start-screen button: pixel icon, pixel title, and a small pixel line under it
function menuButton(icon, title, sub, onclick, cls = '') {
  const pri = cls.includes('primary'), danger = cls.includes('danger'), ink = pri ? '#2b1b24' : '#ffffff';
  const b = el('button', 'm-btn pb ' + (pri ? 'pri ' : '') + cls), words = el('span', 'words');
  const ic = el('span', 'ic'); ic.append(PixelUI.icon(icon, pri ? '#2b1b24' : danger ? '#ff8a8a' : '#fee761'));   // icons sit in a fixed-width slot so titles line up
  b.append(ic, words);
  words.append(PixelUI.set(el('b'), title, danger ? '#ff8a8a' : ink, 'big'));
  if (sub) words.append(PixelUI.set(el('small'), sub, pri ? '#6b4a10' : '#a9b8d6'));
  b.setAttribute('aria-label', title + (sub ? ', ' + sub : ''));
  b.onclick = onclick; return b;
}
// top bar of a menu screen: (deeper in the menus) a Home button, back and the title; it stays put while the screen scrolls
function menuBar(title, home = false) {
  const bar = el('div', 'm-bar'), back = PixelUI.iconButton(el('button', 'm-back'), 'back', 'Back');
  back.onclick = Router.up;
  if (home) { const h = PixelUI.button(el('button', 'm-home'), 'Home'); h.onclick = () => Router.go('#/'); bar.append(h); }   // Home, then Back, side by side
  bar.append(back, PixelUI.set(el('h2'), title, '#ffffff', 'big'));
  return bar;
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const Screens = {
  home() {
    const s = el('div', 'm-screen m-home');
    const builtIn = allLevels().filter((l) => l.key[0] === 'b'), prog = Progress.all();
    const flags = builtIn.filter((l) => prog[l.level.name]?.flag).length;
    const bestEndless = store.get('cardclimber.best', {})['endless distance'];
    const logo = el('h1', 'm-title'); logo.append(PixelUI.logo('DECKHOP')); logo.setAttribute('aria-label', 'Deckhop'); s.append(logo);
    s.append(menuButton('play', 'Puzzles', `${flags}/${builtIn.length} flags`, () => Router.go('#/puzzles'), 'primary'));
    if (CONFIG.features.timeAttack) s.append(menuButton('infinity', 'Endless', bestEndless ? `Best ${bestEndless} tiles` : 'How far can you go?', () => Router.go('#/endless')));
    s.append(menuButton('edit', 'Level editor', app.custom.length ? plural(app.custom.length, 'saved level') : 'Build your own', () => Router.go('#/editor')));
    s.append(menuButton('gear', 'Settings', '', () => Router.go('#/settings')));
    return s;
  },
  puzzles() {
    const s = el('div', 'm-screen'), prog = Progress.all();
    s.append(menuBar('Puzzles'));
    for (const set of sets()) {
      const done = set.levels.filter((l) => prog[l.level.name]?.flag).length;
      const row = el('button', `m-set pb t-${set.theme}`);
      row.append(PixelUI.set(el('b'), `${set.i + 1} ${set.name}`, '#ffffff', 'big'), PixelUI.set(el('span', 'n'), `${done}/${set.levels.length}`, '#ffffff', 'big'));
      row.onclick = () => Router.go('#/set/' + set.i);
      s.append(row);
    }
    const mine = el('button', 'm-set pb t-mine');
    mine.append(PixelUI.set(el('b'), 'Your levels', '#ffffff', 'big'), PixelUI.set(el('span', 'n'), String(app.custom.length), '#ffffff', 'big'));
    mine.onclick = () => Router.go(app.custom.length ? '#/set/mine' : '#/editor');
    s.append(mine);
    return s;
  },
  set(arg) {
    const s = el('div', 'm-screen'), prog = Progress.all(), mine = arg === 'mine';
    const set = mine ? { name: 'Your levels', theme: 'mine', levels: allLevels().filter((l) => l.key[0] === 'c') } : sets()[+arg] || sets()[0];
    s.append(menuBar(mine ? set.name : `${set.i + 1} ${set.name}`, true));
    const grid = el('div', `m-grid t-${set.theme}`);
    set.levels.forEach(({ key, level }, n) => {
      const got = prog[level.name] || {};
      const t = el('button', 'm-tile pb' + (got.flag ? ' done' : '')), marks = el('span', 'marks'), nm = shortName(level.name).toUpperCase();
      for (const [k] of BADGES) if (k !== 'gems' || levelHasGems(level)) { const ic = PixelUI.icon(k === 'flag' ? 'flag' : 'gem', got[k] ? (k === 'flag' ? '#e43b44' : '#2ce8f5') : '#5a6988'); marks.append(ic); }
      t.append(PixelUI.set(el('b'), String(n + 1), '#ffffff', 'big'));
      if (PixelUI.supported(nm)) t.append(PixelUI.lines(nm, '#c0cbdc', 44)); else t.append(el('small', '', shortName(level.name)));
      t.append(marks); t.setAttribute('aria-label', `${n + 1}. ${shortName(level.name)}`);
      t.onclick = () => Router.go('#/play/' + key);
      grid.append(t);
    });
    s.append(grid);
    const legend = el('p', 'm-foot');
    for (const [k, , label] of BADGES) legend.append(PixelUI.icon(k === 'flag' ? 'flag' : 'gem', k === 'flag' ? '#e43b44' : '#2ce8f5'), PixelUI.text(label.toUpperCase(), '#a9b8d6'));
    s.append(legend);
    return s;
  },
  settings() {
    const s = el('div', 'm-screen');
    s.append(menuBar('Settings'));
    const choice = (label, sub, key, options, then) => {
      const row = el('div', 'm-row'), words = el('span', 'words'), seg = el('span', 'pseg');
      words.append(PixelUI.set(el('b'), label, '#ffffff'));
      if (sub) words.append(el('small', '', sub));
      row.append(words);
      for (const [text, value] of options) {
        const b = PixelUI.button(el('button'), text, settings[key] === value);
        b.onclick = () => {
          settings[key] = value; saveSettings();
          seg.querySelectorAll('button').forEach((x) => { const on = x === b; x.classList.toggle('pri', on); PixelUI.button(x, x.title, on); });
          then?.();
        };
        seg.append(b);
      }
      row.append(seg); s.append(row);
    };
    choice('Art style', '', 'artStyle', [['Pixel', 'pixel'], ['Smooth', 'classic']], () => { settings.artStyleChosen = true; saveSettings(); resize(); });
    choice('Animation speed', '', 'speed', [['Relaxed', .75], ['Normal', 1], ['Fast', 1.5]]);
    if (CONFIG.features.hints) choice('Hints', 'Offered after a failed run', 'hints', [['On', true], ['Off', false]]);
    choice('Reduce motion', 'Less screen shake and drifting scenery', 'reduceMotion', [['On', true], ['Off', false]]);
    const reset = menuButton('trash', 'Reset progress', '', () => {
      if (!confirm('Reset all badges and your best Endless distance? Your own levels are kept.')) return;
      store.set('cardclimber.badges', {}); store.set('cardclimber.best', {});
      PixelUI.set(reset.querySelector('b'), 'Progress cleared', '#ff8a8a', 'big');
    }, 'danger');
    s.append(reset);
    s.append(el('p', 'm-note', 'Reset clears your badges and best Endless distance. Your own levels are kept.'));
    s.append(PixelUI.set(el('p', 'm-foot'), 'Version ' + version(), '#8b9bb4'));
    return s;
  },
};

PixelUI.iconButton($('backBtn'), 'back', 'Back');
$('backBtn').onclick = Router.up;
window.addEventListener('hashchange', Router.show);
app.mode = 'plan';
uiPixel();
Router.show();
resize();
requestAnimationFrame(draw);
