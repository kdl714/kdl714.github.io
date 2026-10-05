// Card Climber — game rules (no screen code): cards, movement, crates, keys,
// the solvers and the level generators. Also used by the level editor's
// "Check solvable" and by the roguelite/endless modes to build fair levels.

const W = 16, H = 9;

// Tile legend for level maps:
//   .  empty      #  ground (solid)     ^  spikes (deadly)
//   t  timed spikes: retracted on even turns, up on odd turns (toggle after every card)
//   C  crate: solid, pushed by walking into it; falls; covers spikes it lands on
//   K  key: if a level has keys, the goal is a locked door until all are collected
//   *  gem: optional, worth points
//   P  player start (faces right)       G  goal flag (or door)
//   I  ice: solid; if a move ends on ice you keep sliding until you're off it or blocked
//   =  one-way platform: stand on it, but jump up through it and walk through it sideways
//   S  spring: solid; landing or stepping on it launches you up 3 and forward 1
//   Y  cactus: deadly to touch, and you can't stand on it (jump clear over it)
//   > <  side spring (wall bumper): solid; its face points the way of the arrow. Moving into
//      its face (walking, jumping, sliding) flings you 4 tiles that way, now facing that way.
//   E  patroller: walks one tile per card (starts walking left), turns at walls, edges,
//      spikes and crates (Endless slimes also stay on their own short patch). Touching it kills you; landing on it from above squashes it, and a Dash bowls straight through it.
// Keys and gems are picked up by passing through their tile, even mid-jump.
// A card is a list of moves. A move is a path of [dx,dy] steps (dx is relative
// to facing), followed by gravity. If a step is blocked, the rest of that path
// is skipped; with stop:true the remaining moves of the card are skipped too.
// push:true lets that step shove a crate.
const step = { path: [[1, 0]], stop: true, push: true };
// Players only see the action name; the picture on the card shows exactly what
// it does. `label` is the specific name, used by the editor and solver output.
const CARDS = {
  walk1:    { name: 'Walk', label: 'Walk 1',    moves: [step] },
  walk2:    { name: 'Walk', label: 'Walk 2',    moves: [step, step] },
  walk3:    { name: 'Walk', label: 'Walk 3',    moves: [step, step, step] },
  jump:     { name: 'Jump', label: 'Jump',      moves: [{ path: [[0,-1],[1,0],[1,0]] }] },
  highjump: { name: 'Jump', label: 'High Jump', moves: [{ path: [[0,-1],[0,-1],[1,0]] }] },
  longjump: { name: 'Jump', label: 'Long Jump', moves: [{ path: [[0,-1],[1,0],[1,0],[1,0]] }] },
  turn:     { name: 'Turn', label: 'Turn',      moves: [{ type: 'turn' }] },
  wait:     { name: 'Wait', label: 'Wait',      moves: [{ type: 'wait' }] },
  echo:     { name: 'Echo', label: 'Echo',      echo: true, moves: [] },
  climb:    { name: 'Climb', label: 'Climb',    moves: [{ type: 'climb' }] },   // up the wall you face, any height, then onto the top
  dash:     { name: 'Dash',  label: 'Dash',     moves: [{ path: [[1, 0], [1, 0], [1, 0], [1, 0]], plow: true }] },   // forward 4 in a straight line, skimming over gaps and bowling over patrollers
  hop:      { name: 'Hop',   label: 'Hop',      moves: [{ path: [[0, -1], [1, 0]] }] },                  // up 1, forward 1: a precise step up
  glide:    { name: 'Glide', label: 'Glide',    moves: [{ path: [[1, 0], [1, 1], [1, 1], [1, 1]] }] },   // forward, then drift down 1 per tile
};
if (!CONFIG.features.echo) delete CARDS.echo;
if (!CONFIG.features.climb) delete CARDS.climb;

// Momentum (every mode; switch: features.momentum). Order matters, like real platformer physics:
//   Sprint: a third Walk in a row goes 2 tiles further
//   Run-up: a jump straight after a Walk or Dash goes 1 tile further
//   Double jump: a jump straight after a jump goes 1 tile higher
// Momentum depends only on card order (bumping into things doesn't break it), so the
// card pictures, which use this same function, always show exactly what a card will do.
const JUMPY = ['jump', 'highjump', 'longjump', 'hop'];
function momentumMoves(map, s, id) {
  const card = CARDS[id];
  let moves = card.moves, combo = null;
  if (!map.momentum || !moves.length || moves[0].type) return { moves, combo };
  if (id.startsWith('walk') && (s.streak || 0) >= 2) { moves = [...moves, step, step]; combo = 'Sprint'; }
  else if (JUMPY.includes(id) && s.lastKind === 'run') { moves = moves.map((m) => ({ ...m, path: [...m.path, [1, 0]] })); combo = 'Run-up'; }
  else if (JUMPY.includes(id) && s.lastKind === 'jump') { moves = moves.map((m) => ({ ...m, path: [[0, -1], ...m.path] })); combo = 'Double jump'; }
  return { moves, combo };
}

