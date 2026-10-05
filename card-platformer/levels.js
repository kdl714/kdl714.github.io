// Deckhop — handmade Plan & Run levels.
// Map legend: . empty  # ground  ^ spikes  t timed spikes  C crate  K key  * gem  P start  G flag/door
// Each level: name, optional hint (first hint shown), the map (any size: see LEVEL_SIZES in game.js), and the cards in your hand.
// Levels you build in the editor can be exported as JSON and pasted in here.

const SET_1 = [
  {
    name: 'First Steps',
    hint: 'Put both Walk cards into the sequence, then press Play.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '...P....G...',
      '############',
    ],
    cards: ['walk3', 'walk2'],
  },
  {
    name: 'Mind the Gap',
    hint: 'A Jump goes up and over. Jump straight across the gap.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '...P....G...',
      '####.#######',
    ],
    cards: ['jump', 'walk3'],
  },
  {
    name: 'Run-Up',                   // momentum: Walk then Jump goes one tile further (one solution)
    hint: "This gap is too wide to jump from standing still. A Jump straight after a Walk goes one tile further.",
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.P.......G..',
      '####..######',
    ],
    cards: ['walk2', 'jump', 'walk3'],
  },
  {
    name: 'Ouch',
    hint: 'Spikes hurt! Take a run-up, then jump clean over them.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.P...^...G..',
      '############',
    ],
    cards: ['walk3', 'jump', 'walk2'],
  },
  {
    name: 'Step Up',                  // High Jump onto a 2-high ledge (one solution)
    hint: 'That ledge is two tiles high. One of the jumps goes higher than the others.',
    map: [
      '............',
      '............',
      '............',
      '..........G.',
      '.......#####',
      '....P..#####',
      '############',
    ],
    cards: ['walk1', 'highjump', 'walk3'],
  },
  {
    name: 'The Long Way',             // Long Jump over a 3-wide gap (one solution)
    hint: 'Three tiles is a long way. Look for the longest jump.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '..P.......G.',
      '####...#####',
    ],
    cards: ['walk1', 'longjump', 'walk3'],
  },
  {
    name: 'Shiny',                    // first gem: High Jump grabs it, a plain Jump goes under it
    hint: 'Gems are optional extras. This one is up high: which jump could reach it?',
    map: [
      '............',
      '............',
      '............',
      '.....*......',
      '............',
      '..P......G..',
      '#####.######',
    ],
    cards: ['walk2', 'jump', 'highjump', 'walk3'],
  },
  {
    name: 'Which Jump?',              // a wide gap, then a tall step: each needs a different jump
    hint: 'A wide gap, then a tall step. Each one needs a different jump.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '............G...',
      '..........######',
      '.P........######',
      '####...#########',
    ],
    cards: ['walk2', 'longjump', 'walk1', 'highjump', 'walk2', 'jump'],
  },
  {
    name: 'Meadow Run',               // review of the set; the gem asks for a different first card
    hint: "Everything you've learned in the meadow. The gem needs a different first card.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '........*.......',
      '..............G.',
      '......^....#####',
      '.P..#####...####',
      '################',
    ],
    cards: ['walk2', 'jump', 'walk2', 'highjump', 'longjump', 'walk2', 'walk2', 'walk1'],
  },
];

