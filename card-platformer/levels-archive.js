// Deckhop — retired levels (not loaded by the game). Kept so they can be reused:
// copy one into levels.js (and give it a new name) to bring it back.
// These were the original level sets, before the gentler new sets replaced them. Good candidates for a harder
// 'Summit' set. (Mid-Air U-Turn, Rebound, Bridge Builder, Two-Way Street and Into the Pit are now in it; Full Sprint,
// Stepping Stone, Down and Under, Rush Hour, Upstairs and the old Mind the Gap were joined in pairs to make its wide levels.)
const ARCHIVED_LEVELS = [
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
];
