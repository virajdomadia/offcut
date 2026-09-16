# Offcut — Database + API Design

**Lifecycle step:** 6 of 17 · **Locked:** 2026-09-17 · Behaviour in [04-technical-design.md](04-technical-design.md). Alembic `0001_v1` creates everything under **A** (and `create extension if not exists vector`); v2/v3 tables get their own migrations.

## A. Postgres schema (v1)

```sql
create extension if not exists vector;
create type user_role      as enum ('shopper','owner');
create type product_status as enum ('draft','live');
create type order_state    as enum ('pending_payment','paid','packed','shipped','delivered','expired','cancelled',
                                    'return_requested','returned','return_rejected');          -- last three used from v2
create type category       as enum ('tees','hoodies','jackets','trousers','shorts','caps','sneakers','bags');

users          (id uuid pk, email citext unique, password_hash text, name text, phone text null, role user_role default 'shopper', created_at)
sessions       (id text pk, user_id uuid fk, expires_at timestamptz, created_at)                     index (user_id)
addresses      (id uuid pk, user_id uuid fk, name, phone, line1, line2 null, city, state, pin char(6), is_default bool, created_at)  index (user_id)

products       (id uuid pk, slug citext unique, name text, category category, price_paise int, description text, tags text[],
                status product_status default 'draft', created_at, updated_at,
                search tsvector generated always as (setweight(to_tsvector('english', name),'A') ||
                                                     setweight(to_tsvector('english', array_to_string(tags,' ')),'B') ||
                                                     setweight(to_tsvector('english', description),'C')) stored)
                index gin (search) · index (category, status)
colourways     (id uuid pk, product_id fk, name text, hex text, sort int)                              index (product_id)
variants       (id uuid pk, product_id fk, colourway_id fk, size text, sku text unique,
                stock int default 0 check (stock >= 0), reserved int default 0 check (reserved >= 0 and reserved <= stock))
                unique (colourway_id, size) · index (product_id)
product_photos (id uuid pk, product_id fk, colourway_id fk null, url text, width int, height int,
                thumbhash text, colour text, colour_bucket text, embedding vector(512) null, model text, dims int,
                embed_error text null, sort int, created_at)
                index (product_id, sort) · index hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64)
inventory_moves (id uuid pk, variant_id fk, delta int, reason text, actor_id fk, created_at)          index (variant_id)

carts          (id uuid pk, user_id uuid fk null unique, token text unique null, created_at, updated_at)
cart_lines     (cart_id fk, variant_id fk, qty int check (qty > 0), primary key (cart_id, variant_id))

orders         (id uuid pk, number text unique,                     -- 'OC-1042', sequence-backed
                user_id uuid fk null, email citext, phone text, key text,   -- key: 32-char guest access token
                state order_state, address jsonb, subtotal_paise int, delivery_paise int, discount_paise int default 0, total_paise int,
                razorpay_order_id text unique, razorpay_payment_id text null, refund_id text null,
                courier text null, tracking_id text null, created_at, paid_at null, updated_at)
                index (user_id, created_at desc) · index (state, created_at) · index (email)
order_lines    (id uuid pk, order_id fk, variant_id fk, product_id fk, name text, size text, colour text, photo_url text,
                qty int, unit_paise int)                                                                index (order_id)
order_events   (id uuid pk, order_id fk, from_state order_state null, to_state order_state, actor text, note text null, created_at)
                index (order_id, created_at)
webhook_events (id text pk, event text, received_at)
```

Available stock is always `stock − reserved` in SQL; the `reserved ≤ stock` check makes "adjust below reserved" impossible at the DB too. Photos carry `model` + `dims` so a provider swap re-embeds by filter, not by migration. `orders.address` is a snapshot (jsonb) so an address-book edit never rewrites history; `order_lines` snapshot name / size / colour / price for the same reason.

**Reservation recipe** (checkout and expiry share it):
```sql
begin;
  update orders set state = 'expired' where state = 'pending_payment' and created_at < now() - interval '15 min' returning id;  -- then release each line
  select id, stock, reserved from variants where id = any($ids) order by id for update;
  update variants set reserved = reserved + $qty where id = $id and stock - reserved >= $qty;   -- rowcount 0 → rollback 409
  insert into orders (...) values (... 'pending_payment' ...);
  insert into order_lines (...);
commit;
-- mark_paid (verify or webhook), under `select ... from orders where id = $1 for update`:
  update variants v set stock = v.stock - l.qty, reserved = v.reserved - l.qty from order_lines l where l.variant_id = v.id and l.order_id = $1;
  update orders set state = 'paid', razorpay_payment_id = $2, paid_at = now() where id = $1 and state = 'pending_payment';
```