// updates s.streak / s.lastKind after playing `resolved` (shared with the plan preview)
function carryMomentum(s, resolved) {
  s.streak = resolved.startsWith('walk') ? (s.lastKind === 'run' ? (s.streak || 0) + 1 : 1) : 0;
  s.lastKind = resolved.startsWith('walk') || resolved === 'dash' ? 'run' : JUMPY.includes(resolved) ? 'jump' : null;
}

function parseLevel(level) {
  const grid = [], map = { grid, w: W, start: { x: 0, y: 0 }, goal: { x: -1, y: -1 }, crates: [], items: [], keyMask: 0, enemies: [],
    momentum: !!CONFIG.features.momentum };
  const F = CONFIG.features;
  for (let y = 0; y < H; y++) {
    const row = (level.map[y] || '').padEnd(W, '.').slice(0, W).split('');
    row.forEach((c, x) => {
      if (c === 'P') { map.start = { x, y }; row[x] = '.'; }
      if (c === 'G') { map.goal = { x, y }; row[x] = '.'; }
      if (c === 'C') { if (CONFIG.features.crates) map.crates.push({ x, y }); row[x] = '.'; }
      if (c === 'E') { if (F.enemies) map.enemies.push({ x, y, dir: -1 }); row[x] = '.'; }
      if (c === 'I' && !F.ice) row[x] = '#';           // switched-off features fall back to plain tiles
      if (c === 'S' && !F.springs) row[x] = '#';
      if (c === '=' && !F.platforms) row[x] = '.';
      if ((c === '>' || c === '<') && !F.sideSprings) row[x] = '#';
      if (c === 'Y' && !F.cacti) row[x] = '^';
      if (c === 'K' || c === '*') {
        if (c === 'K' ? CONFIG.features.keys : CONFIG.features.gems) {
          if (c === 'K') map.keyMask |= 1 << map.items.length;
          map.items.push({ x, y, t: c });
        }
        row[x] = '.';
      }
    });
    grid.push(row);
  }
  return map;
}

function initialState(map) {
  const s = { x: map.start.x, y: map.start.y, dir: 1, turn: 0, status: 'playing', last: null, got: 0, n: 0,
    shield: map.mods?.shield ? 1 : 0, crates: map.crates.map((c) => ({ ...c })), enemies: (map.enemies || []).map((e) => ({ ...e })) };
  settleCrates(map, s, []);
  return s;
}

// s.got is a bitmask over map.items (keys and gems collected so far).
const hasAllKeys = (map, s) => (s.got & map.keyMask) === map.keyMask;
const gemCount = (map, s) => map.items.filter((it, i) => it.t === '*' && s.got & (1 << i)).length;
const gemTotal = (map) => map.items.filter((it) => it.t === '*').length;
const stateKey = (s) => `${s.x},${s.y},${s.dir},${s.turn % 2},${s.last},${s.got},${s.n ? 1 : 0},${s.shield || 0},${s.lastKind || ''}${Math.min(2, s.streak || 0)},${s.crates.map((c) => c.gone ? '_' : c.x + ':' + c.y).join(';')}|${(s.enemies || []).map((e) => e.dead ? '_' : e.x + ':' + e.y + ':' + e.dir).join(';')}`;

function wall(map, x, y) {
  if (x < 0 || x >= map.w) return true;      // side walls
  if (y < 0 || y >= H) return false;         // open sky / bottomless pit
  const c = map.grid[y][x];
  return c === '#' || c === 'I' || c === 'S' || c === '>' || c === '<';  // ground, ice and springs are all solid blocks
}
const tileAt = (map, x, y) => (x < 0 || x >= map.w || y < 0 || y >= H ? '' : map.grid[y][x]);
const crateAt = (s, x, y) => s.crates.findIndex((c) => !c.gone && c.x === x && c.y === y);
const enemyAt = (s, x, y) => (s.enemies || []).findIndex((e) => !e.dead && e.x === x && e.y === y);
const solid = (map, s, x, y) => wall(map, x, y) || crateAt(s, x, y) >= 0;
// what you can stand on: anything solid, plus one-way platforms (from above)
const supports = (map, s, x, y) => solid(map, s, x, y) || tileAt(map, x, y) === '=';

function spikeUp(map, s, x, y) {
  if (x < 0 || x >= map.w || y < 0 || y >= H || crateAt(s, x, y) >= 0) return false;
  const c = map.grid[y][x];
  return c === '^' || c === 'Y' || (c === 't' && s.turn % 2 === 1);
}