// Experiment 1: levels built around a single "aha" each (verified with solve()).
const SET_2 = [
  {
    name: 'About Face',  // the flag is behind you: Turn first
    hint: 'The flag is behind you. Turn around first!',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.G....P^....',
      '############',
    ],
    cards: ['turn', 'walk3', 'walk2'],
  },
  {
    name: 'Wait for It',  // orange spikes go up and down every card: Wait to fix the timing
    hint: 'Orange spikes pop up every other card. Waiting one card changes the timing.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.P...t....G.',
      '############',
    ],
    cards: ['walk3', 'wait', 'walk3', 'walk3'],
  },
  {
    name: 'Full Speed',  // three Walks in a row: the third sprints (one solution)
    hint: 'Three Walks in a row: the third one sprints two tiles further.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.P.......G..',
      '############',
    ],
    cards: ['walk2', 'walk2', 'walk2'],
  },
  {
    name: 'Double Jump',           // jump straight after a jump to go one tile higher
    hint: 'That wall is too tall for one Jump. What if you jump again straight away?',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....###.G.......',
      '.P..############',
      '################',
    ],
    cards: ['jump', 'jump', 'walk3'],
    needs: ['momentum'],               // hidden if these features are switched off
  },
  {
    name: 'Push It',  // walk into the crate: it drops into the spike pit and makes a bridge
    hint: "Walk into the crate to push it. It'll fall into the spike pit and make a bridge.",
    map: [
      '............',
      '............',
      '............',
      '............',
      '.P.C......G.',
      '######^#####',
      '############',
    ],
    cards: ['walk3', 'walk2', 'walk3'],
  },
  {
    name: 'Key First',  // the flag is a locked door; the key is behind you (one solution)
    hint: 'The flag is a locked door until you grab the key, and the key is behind you.',
    map: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.K..P..G....',
      '############',
    ],
    cards: ['turn', 'walk3', 'turn', 'walk3', 'walk3'],
  },
  {
    name: 'Echo Chamber',          // one High Jump, two tall steps
    hint: 'Two tall steps, but only one card that climbs that high. Look closely at the purple card.',
    map: [
      '................',
      '................',
      '................',
      '..........G.....',
      '....#..#..######',
      '....#..#..######',
      '...##..#..######',
      '..P##..#..######',
      '#####..#..######',
    ],
    cards: ['highjump', 'walk1', 'longjump', 'echo', 'jump', 'echo'],
  },
  {
    name: 'Small Steps',          // Hop lands exactly where Jump would overshoot
    hint: 'A Jump goes too far here. Sometimes a smaller step is the right one.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..P#^#^#^..G....',
      '################',
    ],
    cards: ['hop', 'jump', 'jump', 'jump', 'walk2'],
  },
  {
    name: 'Turn the Key',          // key is behind you; gem route = same cards, different order
    hint: "The key is behind you, past a spike. You'll have to turn around, then turn back again.",
    map: [
      '................',
      '................',
      '...........*....',
      '................',
      '................',
      '................',
      '...........#....',
      '..K^P......#.G..',
      '################',
    ],
    cards: ['walk3', 'turn', 'highjump', 'echo', 'jump', 'turn', 'echo', 'jump'],
    gemBonus: ['echo'],               // extra card dealt only when gems are on
  },
];

const SET_3 = [
  {
    name: 'On Thin Ice',          // ice carries you until something stops you
    hint: "Once you're on ice you won't stop until you hit something. That wall at the end is your friend.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.........#......',
      '.P.......#...G..',
      '###IIIIII#######',
    ],
    cards: ['walk2', 'highjump', 'walk3'],
  },
  {
    name: 'Boing',                // the door is behind you; the spring is the way up
    hint: 'The door is behind you, up on that block. What happens if you step on the red pad?',
    map: [
      '................',
      '................',
      '................',
      '................',
      '.G..............',
      '#######.........',
      '#######.........',
      '#######.P.......',
      '#######S#....###',
    ],
    cards: ['turn', 'walk3', 'walk3', 'highjump'],
  },
  {
    name: 'Up Through',               // one-way platforms: jump up through from below, stand on top (one solution)
    hint: 'Wooden platforms let you jump up through them from below, then stand on top.',
    map: [
      '............',
      '............',
      '............',
      '........G...',
      '.....=====..',
      '.P..........',
      '#####^^^^^##',
    ],
    cards: ['walk3', 'highjump', 'walk3'],
  },
  {
    name: 'Wall Climber',         // walls far too tall to jump; Climb them
    hint: 'Those walls are far too tall to jump. Walk right up to one first.',
    map: [
      '................',
      '................',
      '..........####G.',
      '..........######',
      '......##..######',
      '......##..######',
      '......##..######',
      '.P....##..######',
      '################',
    ],
    cards: ['walk1', 'walk3', 'climb', 'walk3', 'climb', 'walk1', 'walk3'],
  },
  {
    name: 'Night Watch',          // a patroller walks a step every card: jump it or land on it
    hint: 'The patroller takes a step every time you play a card. Jump over it, or land right on top of it.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.P.......E....G.',
      '################',
    ],
    cards: ['walk2', 'walk3', 'jump', 'walk3', 'walk3'],
  },
  {
    name: 'Skimming',             // Dash skims one-tile gaps but must stop on solid ground
    hint: 'Dash skims straight over one-tile gaps, but it has to stop on solid ground. Where does a Walk fit in?',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '################',
      'P..............G',
      '###.####.###.###',
    ],
    cards: ['dash', 'dash', 'dash', 'walk3', 'walk3'],
  },
  {
    name: 'Bowled Over',              // Dash knocks a patroller out of the way
    hint: "The tunnel is too low to jump the patroller. One card doesn't need to go over it.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '################',
      'P..E...........G',
      '################',
    ],
    cards: ['walk3', 'walk3', 'dash', 'walk3', 'walk2'],
  },
  {
    name: 'Bounce Back',          // no Turn card: the bumper is your U-turn
    hint: "There's no Turn card, but the door is behind you. What happens if you walk into the red pad on that wall?",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.G.......P...<..',
      '######.#########',
    ],
    cards: ['walk3', 'walk1', 'jump', 'walk1', 'walk3'],
  },
  {
    name: 'Grand Tour',           // spring, platform key, patroller, climb, ice slide to the door
    hint: 'Spring up to the key, come back down past the patroller, climb the big wall, and let the ice carry you to the door.',
    map: [
      '................',
      '................',
      '...............G',
      '............IIII',
      '....K.......####',
      '...=====....####',
      '............####',
      '.P........E.####',
      '######S#########',
    ],
    cards: ['walk2', 'walk3', 'turn', 'walk3', 'turn', 'walk1', 'walk3', 'walk3', 'climb'],
  },
];