**v2 additions:** `returns (id, order_id fk, order_line_id fk, reason text, state text, refund_id text null, decided_by fk null, created_at, decided_at null)` index (order_id); `email_log (id, order_id fk, kind text, sent_at)`; `users.reset_token`, `reset_expires_at`.
**v3 additions:** `discounts (code citext pk, type text, value int, min_order_paise int, expires_at, uses int, max_uses int null)`; `orders.discount_code`; `product_photos.duplicate_of uuid null` (recorded when the owner reuses instead of uploading).

## B. Blob keys
| Prefix | Written by | Deleted when |
|---|---|---|
| `products/{product_id}/{uuid}.jpg` | `services/pipeline.py` (owner upload, seed) | Photo deleted in the console / product deleted |

Nothing else is stored in Blob. Query photos (v2) never touch it.

## C. REST API (`/api/*` from the browser; FastAPI serves `/docs`)

Error envelope everywhere: `{ "error": { "code": "out_of_stock", "message": "…", "details": {…} } }`. Auth via cookie; `🔒` = signed in, `👑` = owner (404 otherwise), `🔑` = order `key` or owner of the order, `⚙` = server-to-server. Money fields are paise integers.

### Auth
| Method | Path | Body → Returns |
|---|---|---|
| POST | `/auth/sign-up` | `{ email, password, name }` → `Me` (merges the guest cart) |
| POST | `/auth/sign-in` | `{ email, password }` → `Me` (merges the guest cart) |
| POST | `/auth/sign-out` | → 204 |
| GET | `/auth/me` | `Me { id, name, email, role }` · 401 |
| POST | `/auth/demo` | `{ as: 'shopper' \| 'owner' }` → `Me` |

### Catalogue (public)
| Method | Path | Returns |
|---|---|---|
| GET | `/products?category=&size=&colour=&min=&max=&sort=new\|price_asc\|price_desc&page=` | `Page<ProductCard>` — live products only; size filter = any variant with available > 0 · `s-maxage=300` |
| GET | `/products/{slug}` | `Product` (colourways, variants with `available`, photos with thumbhash) · 404 if draft |
| GET | `/products/{slug}/similar?k=8` | `ProductCard[]` with `score` — pgvector on the hero embedding · `s-maxage=300` |
| GET | `/search?q=&page=` | `Page<ProductCard>` — v1 full-text; v2 hybrid (adds `matched_by: 'text' \| 'semantic'`) |
| GET | `/home` | `{ new_in: ProductCard[], categories: {key, count, cover}[], for_you?: ProductCard[] (v3) }` |
| GET | `/filters?category=` | `{ sizes: {size, count}[], colours: {bucket, hex, count}[], price: {min, max} }` |

### Cart (cookie `oc_cart` or session)
| Method | Path | Body → Returns |
|---|---|---|
| GET | `/cart` | `Cart { lines: [{ variant_id, product, size, colour, photo, unit_paise, qty, available }], subtotal_paise, delivery_paise, total_paise }` |
| POST | `/cart/lines` | `{ variant_id, qty }` → `Cart` · 409 `out_of_stock` |
| PATCH | `/cart/lines/{variant_id}` | `{ qty }` (0 = remove) → `Cart` |
| DELETE | `/cart` | → 204 |

### Checkout & orders
| Method | Path | Body → Returns |
|---|---|---|
| POST | `/checkout` | `{ email, phone, address \| address_id, discount_code? (v3) }` → `{ order_id, number, key, razorpay_order_id, key_id, amount_paise }` · 409 `out_of_stock { variant_id }` · 422 `cart_empty` |
| POST | `/checkout/{order_id}/verify` | `{ razorpay_payment_id, razorpay_signature }` → `Order` · 400 `bad_signature` |
| POST | `/checkout/{order_id}/cancel` | → `Order` (only from `pending_payment`; releases stock) |
| GET 🔑 | `/orders/{number}?key=` | `Order { number, state, lines, address, totals, events[], courier, tracking_id, paid_at }` |
| POST | `/orders/track` | `{ number, email }` → `Order` (rate-limited) |
| POST 🔑 | `/orders/{number}/claim` | `{ password }` → `Me` — success-page "create an account": creates the user with the order's email, attaches order + address |
| GET 🔒 | `/account/orders` | `OrderCard[]` |
| GET/POST 🔒 | `/account/addresses` · PATCH/DELETE `/account/addresses/{id}` | address book |