// Drop every unsupported crate (bottom-most first so stacks fall together).
function settleCrates(map, s, ev) {
  let moved = true;
  while (moved) {
    moved = false;
    [...s.crates.keys()].sort((a, b) => s.crates[b].y - s.crates[a].y).forEach((i) => {
      const c = s.crates[i];
      if (c.gone) return;
      const by = c.y + 1;
      if (wall(map, c.x, by) || tileAt(map, c.x, by) === '=' || tileAt(map, c.x, by) === 'Y' || crateAt(s, c.x, by) >= 0 || (s.x === c.x && s.y === by)) return;
      c.y = by; moved = true;
      const ei = enemyAt(s, c.x, c.y);
      if (ei >= 0) { s.enemies[ei].dead = true; ev.push({ k: 'stomp', i: ei, x: c.x, y: c.y }); }   // a falling crate squashes a patroller
      if (c.y >= H) { c.gone = true; ev.push({ k: 'cgone', i }); }
      else ev.push({ k: 'cfall', i, x: c.x, y: c.y });
    });
  }
}

// Runs one card. Returns the new state plus a list of events for animation.
function runCard(map, st, id) {
  const s = { ...st, crates: st.crates.map((c) => ({ ...c })), enemies: (st.enemies || []).map((e) => ({ ...e })) }, ev = [];
  let card = CARDS[id], resolved = id;
  if (card.echo) {
    ev.push({ k: 'echo', x: s.x, y: s.y, of: s.last });
    resolved = s.last || 'wait';                   // nothing to echo → wasted turn
    card = CARDS[resolved];
  } else s.last = id;
  // perks (shop runs) can change what cards do; map.mods is absent everywhere else
  let moves = card.moves;
  const mom = momentumMoves(map, s, resolved);
  if (mom.combo) { moves = mom.moves; ev.push({ k: 'combo', name: mom.combo, x: s.x, y: s.y }); }
  const mods = map.mods;
  if (mods) {
    if (mods.walkExtra && resolved.startsWith('walk')) moves = [...moves, step];
    if (mods.jumpExtra && resolved === 'jump') moves = [{ path: [...moves[0].path, [1, 0]] }];
    if (mods.doubleFirst && !s.n) { moves = [...moves, ...moves]; ev.push({ k: 'double', x: s.x, y: s.y }); }
  }
  s.n++;
  const check = () => {
    if (spikeUp(map, s, s.x, s.y)) {
      if (s.shield > 0 && !s.shielded) { s.shield--; s.shielded = true; ev.push({ k: 'shield', x: s.x, y: s.y }); }   // Spike Guard perk
      else if (!s.shielded) { s.status = 'dead'; s.why = tileAt(map, s.x, s.y) === 'Y' ? 'cactus' : 'spikes'; ev.push({ k: 'die', x: s.x, y: s.y }); return true; }
    } else s.shielded = false;
    if (enemyAt(s, s.x, s.y) >= 0) { s.status = 'dead'; s.why = 'enemy'; ev.push({ k: 'die', x: s.x, y: s.y }); return true; }
    map.items.forEach((it, i) => {
      if (it.x === s.x && it.y === s.y && !(s.got & (1 << i))) { s.got |= 1 << i; ev.push({ k: 'collect', i, t: it.t, x: s.x, y: s.y }); }
    });
    if (s.x === map.goal.x && s.y === map.goal.y) {
      if (hasAllKeys(map, s)) { s.status = 'won'; ev.push({ k: 'win', x: s.x, y: s.y }); return true; }
      if (!ev.some((e) => e.k === 'locked')) ev.push({ k: 'locked', x: s.x, y: s.y });
    }
    return false;
  };
  const fall = () => {
    while (!supports(map, s, s.x, s.y + 1)) {
      s.y++; ev.push({ k: 'fall', x: s.x, y: s.y });
      if (s.y >= H) { s.status = 'dead'; s.why = 'pit'; ev.push({ k: 'die', x: s.x, y: s.y }); return true; }
      const ei = enemyAt(s, s.x, s.y);
      if (ei >= 0) { s.enemies[ei].dead = true; ev.push({ k: 'stomp', i: ei, x: s.x, y: s.y }); }   // landed on it: squashed
      if (check()) return true;
    }
    return false;
  };
  // walk a list of steps (dx relative to facing); stops at the first blocked step
  const path = (steps) => {
    for (const [dx, dy] of steps) {
      const nx = s.x + dx * s.dir, ny = s.y + dy;
      const hit = dy === 0 ? bumperFace(nx, ny, dx * s.dir) : 0;
      if (hit) return fling(hit, nx, ny) === 'end' ? null : false;
      if (ny < 0 || solid(map, s, nx, ny)) { ev.push({ k: 'bump', x: s.x, y: s.y, dx: dx * s.dir, dy }); return false; }
      s.x = nx; s.y = ny; ev.push({ k: 'move', x: s.x, y: s.y });
      if (check()) return null;
    }
    return true;
  };
  // springs: standing on one launches you up 3 and forward 1 (capped so a spring against a wall can't loop forever)
  let bounces = 0;
  const spring = () => {
    while (tileAt(map, s.x, s.y + 1) === 'S' && bounces < 4) {
      bounces++;
      ev.push({ k: 'spring', x: s.x, y: s.y + 1 });
      if (path([[0, -1], [0, -1], [0, -1], [1, 0]]) === null || fall()) return true;
    }
    return false;
  };
  // ice: if a move leaves you standing on ice, keep sliding the way you face until off it or blocked
  const slide = () => {
    let guard = 0;    // only stops endless loops (e.g. bouncing between bumpers on ice); a real slide can cross the map several times
    while (tileAt(map, s.x, s.y + 1) === 'I' && guard++ < map.w * 4) {
      const nx = s.x + s.dir;
      const hit = bumperFace(nx, s.y, s.dir);
      if (hit) { if (fling(hit, nx, s.y) === 'end') return true; continue; }
      if (solid(map, s, nx, s.y)) break;
      s.x = nx; ev.push({ k: 'move', x: s.x, y: s.y, slide: true });
      if (check() || fall() || spring()) return true;
    }
    return false;
  };
  // side springs: which way does this one fling you if you move into it going `mdx`? (0 = you hit its back/side)
  function bumperFace(x, y, mdx) { const t = tileAt(map, x, y); return t === '>' && mdx === -1 ? 1 : t === '<' && mdx === 1 ? -1 : 0; }
  let flings = 0;
  function fling(d, tx, ty) {
    flings++;
    s.dir = d; ev.push({ k: 'bumper', x: s.x, y: s.y, tx, ty, dir: d });
    for (let k = 0; k < 4; k++) {
      const nx = s.x + d, hit = bumperFace(nx, s.y, d);
      if (hit && flings < 4) return fling(hit, nx, s.y);      // straight into another bumper: ping-pong
      if (solid(map, s, nx, s.y)) break;
      s.x = nx; ev.push({ k: 'move', x: s.x, y: s.y });
      if (check()) return 'end';
    }
    return fall() || spring() ? 'end' : 'flung';
  }
  let movedSideways = false, flung = false;
  for (const m of moves) {
    if (m.type === 'turn') { s.dir = -s.dir; ev.push({ k: 'turn', x: s.x, y: s.y, dir: s.dir }); continue; }
    if (m.type === 'wait') { ev.push({ k: 'wait', x: s.x, y: s.y }); continue; }
    if (m.type === 'climb') {
      // up the face of the wall in front of you, then onto the top
      const fx = s.x + s.dir;
      if (!solid(map, s, fx, s.y)) { ev.push({ k: 'bump', x: s.x, y: s.y, dx: s.dir, dy: 0 }); continue; }   // nothing to climb
      while (solid(map, s, fx, s.y) && s.y > 0 && !solid(map, s, s.x, s.y - 1)) {
        s.y--; ev.push({ k: 'move', x: s.x, y: s.y });
        if (check()) return { state: s, ev };
      }
      if (!solid(map, s, fx, s.y)) { s.x = fx; ev.push({ k: 'move', x: s.x, y: s.y }); movedSideways = true; if (check()) return { state: s, ev }; }
      if (fall() || spring()) return { state: s, ev };
      continue;
    }
    let blocked = false;
    for (const [dx, dy] of m.path) {
      const nx = s.x + dx * s.dir, ny = s.y + dy;
      const hit = dy === 0 ? bumperFace(nx, ny, dx * s.dir) : 0;
      if (hit) {                                   // hit a bumper's face: flung, and this card's movement ends
        if (fling(hit, nx, ny) === 'end') return { state: s, ev };
        movedSideways = flung = true; break;
      }
      const ci = crateAt(s, nx, ny);
      if (ci >= 0 && m.push && dy === 0 && !solid(map, s, nx + dx * s.dir, ny) && enemyAt(s, nx + dx * s.dir, ny) < 0) {
        const c = s.crates[ci];
        c.x = nx + dx * s.dir;
        s.x = nx; ev.push({ k: 'push', x: s.x, y: s.y, i: ci, cx: c.x, cy: c.y });
        settleCrates(map, s, ev);
        if (check()) return { state: s, ev };
        continue;
      }
      if (solid(map, s, nx, ny)) { ev.push({ k: 'bump', x: s.x, y: s.y, dx: dx * s.dir, dy }); blocked = true; break; }
      const ei = m.plow ? enemyAt(s, nx, ny) : -1;          // Dash: a patroller in the way is knocked out, not deadly
      if (ei >= 0) { s.enemies[ei].dead = true; ev.push({ k: 'smash', i: ei, x: nx, y: ny, dir: dx * s.dir }); }
      s.x = nx; s.y = ny; ev.push({ k: 'move', x: s.x, y: s.y });
      if (dx) movedSideways = true;
      if (check()) return { state: s, ev };
    }
    if (flung) break;
    if (fall() || spring()) return { state: s, ev };
    settleCrates(map, s, ev);
    if (blocked && m.stop) break;
  }
  if (movedSideways && slide()) return { state: s, ev };
  if (map.momentum) carryMomentum(s, resolved);   // carry momentum into the next card
  // patrollers take their step after your card
  s.enemies.forEach((e, i) => {
    if (e.dead) return;
    const nx = e.x + e.dir;
    const blockedE = solid(map, s, nx, e.y) || !supports(map, s, nx, e.y + 1) || enemyAt(s, nx, e.y) >= 0
      || ['^', 't', 'Y'].includes(tileAt(map, nx, e.y))
      || (e.min != null && (nx < e.min || nx > e.max));            // Endless slimes pace their own patch only
    if (blockedE) e.dir = -e.dir;            // turn around this turn, walk next turn
    else e.x = nx;
    ev.push({ k: 'emove', i, x: e.x, y: e.y, dir: e.dir });
  });
  s.turn++; ev.push({ k: 'tick', x: s.x, y: s.y, turn: s.turn });
  check(); // timed spikes may pop up underneath you, or a patroller may walk into you
  return { state: s, ev };
}

