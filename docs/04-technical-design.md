# Offcut — Technical Design

**Lifecycle step:** 4 of 17 · **Locked:** 2026-09-17 · UI companion: [04-ui-mockups.md](04-ui-mockups.md). Schema and routes: [06-data-and-api.md](06-data-and-api.md).

## 1. Stack (shared stack, no deviations)
| Layer | Choice | Notes |
|---|---|---|
| web/ | Next.js 15 App Router · TypeScript strict · Tailwind 4 · pnpm | UI only; `/api/*` rewritten to the API so cookies are same-origin. New: `thumbhash` (decode placeholder → data URL), `react-easy-crop` (v2) |
| api/ | FastAPI (Python 3.12, uv) · SQLAlchemy 2.0 async + Alembic · pydantic · pytest | Vercel FastAPI preset, region `bom1`. New: **`Pillow`**, **`pgvector`** (SQLAlchemy `Vector` type), `httpx` (Jina), `thumbhash`, `razorpay` |
| Data | Neon Postgres + **`pgvector`** extension | Catalogue, carts, orders, photos **with their embeddings** — one DB, no vector service |
| Files | Vercel Blob | Product photos (pipeline output). Shopper query photos are never stored |
| Embeddings | Jina `jina-clip-v2` over HTTPS | Image and text in one space; 512-d Matryoshka truncation; `normalized: true` |
| Payments | Razorpay Standard Checkout + webhooks, test mode | Orders, verify, refunds (v2) |
| Email (v2) | Resend + React Email | Order mails, returns, forgot-password |
| Contract | `api/openapi.json` → `openapi-typescript` → `web/src/lib/api-types.ts` | `pnpm gen:api`; committed; not CI-gated |
| CI | GitHub Actions: `web` (typecheck + build), `api` (ruff + pytest with a `pgvector/pgvector:pg17` service) | Nothing else |

## 2. Catalogue model
- `products` (slug, name, category, price_paise, description, tags, status draft|live) → `colourways` (name, hex, sort) → `variants` (colourway, size, sku, **stock**, **reserved**). Available = `stock − reserved`, computed in SQL, never stored.
- `product_photos` (product, colourway nullable, url, width, height, **thumbhash**, **colour** hex, **embedding vector(512)**, model, dims, sort). The hero = lowest sort per colourway.
- Full-text: `products.search tsvector` generated column (`name` A, `tags` B, `description` C) with a GIN index; `/search?q=` uses `websearch_to_tsquery('english', q)`.
- Money is integer paise everywhere; the web formats ₹.

## 3. The image pipeline (api, v1)
`services/pipeline.py::ingest(product_id, colourway_id, file) → ProductPhoto`, called inline by `POST /owner/products/{id}/photos` (one call per file; the client sends files one at a time so a failure is per photo):

