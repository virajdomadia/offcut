# Offcut — Architecture

**Lifecycle step:** 5 of 17 · **Locked:** 2026-09-17

## 1. System diagram

```mermaid
flowchart LR
  subgraph Browser
    SH[Shopper · phone<br/>shop · bag · checkout · lens]
    OW[Owner console · desktop<br/>products · photos · stock · orders]
  end
  subgraph Vercel
    WEB[web · offcut<br/>Next.js: shop (tag-cached) · account · owner · lens<br/>rewrites /api/* →]
    API[api · offcut-api<br/>FastAPI bom1 · Pillow · pgvector<br/>REST + webhooks]
  end
  PG[(Neon Postgres + pgvector<br/>products · variants · photos+embeddings<br/>carts · orders · events)]
  BL[Vercel Blob<br/>product photos]
  JN[Jina · jina-clip-v2<br/>image + text embeddings]
  RZ[Razorpay<br/>orders · payments · refunds]
  RS[Resend · v2]

  SH -->|same-origin /api/*| WEB --> API
  OW --> WEB
  SH -.->|Standard Checkout modal| RZ
  API --> PG
  API -->|put photo| BL
  API -->|embed at ingest · at search| JN
  API -->|create order · refund| RZ
  RZ -->|payment.captured webhook| API
  API -->|revalidate tags| WEB
  API -->|order mails| RS
  BL -->|next/image| SH
```

## 2. Boundaries
| Component | Owns | Never does |
|---|---|---|
| **web/** | Every screen; the bag store; URL filters; the Razorpay modal; the Lens crop UI and browser-side downscale; ThumbHash → data URL | Touch the DB, Blob, Jina or Razorpay's server API; compute prices or stock |
| **api/** | Auth, catalogue, carts, reservations, orders and their state machine, the image pipeline, embeddings, vector queries, Razorpay orders / verify / webhooks / refunds, uploads, seed | Render HTML; keep an in-memory index; store shopper query photos |
| **Postgres (+pgvector)** | Everything durable, including the vectors and the HNSW index | Serve image bytes |
| **Blob** | Product photo bytes (pipeline output only) | Originals, query photos |
| **Jina** | Turning bytes / text into 512-d vectors | Ranking (that is pgvector's) |
| **Razorpay** | Taking the money, telling us via webhook | Deciding stock — reservation is ours |

Contract: `api/openapi.json` → `web/src/lib/api-types.ts` via `pnpm gen:api`. Web client (`web/src/lib/api.ts`) = typed `fetch` forwarding cookies, trusting only the `{ error: { code, message, details } }` envelope.

## 3. api/ layout
```
api/app/
  main.py            app factory, request-id middleware, error envelope
  config.py          pydantic-settings
  db.py              async engine; `create extension if not exists vector` in 0001
  colours.py         hex → 12 filter buckets
  models/            user, session, product, colourway, variant, product_photo (Vector(512)), cart, cart_line,
                     order, order_line, order_event, address, webhook_event, inventory_move,
                     return (v2), discount (v3)
  schemas/           pydantic request/response models (= the OpenAPI contract)
  routers/           auth, catalog (products, search, similar), cart, checkout, orders, account,
                     owner (products, photos, inventory, orders, dashboard v2), lens (v2), webhooks
  services/
    pipeline.py      Pillow → thumbhash → colour → Blob → embed
    embedder.py      Embedder protocol · JinaEmbedder · FakeEmbedder (tests)
    search.py        nearest(); fts(); rrf() (v2)
    blob.py          Blob REST put / delete
    cart.py          merge, clamp
    checkout.py      expire_stale, reserve, create order, mark_paid
    orders.py        TRANSITIONS, transition(), refunds
    razorpay.py      order create, signature verify, webhook verify, refund
  seed/              catalog.json · fetch_photos.py · photos/ (+ CREDITS.md) · queries/ (10 held-out) · seed.py
scripts/             eval_similar.py · eval_lens.py (v2)
tests/               the tests listed in 04 §11 only
```

## 4. web/ layout
```
web/src/
  app/(shop)/            page.tsx (home) · shop/[[...category]] · search · p/[slug] · lens (v2) · track · orders/[number]
  app/(account)/         sign-in · sign-up · account · account/addresses · checkout
  app/(owner)/owner/     layout (404 non-owners) · page (dashboard v2) · products · products/[id] · inventory · orders
  app/api/revalidate/    route.ts
  components/shop/       ProductCard · ProductGrid · FilterBar · Gallery · VariantPicker · SimilarRail · BagDrawer · Price (ticker)
  components/checkout/   CheckoutForm · RazorpayButton · OrderTimeline
  components/owner/      ProductForm · VariantMatrix · PhotoPanel (pipeline status) · InventoryTable · OrdersBoard · OrderDrawer
  components/lens/       DropZone · Cropper · Scan (signature) · Results (v2)
  components/landing/    (exists)
  components/ui/
  lib/api.ts · api-types.ts (generated) · session.ts · cart-store.ts · thumbhash.ts · money.ts · filters.ts · image-downscale.ts
```

## 5. Deployment topology
- Two Vercel projects per repo (as the other projects): `offcut` (root `web/`) and `offcut-api` (root `api/`, FastAPI preset, `bom1`). `web/next.config.ts` rewrites `/api/:path*` → `API_URL`; cookies are first-party; no CORS.
- Neon: one project with `pgvector` enabled; `main` = production, a `dev` branch for local; CI uses the `pgvector/pgvector:pg17` image.
- Blob store on `offcut-api`; `NEXT_PUBLIC_BLOB_HOST` in `remotePatterns`.
- Razorpay test mode; webhook → `https://offcut.virajdomadia.com/api/webhooks/razorpay` (via the web rewrite so the URL survives an API host change).
- Previews: Vercel previews per PR for `web/` against the production API.
- CI (GitHub Actions): `web` = pnpm typecheck + build; `api` = ruff + pytest with the pgvector Postgres service. That is all.

## 6. Request paths worth drawing
**Ingest:** owner drops a 6 MB phone photo → canvas downscale to 2000 px (~1 MB) → `POST /api/owner/products/42/photos` → Pillow (orient, strip, resize) → ThumbHash + colour → Blob put → Jina embed (≈ 600 ms) → `product_photos` insert → `POST web/api/revalidate tag=product:boxy-tee-03` → the console shows swatch + ✓.
**Buy:** `/p/boxy-tee-03` (ISR by tag) → Add to bag → `POST /api/cart/lines` → Checkout → `POST /api/checkout` (expire_stale, lock, reserve, Razorpay order) → modal → `POST /api/checkout/{id}/verify` → `mark_paid` → `/orders/OC-1042?key=…`; Razorpay's webhook arrives seconds later → no-op.
**More like this:** product page server component → `GET API/products/boxy-tee-03/similar` (`s-maxage=300`) → hero embedding → HNSW nearest 60 → group → 8 cards.
**Lens (v2):** paste → downscale 1024 px → crop → `POST /api/lens/search` → Pillow crop → Jina embed → nearest → 12 matches with scores → the Scan plays over the ~1 s round trip.

## 7. Security notes (the short list)
Cookie session HttpOnly + SameSite=Lax; argon2 passwords; owner routes 404 for non-owners; prices and delivery computed server-side from the DB at checkout (the client never sends amounts); Razorpay signature checked on verify and on the webhook, event ids deduped; order `key` is a 32-char random token, `/track` rate-limited; uploads type-sniffed, size-capped, EXIF-stripped, owner-only; query photos processed in memory only; Blob URLs are unguessable but public (product photos are public anyway); no PII in logs; the eval scripts never run against production.