### Owner 👑
| Method | Path | Body → Returns |
|---|---|---|
| GET | `/owner/products?status=&q=` | `OwnerProductRow[]` (photo, name, category, variants, stock_total, status) |
| POST | `/owner/products` | `{ name, slug?, category, price_paise, description, tags, colourways: [{name, hex}], sizes: [] }` → `OwnerProduct` (variants generated as the matrix) |
| GET/PATCH | `/owner/products/{id}` | `OwnerProduct` (variants with stock / reserved, photos with pipeline fields) |
| POST | `/owner/products/{id}/status` | `{ status }` → `OwnerProduct` · 409 `no_live_variants` |
| POST | `/owner/products/{id}/photos` | multipart `file`, `colourway_id?` → `ProductPhoto { url, width, height, thumbhash, colour, embedded: bool }` · 413 · 415 · 502 `storage_failed` |
| PATCH | `/owner/products/{id}/photos/order` | `{ ids: [] }` → 204 |
| POST | `/owner/products/{id}/photos/{photo_id}/embed` | → `ProductPhoto` (retry) |
| DELETE | `/owner/products/{id}/photos/{photo_id}` | → 204 (Blob delete) |
| GET | `/owner/inventory?low=` | `VariantRow[]` (product, sku, size, colour, stock, reserved, available) |
| POST | `/owner/inventory/{variant_id}/adjust` | `{ delta, reason }` → `VariantRow` · 409 `below_reserved` |
| GET | `/owner/orders?state=` | `OrderCard[]` (runs `expire_stale()` first) |
| GET | `/owner/orders/{number}` | `Order` + `allowed_transitions: order_state[]` |
| POST | `/owner/orders/{number}/transition` | `{ to, note?, courier?, tracking_id? }` → `Order` · 409 `invalid_transition` |

### Server-to-server ⚙
| Method | Path | Notes |
|---|---|---|
| POST | `/webhooks/razorpay` | `X-Razorpay-Signature` HMAC over the raw body; `webhook_events.id` unique; `payment.captured → mark_paid`, `payment.failed → cancel if pending` |
| POST (web) | `{WEB_URL}/api/revalidate` | `{ tags: [], secret }` — called on product / photo / stock / status writes |

### v2
| Method | Path | Notes |
|---|---|---|
| POST | `/lens/search` | multipart `file` (≤ 4 MB after downscale), `crop: {x,y,w,h}?`, `category?` → `{ matches: [{ product: ProductCard, score, photo_url }], took_ms }` · 415 · 503 `search_unavailable` |
| GET | `/search?q=` | hybrid (RRF over FTS + text embedding) |
| POST 🔑 | `/orders/{number}/returns` | `{ order_line_id, reason }` → `Order` (≤ 7 days after delivered) · 409 |
| POST 👑 | `/owner/returns/{id}/decide` | `{ approve: bool, note? }` → refund → `Order` |
| GET 👑 | `/owner/dashboard?days=7\|30` | `{ revenue_paise, orders, aov_paise, top_products[], low_stock }` |
| POST | `/auth/forgot` · `/auth/reset` | Resend link |

### v3 (sketch; detailed when v3 starts)
`POST /lens/search` accepts `crops: []` → `{ boards: [{ crop, matches[] }] }` · `GET /home` adds `for_you` from `X-Viewed` (cookie of last 20 product ids) · `POST /owner/products/{id}/photos` returns `duplicate_of?: { photo, score }` when ≥ 0.95 · `GET/POST/DELETE /owner/discounts` · `POST /checkout` validates `discount_code` · daily low-stock digest (`scripts/low_stock_digest.py`, run by hand or a Vercel cron once the project moves off Hobby).

## D. Payload shapes that matter
```ts
type ProductCard = { id: string; slug: string; name: string; category: Category; price_paise: number;
                     photo: Photo; colourways: { name: string; hex: string }[]; sold_out: boolean; score?: number };
type Photo = { url: string; width: number; height: number; thumbhash: string; colour: string };
type Product = ProductCard & { description: string; tags: string[];
                     colourways: { id: string; name: string; hex: string; photos: Photo[] }[];
                     variants: { id: string; colourway_id: string; size: string; available: number }[] };
type Cart = { lines: CartLine[]; subtotal_paise: number; delivery_paise: number; total_paise: number };
type Order = { number: string; state: OrderState; lines: OrderLine[]; address: Address; email: string;
               subtotal_paise: number; delivery_paise: number; discount_paise: number; total_paise: number;
               events: { from: OrderState | null; to: OrderState; at: string; note?: string }[];
               courier?: string; tracking_id?: string; paid_at?: string; allowed_transitions?: OrderState[] };
type OrderState = 'pending_payment'|'paid'|'packed'|'shipped'|'delivered'|'expired'|'cancelled'|'return_requested'|'returned'|'return_rejected';
type CheckoutStart = { order_id: string; number: string; key: string; razorpay_order_id: string; key_id: string; amount_paise: number };
type LensResult = { matches: { product: ProductCard; score: number; photo_url: string }[]; took_ms: number };   // v2
type ProductPhoto = Photo & { id: string; colourway_id?: string; embedded: boolean; embed_error?: string; sort: number };
```
