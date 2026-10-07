# Deckhop — art asset guide (Aseprite)

Everything in the game is currently drawn in code. This guide lists what you can replace with your own
art, the exact sizes, and how to export it from Aseprite. The plan is **piece by piece**: anything you
haven't drawn yet keeps using the built-in art, so the game always works, and you can swap things in
as you go.

> Status: templates are in `art-templates/` (section 4) and the game **loads your exports**
> (`assets/`, section 2). So far the loader uses **backgrounds, clouds, terrain tiles, the hero,
> the flag, the door, things (gem, key, crate), the HUD icons, the logo, the slime, the spring and the
> bumper**: everything in the level. The cards, button icons and fonts are next, and their exports can be made now: they'll be picked
> up as each part is wired in.

---

## 1. Ground rules

| Rule | Value |
|---|---|
| Tile size | **16 × 16** pixels |
| Pixel art only | No anti-aliasing, no partial transparency (except where noted), no soft brushes |
| Background | Transparent (PNG with alpha) |
| Facing | Draw the hero **facing right** and the slime **facing left** (as in their templates); the game mirrors them |
| Anchor | Characters and objects sit on the **bottom-centre** of their frame (feet on the bottom row) |
| Outlines | Characters, items and hazards: solid dark outline (`#2b1b24` or `#181425`). Terrain: lighter, coloured outlines so characters pop |
| Palette | Based on **Endesga 32** (below). Extra colours are fine, but staying close keeps everything cohesive |
| Folder | `assets/` next to `index.html` (e.g. `assets/hero.png` + `assets/hero.json`) |

### Palette (Endesga 32, as used now)

```
#be4a2f #d77643 #ead4aa #e4a672 #b86f50 #733e39 #3e2731 #a22633
#e43b44 #f77622 #feae34 #fee761 #63c74d #3e8948 #265c42 #193c3e
#124e89 #0099db #2ce8f5 #ffffff #c0cbdc #8b9bb4 #5a6988 #3a4466
#262b44 #181425 #ff0044 #68386c #b55088 #f6757a #e8b796 #c28569
```

Extras in use today: slime purples `#a884f3 #7b4fd6 #4b2a8a`, sky blues per theme (see `PIXEL_THEMES`
in `pixel.js`).

---

## 2. Getting your art into the game

Draw on any layers you like (a new layer over the built-in `art` layer is great: hide `art` once you've
replaced it). **Frames you leave empty keep the built-in art**, so you can replace one piece at a time.

**The easiest way: from Aseprite's menu.** With your file open, choose **File → Scripts → Export to
Deckhop**. It exports the file into the project's `assets/` folder (every visible layer except the
guide) and adds it to `assets/manifest.json`. The file must be saved inside the project folder (e.g. in
`art-templates/`). Your file itself isn't changed.

*Setting it up (once):* copy `tools/Export to Deckhop.lua` into Aseprite's scripts folder (**File →
Scripts → Open Scripts Folder**), then **File → Scripts → Rescan Scripts Folder**. The first time it
runs, Aseprite may ask whether the script can write files: allow it. Tip: give it a keyboard shortcut
in **Edit → Keyboard Shortcuts** (search "Export to Deckhop").

**Or one command, from the project folder:**

```
tools/export-art.sh bg-peaks
```

That exports `art-templates/bg-peaks.aseprite` to `assets/bg-peaks.png` + `.json` (every visible layer
except the guide) and adds it to `assets/manifest.json`, the list of art the game loads. Several at once:
`tools/export-art.sh hero slime tiles-meadow`, or give a path to your own copy:
`tools/export-art.sh ~/Art/hero.aseprite`.

**Or by hand in Aseprite:** File → Export Sprite Sheet, hide the guide layer (Layers: *Visible layers*),
Layout *By Rows*, Padding 0, Trim off, Output **JSON Data → Hash** with **Tags**, saved as
`assets/<name>.png` / `.json`; then add `"<name>"` to `assets/manifest.json`.

