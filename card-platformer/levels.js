// Card Climber — handmade Plan & Run levels.
// Map legend: . empty  # ground  ^ spikes  t timed spikes  C crate  K key  * gem  P start  G flag/door
// Each level: name, optional hint (first hint shown), 9 rows × 16 columns, and the cards in your hand.
// Levels you build in the editor can be exported as JSON and pasted in here.

const BASE_LEVELS = [
  {
    name: '1. Mind the Gap',
    hint: 'The pit is two tiles wide, so only one card can clear it. Where do you need to be standing first?',
    map: [
      '................',
      '..........*.....',
      '................',
      '................',
      '...........G....',
      '.........#######',
      '.........#######',
      '.P......########',
      '####..##########',
    ],
    cards: ['jump', 'walk1', 'highjump', 'walk2', 'longjump'],
    gemBonus: ['jump'],               // extra card dealt only when gems are on
  },
  {
    name: '2. Run-Up',                // walk first and the jump goes one tile further
    hint: "A Jump on its own won't clear that pit. Get moving first.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.P......G.......',
      '####..##########',
    ],
    cards: ['jump', 'walk2', 'walk2'],
    needs: ['momentum'],               // hidden if these features are switched off
  },
  {
    name: '3. Double Jump',           // jump straight after a jump to go one tile higher
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
    name: '4. Full Sprint',           // the third Walk in a row sprints two tiles further
    hint: 'No jumping under that ceiling. Keep walking: the third Walk in a row really gets going. Mind the orange spikes.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '################',
      'P.....t.G.......',
      '################',
    ],
    cards: ['walk2', 'walk2', 'walk2', 'wait'],
    needs: ['momentum'],               // hidden if these features are switched off
  },
  {
    name: '5. Up and Back',
    hint: 'The orange spikes flip after every card you play. Sometimes the best move is no move at all.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '...G............',
      '.######.........',
      '.........##.....',
      'P^.t.....##.....',
      '################',
    ],
    cards: ['walk3', 'highjump', 'turn', 'jump', 'walk2', 'wait', 'longjump', 'walk3'],
  },
];

