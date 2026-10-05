// Deckhop — retired levels (not loaded by the game). Kept so they can be reused:
// copy one into levels.js (and give it a new name) to bring it back.
// These were the original Meadow and Dusk Canyon sets, before the gentler new sets replaced them.
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
];