**Seeing it:** reload the game from a local web server or GitHub Pages. (Browsers won't load these files
when `index.html` is opened straight from disk, so you'd see the built-in art there.)

Use **tags** to name animations (e.g. `idle`, `jump`) and **frame durations** for timing. The game reads
the tag names listed below; frames are played in order.

---

## 3. What to draw

Suggested order (most visible first): **hero → meadow ground → flag, gem, key, door → slime →
the other tiles → backgrounds → interface**.

### 3.1 The hero — `assets/hero.png` (+ `.json`)

Frame size **16 × 16**; the body is about **12 × 12** with feet on the bottom row, centred.

| Tag | Frames | When it's used |
|---|---|---|
| `idle` | 2–4 | Standing still (gentle breathing) |
| `blink` | 1 | Every few seconds while idle |
| `crouch` | 1 | Just before a jump (squashed: wider, shorter) |
| `jump` | 1–2 | Going up (stretched: narrower, taller) |
| `fall` | 1–2 | Coming down |
| `land` | 1 | The moment you touch down (squashed) |
| `walk` | 2–4 | Walking (optional; the game can bob `idle` instead) |
| `win` | 1–2 | Reaching the flag (smile) |
| `dead` | 1 | Spiked / fallen / caught (the current one turns red with x x eyes) |

With your frames the game plays `idle` (with `blink` now and then) while waiting, `walk` while moving
(about two frames per tile), `jump` going up, `fall` coming down, `land` on touchdown, then `win` or
`dead`. Frame durations come from Aseprite (idle, win); walk follows the footsteps. It mirrors your
drawing for facing left, and still leans, bobs and squeezes through a turn in whole pixels. Any tag
left empty falls back to the built-in hero for that moment.

### 3.2 The slime (patroller) — `assets/slime.png` (+ `.json`)

Frame size **16 × 16**, about 14 × 10, feet on the bottom row. Unlike the hero, draw the slime **facing
left** (as in the template): slimes start out walking left, and the game mirrors it when it turns.

| Tag | Frames | Notes |
|---|---|---|
| `idle` | 2 | The wobble while waiting |
| `walk` | 2 | One step per card |
| `squash` | 2–3 | Stomped: flattening into a pancake (the game fades it out and adds a few splash droplets) |
| `tumble` | 4 | Bowled over by a Dash: a spin. The game moves it along an arc; just draw the turns |

### 3.3 Things — one file each (or one `assets/things.png` sheet with a tag per thing)

| File / tag | Size | Frames | Notes |
|---|---|---|---|
| `gem` | 16 × 16 | 1–4 | Floats; optional shine frames. The game bobs it 1 px and adds a twinkle |
| `key` | 16 × 16 | 1 | |
| `flag` | 16 × **32** | 4 | Waving. Must fit in **26 px** of height from the bottom (pole bottom on the bottom row) |
| `door` | 16 × **32** | 1 | The locked door: **exactly the same height as the flag** (26 px from the bottom) |
| `crate` | 16 × 16 | 1 | Fills the whole tile (it becomes a floor when it drops into a pit) |
| `spring` | 16 × 16 | 3 | `rest`, `squash1`, `squash2` (it rings after firing). Pad on top, base on the bottom row |
| `bumper` | 16 × 16 | 2 | `rest`, `squash`. Draw it **facing right** (pad on the right, plate on the left); the game mirrors it |

### 3.4 Terrain tiles — `assets/tiles-<theme>.png` (`meadow`, `canyon`, `peaks`)

**Ground autotile (16 tiles).** The game picks the right ground tile from its four neighbours, so draw
16 versions: the **`ground` tag has 16 frames, and frame number = tile number** (the first frame is
tile 0). In the template, cyan lines on the guide layer mark each frame's open sides. Tile number = add
up the sides that are **open** (not ground):

| Open side | Adds |
|---|---|
| top | 1 |
| right | 2 |
| bottom | 4 |
| left | 8 |

So tile 0 is fully surrounded (plain dirt), tile 1 has grass on top only, tile 9 (1 + 8) is a top-left
corner, tile 15 is a lone block, and so on. The grass (or sand, or snow) cap goes on the **top** edge
whenever the top is open.

**Variety (optional).** To keep the ground from looking samey, draw **extra versions** of any tile: add
frames at the end of the file and tag them **`ground-<number>`**. For example, a `ground-0` tag with 3
frames gives plain dirt 4 looks, and `ground-1` adds versions of the grass top. The game mixes your
versions with the main one, picked by position, so each spot always looks the same and nothing
flickers. Start with tiles **0** (dirt) and **1** (grass top): they're most of the ground.
**`deco`** frames (tufts, flowers, stones; 16 × 16, sitting on the bottom row) are scattered on top of
about a third of the open ground tops.

**Inside corners (optional).** Where a cliff face meets lower ground (or an overhang meets a wall),
the corner belongs to no single autotile, because it depends on the *diagonal* neighbour. Draw it as a
small overlay, a 16 × 16 frame that's transparent except the corner pixels, tagged **`inner-tl`**,
**`inner-tr`**, **`inner-bl`** or **`inner-br`** (which corner of the tile it's in). The game draws it
on top of a ground tile whose two sides toward that corner are ground but whose diagonal neighbour
there is open. Usually it's the single outline pixel in that corner, e.g. `inner-tl` = pixel (0, 0),
`inner-tr` = (15, 0), joining the cliff's edge line to the lower ground's top line.

**Other tiles** (same sheet, below the ground, or separate files; 16 × 16 each):

| Tag | Frames | Notes |
|---|---|---|
| `ice` | 1 | Can tile next to itself |
| `plank-left`, `plank-mid`, `plank-right`, `plank-single` | 1 each | One-way platform: the walkable top is the top ~5 px |
| `spikes` | 1 | Deadly. Points up, base on the bottom row |
| `timed-up`, `timed-down` | 1 each | Orange timed spikes, up and retracted. The game adds the small ▲/▼ arrow |
| `cactus-top`, `cactus-mid` | 1 each | Stackable: `top` sits on `mid`, `mid` on `mid` |
| `deco` | 2–6 | *Optional:* little tufts, flowers, stones the game scatters on ground tops (see Variety) |
| `ground-0` … `ground-15` | any | *Optional:* extra versions of that ground tile (see Variety) |
| `inner-tl`, `inner-tr`, `inner-bl`, `inner-br` | 1 each | *Optional:* inside-corner overlays (see Inside corners) |

### 3.5 Backgrounds — `assets/bg-<theme>.png` and `assets/clouds-<theme>.png`

`bg-<theme>` is **512 × 144** with one frame per layer, back to front. The scrolling layers (`far`,
`near`, `hills`) repeat as you travel, so each must **tile seamlessly left to right**: the right edge has
to flow into the left edge (the guide's dotted side lines are a reminder). Any width works if you want
them even longer (the wider, the less often they repeat). A handy trick in Aseprite: **View → Tiled Mode
→ Tile in X axis** shows the frame repeated, so you can see and paint across the seam. The game shifts
layers for taller or shorter levels, so keep the interesting part in the lower half (the dotted guide
line across marks roughly where the ground of a normal level sits).

| Tag | Notes |
|---|---|
| `sky` | The sky, including the **sun** (top right). Flat bands look best; it doesn't scroll |
| `far` | Distant mountains / mesas. Lightest, hazy colours |
| `near` | A closer range |
| `hills` | The hills with trees, nearest of the scenery. Keep scenery **hazy** (blended toward the sky) so it never looks like something you can touch |

`clouds-<theme>` is **48 × 16** with a `cloud` tag: each frame is a different cloud; they drift slowly.

Parallax (how fast each layer moves) stays in code (`PARALLAX` in `art.js`).

### 3.6 Interface — `assets/ui.png` (+ `.json`)

All interface art is drawn at the **UI pixel** (one of your pixels = one UI pixel on screen), so it
matches the cards exactly.

| File / tag | Size | Notes |
|---|---|---|
| `ui-card`: `card`, `card-boosted`, `card-lucky` | 32 × 44 | The blank card face. The game draws the name (on the dotted line) and the path (between the pink lines) on top |
| `ui-hud`: `heart`, `heart-empty`, `gem`, `key` | 9 × 7 | The status icons on the level. Spaced by the size you draw, centred on the numbers |
| `ui-icons`: one tag per icon | 7 × 7 | Button icons (play, retry, hint, next, grid, pause, redraw, back, edit, flag, gem, infinity, gear, trash) |
| `ui-font-small` | grid of 6 × 6 cells | Optional: your own small font (3 × 5 letters). Order, 16 per row: A–Z, 0–9, then `! ? . , ' - / & : +` |
| `ui-font-big` | grid of 6 × 8 cells | Optional: the 5 × 7 title font, same order |
| `ui-logo` | any | The DECKHOP logo for the Start screen |

Buttons and panels are built from simple boxes in CSS; if you'd like to draw them too, a 9-slice
(3 × 3 grid: corners, edges, middle) of about 12 × 12 for each works well. Tell me and I'll wire it up.

---

## 4. Templates — `art-templates/`

One `.aseprite` file per asset group, with the right canvas size, every frame, the tag names above and
sensible frame timings already set up. Each has two layers:

- **`art`**: the game's **current** art, exactly as it's drawn today, so you can paint over it, tweak
  it, or clear it and start fresh.
- **`guide (hide before export)`**: faint pink and cyan marks: where the feet go (cyan), the 12 × 12
  body area (pink box), the 26 px height limit for the flag and door, each ground tile's open sides,
  the card's name line and picture area, and roughly where the ground sits in a background.

| Template | What's in it |
|---|---|
| `hero`, `slime` | Characters, one tag per animation |
| `things` | Gem, key, crate |
| `flag`, `door` | The goal (16 × 32) |
| `spring`, `bumper` | Rest and squash frames |
| `tiles-meadow`, `tiles-canyon`, `tiles-peaks` | 16 ground autotiles, ice, planks, spikes, timed spikes, cactus |
| `bg-meadow`, `bg-canyon`, `bg-peaks` | Sky, far, near and hills layers |
| `clouds-meadow`, `clouds-canyon`, `clouds-peaks` | Three clouds each |
| `ui-card`, `ui-hud`, `ui-icons` | Card faces, status icons, button icons |
| `ui-font-small`, `ui-font-big`, `ui-logo` | Fonts and logo |

Edit them in place or save copies anywhere, and export as in section 2. Keep the **tag names** and
**frame order**: that's how the game finds each piece.
