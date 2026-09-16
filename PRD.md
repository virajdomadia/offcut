# PRD — Offcut: D2C fashion store + AI visual search

**Status:** v1 · lifecycle steps 1–7 in progress (2026-09-17) — see [docs/](docs/) · next: step 8 Project Setup (= milestone 1.0), **after Frontrow** (build order 1 → 2 → 4 → 5 → 3 → 6)
**Name:** Offcut · *streetwear, no filler*
**URL:** https://offcut.virajdomadia.com (landing live at https://offcut-viraj.vercel.app until DNS)
**Slot:** #4 · Budget ~35 h (v1 16 · v2 11 · v3 8) · Build third
**Live artifacts:** Tracker · Screens · Direction variants — links added as each is published (step 4 / 7)

## One-liner
A complete D2C streetwear store for a fictional Bengaluru brand — variants, stock, cart, Razorpay checkout, orders, returns, an owner console — where every product photo goes through an image pipeline into a vector index, so the store can say "more like this" from day one and, in v2, "**drop in a photo of an outfit, find the closest pieces we sell**".

## Who it's for
- **Shopper:** buying clothes on a phone; guest checkout, account optional.
- **Owner:** the brand's one operator — products, photos, stock, orders, returns.
- **Platform (Offcut):** code and seed only — Razorpay webhooks, the image pipeline, embeddings, seed data. No third UI.

## Why this project
- Clients ask for stores more than anything else; this proves one shipped end to end on a phone, with real money flow (test mode) and stock that never goes negative.
- E-commerce data modelling (product → variants → inventory, reservations, an order state machine) is what recruiters probe.
- Visual search adds a second AI shape (vision + embeddings + pgvector) distinct from Tripsmith's agent — and the same joint image/text space powers text search, "for you" and duplicate detection for free.

## Locked decisions (2026-09-17) — follow these until the project ends

### 1. Identity: one brand, one store, two consoles-worth of roles
Offcut **is** the brand: a fictional Bengaluru streetwear label (Indiranagar studio, prices in ₹, sizes S–XL). The site is its own D2C store — no marketplace, no tenancy, no `brand_id`. Roles on one `users` table: `shopper` (optional account) and `owner` (the console at `/owner`). Everything the "platform" does is code: webhooks, pipeline, embeddings, seed.

### 2. Seed: 36 products, 8 categories, ~100 CC photos
| Category | Products | Notes |
|---|---|---|
| Tees | 5 | boxy, oversized, graphic, pocket, long-sleeve |
| Hoodies & sweats | 5 | pullover, zip, crewneck, cropped, heavyweight |
| Jackets | 5 | denim, coach, bomber, work, shell |
| Denim & trousers | 5 | wide, straight, cargo, carpenter, track |
| Shorts | 4 | cargo, mesh, denim, sweat |
| Caps & beanies | 4 | 6-panel, 5-panel, bucket, beanie |
| Sneakers | 4 | low, mid, canvas, runner |
| Bags | 4 | tote, sling, backpack, cap-case |

Each product: 2–3 photos (hero, detail, on-body where Commons has one), 1–3 colourways × sizes S–XL (sneakers: UK 6–11; caps/bags: one size) → ~150 variants, stock 0–40 so some sizes read "sold out". All photos are **CC from Wikimedia Commons**, pulled by a script per category with a licence filter, credits in `api/app/seed/photos/CREDITS.md`, embedded at seed time through the same pipeline the owner uses. Plus **10 held-out query photos** (outfit shots, not in the catalogue) for the search eval. Two demo logins on the landing: **shopper** (has one delivered order and an address) and **owner**.

### 3. Versions — base → mid → advanced
Every project is cut base → mid → advanced (rule set 2026-09-15). v1 alone is a complete, sellable store — and it already runs the pipeline and the vector index, so v2 adds an input, not an engine.