// Depth-first search over every order of the hand. A sequence counts as a
// solution as soon as it reaches the flag (leftover cards are allowed).
function solve(level, limit = 200) {
  const map = parseLevel(level), sols = [], counts = {};
  let explored = 0;
  for (const c of level.cards) counts[c] = (counts[c] || 0) + 1;
  const dfs = (st, seq) => {
    for (const id in counts) {
      if (!counts[id] || sols.length >= limit) continue;
      explored++;
      const r = runCard(map, st, id);
      seq.push(id); counts[id]--;
      if (r.state.status === 'won') sols.push(Object.assign([...seq], { gems: gemCount(map, r.state) }));
      else if (r.state.status === 'playing') dfs(r.state, seq);
      seq.pop(); counts[id]++;
    }
  };
  dfs(initialState(map), []);
  return { solutions: sols, explored, gemTotal: gemTotal(map), bestGems: Math.max(0, ...sols.map((x) => x.gems)) };
}

// Breadth-first search with unlimited copies of each card type: the fewest
// cards that can possibly finish the level. Used to vet generated levels.
// Can the flag still be reached from state s within maxDepth cards of these types?
function canFinish(map, s0, types, maxDepth) {
  if (s0.status === 'won') return true;
  let frontier = [s0];
  const seen = new Set([stateKey(s0)]);
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const s of frontier) for (const id of types) {
      const r = runCard(map, s, id);
      if (r.state.status === 'won') return true;
      if (r.state.status !== 'playing') continue;
      const k = stateKey(r.state);
      if (!seen.has(k)) { seen.add(k); next.push(r.state); }
    }
    frontier = next;
  }
  return false;
}

