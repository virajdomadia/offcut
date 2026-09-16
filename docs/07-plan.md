# Offcut — Development Plan

**Lifecycle step:** 7 of 17 · **Written:** 2026-09-17 · **Inputs:** [03-requirements.md](03-requirements.md), [04-technical-design.md](04-technical-design.md), [06-data-and-api.md](06-data-and-api.md).
**Tracker:** row status lives in the tracker artifact (link added when published; rebuild the page with `python mockups/tracker-build.py`).
**Budget:** v1 ≈ 16 h · v2 ≈ 11 h · v3 ≈ 8 h. v1 runs the whole image pipeline and the vector query from milestone 1.0, so v2 adds an input (the shopper's photo) and a screen, not an engine. **Cadence:** evenings/weekends; each row = one branch + one PR, squash-merged, and **every PR shows something in the browser**. Milestones end deployed. **Build starts after Frontrow** (order 1 → 2 → 4 → 5 → 3 → 6).

**Lean rules in force** (2026-09-15): setup is the minimum to deploy both apps with plain CI; no observability, contract gates, e2e workflows or tracker updates per PR; review findings fixed on the same branch; tests only from 04 §11. Hours saved go to the product page, the Lens and the photos. **Accounts and keys are created just-in-time** — in the row that first needs them, never in a setup batch: **Neon in S2, Vercel Blob + Jina in S3, Razorpay in F4, Resend in L3.** Photos are CC from Wikimedia Commons, fetched by script in S3.

How the lifecycle maps: step 8 = milestone 1.0; steps 9–11 and 14–15 cycle inside every row; step 12 is one checklist row at the end of v1; step 13 is the CI file in 1.0; step 16 is skipped unless something breaks; step 17 is a short doc after v3.

Column key — **Who:** 🟢 shopper · 🟠 owner · ⚪ platform. Endpoints from 06 §C; screens from 03-user-flows.

---

## v1 — Store (≈ 16 h)

### Milestone 1.0 — Skeleton + catalogue live (≈ 5.5 h) — step 8
Goal: both apps deployed, the catalogue seeded through the real pipeline, direction chosen, `/products` answering with photos, ThumbHashes and embeddings.

| # | Part | Who | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|---|
| S1 | **Direction + tokens** | 🟢 | Variant page per [04-ui-mockups.md](04-ui-mockups.md) (S4 product page + S16 Lens results on a phone + S2 collection, 3–4 directions, live motion candidates, CC photos) → Viraj picks → tokens + fonts in `globals.css`, themed browser surfaces | — | 1.5 h | Chosen direction recorded in 04-ui-mockups; landing restyled only if tokens changed |
| S2 | **API skeleton + DB + catalogue seed** | ⚪ | `next.config.ts` rewrite `/api/*`; `lib/api.ts` typed fetch; `pnpm gen:api` | `pyproject` (uv), `main.py`, settings, error envelope, `/health`; models + Alembic `0001_v1` (06 §A, `create extension vector`, HNSW index); `seed/catalog.json` — 36 products, colourways, sizes, stock; `seed.py` (idempotent) for users, products, variants; `GET /products`, `/products/{slug}`, `/filters`, `/search` (FTS); **accounts needed here and no others:** Vercel project `offcut-api` (FastAPI preset, bom1) + Neon with pgvector (`DATABASE_URL`); `ci.yml` (web typecheck+build · api ruff+pytest with `pgvector/pgvector:pg17`) | 2 h | `api.offcut…/docs` opens in prod; `GET /products?category=tees` lists five tees with variants; seed runs twice cleanly; CI green |
| S3 | **The image pipeline + photo seed** | ⚪ | — | `services/pipeline.py` (Pillow sniff → orient + strip → ≤ 2000 px → ThumbHash → dominant colour + bucket → Blob → embed), `services/embedder.py` (`Embedder`, `JinaEmbedder`, `FakeEmbedder`), `services/blob.py`, `services/search.py::nearest()`; `seed/fetch_photos.py` (Commons API, licence filter, `CREDITS.md`) → `seed/photos/`; `seed.py photos` runs every file through `ingest()`; `GET /products/{slug}/similar`; `scripts/eval_similar.py`; **Vercel Blob store + Jina key created here** (`BLOB_READ_WRITE_TOKEN`, `JINA_API_KEY`); **test:** `pipeline`, `similar_excludes_self` | 2 h | ~100 photos in Blob with thumbhash, colour and a 512-d vector each; `eval_similar.py` reports 36/36 same-category top-3; tests green |

### Milestone 1.1 — The shop (≈ 5 h) 🟢
| # | Part | Who | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|---|
| F1 | **Home + collection + filters + search** | 🟢 | S1 home (hero drop, categories, New in; Lens teaser band); S2 collection grid with `ProductCard` (ThumbHash blur-up via `lib/thumbhash.ts`, `next/image` sizes, colourway dots, sold-out), `FilterBar` (URL state, no reload), sort; S3 search results; **v1 motion touch if chosen (e.g. Ticker on prices)** | `GET /home`; cache headers; `app/api/revalidate` contract | 2 h | `/shop/jackets?size=M&colour=black` is shareable and correct; Lighthouse mobile ≥ 90 / 100 / 100 on home and collection with no CLS |
| F2 | **Product page + More like this** | 🟢 | S4 product page: `Gallery` (aspect reserved, blur-up, phone swipe), colourway switch, `VariantPicker` with per-size stock state, qty, Add to bag (stub → F3), delivery note; `SimilarRail` from `/similar`; S18 states (draft 404, all sold out) | ISR by tag `product:{slug}` | 1.5 h | Every seeded product renders at 390 / 1280 with no CLS; sold-out size disables with a reason; the rail shows same-category items |
| F3 | **Auth + cart + bag drawer** | 🟢 | S10 sign in / up + demo buttons on landing; `cart-store.ts` (optimistic add, hydrate from `/cart`); S5 bag drawer (lines, stepper, remove, subtotal, delivery, stock re-check on open); header count | `/auth/*` (argon2, sessions, `oc_session`, `/auth/demo`); `carts` by `oc_cart` cookie; `/cart*`; `services/cart.py` merge on sign-in; **test:** `cart_merge` | 1.5 h | Guest adds two items, signs in with one in the account cart → three lines; count updates without reload; cart survives a restart |

### Milestone 1.2 — Money + owner + close (≈ 5.5 h) 🟢🟠
| # | Part | Who | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|---|
| F4 | **Checkout + Razorpay + orders** | 🟢 | S6 checkout (contact, Indian address form, address book for signed-in, summary), `RazorpayButton` (lazy `checkout.js`, modal, verify, dismiss message); S7 success with **Create an account**; S8 order page with `OrderTimeline`, `/track`; S9 account (orders, addresses) | **Razorpay test account + webhook created here** (`RAZORPAY_*`); `services/checkout.py` (`expire_stale`, reserve under row locks, Razorpay order, `mark_paid`), `services/razorpay.py` (verify, webhook signature); `/checkout*`, `/orders*`, `/account*`, `/webhooks/razorpay`; order numbers `OC-####`; **tests:** `reserve_last_unit_race`, `mark_paid_idempotent`, `expire_stale` | 2.5 h | A guest buys a tee on a phone with the test card in under 2 minutes; the webhook replay is a no-op; stock 1 + two checkouts → one paid; the success page creates an account that owns the order |
| F5 | **Owner console: products, photos, inventory** | 🟠 | `(owner)` layout (404 for non-owners); S11 products table + editor with `VariantMatrix`; S13 `PhotoPanel` (drop zone, canvas downscale ≤ 2000 px, one POST per file, per-file pipeline result: swatch, ThumbHash preview, embedded ✓, retry); S14 inventory table with adjust + reason, low filter | `/owner/products*` (matrix generation, status with `no_live_variants`), `/owner/products/{id}/photos*` (calls `ingest()`), `/owner/inventory*` with `below_reserved`; revalidate tags on writes | 1.5 h | Owner creates a product with 2 colourways × 4 sizes, drops three phone photos, sees swatches + ✓, sets it live → it appears in the shop with a working "More like this" |
| F6 | **Owner orders board + state machine + v1 close** | 🟠 | S12 orders board (columns by state, tabs), `OrderDrawer` offering only `allowed_transitions`, courier + tracking on ship; shopper's timeline reflects it | `services/orders.py` `TRANSITIONS`, `transition()` with `order_events`, `paid → cancelled` refund via Razorpay; `/owner/orders*`; **test:** `transitions`; README "how the pipeline and the reservation work" with diagrams; `docs/12-security-performance.md` (one page + Lighthouse numbers) | 1.5 h | Owner moves an order paid → packed → shipped → delivered and the shopper's page shows each step; an illegal move is refused; v1 tagged; case-study entry drafted |

**v1 total ≈ 16 h**

---

## v2 — Lens (≈ 11 h)

### Milestone 2.0 — Shop the look (≈ 4.5 h) 🟢
| # | Part | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|
| L1 | **Lens: drop, crop, search, results** | S15 `/lens` — `DropZone` (drag, picker, **paste**, camera), `image-downscale.ts` ≤ 1024 px, `Cropper` (`react-easy-crop`, source-pixel box, "use whole photo"); S16 `Results` (query pinned, 12 matches with %, category chips re-query); **the signature motion (Scan) between submit and results**; "Search from this photo" on S4 images | `POST /lens/search` (sniff, crop, embed, `nearest()` with category, group, top 12, `took_ms`), 503 `search_unavailable`; `scripts/eval_lens.py` over `seed/queries/` | 3.5 h | Paste an Instagram outfit screenshot → ranked matches ≤ 1.5 s p50 on prod; `eval_lens.py` ≥ 8/10; the Scan plays with a reduced-motion fallback |
| L2 | **Hybrid text search** | S3 shows a "semantic" hint on vector-side hits | `embed_texts` + RRF in `services/search.py`; `/search` hybrid; **test:** `rrf_fusion_order` | 1 h | "olive cargo pants" ranks cargo trousers first with no name match |

### Milestone 2.1 — Operations (≈ 6.5 h) 🟢🟠
| # | Part | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|
| L3 | **Emails + forgot password** | Forgot / reset pages; email links land on S8 with the `key` | **Resend key created here**; React Email templates: confirmed, shipped, return decision, reset; `email_log`; `/auth/forgot`, `/auth/reset` | 1.5 h | Confirmation arrives within a minute of `paid` with a working link |
| L4 | **Returns + refunds** | S8 "Request return" per line (≤ 7 days after delivered) with reason; S12 drawer shows return requests with approve / reject | `returns` table, `/orders/{n}/returns`, `/owner/returns/{id}/decide` → Razorpay refund → `returned`, stock back; transitions extended; **test:** `return_refund_amount` | 2.5 h | Approve → refund id stored, stock back, shopper sees "Refunded ₹1,299"; a 9-day-old order cannot request |
| L5 | **Owner dashboard + v2 close** | S17 dashboard (revenue, orders, AOV, top 5, low stock; 7 / 30 d sparklines); motion polish on Lens | `/owner/dashboard`; seed adds ~20 historical orders for real numbers | 2 h | Numbers match a SQL check; v2 tagged; case study updated with the Lens |

**v2 total ≈ 11 h**

---

## v3 — Full fit (≈ 8 h)

| # | Part | web/ | api/ | Est. | Done when |
|---|---|---|---|---|---|
| A1 | **Shop the whole look** | Multi-crop on S15 (up to 4 boxes, labelled top / bottom / shoes / extra); outfit board on S16 with a best match + alternates per box; "Add the fit to bag" | `/lens/search` with `crops[]` → one embed batch → one `nearest()` per crop → `boards[]` | 3 h | Four boxes → four ranked lists in one response ≤ 2.5 s; the fit lands in the bag with editable sizes |
| A2 | **For you** | Viewed-products cookie (last 20); home "For you" rail replaces "New in" once ≥ 3 viewed | `/home` reads `X-Viewed`, centroid of hero embeddings, `nearest()` excluding viewed | 1.5 h | Viewing three jackets makes the rail mostly jackets; a fresh browser shows New in |
| A3 | **Near-duplicates + low-stock digest** | S13 shows "looks like *Boxy Tee 03* — reuse?" with both thumbnails; reuse links the photo | Upload response adds `duplicate_of` when nearest ≥ 0.95; `scripts/low_stock_digest.py` (Resend) | 1.5 h | Uploading the same file twice prompts; the digest lists the right variants |
| A4 | **Discount codes + v3 close** | Code field on S6 with inline validation; owner CRUD page | `discounts`, `/owner/discounts*`, `/checkout` applies and stores `discount_paise`; Razorpay amount reflects it; `docs/17-post-launch.md` (½ page); case study | 2 h | Expired / minimum-unmet codes refused with reasons; v3 tagged; case study live |

**v3 total ≈ 8 h** · **Project total ≈ 35 h**
