// Card Climber — every tuning knob lives here.
// Change a number, save, reload the page. Loaded first, before rules.js, levels.js and game.js.

/* =====================================================================
   CONFIG — knobs for experimenting with the design.
   turnMode:  'plan'    → arrange cards into a sequence, then press Play.
              'instant' → clicking a card plays it immediately (with undo).
              'run'     → roguelite run: draw from a deck, generated levels.
   All modes run on the same pure simulation (runCard), so adding a mode
   only means writing a new controller, not touching rules.

   features: switch each experiment off to get back to the earlier game.
     Experiment 1 (puzzle depth): echo, crates, puzzlePack
     Experiment 2 (replayability): runMode
   ===================================================================== */
const CONFIG = {
  turnMode: 'plan',
  artStyle: 'pixel',   // default look: 'pixel' or 'classic' (smooth); players can switch in Settings
  features: {
    echo: true,        // "Echo" card: replays the previous card
    crates: true,      // pushable crates (tile C)
    puzzlePack: true,  // levels 3–5, built around echo/crates/decoy cards
    runMode: false,    // "Roguelite" mode (tabled for now: hidden from the menu; set true to bring it back)
    fairGenerator: true, // generated levels respect your deck's card counts and are play-tested with random draws
    keys: true,        // key (K) + locked door: the flag stays locked until you hold every key
    gems: true,        // optional gems (*) off the easy route, plus scoring
    hints: true,       // Plan & Run: optional hints unlock after a failed run
    timeAttack: true,  // replaces "Instant" with an endless, timed runner (off = old Instant mode)
    ice: true,         // I: ice blocks you slide along
    platforms: true,   // =: one-way platforms (jump up through, stand on top)
    springs: true,     // S: springs launch you up 3 and forward 1
    sideSprings: true, // > <: wall bumpers fling you 4 tiles the way they face
    cacti: true,       // Y: cacti (deadly, can't be stood on)
    momentum: true,    // Run-up / Sprint / Double jump, in every mode (see rules.js → momentumMoves)
    climb: true,       // the Climb card: up any wall you're facing
    enemies: true,     // E: patrollers that walk one tile per card
    shopRun: true,     // Roguelite = route map + buy your hand + Plan & Run + perks (off = older deck-draw roguelite)
  },
  // Shop-run roguelite (features.shopRun)
  quest: {
    hearts: 3,
    startGems: 4,
    handLimit: 10,      // most cards you can own in one level
    prices: { walk1: 1, walk2: 1, walk3: 2, jump: 2, highjump: 3, longjump: 3, turn: 1, wait: 1, echo: 2 },
    shopSize: 6,        // card types on sale per level (always includes everything the cheapest solution needs)
    budgetStart: 1.4,   // level budget = cheapest solution × this…
    budgetEnd: 1.05,    // …narrowing to this…
    budgetRamp: 12,     // …over this many levels
    riskyTighter: 0.1,  // risky routes: smaller margin, but +2 gems on the map and a perk
    gemValue: 2,        // ◆ per gem picked up
    shrineCost: 6,
    carryCap: 12,       // most ◆ you can carry from one level to the next
    perks: {
      legs:     { name: 'Long Legs',     desc: 'Walk cards go 1 tile further', mod: 'walkExtra' },
      spring:   { name: 'Spring Heels',  desc: 'Jump goes 1 tile further', mod: 'jumpExtra' },
      guard:    { name: 'Spike Guard',   desc: 'Survive the first spikes you land on each level', mod: 'shield' },
      double:   { name: 'Head Start',    desc: 'Your first card each level is played twice', mod: 'doubleFirst' },
      thrifty:  { name: 'Thrifty',       desc: 'Walk cards cost 1◆ less' },
      echoes:   { name: 'Echo Discount', desc: 'Echo cards are free' },
      magnet:   { name: 'Gem Magnet',    desc: 'Gems you pick up are worth double' },
      piggy:    { name: 'Piggy Bank',    desc: 'Finish a level with 5◆ or more: +2◆' },
      pockets:  { name: 'Big Pockets',   desc: 'Hold 2 more cards per level' },
      heart:    { name: 'Second Wind',   desc: '+1 max heart, and heal' },
    },
  },
  // Endless mode (internally "timeAttack"). Everything you'd want to tune is here.
  timeAttack: {
    handSize: 5,
    hearts: 3,
    // --- timer: generous at first, tightening slowly with distance ---
    freeCards: 3,                // the first few picks have no timer at all
    startSeconds: 4,             // time to pick a card once the timer starts…
    minSeconds: 1.5,             // …never less than this…
    secondsLostPer100Tiles: 0.6, // …losing this much per 100 tiles travelled (0.6 → hits the minimum after ~400 tiles)
    // --- terrain: how quickly gaps and spikes get more common ---
    terrainRampTiles: 400,       // tiles until the terrain is at full difficulty
    // --- keeping it fair ---
    fairDeal: true,              // every hand has at least one card that moves you forward without dying
    heartEvery: 0,               // win back a heart every N tiles, up to the max (0 = off; rest stops heal instead)
    // --- biomes: meadow → canyon → peaks, each starting with a rest stop ---
    biomeLength: 150,            // tiles per biome
    restLength: 8,               // flat tiles at the start of each biome
    restHeal: true,              // reaching a rest stop gives back a heart
    forkChance: 0.08,            // how often an upper lane (one-way platforms over a hazardous stretch) appears
    // --- cards: draw weights (higher = more common); Wait and Echo left out on purpose ---
    pool: { walk1: 3, walk2: 3, walk3: 2, jump: 3, highjump: 2, longjump: 2, dash: 2, hop: 2 },   // (glide, climb also exist; add them here to use them)
    animSpeed: 0.6,              // animations play faster than in other modes
    gemsPerHeart: 5,             // every this many gems restores a heart (at full hearts they wait, and refill the next heart you lose)
  },
  // Points: only the hidden Roguelite uses these now (puzzles have badges, Endless goes by distance)
  score: {
    clear: 100,        // for reaching the flag
    gem: 50,           // per gem
    spare: 10,         // per unused card (Plan/Instant) or unused step (Roguelite)
    allGemsMultiplier: 2,
  },
  run: {
    hearts: 3,
    handSize: 4,
    startingDeck: ['walk1', 'walk1', 'walk2', 'walk2', 'jump', 'jump', 'highjump', 'wait'],
    rewardPool: ['walk3', 'longjump', 'highjump', 'jump', 'walk2', 'wait', 'echo', 'turn'],
    minWinRate: 0.75,  // fairGenerator: a simulated player must win this often with random draws…
    fairTrials: 20,    // …over this many shuffled attempts, or the level is thrown away
    spareSteps: 6,     // step budget = shortest possible solution + this (6 ≈ 80–100% wins for a perfect player)
    // Balance pass (each can be switched off on its own):
    freeSwaps: 2,      // per level: swap ONE card for free (no step, no turn). Mulligan stays as the paid fallback. 0 = off
    peek: 2,           // show the next N cards of the draw pile (0 = off)
    rewardStyle: 'trade', // 'trade': offers explain what they do for the next level; a full deck means giving a card up
                          // 'edit': older add / remove / upgrade screen   'add': just add one of three
    deckLimit: 10,     // 'trade' only: max deck size
    preview: true,     // show the next level before you choose your reward
    healEvery: 3,      // win back a heart every N levels cleared (0 = off)
    minDeck: 6,        // removal can't take the deck below this
    upgrades: { walk1: 'walk2', walk2: 'walk3', jump: 'longjump', wait: 'echo' },
  },
  stepMs: 120,        // animation time per tile moved (walking pace)
  fallMs: 70,         // used for crates and other small drops
  gravityMs: 150,     // time to fall the first tile; later tiles get quicker, like real gravity
  pauseBetweenCards: 50,
};