// Cheapest set of cards that finishes the level, if every card in `prices`
// can be bought as often as you like (up to maxCards cards). Used by shop runs.
// needMask: items (bitmask over map.items) that must be collected before the flag counts
function cheapestSolution(map, prices, maxCards, needMask = 0) {
  const types = Object.keys(prices);
  const buckets = [[{ s: initialState(map), seq: [] }]];      // buckets[cost] = nodes; prices are small integers
  const best = new Map();
  for (let cost = 0; cost < buckets.length; cost++) {
    for (const cur of buckets[cost] || []) {
      if (cur.won) return { cost, seq: cur.seq };
      if (cur.seq.length >= maxCards) continue;
      for (const id of types) {
        const r = runCard(map, cur.s, id), c = cost + prices[id], seq = [...cur.seq, id];
        if (r.state.status !== 'playing' && r.state.status !== 'won') continue;
        if (r.state.status === 'won' && (r.state.got & needMask) !== needMask) continue;   // finished without the required pickup
        const k = r.state.status === 'won' ? 'won' : stateKey(r.state);
        // skip only if an earlier visit was at least as cheap AND used no more cards
        // (both matter: a pricier path with fewer cards can still fit the hand limit)
        const seen = best.get(k) || [];
        if (seen.some((e) => e.c <= c && e.n <= seq.length)) continue;
        best.set(k, [...seen.filter((e) => !(c <= e.c && seq.length <= e.n)), { c, n: seq.length }]);
        if (!buckets[c]) buckets[c] = [];
        buckets[c].push({ s: r.state, seq, won: r.state.status === 'won' });
      }
    }
  }
  return null;
}

// Remove gems no card sequence can collect while still finishing the level.
// Returns the cleaned level plus, for each kept gem, a sequence that collects it.
function pruneGems(level, prices, maxCards, mods) {
  const map = parseLevel(level);
  if (mods) map.mods = mods;
  const rows = level.map.map((r) => r.split('')), routes = [];
  map.items.forEach((it, i) => {
    if (it.t !== '*') return;
    const sol = cheapestSolution(map, prices, maxCards, 1 << i);
    if (sol) routes.push(sol.seq); else rows[it.y][it.x] = '.';
  });
  return { level: { ...level, map: rows.map((r) => r.join('')) }, routes };
}

function shortestPath(level, types, maxDepth = 16) {
  const map = parseLevel(level);
  const key = stateKey;
  let frontier = [{ s: initialState(map), seq: [] }];
  const seen = new Set([key(frontier[0].s)]);
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const { s, seq } of frontier) for (const id of types) {
      const r = runCard(map, s, id);
      if (r.state.status === 'won') return [...seq, id];
      if (r.state.status !== 'playing') continue;
      const k = key(r.state);
      if (!seen.has(k)) { seen.add(k); next.push({ s: r.state, seq: [...seq, id] }); }
    }
    frontier = next;
  }
  return null;
}