const SET_4 = [
  {
    name: 'Mid-Air U-Turn',       // the bumper is too high to walk into, so jump into it (one solution)
    hint: "That bumper is too high to walk into. You'll have to hit it in mid-air.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...G......<.....',
      '..####.P..#.....',
      '################',
    ],
    cards: ['walk1', 'jump', 'walk2'],
  },
  {
    name: 'Rebound',              // floor spring launches you into a high bumper, which throws you onto the ledge
    hint: "The ledge is too high and behind you. The floor spring can't get you there on its own, but it can get you somewhere useful.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '..G.......<.....',
      '######....#.....',
      '######....#.....',
      '######.P..#.....',
      '#########S######',
    ],
    cards: ['walk2', 'walk3'],
  },
  {
    name: 'Bridge Builder',       // jump the small pit, push the crate into the wide one
    hint: 'You can hop the first spike pit, but not the wide one. What could fill part of it?',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '...........*....',
      '.P...C......G...',
      '###^####^^######',
      '################',
    ],
    cards: ['walk1', 'hop', 'walk3', 'walk1', 'jump', 'walk2'],
  },
  {
    name: 'Two-Way Street',       // key on the right, door on the left; clear the spike both ways
    hint: "The key is on the pillar to the right and the door is back on the left. You'll have to get past that spike twice.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '..........K.....',
      '.G........#.....',
      '##...P..^.#.....',
      '################',
    ],
    cards: ['walk2', 'jump', 'highjump', 'turn', 'longjump', 'walk3', 'walk2', 'jump'],
  },
  {
    name: 'Into the Pit',         // you can't climb out of the pit, so send the crate in first
    hint: "Once you drop in for the key, you can't jump high enough to climb out. Send something down there first.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '..PC......G.....',
      '######..########',
      '######..########',
      '######.K########',
      '################',
    ],
    cards: ['walk3', 'walk2', 'turn', 'hop', 'jump', 'turn', 'walk1', 'jump', 'walk2'],
  },
  {
    name: 'Sprint and Step',  // Full Sprint + Stepping Stone, joined; scrolls (one solution)
    hint: 'Sprint under the low ceiling and past the orange spike, then push the crate along to use as a step.',
    map: [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '..................G...',
      '...............######.',
      '########..............',
      'P.....t...C...........',
      '######################',
    ],
    cards: ['walk2', 'walk2', 'walk2', 'walk2', 'walk3', 'highjump', 'echo'],
  },
  {
    name: 'Down the Gap',  // Down and Under + the old Mind the Gap, joined; scrolls. The bonus High Jump opens the gem route
    hint: 'Drop the crate onto the spikes, time the orange ones, then climb out at the far end. The gem is up high.',
    map: [
      '...........................',
      '...........................',
      '...........................',
      '.....................*.....',
      '...........................',
      '.P.C.......................',
      '#####.................G....',
      '#####...............#######',
      '#####...............#######',
      '#####^.t..t........########',
      '###############..##########',
    ],
    cards: ['walk2', 'walk3', 'echo', 'walk3', 'jump', 'walk1', 'highjump', 'walk2'],
    gemBonus: ['highjump'],
  },
  {
    name: 'Rush Hour Climb',  // Rush Hour + Stepping Stone, joined; scrolls
    hint: 'Time your run under the low ceiling past both orange spikes, then turn the crate into a step.',
    map: [
      '...........................',
      '...........................',
      '...........................',
      '...........................',
      '...........................',
      '...........................',
      '.......................G...',
      '....................######.',
      '...##########..............',
      '.P...t...t.....C...........',
      '###########################',
    ],
    cards: ['walk1', 'walk3', 'walk3', 'wait', 'echo', 'echo', 'walk2', 'walk3', 'highjump'],
  },
  {
    name: 'Stairway',  // Full Sprint + Upstairs, joined; scrolls. The finale: every card counts (one solution)
    hint: 'Sprint the tunnel past the orange spike, then zig-zag up the wooden platforms. Every card counts.',
    map: [
      '.......................',
      '.......................',
      '.......................',
      '.................G.....',
      '...............=====...',
      '.......................',
      '...........=====.......',
      '.......................',
      '########.......=====...',
      'P.....t................',
      '#######################',
    ],
    cards: ['walk2', 'walk2', 'walk2', 'walk2', 'walk2', 'walk2', 'highjump', 'turn', 'highjump', 'turn', 'highjump'],
  },
];