1. **Sniff** the bytes with Pillow (`Image.open` + `format in {JPEG, PNG, WEBP}`), reject otherwise (415). Reject > 4 MB after the browser-side downscale (413).
2. **Orient + strip:** `ImageOps.exif_transpose`, then re-encode without metadata (no GPS from the owner's phone).
3. **Resize** so the longest side ≤ 2000 px (LANCZOS); encode JPEG q85 (PNG kept for transparent flats).
4. **ThumbHash:** 100 px copy → `thumbhash.image_to_thumbhash` → ~25 bytes, base64 in the row. The web decodes it to a data URL for `next/image placeholder="blur"`; no CLS because width/height are stored.
5. **Dominant colour:** 64 px copy → `quantize(4)` → most-frequent palette entry → hex; mapped to one of 12 filter buckets (black, white, grey, olive, navy, …) in `colours.py`.
6. **Blob:** `put('products/{product_id}/{uuid}.jpg')` via the Blob REST API (`httpx`) → public URL.
7. **Embed:** `Embedder.embed_images([jpeg_bytes])` → 512 floats, L2-normalised → row insert. If Jina fails, the photo row is still written with `embedding null` and `embed_error`; the console shows "retry embed" (`POST …/photos/{id}/embed`).

**Browser side (why):** Vercel functions cap request bodies at **4.5 MB**, so the owner console downsizes each picked file on a canvas to ≤ 2000 px JPEG (≈ 0.5–1.5 MB) before the POST; the picker itself accepts ≤ 8 MB. The API still runs every step above — the browser resize is a transport optimisation, not the pipeline. Same for v2 query photos: ≤ 5 MB picked, downscaled to ≤ 1024 px in the browser.

Seed runs the identical function over `seed/photos/*.jpg`, so the seed is the pipeline's first integration test.

## 4. Embedder
```python
class Embedder(Protocol):
    model: str; dims: int
    async def embed_images(self, images: list[bytes]) -> list[list[float]]: ...
    async def embed_texts(self, texts: list[str]) -> list[list[float]]: ...
```
`JinaEmbedder`: `POST https://api.jina.ai/v1/embeddings` `{ model: "jina-clip-v2", dimensions: 512, normalized: true, input: [{image: <base64>} | {text: "…"}] }`, `Authorization: Bearer $JINA_API_KEY`, timeout 20 s, one retry. Batches of ≤ 16 images. Fallback documented in the PRD: `VoyageEmbedder` (`voyage-multimodal-3`, 1024-d → would need `dims` 1024 and a re-embed via `seed embed --all`). Tests use `FakeEmbedder` (deterministic hash → unit vector) so CI never calls the network.

## 5. Vector queries (api)
One SQL for every feature (`services/search.py::nearest(query_vec, exclude_product=None, category=None, k=12)`):
```sql
with hits as (
  select p.product_id, 1 - (p.embedding <=> $1) as score
  from product_photos p join products pr on pr.id = p.product_id
  where pr.status = 'live' and p.embedding is not null
    and ($2::uuid is null or p.product_id <> $2)
    and ($3::text is null or pr.category = $3)
  order by p.embedding <=> $1 limit 60)
select product_id, max(score) as score from hits group by product_id order by score desc limit $4;
```
Index: `create index on product_photos using hnsw (embedding vector_cosine_ops)` (`m 16, ef_construction 64`; ~100 rows means the index is a formality in v1, but it is the same index at 10k). `SET hnsw.ef_search = 100` per query.
- **More like this (v1):** `query_vec` = the product's hero photo embedding; `exclude_product` = itself; k = 8. Cached at the edge for 5 min (`s-maxage=300`) since the catalogue changes rarely.
- **Shop the look (v2):** `query_vec` = embed of the shopper's crop; optional `category` from the chips (re-query, not client filter, so the 60-cap doesn't starve a category).
- **Text (v2):** `embed_texts([q])` → same query, then reciprocal-rank fusion with the FTS ranking: `score = Σ 1/(60 + rank_i)`.
- **For you (v3):** mean of the hero embeddings of the last 20 viewed products, re-normalised; exclude viewed.

## 6. Cart, checkout, orders (api)
- **Cart:** `carts(id, user_id null, token)`; cookie `oc_cart` = token (30 d). Sign-in: if the user already has a cart, merge lines (sum, clamp to available) and delete the guest cart; else attach. Cart reads join variants for live price and available stock; no price is stored in the cart.
- **Checkout** (`POST /checkout`): in one transaction — `expire_stale()` → `select … from variants where id = any($ids) order by id for update` → per line `update variants set reserved = reserved + $qty where id = $id and stock − reserved ≥ $qty` (rowcount 0 → rollback, `409 out_of_stock { variant_id }`) → snapshot lines into `order_lines` (name, size, colour, unit_paise) → `orders(pending_payment, subtotal, delivery = 9900 or 0 over 199900, total)` → Razorpay `order.create(amount=total, receipt=number)` → store `razorpay_order_id` → commit. Returns `{ order_id, number, key_id, razorpay_order_id, amount }`.
- **Confirm:** `POST /checkout/{id}/verify { payment_id, signature }` → `hmac.sha256(secret, f"{rz_order_id}|{payment_id}") == signature` → `mark_paid(order, payment_id)`: `select … for update`; if `pending_payment` → `paid`, and per line `stock −= qty, reserved −= qty`; else no-op. The webhook route verifies `X-Razorpay-Signature` over the raw body with the webhook secret, inserts `webhook_events(id)` (unique → replay = 200 no-op), then dispatches `payment.captured → mark_paid`, `payment.failed → cancel if still pending`.
- **Expiry:** `expire_stale()` = `update orders set state='expired' where state='pending_payment' and created_at < now() − interval '15 min' returning id` → release each line's reservation. Called at the top of `POST /checkout`, `GET /orders/{n}` and the owner's board load. No cron.
- **Transitions** (`services/orders.py::TRANSITIONS`): `{pending_payment: [paid, expired, cancelled], paid: [packed, cancelled], packed: [shipped], shipped: [delivered], delivered: [return_requested (v2)], return_requested: [returned, return_rejected]}`; `paid → cancelled` and `return_requested → returned` call Razorpay `payment.refund` first and store the refund id. Every transition writes `order_events(order_id, from, to, actor, note)` — the shopper's timeline.
- **Order access:** signed-in owner of the order, or `?key=` (random 32-char token on the order, in the success URL and the v2 email), or `/track` with number + email (rate-limited 10/min/IP).

