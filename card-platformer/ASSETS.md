# Deckhop — art asset guide (Aseprite)

Everything in the game is currently drawn in code. This guide lists what you can replace with your own
art, the exact sizes, and how to export it from Aseprite. The plan is **piece by piece**: anything you
haven't drawn yet keeps using the built-in art, so the game always works, and you can swap things in
as you go.

> Status: this is the spec. The loader that reads these files comes next, so nothing here is wired
> up yet. Start drawing whenever you like; file names below are what the loader will look for.

---

## 1. Ground rules

| Rule | Value |
|---|---|
| Tile size | **16 × 16** pixels |
| Pixel art only | No anti-aliasing, no partial transparency (except where noted), no soft brushes |
| Background | Transparent (PNG with alpha) |
| Facing | Draw characters **facing right**; the game mirrors them for left |
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

## 2. Exporting from Aseprite

For anything with more than one frame (or several pieces in one file):

1. **File → Export Sprite Sheet**
2. **Layout:** *By Rows* (or *Packed*, either works), **Padding 0**, **Trim off**
3. **Output:** tick **JSON Data**, choose **Hash**, and tick **Tags** (Meta: *Tags*)
4. Save as `assets/<name>.png` and `assets/<name>.json`

Use **tags** to name animations (e.g. `idle`, `jump`) and **frame durations** for timing. The game reads
the tag names listed below; frames are played in order.

Single images (one frame, no animation) can just be exported as a PNG.

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

Today the hero's squash and stretch is rebuilt in code at any size. With drawn frames the game picks
the closest frame (`crouch` / `land` for squashed, `jump` / `fall` for stretched). It still leans and
bobs him in whole pixels.

### 3.2 The slime (patroller) — `assets/slime.png` (+ `.json`)

Frame size **16 × 16**, about 14 × 10, feet on the bottom row.

| Tag | Frames | Notes |
|---|---|---|
| `idle` | 2 | The wobble while waiting |
| `walk` | 2 | One step per card |
| `squash` | 2–3 | Stomped: flattening into a pancake (the game fades it out) |
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
16 versions in a **4 × 4 grid** (64 × 64 px). Tile number = add up the sides that are **open** (not ground):

| Open side | Adds |
|---|---|
| top | 1 |
| right | 2 |
| bottom | 4 |
| left | 8 |

So tile 0 is fully surrounded (plain dirt), tile 1 has grass on top only, tile 9 (1 + 8) is a top-left
corner, tile 15 is a lone block, and so on. Lay them out left to right, top to bottom: 0–3 on the first
row, 4–7 on the second, etc. The grass (or sand, or snow) cap goes on the **top** edge whenever the top is
open; it may poke a few pixels **above** the tile (tufts), which is fine.

**Other tiles** (same sheet, below the ground, or separate files; 16 × 16 each):

| Tag | Frames | Notes |
|---|---|---|
| `ice` | 1 | Can tile next to itself |
| `plank-left`, `plank-mid`, `plank-right`, `plank-single` | 1 each | One-way platform: the walkable top is the top ~5 px |
| `spikes` | 1 | Deadly. Points up, base on the bottom row |
| `timed-up`, `timed-down` | 1 each | Orange timed spikes, up and retracted. The game adds the small ▲/▼ arrow |
| `cactus-top`, `cactus-mid` | 1 each | Stackable: `top` sits on `mid`, `mid` on `mid` |
| `deco` | 2–6 | *Optional:* little tufts, flowers, stones the game scatters on ground tops |

### 3.5 Backgrounds — `assets/bg-<theme>.png`

Layers, back to front. Each layer is drawn across the whole screen and must **tile seamlessly left to
right** (the right edge joins the left edge). Height **144 px** (9 tiles); the game shifts layers up
or down for taller or shorter levels, so keep the interesting part in the lower half.

| Tag | Size | Notes |
|---|---|---|
| `sky` | 1 × 144 (or any width) | Stretched across; flat bands look best |
| `sun` | up to 32 × 32 | Drawn once, top right |
| `cloud` | up to 48 × 16, 2–4 frames | Each frame is a different cloud; they drift slowly |
| `far` | 256 × 144 | Distant mountains / mesas. Lightest, hazy colours |
| `near` | 256 × 144 | A closer range |
| `hills` | 256 × 144 | The hills with trees, nearest of the scenery. Keep scenery **hazy** (blended toward the sky) so it never looks like something you can touch |

Parallax (how fast each layer moves) stays in code (`PARALLAX` in `art.js`).

### 3.6 Interface — `assets/ui.png` (+ `.json`)

All interface art is drawn at the **UI pixel** (one of your pixels = one UI pixel on screen), so it
matches the cards exactly.

| Tag | Size | Notes |
|---|---|---|
| `card` | 32 × 44 | The blank card face (frame, background). The game draws the name and path on top |
| `card-boosted`, `card-lucky` | 32 × 44 | Momentum (green) and lucky (gold) versions |
| `font-small` | 3 × 5 per letter | Optional: your own small font. A grid of A–Z, 0–9, then `! ? . , ' - / & : +` |
| `font-big` | 5 × 7 per letter | Optional: the title font, same order |
| `heart`, `heart-empty`, `hud-gem`, `hud-key` | 7 × 6-ish | The status icons on the level |
| `icons` | 5 × 5 each | Play, retry, hint, next, levels, pause, redraw, back, edit, flag, gem (button icons) |
| `logo` | any | The DECKHOP logo for the Start screen |

Buttons and panels are built from simple boxes in CSS; if you'd like to draw them too, a 9-slice
(3 × 3 grid: corners, edges, middle) of about 12 × 12 for each works well. Tell me and I'll wire it up.

---

## 4. Templates

I can generate blank Aseprite-ready templates with the grid, labels and frame sizes already set up
(for example the 4 × 4 ground autotile sheet with each tile's open sides marked). Just ask for the
ones you want to start with.
