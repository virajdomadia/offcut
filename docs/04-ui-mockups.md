# Offcut — UI Mockups

**Lifecycle step:** 4 of 17 (UX companion to the technical design) · **Brief locked:** 2026-09-17 · **Variants:** built 2026-09-17 — `mockups/direction-variants.html`, published at https://claude.ai/artifact/GXn8tPnv8uMhKXMxjtZeoG · **Chosen:** —
**Pairs with:** [03-user-flows.md](03-user-flows.md) — one mockup per v1 screen (S1–S14, S18) after the direction is chosen; S15–S16 (Lens) are mocked with v1 because the direction is judged on them.
**Files:** `mockups/landing.html` (exists, already ported to `web/`) → `mockups/direction-variants.html` (S4 product page + S16 Lens results on a 390 px phone, S2 collection at desktop, 3–4 directions) → `mockups/screens.html` (every v1 screen in the chosen direction) → `mockups/tracker.html` (built by `mockups/tracker-build.py`).
**Published:** [Direction variants](https://claude.ai/artifact/GXn8tPnv8uMhKXMxjtZeoG) · Screens — after the pick · Tracker — after the pick.

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

Recommendation: **A · Scan** as the signature (it is the wow moment, and it only makes sense on this product) with **D · Ticker** as the v1 touch (bag subtotal and stock counts roll — so v1 already has motion before Lens exists). C is the cheapest to add later; B fights the App Router's navigation model for little gain.

## Variant page (`mockups/direction-variants.html`) — round 1, built
Four full-size directions of **S4 product page** (desktop 1280, scaled to fit) with **S16 Lens results** on a 390 px phone beside it, and **S2 collection** below, behind an A/B/C/D tab strip (keys 1–4). Each direction demonstrates one motion candidate live; the Scan plays on every phone since it is the wow whichever chrome wins. Directions:

| Direction | Chrome | Photography | Idea |
|---|---|---|---|
| **A · Rulebook** | The landing's system as-is: white, 2 px black rules, boxed grid, acid only on actions and labels | Photos boxed by rules, 4:5, no radius | The brand's own grid — Swiss streetwear. **Demonstrates D · Ticker:** Add to bag rolls the subtotal |
| **B · Blackout** | Black chrome, white type, acid accents; photos glow on black | Photos edge-to-edge in a dark gallery | Night drop. **Demonstrates A · Scan** on its native ground |
| **C · Paper stock** | Off-white `#F2F0EA`, thin 1 px rules, huge condensed headings, mono labels (JetBrains Mono) for SKUs, sizes, % | Photos sit on the paper like a lookbook spread, staggered grid | Lookbook / zine; product data in mono reads "engineered". **Demonstrates C · Swatch:** hover flips a tile through its colourways |
| **D · Acid sheet** | White with acid section bands and acid selection; oversized wordmarks bleeding off | Photos stacked with sticker-style labels | Loudest; risks fighting the photos. **Demonstrates B · Cut:** the product page is cut along a dashed line to reveal the collection |

Each direction carries the same photos and copy; only the chrome and the demonstrated motion change. `prefers-reduced-motion` respected in all.

## Chosen direction — (to be filled after Viraj picks)
Tokens, motion table and browser surfaces recorded here, then every v1 screen from the screen index built in `mockups/screens.html`.