// Experiment 1: levels built around a single "aha" each (verified with solve()).
const PUZZLE_PACK = [
  {
    name: '6. Echo Chamber',          // one High Jump, two tall steps
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
    name: '7. Crate Expectations',    // jumping the pit wastes a jump you need later
    hint: "Do you really need to jump that spike pit? Crates fall into holes, and you'll want both jumps later.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '.........G......',
      '........########',
      '.P.C...C########',
      '#####^##########',
      '################',
    ],
    cards: ['jump', 'jump', 'walk3'],
  },
  {
    name: '8. Down and Under',        // crate covers spikes, echo + timing
    hint: 'Get the crate onto the spikes first. Then count turns: orange spikes are down on even turns.',
    map: [
      '................',
      '................',
      '................',
      '.P.C............',
      '#####...........',
      '#####...........',
      '#####...........',
      '#####^.t..t.G...',
      '################',
    ],
    cards: ['walk2', 'walk3', 'echo', 'wait', 'walk3'],
  },
  {
    name: '9. Turn the Key',          // key is behind you; gem route = same cards, different order
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
  {
    name: '10. Back for the Key',     // key on a ledge behind you, spike on the way back
    hint: 'The door is locked and the key is on the ledge behind you. That ledge is two tiles tall.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.K..............',
      '####............',
      '####.P.^...G....',
      '################',
    ],
    cards: ['turn', 'walk1', 'highjump', 'turn', 'walk1', 'walk3', 'longjump', 'walk3'],
  },
  {
    name: '11. Small Steps',          // Hop lands exactly where Jump would overshoot
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
    name: '12. Bridge Builder',       // jump the small pit, push the crate into the wide one
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
    name: '13. Stepping Stone',       // the crate has to stop exactly under the platform's edge
    hint: 'The platform is out of reach from the floor. Something has to be standing right under its edge: exactly there, not one tile further.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '............G...',
      '.........######.',
      '................',
      '..P.C...........',
      '################',
    ],
    cards: ['walk2', 'walk3', 'highjump', 'echo', 'walk3'],
  },
  {
    name: '14. Into the Pit',         // you can't climb out of the pit, so send the crate in first
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
    name: '15. Two-Way Street',       // key on the right, door on the left; clear the spike both ways
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
    name: '16. Rush Hour',            // no jumping under the ceiling: pure timing (one solution)
    hint: "No jumping under that ceiling, so it's all about timing: orange spikes are down on even turns. Count turns before you move.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...##########...',
      '.P...t...t...G..',
      '################',
    ],
    cards: ['walk1', 'walk3', 'walk3', 'wait', 'echo', 'echo'],
  },
  {
    name: '17. Fetch & Carry',        // crate against the wall, key from behind, then a double jump (one solution)
    hint: 'You need the crate against the tall wall and the key from behind you. Then jump onto the crate, and do it again.',
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '.........G......',
      '........########',
      '.K^P.C..########',
      '################',
    ],
    cards: ['turn', 'jump', 'turn', 'jump', 'walk3', 'jump', 'echo'],
  },
  {
    name: '18. Skimming',             // Dash skims one-tile gaps but must stop on solid ground
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
    name: '19. On Thin Ice',          // ice carries you until something stops you
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
    name: '20. Boing',                // the door is behind you; the spring is the way up
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
    name: '21. Upstairs',             // zig-zag up through one-way platforms (one solution)
    hint: 'You can jump up through the wooden platforms and land on top of them. Zig-zag your way up.',
    map: [
      '................',
      '..........G.....',
      '........=====...',
      '................',
      '....=====.......',
      '................',
      '........=====...',
      '.P..............',
      '################',
    ],
    cards: ['walk2', 'walk2', 'walk2', 'highjump', 'turn', 'highjump', 'turn', 'highjump', 'walk2'],
  },
  {
    name: '22. Wall Climber',         // walls far too tall to jump; Climb them
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
    name: '23. Night Watch',          // a patroller walks a step every card: jump it or land on it
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
    name: '24. Grand Tour',           // spring, platform key, patroller, climb, ice slide to the door
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
  {
    name: '25. Bounce Back',          // no Turn card: the bumper is your U-turn
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
    name: '26. Mid-Air U-Turn',       // the bumper is too high to walk into, so jump into it (one solution)
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
    name: '27. Rebound',              // floor spring launches you into a high bumper, which throws you onto the ledge
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
];

// Levels that need a switched-off feature are hidden.
const usesDisabled = (l) => (l.needs || []).some((f) => !CONFIG.features[f]) || (!CONFIG.features.crates && l.map.some((r) => r.includes('C')))
  || [['ice', 'I'], ['platforms', '='], ['springs', 'S'], ['enemies', 'E'], ['sideSprings', '>'], ['sideSprings', '<']].some(([f, ch]) => !CONFIG.features[f] && l.map.some((r) => r.includes(ch)))
  || (!CONFIG.features.keys && l.map.some((r) => r.includes('K'))) || l.cards.some((c) => !CARDS[c]);
const withGemBonus = (l) => CONFIG.features.gems && l.gemBonus?.every((c) => CARDS[c]) ? { ...l, cards: [...l.cards, ...l.gemBonus] } : l;
const BUILTIN_LEVELS = [...BASE_LEVELS, ...(CONFIG.features.puzzlePack ? PUZZLE_PACK : [])].filter((l) => !usesDisabled(l)).map(withGemBonus);

// Level sets: the Puzzles screen groups the levels above, in order, SET_SIZE at a time.
// Each set has its own theme (see THEMES in art.js). Levels past the last set listed
// here get a numbered set that cycles through the themes.
const SET_SIZE = 9;
const LEVEL_SETS = [
  { name: 'Meadow', theme: 'meadow', blurb: 'Jumps, momentum, crates and keys' },
  { name: 'Dusk Canyon', theme: 'canyon', blurb: 'Keys, crates, Hop and Dash' },
  { name: 'Snowy Peaks', theme: 'peaks', blurb: 'Ice, springs, slimes and bumpers' },
];
const setInfo = (i) => LEVEL_SETS[i] || { name: 'Set ' + (i + 1), theme: ['meadow', 'canyon', 'peaks'][i % 3], blurb: '' };
