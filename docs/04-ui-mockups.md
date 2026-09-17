# Offcut — UI Mockups

**Lifecycle step:** 4 of 17 (UX companion to the technical design) · **Brief locked:** 2026-09-17 · **Variants:** built 2026-09-17 — `mockups/direction-variants.html`, published at https://claude.ai/artifact/GXn8tPnv8uMhKXMxjtZeoG (round 2: eight directions, six screens) · **Chosen: H · Court** (Viraj, 2026-09-17)
**Pairs with:** [03-user-flows.md](03-user-flows.md) — one mockup per v1 screen (S1–S14, S18) after the direction is chosen; S15–S16 (Lens) are mocked with v1 because the direction is judged on them.
**Files:** `mockups/landing.html` (exists, already ported to `web/`) → `mockups/direction-variants.html` (S4 product page + S16 Lens results on a 390 px phone, S2 collection at desktop, 3–4 directions) → `mockups/screens.html` (every v1 screen in the chosen direction) → `mockups/tracker.html` (built by `mockups/tracker-build.py`).
**Published:** [Direction variants](https://claude.ai/artifact/GXn8tPnv8uMhKXMxjtZeoG) · [Screens](https://claude.ai/artifact/QRyBudWEkRwfHRsW8DGmvH) · Tracker — link in [07-plan.md](07-plan.md).

## Brief
**Style:** the existing landing sets the brand — **Archivo** (variable width, 62–125), black `#000`, white `#FFF`, acid `#D6FF3B`, grey `#5E5E5E`, 2 px black rules, uppercase 900-weight headings at line-height .9, a marquee. Streetwear brands earn trust with restraint and confidence: big type, hard edges, photography doing the talking. Keep the black/white/acid system; the variants explore the one question that matters for a store with a camera in it: **how does the product photography sit against the chrome, and what does "the store is looking at your photo" feel like.**

**The product page and the Lens results are the product.** Photos must be the biggest thing on every shopper screen; chrome is rules and type. The owner console is the same system in a denser, calmer register (tables, matrices, pipeline status) — it must feel like the same brand, not an admin template.

**Real content:** the seed catalogue — CC streetwear photos from Wikimedia Commons (tees, hoodies, jackets, cargo trousers, caps, sneakers), one outfit photo as the Lens query, credits in `mockups/img/CREDITS.md`. Prices in ₹ (₹1,299 tee, ₹2,999 hoodie, ₹4,499 jacket). Sizes S–XL with one sold out.

## Motion signature — pick one in the variant page
| Candidate | What happens | Reduced-motion fallback |
|---|---|---|
| **A · Scan** | On submit, an acid scanline sweeps the query photo top→bottom (700 ms) leaving a faint grid; as it passes, matches tile in from the right in rank order, each match % counting up from 0 (stagger 60 ms). The crop box outline "locks" with a 2-frame flash. | Photo dims 20 %, results fade in together |
| **B · Cut** | Page transitions are a cut: a dashed line draws across the viewport (300 ms), the old page splits along it and the two halves slide apart, the new page is underneath. Product tiles on hover show a dashed "cut here" corner. | Cross-fade 150 ms |
| **C · Swatch** | Hovering / focusing a product tile flips it through its colourways like fabric swatches (each 120 ms, `rotateY`), settles on the last; the colour dots under the title track it. Size buttons stamp in on the product page. | Static tile; dots only |
| **D · Ticker** | Prices, stock ("3 left"), and match % render as split-flap tickers: digits roll when they change (adding to bag rolls the subtotal; the Lens % rolls up from 00). Marquee stays. | Digits change instantly |

Recommendation was A · Scan + D · Ticker. Round 2 added four more candidates (Reveal, Fly to bag + Stitch, Focus, Stamp + Pop) with the four new styles. **Viraj chose H · Court (2026-09-17)**: signature = **the Scan with Stamp + Pop** (scanline sweeps the query photo, the match count stamps in, tiles pop with overshoot and their % counts up); v1 touch = **Fly to bag + Ticker** (the photo arcs into the bag pill, the pill bumps, the subtotal rolls); hover lifts every tile off its hard shadow. Cut, Swatch, Reveal, Focus dropped.

## Variant page (`mockups/direction-variants.html`) — round 1, built
Four full-size directions of **S4 product page** (desktop 1280, scaled to fit) with **S16 Lens results** on a 390 px phone beside it, and **S2 collection** below, behind an A/B/C/D tab strip (keys 1–4). Each direction demonstrates one motion candidate live; the Scan plays on every phone since it is the wow whichever chrome wins. Directions:

| Direction | Chrome | Photography | Idea |
|---|---|---|---|
| **A · Rulebook** | The landing's system as-is: white, 2 px black rules, boxed grid, acid only on actions and labels | Photos boxed by rules, 4:5, no radius | The brand's own grid — Swiss streetwear. **Demonstrates D · Ticker:** Add to bag rolls the subtotal |
| **B · Blackout** | Black chrome, white type, acid accents; photos glow on black | Photos edge-to-edge in a dark gallery | Night drop. **Demonstrates A · Scan** on its native ground |
| **C · Paper stock** | Off-white `#F2F0EA`, thin 1 px rules, huge condensed headings, mono labels (JetBrains Mono) for SKUs, sizes, % | Photos sit on the paper like a lookbook spread, staggered grid | Lookbook / zine; product data in mono reads "engineered". **Demonstrates C · Swatch:** hover flips a tile through its colourways |
| **D · Acid sheet** | White with acid section bands and acid selection; oversized wordmarks bleeding off | Photos stacked with sticker-style labels | Loudest; risks fighting the photos. **Demonstrates B · Cut:** the product page is cut along a dashed line to reveal the collection |

Each direction carries the same photos and copy; only the chrome and the demonstrated motion change. `prefers-reduced-motion` respected in all.

## Variant page — round 2 (Viraj: "all look the same… check more UI styles", "try more animations")
Six screens per tab (S4 + S16, S1 + S6, S2, owner console S11/S13) and four styles that are not chrome swaps of the streetwear system:

| Direction | Style | Motion |
|---|---|---|
| **E · Gallery** | Ivory, hairlines, Cormorant Garamond headings, letter-spaced light Archivo, accent = ink (no acid). SSENSE / COS | **Reveal** — photos wipe up on entry; hover = slow zoom, siblings dim |
| **F · Clay** | Sand ground, terracotta, Fraunces serif, 14 px radius, pill buttons, soft shadows. Warm craft brand | **Fly to bag** + **Stitch** (dashed thread tightens around a hovered tile) |
| **G · Lens app** | Cool grey, electric blue, Plus Jakarta Sans sentence case, elevated cards, pill sizes/chips. Product app | **Focus** — the scan is a focus pull with viewfinder brackets; results pop with a spring; tiles lift |
| **H · Court** | Cream `#FFF6E0`, navy `#1B1B6F` 3 px borders with offset hard shadows, red `#E63B2E` + yellow `#F6C90E` blocks, Archivo at wdth 125. Retro 90s sportswear catalogue | **Stamp** + **Pop**; hover lifts a tile off its shadow |

Switching tabs replays a staggered entrance in each direction's idiom; Add to bag does Ticker + Fly to bag in every tab.

## Chosen direction — H · Court (locked 2026-09-17)
**Idea:** a 90s sportswear catalogue you can buy from. Cream paper, navy ink, every object is a card with a 3 px navy border and a hard offset shadow — a sticker on a sheet. Red and yellow do the pointing (actions, tags, stamps); the photos stay the biggest thing on every screen. Archivo at its widest for headings and the wordmark; the same face at normal width for everything else, so the brand is one family. The owner console is the same sheet at a calmer density.

### Tokens (→ `web/src/app/globals.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` / `--panel` / `--tile` | `#FFF6E0` / `#FFFFFF` / `#FFE9B8` | page ground / cards, drawers, header / image placeholders, hover fills |
| `--ink` / `--ink-2` / `--muted` | `#1B1B6F` / `#2E2E7A` / `#5B5B8C` | text, borders, shadows / secondary / labels (≥ 4.5:1 on cream) |
| `--line` · `--lw` | `#1B1B6F` · `3px` | every border; hard shadows `5px 5px 0 var(--line)` on tiles, `6px 6px 0` on cards |
| `--red` | `#E63B2E` | primary action fill, sold-out, stamps, match badges, destructive |
| `--yellow` | `#F6C90E` | selected state (size, chip, nav item), bag pill, low-stock, "Drop 04" tags, the Lens scanline |
| radii | tiles / cards 8 px · buttons / pills 8 px · phone 44 px | rounded just enough to read as stickers |
| type | **Archivo** variable — headings 900 at wdth 125, uppercase, tracking −.01em · body 400–800 at wdth 100 · **JetBrains Mono** 400/500 for SKUs, match %, pipeline status, order numbers | `next/font/google`, `display: swap` |
| grid | shop 4 columns at ≥ 1280 (gap 22 px, shadow room 8 px), 2 on phone; product page 1.25 fr / 1 fr; console 220 px sidebar + fluid | |

### Motion (all with `prefers-reduced-motion` fallbacks)
| Moment | Spec | Reduced |
|---|---|---|
| **Scan (signature, v2)** | red scanline sweeps the query photo top→bottom 700 ms linear with a faint red grid; at 720 ms the match count **stamps** in (scale 1.9 → .94 → 1, rotate −8° → 2°, 500 ms `cubic-bezier(.2,1.4,.4,1)`), then tiles **pop** in rank order (scale .6 → 1, 500 ms `cubic-bezier(.34,1.56,.64,1)`, stagger 70 ms) while each % counts up from 00 over 600 ms | photo dims, results fade in together, numbers set instantly |
| Fly to bag (v1) | on Add to bag a 90 × 112 clone of the hero photo arcs to the bag pill (720 ms, mid-point 160 px above the line, scale 1 → .12), the pill bumps (scale 1.18, 450 ms spring) and the subtotal rolls | no clone; subtotal changes instantly |
| Ticker (v1) | digits are 0–9 columns translating `translateY(−n × 1.1em)`, 550 ms `cubic-bezier(.2,.8,.2,1)` — bag subtotal, "3 left", order totals | instant |
| Tile hover | `translate(−3px, −3px)` and shadow `8px 8px 0`, 180 ms; buttons `−2px` and `6px 6px 0` | none |
| Page entrance | tiles / cards pop in with the same overshoot, stagger 45 ms, on first paint of a route | fade |
| Sold-out / 404 | the stamp (rotated −4°, 4 px border) with no animation — it's a state, not an event | — |
| Marquee | 24 s linear loop, yellow band | static |

### Browser surfaces
`::selection` yellow with navy ink · scrollbar: cream track, navy thumb, 10 px, square · focus ring 3 px yellow, offset 2 px · `caret-color` navy · `theme-color` `#FFF6E0` · favicon = the mark with the yellow corner.

## Screens (`mockups/screens.html`) — built 2026-09-17
Every v1 screen from the screen index in Court, plus the Lens: S1 home, S2 collection (desktop + phone), S3 search results, S4 product page (desktop with Fly to bag + Ticker live, phone), S5 bag drawer, S6 checkout (desktop + phone), S7 order success, S8 order page + track, S9 account, S10 sign in/up, S11 owner products, S13 owner editor + photo pipeline, S12 owner orders board with the transition drawer, S14 owner inventory, S15/S16 Lens (drop, crop, results with the Scan), S18 states (sold out, draft 404, empty search). Published at https://claude.ai/artifact/QRyBudWEkRwfHRsW8DGmvH. **Step 4 complete.**
