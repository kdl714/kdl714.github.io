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
      '................',
      '.........*......',
      '................',
      '...........G....',
      '.........#######',
      '.........#######',
      '.P......########',
      '####..##########',
    ],
    cards: ['jump', 'walk2', 'highjump', 'walk2', 'longjump'],
    gemBonus: ['echo'],               // extra card dealt only when gems are on
  },
  {
    name: '2. Up and Back',
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
    cards: ['walk3', 'highjump', 'turn', 'jump', 'walk3', 'wait', 'longjump', 'walk3'],
  },
];

// Experiment 1: levels built around a single "aha" each (verified with solve()).
const PUZZLE_PACK = [
  {
    name: '3. Echo Chamber',          // one High Jump, two tall steps
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
    name: '4. Crate Expectations',    // jumping the pit wastes a jump you need later
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
    cards: ['jump', 'walk2', 'jump', 'walk3'],
  },
  {
    name: '5. Down and Under',        // crate covers spikes, echo + timing
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
    name: '6. Turn the Key',          // key is behind you; gem route = same cards, different order
    hint: "The key is behind you, past a spike. You'll have to turn around, then turn back again.",
    map: [
      '................',
      '................',
      '................',
      '...........*....',
      '................',
      '................',
      '...........#....',
      '..K^P......#.G..',
      '################',
    ],
    cards: ['walk3', 'turn', 'highjump', 'echo', 'jump', 'walk1', 'turn', 'echo', 'jump'],
  },
  {
    name: '7. Back for the Key',     // key on a ledge behind you, spike on the way back
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
    cards: ['turn', 'walk1', 'highjump', 'walk2', 'turn', 'walk1', 'walk3', 'longjump', 'walk3'],
  },
  {
    name: '8. Bridge Builder',       // jump the small pit, push the crate into the wide one
    hint: 'You can hop the first spike pit, but not the wide one. What could fill part of it?',
    map: [
      '................',
      '................',
      '................',
      '................',
      '..........*.....',
      '................',
      '.P...C......G...',
      '###^####^^######',
      '################',
    ],
    cards: ['walk1', 'jump', 'walk3', 'walk1', 'jump', 'walk2'],
    gemBonus: ['highjump'],               // extra card dealt only when gems are on
  },
  {
    name: '9. Stepping Stone',       // the crate has to stop exactly under the platform's edge
    hint: 'The platform is out of reach from the floor. Something has to be standing right under its edge: exactly there, not one tile further.',
    map: [
      '................',
      '................',
      '................',
      '..........*.....',
      '............G...',
      '.........######.',
      '................',
      '..P.C...........',
      '################',
    ],
    cards: ['walk2', 'walk3', 'highjump', 'echo', 'walk3', 'jump'],
  },
  {
    name: '10. Into the Pit',        // you can't climb out of the pit, so send the crate in first
    hint: "Once you drop in for the key, you can't jump high enough to climb out. Send something down there first.",
    map: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '..PC......G.....',
      '######..########',
      '######.K########',
      '################',
    ],
    cards: ['walk3', 'walk2', 'turn', 'jump', 'turn', 'jump', 'walk2'],
  },
  {
    name: '11. Two-Way Street',      // key on the right, door on the left; clear the spike both ways
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
    name: '12. Rush Hour',           // no jumping under the ceiling: pure timing (one solution)
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
    name: '13. Fetch & Carry',       // crate against the wall, key from behind, then a double jump (one solution)
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
];

// Levels that need a switched-off feature are hidden.
const usesDisabled = (l) => (!CONFIG.features.crates && l.map.some((r) => r.includes('C')))
  || (!CONFIG.features.keys && l.map.some((r) => r.includes('K'))) || l.cards.some((c) => !CARDS[c]);
const withGemBonus = (l) => CONFIG.features.gems && l.gemBonus?.every((c) => CARDS[c]) ? { ...l, cards: [...l.cards, ...l.gemBonus] } : l;
const BUILTIN_LEVELS = [...BASE_LEVELS, ...(CONFIG.features.puzzlePack ? PUZZLE_PACK : [])].filter((l) => !usesDisabled(l)).map(withGemBonus);