## 7. Web
- **Rendering:** home and collection pages are dynamic with `fetch` cached by tag (`products`) and `revalidate: 300`; the owner console calls `POST web/api/revalidate` on product/photo/stock writes. Product page: ISR by tag `product:{slug}`. Cart, checkout, orders, account, owner: dynamic, `no-store`. `next/image` with `remotePatterns` for the Blob host, `sizes` per grid, `placeholder="blur"` from ThumbHash.
- **Filters** live in the URL (`nuqs`-style, hand-rolled): `/shop/tees?size=M&colour=olive&max=2500&sort=new`; the grid is a server component; the filter bar is a client component that pushes the URL (no reload, `router.replace` with scroll false).
- **Bag drawer:** client store (`useCart`) hydrated from `GET /cart`; optimistic add; revalidated on open.
- **Checkout:** one client component; loads `checkout.js` (Razorpay) lazily on the page; `Pay` → `POST /api/checkout` → `new Razorpay(options).open()` → handler → `POST /api/checkout/{id}/verify` → `router.push` to success; `ondismiss` shows "Payment not completed — stock is held for 15 min".
- **Owner console:** `app/(owner)/owner/*` behind a layout that 404s non-owners; product editor = one form with a variant matrix (sizes × colourways, stock inputs); photo panel posts files sequentially with per-file progress and pipeline result (swatch, ThumbHash preview, embedded ✓).
- **Lens (v2):** `app/(shop)/lens` client page: drop zone with `paste` listener and `capture="environment"` input; canvas downscale to ≤ 1024 px; `react-easy-crop` → crop box in *source* pixels; `POST /api/lens/search` multipart; results grid. The signature motion (chosen in [04-ui-mockups.md](04-ui-mockups.md)) plays between submit and results.
- **Motion signature and visual direction:** decided in [04-ui-mockups.md](04-ui-mockups.md) from 3–4 variants. On the table: *Scan* (acid scanline over the query photo, matches tile in ranked), *Cut* (page transitions cut along a dashed line), *Swatch* (product tiles flip through colourways on hover), *Ticker* (stock/price tickers).

## 8. Auth & access
Own session auth (as the other projects): `users(email, password_hash argon2, name, role shopper|owner)`, `sessions(id, user_id, expires_at)`, cookie `oc_session` HttpOnly SameSite=Lax 30 d. `POST /auth/demo { as: shopper|owner }` for the landing buttons. Owner routes depend on `require_owner` (404 otherwise). Guest order reads use the order `key`.

## 9. Caching & rendering
Home / collection / product: tag-cached with a 5-min revalidate; API `GET /products*` and `/products/{slug}/similar` send `s-maxage=300, stale-while-revalidate=600`. Cart, checkout, orders, owner, lens: `no-store`. Landing (marketing sections) static.

## 10. Failure modes worth handling
| Failure | Behaviour |
|---|---|
| Jina down during ingest | Photo saved without embedding + `embed_error`; console offers retry; the product still sells |
| Jina down during Lens search (v2) | 503 `search_unavailable`, page shows "Try again in a moment" and the text search link |
| Razorpay modal dismissed | Order stays `pending_payment` 15 min; checkout page can re-open the modal for the same order (no second reservation) |
| Verify never arrives (tab closed) | Webhook `payment.captured` marks paid; the order email (v2) / account shows it |
| Webhook before verify / replayed | `mark_paid` idempotent; `webhook_events.id` unique |
| Stock adjusted below `reserved` | 409 `below_reserved` in the console |
| Blob put fails | 502 `storage_failed`; nothing written; the client retries that file |
| Body > 4.5 MB | Prevented client-side by the canvas downscale; API returns 413 regardless |

## 11. Testing (only these)
- `test_reserve_last_unit_race`: stock 1, two concurrent `POST /checkout` (`asyncio.gather`) → one 200, one 409; `reserved` = 1.
- `test_mark_paid_idempotent`: verify then webhook, and webhook then verify → one decrement; replayed webhook → 200, no change.
- `test_expire_stale`: pending order aged 16 min → `expired`, reservation released.
- `test_transitions`: every edge in `TRANSITIONS` allowed; `shipped → packed` → 409; `paid → cancelled` calls the refund stub.
- `test_pipeline`: a fixture JPEG with EXIF rotation → oriented, ≤ 2000 px, no EXIF, ThumbHash present, hex colour, 512-d unit vector (`FakeEmbedder`); a GIF → 415.
- `test_similar_excludes_self`: nearest never returns the query product; category filter honoured.
- `test_cart_merge`: guest cart + user cart → summed, clamped to available.
- v2: `test_return_refund_amount`, `test_rrf_fusion_order`; `scripts/eval_lens.py` over the 10 held-out photos (report, not CI).

## 12. Environment
`api/`: `DATABASE_URL`, `SESSION_SECRET`, `WEB_URL`, `REVALIDATE_SECRET`, `BLOB_READ_WRITE_TOKEN`, `JINA_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; v2: `RESEND_API_KEY`. `web/`: `API_URL`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_BLOB_HOST`.