| Version | Ships | Proves | ~Hours |
|---|---|---|---|
| **v1 Store** (base) | Auth (email + password, `oc_session`, roles shopper/owner; two demo logins) · home + collection pages with filters (category, size, colour, price), sort, Postgres full-text search · product page: gallery with ThumbHash blur-up, size × colour variants, stock state, **"More like this"** (pgvector) · cookie cart (guest + merge on sign-in) · **Razorpay** Standard Checkout with stock reservation under row locks, HMAC verify + webhook, order state machine `pending_payment → paid → packed → shipped → delivered` (+ `expired`, `cancelled`) · order tracking by number + email; account: orders, address book · **Owner console:** products & variants CRUD, photo upload → **the image pipeline** (sniff → EXIF strip → resize → ThumbHash → dominant colour → Jina embedding → Blob → pgvector), inventory adjustments, orders board with transitions · seed (decision 2) | A complete store; the model recruiters probe (variants, reservations, state machine, idempotent payments); the pipeline and the vector index are live before the wow needs them | 16 |
| **v2 Lens** (mid) | **Shop the look:** upload / drag / paste a photo → crop → top 12 matches with similarity %, category filter; "Search from this photo" on any product image · **text-to-image search** ("olive cargo pants") hybrid with full-text (reciprocal-rank fusion) · returns: request within 7 days of delivered → owner approves → Razorpay refund · order emails (Resend: confirmed, shipped) · owner sales dashboard (7 / 30 d) | The wow; one joint embedding space serving image *and* text queries | 11 |
| **v3 Full fit** (advanced) | **Shop the whole look:** several crops on one photo → one query each → an outfit board with one match per garment, "Add the fit to bag" · **For you** rail: centroid of recently viewed product embeddings → nearest items (cookie-based, no account) · owner near-duplicate check at upload ("0.97 similar to Boxy Tee 03 — reuse it?") + low-stock alerts · discount codes | Embeddings as a product surface, not a feature | 8 |

### 4. The engine: one pipeline, one vector column, one query
- **Ingest (v1)** — inline in the owner's upload request, no queue: `POST /owner/products/{id}/photos` (multipart, ≤ 8 MB, jpeg/png/webp) → **Pillow** sniff, EXIF orientation applied and metadata stripped, resize ≤ 2000 px → **ThumbHash** (the blur-up placeholder, ~25 bytes) + **dominant colour** (quantised on a 64 px thumb; feeds the colour filter) → **Vercel Blob** `products/{product_id}/{uuid}.jpg` → **Jina `jina-clip-v2`** image embedding, Matryoshka-truncated to **512 dims** and L2-normalised → `product_photos.embedding vector(512)` with `model` + `dims`. ~1–2 s per photo, all inside the request.
- **Index and query** — pgvector **HNSW** `vector_cosine_ops` on `product_photos.embedding`. One query for every feature: nearest photos `LIMIT 60` → group by product keeping the best distance → drop the source product → top 12; `score = 1 − distance`. "More like this" (v1) feeds the product's hero embedding; Shop the look (v2) feeds the shopper's crop; text search (v2) feeds a Jina **text** embedding of the query — same space, same SQL; "For you" (v3) feeds the centroid of recently viewed products.
- **Search (v2)** — shopper photo ≤ 5 MB → Pillow sniff, crop box applied server-side, resize ≤ 1024 px → embed → query. The query image lives in memory for the request and is **never stored**. Target ≤ 1.5 s p50 from `bom1` (embedding call ≈ 400–800 ms).
- **Embedder boundary** — `services/embedder.py` defines `Embedder.embed_images(list[bytes]) → list[list[float]]` and `embed_texts`; `JinaEmbedder` is the only implementation; the documented fallback is Voyage `voyage-multimodal-3` (same protocol, re-embed ~100 photos via the seed command, no schema change).
- **Why hosted, why not self-hosted or in-browser:** `api/` runs on Vercel functions (250 MB bundle, no GPU) — torch does not fit, an ONNX int8 CLIP would add seconds of cold start to the demo, and a 90 MB in-browser model is not something a shopper's phone should download. One HTTPS call in the request is the lean answer; the protocol keeps the choice reversible.

