# Card Climber

A turn-based puzzle platformer: play movement cards in the right order to reach the flag.
No build step and no dependencies: just static files.

## Files

| File | What's in it |
|---|---|
| `index.html` | The page: layout and buttons. Loads everything below. |
| `style.css` | All styling. Phone layouts are at the bottom. |
| `config.js` | **Every tuning knob** (timers, hand sizes, prices, perks, scoring, feature switches). |
| `rules.js` | Game rules with no screen code: cards, movement, crates, keys, solvers, level generators. |
| `levels.js` | The handmade Plan & Run levels (maps, hands, hints). |
| `game.js` | Modes, drawing, animation, card UI, drag & drop, editor. |
| `card-climber.html` | Redirects to `index.html`, so old links and home-screen shortcuts keep working. |
| `apple-touch-icon.png` | Home-screen icon. |

The scripts load in the order `config.js` → `rules.js` → `levels.js` → `game.js`.

## Play

Open `index.html` in any browser. You can double-click it from disk or use GitHub Pages. It works on desktop and on iPhone, in portrait or landscape.

## Put it on GitHub Pages

1. Upload **all the files above** to a GitHub repo, in the same folder.
2. In the repo, go to **Settings → Pages** and set the source to your main branch, root folder.
3. Open `https://<your-username>.github.io/<repo-name>/`.

On iPhone, open that URL in Safari, then **Share → Add to Home Screen**. The game launches full-screen like an app.

To tune something, edit `config.js`, upload it again, and reload. If your phone shows the old version, reload once more: Safari sometimes caches files for a few minutes.

## Adding levels

Build a level in the editor (✎), check it with **Check solvable**, then use **Import / Export** to copy its JSON. Paste it into `PUZZLE_PACK` in `levels.js`, using the same shape as the other entries.

## Tweaking

Everything you can change is in `config.js`:

- `stepMs`, `gravityMs` and `pauseBetweenCards` set the feel of playback: walking pace, how fast falls speed up, and the gap between cards.
- `turnMode` sets the default mode: `'plan'`, `'instant'` or `'run'` (roguelite).
- `features` turns each experiment on or off: `echo`, `crates`, `puzzlePack`, `runMode`, `fairGenerator`, `keys`, `gems`, `hints` and `timeAttack` (Endless; off brings back the old Instant mode).
- `hints.penalty` sets the points a hint costs. `timeAttack` (Endless) has every Endless knob in one place: `handSize`, `hearts`, `freeCards`, `startSeconds`, `minSeconds`, `secondsLostPer100Tiles`, `terrainRampTiles`, `fairDeal`, `heartEvery` and the card `pool` weights.
- `score` sets the points: flag, per gem, per spare card or step, and the multiplier for collecting every gem.
- `run` holds the roguelite tuning: starting deck, reward pool, hearts, hand size, step budget and the fairness bar.

## Modes

- **Plan & Run:** put cards into the sequence slots, then press Play. You can drop a card into any slot, but Play stays off while there's an empty slot between cards. Tap a planned card to take it back; drag to move it. **Reset** starts the level over (cards back in your hand). After a failed run an optional 💡 Hint unlocks. The first hint is a nudge in words; later ones reveal cards one at a time.
- **Endless:** an endless runner with a hand of 5 movement cards (no Wait or Echo). Your first 3 moves are untimed; after that, pick a card before the timer strip along the top runs out. It starts at 4s and tightens slowly with distance. Every hand includes at least one card that moves you forward safely, and you win back a heart every 60 tiles. Number keys 1–5 pick cards, Space redraws your hand (the clock keeps running), and P pauses (which hides the level).
- **Roguelite:** a run of levels where you buy your cards.
  1. **Pick a route:** *Safe*, *Risky* (tighter budget and more gems, plus a perk), or a *Rest* (heal) or *Shrine* (buy a perk) stop. Each level is previewed.
  2. **Shop:** each level comes with a gem budget, a bit more than its cheapest solution. Tap a shop card to buy it straight into your plan. Drag to reorder, or tap a planned card (or drag it off) to sell it back for a full refund. Every gem on the map can be reached with cards the shop sells.
  3. **Plan & Run:** arrange and play. Failing costs a heart but keeps your cards. Gems you pick up add to your purse, and up to 12◆ carries over.
  4. **Perks** change the rules for the rest of the run: Long Legs, Spring Heels, Spike Guard, Head Start, Thrifty, Echo Discount, Gem Magnet, Piggy Bank, Big Pockets and Second Wind.

  Tuning is in `CONFIG.quest`. Setting `features.shopRun: false` brings back the older deck-draw roguelite.

## Reading cards

Cards only show their action (Walk, Jump, Turn, Wait, Echo). The picture shows exactly what each one does: the yellow square is where you start and the line traces your path, so a "Jump" might go up one and over two, up two and over one, or up one and over three. Hints and other text show small card pictures rather than names. The level editor still uses specific names (Walk 2, High Jump…) so you can build levels precisely.

## Moving cards

In Plan & Run and Roguelite you can tap or drag cards. With a mouse a card lifts as soon as you move it; on a touch screen, press and hold for a moment (a quick swipe still scrolls). Drop into your plan at any position; drag a planned card off the plan to return it to your hand (Plan & Run) or sell it (Roguelite).

## Keys, doors and gems

- **Key (K):** if a level has one, the flag is a locked door until you pick it up. You can grab it mid-jump.
- **Gem (\*):** optional, and placed off the easy route. Score = (100 + 50 per gem + 10 per spare card or step) × 2 if you got every gem. Best scores are saved per level.
- In the editor, **Check solvable** reports how many solutions collect every gem. A good gem is reachable by only some of the solutions.

Levels you make in the editor are saved in that browser only. Use **Import / Export** to keep them as JSON.