// Levels that need a switched-off feature are hidden.
const usesDisabled = (l) => (l.needs || []).some((f) => !CONFIG.features[f]) || (!CONFIG.features.crates && l.map.some((r) => r.includes('C')))
  || [['ice', 'I'], ['platforms', '='], ['springs', 'S'], ['enemies', 'E'], ['sideSprings', '>'], ['sideSprings', '<']].some(([f, ch]) => !CONFIG.features[f] && l.map.some((r) => r.includes(ch)))
  || (!CONFIG.features.keys && l.map.some((r) => r.includes('K'))) || l.cards.some((c) => !CARDS[c]);
const withGemBonus = (l) => CONFIG.features.gems && l.gemBonus?.every((c) => CARDS[c]) ? { ...l, cards: [...l.cards, ...l.gemBonus] } : l;
const BUILTIN_LEVELS = [...SET_1, ...SET_2, ...SET_3, ...SET_4].filter((l) => !usesDisabled(l)).map(withGemBonus);

// Level sets: the Puzzles screen groups the levels above, in order: each set takes its
// `size` levels (SET_SIZE if it doesn't say). Each set has its own theme (see THEMES in
// art.js). Levels past the last set listed here get a numbered set that cycles the themes.
const SET_SIZE = 9;
const LEVEL_SETS = [
  { name: 'Sunny Meadow', theme: 'meadow', blurb: 'Jumps, momentum, crates and keys' },
  { name: 'Dusk Canyon', theme: 'canyon', blurb: 'Keys, crates, Hop and Dash' },
  { name: 'Snowy Peaks', theme: 'peaks', blurb: 'Ice, springs, platforms, Climb, slimes, Dash and bumpers' },
  { name: 'The Summit', theme: 'peaks', blurb: 'Harder, bigger levels that mix everything' },
];
const setInfo = (i) => LEVEL_SETS[i] || { name: 'Set ' + (i + 1), theme: ['meadow', 'canyon', 'peaks'][i % 3], blurb: '' };
// which set a built-in level (its index in BUILTIN_LEVELS) is in, and its place in that set (0-based)
function setPos(i) {
  for (let s = 0, start = 0; ; s++) { const n = setInfo(s).size || SET_SIZE; if (i < start + n) return { set: s, n: i - start }; start += n; }
}
const setCount = () => (BUILTIN_LEVELS.length ? setPos(BUILTIN_LEVELS.length - 1).set + 1 : 0);