// Random level for roguelite runs: left-to-right terrain built only from moves
// the deck can make, then kept only if shortestPath finds a route.
// With fairGenerator on, obstacles are also capped by how many of each jump
// card the deck holds (one High Jump → at most one tall step), and the level
// must pass drawOdds() so it's winnable with the luck of the draw.
function generateLevel(depth, deck, rand = Math.random, opts = {}) {
  const types = [...new Set(deck)];
  const fair = CONFIG.features.fairGenerator && !opts.skipOdds;   // shop runs have no random draws to test
  const has = (id) => types.includes(id);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    // obstacle budget: each obstacle spends one card that can clear it
    const budget = {};
    for (const id of deck) budget[id] = (budget[id] || 0) + 1;
    const spend = (...ids) => {
      if (!fair) return ids.some(has);
      const id = ids.find((i) => budget[i] > 0);
      if (id) budget[id]--;
      return !!id;
    };
    const rows = Array.from({ length: H }, () => Array(W).fill('.'));
    let top = 7 - Math.floor(rand() * 2);   // row of the top ground tile
    const column = (x, t) => { for (let y = t; y < H; y++) rows[y][x] = '#'; };
    column(0, top); column(1, top);
    let x = 2;
    const danger = Math.min(.15 + depth * .07, .5);
    while (x < W - 2) {
      const opts = ['flat', 'flat', 'up', 'down', 'gap'];
      if (rand() < danger) opts.push('spike', 'spike', 'timed');
      if (CONFIG.features.crates && depth >= 2 && rand() < .3) opts.push('crate');
      let f = pick(opts);
      if (f === 'gap') {
        const wide = rand() < .5 && spend('longjump');
        if (wide || spend('jump', 'longjump')) x += wide ? 2 : 1;   // leave columns empty → pit
        else f = 'flat';
      } else if (f === 'up') {
        const tall = rand() < .5 && spend('highjump');
        if (tall || spend('jump', 'highjump', 'longjump')) { top = Math.max(3, top - (tall ? 2 : 1)); column(x, top); x++; }
        else f = 'flat';
      } else if (f === 'down') {
        top = Math.min(8, top + 1 + Math.floor(rand() * 2)); column(x, top); x++;
      } else if (f === 'spike' || f === 'timed') {
        if (f === 'spike' && !spend('jump', 'longjump')) f = 'flat';
        else { column(x, top); rows[top - 1][x] = f === 'spike' ? '^' : 't'; x++; }
      } else if (f === 'crate') {
        column(x, top); column(x + 1, top); rows[top - 1][x] = 'C'; x += 2;
      }
      if (f === 'flat') {
        const n = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < n && x < W - 2; i++, x++) column(x, top);
      }
    }
    for (; x < W; x++) column(x, top);
    rows[top - 1][W - 1] = 'G';             // last column: the wall stops you overshooting it
    const standY = (cx) => { const t = rows.findIndex((r) => r[cx] === '#'); return t > 0 ? t - 1 : -1; };
    const free = (cx, cy) => cy >= 0 && rows[cy][cx] === '.';
    let px = 0;
    // Key: either behind the start (needs two Turns) or floating one tile up (jump through it)
    if (CONFIG.features.keys && depth >= 2 && rand() < .6) {
      const behind = has('turn') && rand() < .5 && [0, 1, 2, 3].every((c) => free(c, standY(c))) && spend('turn') && spend('turn');
      if (behind) { px = 3; rows[standY(0)][0] = 'K'; }
      else {
        const xs = [];
        for (let c = 3; c < W - 3; c++) if (free(c, standY(c)) && free(c, standY(c) - 1)) xs.push(c);
        if (xs.length && spend('jump', 'highjump', 'longjump')) { const c = pick(xs); rows[standY(c) - 1][c] = 'K'; }
      }
    }
    // Gems: floating 1 or 2 tiles up, so grabbing one means jumping where you'd rather walk
    if (CONFIG.features.gems) {
      for (let n = (rand() < .4 ? 2 : 1) + (opts.extraGems || 0); n > 0; n--) {
        const c = 2 + Math.floor(rand() * (W - 5)), h = has('highjump') && rand() < .5 ? 2 : 1;
        if (standY(c) >= 0 && free(c, standY(c) - h) && free(c, standY(c))) rows[standY(c) - h][c] = '*';
      }
    }
    rows[standY(px)][px] = 'P';
    const level = { name: `Run level ${depth}`, map: rows.map((r) => r.join('')), cards: [] };
    const path = shortestPath(level, types, 14);
    const minLen = Math.min(3 + Math.floor(depth / 2), 7);
    if (!path || path.length < minLen) continue;
    const unit = Object.fromEntries(types.map((id) => [id, 1]));
    const finish = (gn) => (opts.keepGems || !CONFIG.features.gems ? gn : { ...gn, level: pruneGems(gn.level, unit, 14).level });
    const gen = { level, par: path.length, path };
    if (!fair) return finish(gen);
    gen.odds = drawOdds(level, gen.par, deck, CONFIG.run.fairTrials, rand);
    if (gen.odds >= CONFIG.run.minWinRate) return finish(gen);
    if (!best || gen.odds > best.odds) best = gen;
    if (attempt >= 60 && best) break;      // keep load times short: settle for the fairest seen
  }
  if (best && CONFIG.features.gems) best.level = pruneGems(best.level, Object.fromEntries(types.map((id) => [id, 1])), 14).level;
  return best;
}