### 5. Stock and money: reserve, pay, confirm — idempotently
- **Checkout** creates an order in `pending_payment` and **reserves** every line in one transaction: variant rows locked in id order, `update variants set reserved = reserved + qty where id = $1 and stock − reserved ≥ qty`; a zero-row update aborts with `409 out_of_stock` naming the line. Then a Razorpay order (paise) is created and its id stored.
- **Confirm** — the client's `POST /checkout/{id}/verify` (HMAC-SHA256 of `order_id|payment_id`) and the webhook `payment.captured` (signature-checked, event id deduped) both call the same `mark_paid(order)`; whichever lands first flips `pending_payment → paid` and converts the reservation into a decrement (`stock −= qty, reserved −= qty`); the second is a no-op.
- **Expiry** — a `pending_payment` order older than **15 min** is expired lazily: every checkout and every read of a pending order first runs `expire_stale()`, which releases reservations. No cron.
- **State machine** — transitions live in one dict in `services/orders.py`; the owner console only offers legal next states; anything else → `409 invalid_transition`. v2 adds `delivered → return_requested → returned | return_rejected`, with the refund through Razorpay's refund API.
- **Tests only where a demo bug embarrasses:** two concurrent checkouts of the last unit → exactly one succeeds; every transition edge; webhook signature and replay; pipeline yields a 512-d unit vector and a ThumbHash; "More like this" never returns its own product; guest cart merges on sign-in. The search eval (10 held-out photos, 8/10 in top 3) is a script, not CI.

### 6. Stack and setup — lean
Shared stack from [`projects/README.md`](../README.md): `web/` Next.js App Router + Tailwind 4, `api/` FastAPI on Vercel (FastAPI preset, `bom1`), **Neon Postgres with `pgvector`**, Vercel Blob, own cookie-session auth (`oc_session`), Razorpay (test mode), Resend (v2). New deps: `Pillow`, `pgvector` (SQLAlchemy type), `httpx`, `thumbhash` in api; `react-easy-crop` in web (v2). Setup is the minimum to deploy both apps with plain CI (web typecheck + build, api ruff + pytest). OpenAPI → TS types by script, committed, not CI-gated; no Sentry, no uptime monitor. **Accounts and keys are created just-in-time** in the plan row that first needs them: Neon in S2, Blob + Jina in F1, Razorpay in F3, Resend in L3.

## The wow moment (v2)
Screenshot an outfit from Instagram. Drop it on the store. A scanline sweeps the photo, and the closest pieces Offcut sells tile in, ranked, each with a match percentage — the cargo pants at 91 %, a similar jacket at 84 %. Tap one, pick a size, pay. Under a minute on a phone.

## Out of scope (all versions)
Marketplace / multi-brand · wishlists · reviews · multi-currency · shipping-rate APIs (flat ₹99, free over ₹1,999) · marketing emails · COD · size guides beyond a static table · mobile owner console (owner = desktop) · real-money billing · storing shopper query photos.

## Success criteria
- A full purchase on a phone in under 2 minutes from the home page (guest, demo card).
- Stock can never go negative under concurrent checkout — covered by a test in CI; reservations released within 15 min of an abandoned checkout.
- v1: "More like this" returns same-category items in the top 3 for every seeded product (eval script).
- v2: 8 of the 10 held-out outfit photos put a correct-category product with a sensible look in the top 3; search responds ≤ 1.5 s p50.
- Lighthouse mobile ≥ 90 perf / 100 a11y / 100 SEO on home, collection and product pages (ThumbHash placeholders, `next/image`, no CLS in the gallery).
- A visible frontend signature chosen in step 4 (candidates: *Scan*, *Cut*, *Swatch*, *Ticker*), themed browser surfaces, reduced-motion fallbacks.

## Resolved questions
- *Marketplace or one brand?* One brand; platform = code + seed (Viraj, 2026-09-17).
- *Visual search in v1?* No — v1 runs the whole pipeline and uses it for "More like this"; v2 adds the shopper's photo as an input. Same precedent as Frontrow / Pagecraft: the engine in v1, the wow in v2.
- *Embeddings: hosted vs self-hosted?* Hosted Jina CLIP v2, called inline; `Embedder` protocol keeps it swappable (decision 4).
- *How many SKUs?* 36 products / ~150 variants / ~100 photos + 10 held-out queries (decision 2).
- *Accounts required?* No — guest checkout; account offered on the success screen; owner is a role on the same table.
- *Images: Cloudinary?* No — Vercel Blob + Pillow + `next/image`, one less account; the pipeline is the point.
- *Fictional brand name?* Offcut itself; studio in Indiranagar, Bengaluru.
