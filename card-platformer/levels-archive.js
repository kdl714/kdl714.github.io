// Card Climber — retired levels (not loaded by the game). Kept so they can be reused:
// copy one into levels.js (and give it a new name) to bring it back.
// These were the original Meadow set (levels 1–9) before the gentler Set 1 replaced it.
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
];