// Plays a level many times with shuffled draws, the way a careful player
// would: play the card that gets closest to the flag, mulligan if none helps.
// Returns the fraction of attempts that reach the flag within the step budget.
function drawOdds(level, par, deck, trials, rand = Math.random) {
  const map = parseLevel(level), types = [...new Set(deck)];
  const key = stateKey;
  const memo = new Map();
  const dist = (s0) => {                   // fewest cards to the flag with any draws
    const k0 = key(s0);
    if (memo.has(k0)) return memo.get(k0);
    let frontier = [s0], d = 0, found = 99;
    const seen = new Set([k0]);
    search: while (frontier.length && ++d <= 14) {
      const next = [];
      for (const s of frontier) for (const id of types) {
        const r = runCard(map, s, id);
        if (r.state.status === 'won') { found = d; break search; }
        if (r.state.status !== 'playing') continue;
        const k = key(r.state);
        if (!seen.has(k)) { seen.add(k); next.push(r.state); }
      }
      frontier = next;
    }
    memo.set(k0, found);
    return found;
  };
  const shuffled = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    let s = initialState(map), draw = shuffled(deck), disc = [], hand = [], steps = par + CONFIG.run.spareSteps, swaps = CONFIG.run.freeSwaps;
    const fill = () => { while (hand.length < CONFIG.run.handSize) { if (!draw.length) { if (!disc.length) break; draw = shuffled(disc); disc = []; } hand.push(draw.pop()); } };
    fill();
    while (steps-- > 0 && s.status === 'playing') {
      let bestId = null, bestState = null, bd = dist(s);
      for (const id of new Set(hand)) {
        const r = runCard(map, s, id);
        if (r.state.status === 'won') { bestId = id; bestState = r.state; break; }
        if (r.state.status !== 'playing') continue;
        const d = dist(r.state);
        if (d < bd) { bd = d; bestId = id; bestState = r.state; }
      }
      if (bestId) { hand.splice(hand.indexOf(bestId), 1); disc.push(bestId); s = bestState; }
      else if (swaps > 0) { swaps--; steps++; disc.push(hand.splice(Math.floor(rand() * hand.length), 1)[0]); }   // free swap
      else { disc.push(...hand); hand = []; const last = s.last; s = runCard(map, s, 'wait').state; s.last = last; }
      fill();
    }
    if (s.status === 'won') wins++;
  }
  return wins / trials;
}
// Endless terrain for Time Attack: the map grows to the right as you go.
// Every obstacle can be cleared by some card in the draw pool.
// Endless terrain: the map grows to the right as you go. Every `biomeLength` tiles
// you reach a new biome (meadow → canyon → peaks → meadow…), starting with a short
// flat rest stop and a signpost. Each biome brings its own elements; from the
// second lap on they mix. Every obstacle can be cleared with cards from the pool.
const ENDLESS_BIOMES = ['meadow', 'canyon', 'peaks'];
const biomeAt = (x) => ENDLESS_BIOMES[Math.floor(x / (CONFIG.timeAttack.biomeLength || 150)) % 3];
function makeEndlessMap(rand = Math.random) {
  const map = { grid: Array.from({ length: H }, () => []), w: 0, start: { x: 1, y: 6 }, goal: { x: -1, y: -1 },
    crates: [], items: [], keyMask: 0, enemies: [], signs: [], gen: { top: 7 }, momentum: !!CONFIG.features.momentum };
  extendTerrain(map, W + 6, rand);
  return map;
}
// Returns any patrollers it added, so the running game can start tracking them.
function extendTerrain(map, upto, rand = Math.random) {
  const T = CONFIG.timeAttack, F = CONFIG.features, L = T.biomeLength || 150, g = map.gen, added = [];
  const col = (t, mark, surface = '#') => {
    for (let y = 0; y < H; y++) map.grid[y].push(y > t ? '#' : y === t ? surface : '.');
    if (mark) map.grid[t - 1][map.w] = mark;
    map.w++;
  };
  const gap = () => { for (let y = 0; y < H; y++) map.grid[y].push('.'); map.w++; };
  const flat = (n) => { for (let i = 0; i < n; i++) col(g.top); };
  if (map.w === 0) flat(6);
  while (map.w < upto) {
    const x = map.w, inBand = x % L;
    // rest stop: flat, easy ground at the start of each biome, with a signpost
    if (x >= L && inBand < (T.restLength || 8)) {
      if (inBand === 0) { g.top = Math.max(5, Math.min(7, g.top)); map.signs.push({ x: x + 1, y: g.top - 1, biome: biomeAt(x) }); }
      col(g.top); continue;
    }
    if (L - inBand <= 6) { col(g.top); continue; }        // don't start anything that runs into the next rest stop
    const hard = Math.min(1, x / (T.terrainRampTiles || 300)), biome = biomeAt(x), lap = Math.floor(x / (3 * L));
    const here = (b) => biome === b, mixed = lap >= 1;   // later laps borrow other biomes' elements
    const opts = [['flat', .40 - .18 * hard], ['up', .15], ['down', .12], ['gap', .14 + .08 * hard], ['spike', .10 + .04 * hard], ['timed', .06 + .04 * hard]];
    // slimes only get clean stretches: nothing special just before them, nothing hazardous right after
    const clear = x >= (g.slimeClearUntil ?? 0);
    if (F.enemies && x > 30 && clear && (here('meadow') || mixed)) opts.push(['slime', (here('meadow') ? .09 : .04) + .04 * hard]);
    if (F.springs && x > 20 && g.top >= 5 && clear) opts.push(['spring', here('canyon') ? .08 : .05]);
    if (F.cacti && clear && (here('canyon') || mixed)) opts.push(['cactus', here('canyon') ? .14 + .05 * hard : .04], ['cacti', here('canyon') ? .04 + .05 * hard : .02]);
    if (F.ice && clear && (here('peaks') || mixed)) opts.push(['ice', here('peaks') ? .16 : .05]);
    // a fork: an upper lane of one-way platforms over a hazardous stretch of ground
    if (F.platforms && x > 40 && g.top >= 5 && clear && L - inBand > 16) opts.push(['fork', (T.forkChance ?? .08) + .03 * hard]);
    if (!clear) for (const o of opts) if (o[0] === 'spike' || o[0] === 'timed' || o[0] === 'gap') o[1] = 0;
    let r = rand() * opts.reduce((a, [, w]) => a + w, 0), f = 'flat';
    for (const [k, w] of opts) { if (r < w) { f = k; break; } r -= w; }
    if (f === 'flat') {
      flat(1 + Math.floor(rand() * 3));
      if (rand() < .3) map.items.push({ x: map.w - 1, y: g.top - (rand() < .5 ? 2 : 3), t: '*' });   // jump for it
    } else if (f === 'up') { g.top = Math.max(3, g.top - (rand() < .35 ? 2 : 1)); flat(2); }
    else if (f === 'down') { g.top = Math.min(8, g.top + 1 + Math.floor(rand() * 2)); flat(2); }
    else if (f === 'gap') { for (let n = rand() < .35 + hard * .3 ? 2 : 1; n > 0; n--) gap(); flat(2); }
    else if (f === 'spike') { col(g.top, '^'); flat(1); }
    else if (f === 'timed') { col(g.top, 't'); flat(1); }
    else if (f === 'cactus') { col(g.top, 'Y'); flat(1); }                 // hop over it
    else if (f === 'cacti') { col(g.top, 'Y'); col(g.top, 'Y'); flat(2); }   // two in a row: a long jump
    else if (f === 'slime') {                              // a slime pacing its own flat patch (it never leaves it)
      flat(2);
      const e = { x: map.w + 2, y: g.top - 1, dir: -1, min: map.w, max: map.w + 4 };
      flat(5); map.enemies.push(e); added.push(e);
      g.slimeClearUntil = map.w + 6;
    } else if (f === 'spring') {                           // a spring in front of a ledge too tall to jump
      flat(1); col(g.top, null, 'S'); g.top -= 3; flat(3);
    } else if (f === 'fork') {
      // Upper lane: planks two rows up. Get on with a High Jump (from just before it, or from
      // underneath: you can jump up through planks); walking off the end drops you back down.
      // The ground route below has two hazards to jump instead; both routes rejoin on safe ground.
      const n = 6 + Math.floor(rand() * 3), top = g.top, lane = top - 2, hz = [1, 4 + Math.floor(rand() * 2)];
      flat(1);
      for (let i = 0; i < n; i++) {
        const kind = !hz.includes(i) ? null : F.cacti && here('canyon') ? 'Y' : rand() < .45 ? 'gap' : '^';
        if (kind === 'gap') gap(); else col(top, kind);
        map.grid[lane][map.w - 1] = '=';
        if (i > 0 && i < n - 1 && rand() < .4) map.items.push({ x: map.w - 1, y: lane - 1, t: '*' });   // gems ride the high road
      }
      flat(2);
    } else if (f === 'ice') {                              // an ice run that slides you onto solid ground
      for (let n = 3 + Math.floor(rand() * 3); n > 0; n--) col(g.top, null, 'I');
      flat(2);
    }
  }
  return added;
}
