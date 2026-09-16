# Offcut — Requirements & Scope

**Lifecycle step:** 3 of 17 · **Locked:** 2026-09-17 · **Source:** [PRD.md](../PRD.md) locked decisions. Flows and screen index: [03-user-flows.md](03-user-flows.md).

Actors: **Shopper** (guest or signed in), **Owner** (the brand operator, `/owner`), **Platform** (code: webhooks, pipeline, seed). Each requirement ends with **Accept:** — the check that closes it. Ids: R = v1, R2 = v2, R3 = v3. Money in ₹, integer paise in the DB.

---

## v1 — Store (base, ≈ 16 h)

### R1. Auth & roles
- Email + password, cookie session (`oc_session`, HttpOnly, SameSite=Lax), sign up / sign in / sign out; roles `shopper` | `owner` on `users`. Two demo logins on the landing: shopper (one delivered order, one address) and owner. Forgot-password arrives with Resend in v2.
- `/owner/*` requires `owner`; a shopper hitting it gets 404. `/account/*` requires any session.
- **Accept:** protected routes redirect to sign-in and back; a shopper never sees the console; sessions expire after 30 days.

### R2. Catalogue & browsing
- Home: hero drop, category strip, "New in" rail, "Shop the look" teaser (v1: links to a "coming in v2" band; v2: live).
- `/shop` and `/shop/[category]`: product grid (4 / 2 columns), filters in the URL — category, size (in stock only), colour (from dominant colour buckets), price range — sort by new / price ↑↓; full-text search (`tsvector` on name + description + tags) at `/search?q=`.
- Product card: hero photo with ThumbHash blur-up, name, price, colourway dots, "sold out" when every variant is 0.
- **Accept:** every filter combination is a shareable URL; a filter change never reloads the page; a grid of 36 products scores Lighthouse mobile ≥ 90 perf with no CLS.

### R3. Product page
- `/p/[slug]`: gallery (2–3 photos, blur-up, pinch/scroll on phone), name, price, description, colourway switch (changes photos), size row with per-size stock state (in stock / low ≤ 3 / sold out), quantity, **Add to bag**, delivery note (flat ₹99, free over ₹1,999).
- **More like this:** 8 products from `GET /products/{slug}/similar` (pgvector on the hero photo's embedding, own product excluded), as a rail.
- **Accept:** picking a sold-out size disables the button with a reason; "More like this" returns same-category items in its top 3 for every seeded product (eval script); the gallery reserves its aspect ratio (no CLS).

### R4. Cart
- A `carts` row keyed by a `oc_cart` cookie from the first add (guest) or by `user_id` (signed in); signing in merges the guest cart into the user's cart (sum quantities, cap at stock). Line = variant + qty; price snapshotted at checkout, not in the cart.
- Bag drawer from any page: lines with photo, size / colour, qty stepper, remove, subtotal, delivery, **Checkout**. Stock is re-checked when the drawer opens; a line over stock is clamped with a notice.
- **Accept:** add on one page → drawer count updates without reload; guest adds two items, signs in with a cart holding one → three lines; cart survives a browser restart for 30 days.

### R5. Checkout & payment
- `/checkout`: contact (email, phone), address (name, line 1/2, city, state, PIN — Indian format), summary; signed-in users pick from the address book. **Pay** → `POST /checkout` (reserves stock, creates the Razorpay order) → Razorpay Standard Checkout modal → `POST /checkout/{id}/verify` → `/orders/[number]?key=…` success page.
- Reservation: per-line `stock − reserved ≥ qty` under row locks in one transaction; failure → `409 out_of_stock` and the checkout page marks the line. Unpaid orders expire after 15 min (lazy `expire_stale()`), releasing stock.
- Webhook `POST /webhooks/razorpay` (`payment.captured`, `payment.failed`): HMAC-verified, event id deduped; `payment.captured` calls the same `mark_paid` as verify.
- Success page offers **Create an account** (password only; email already known) which attaches the order and the address.
- **Accept (tests):** two concurrent checkouts of the last unit → one `paid`, one `409`; verify then webhook (and webhook then verify) both leave exactly one decrement; a replayed webhook is a no-op; an order left unpaid for 16 min is `expired` and its stock is back.

### R6. Orders — shopper side
- `/orders/[number]`: status timeline `paid → packed → shipped → delivered`, lines, address, totals, payment id; reachable signed in, or as a guest with the `key` from the success page / email (v2) or by **Track order** (`/track`: number + email).
- `/account`: orders list, address book (add / edit / default), profile.
- **Accept:** a guest can open their order with number + email and cannot open anyone else's; the timeline reflects owner transitions on reload.

### R7. Owner console — products & the image pipeline
- `/owner/products`: table (photo, name, category, variants, stock total, status draft / live); `/owner/products/new` and `/owner/products/[id]`: name, slug, category, price (₹), description, tags, colourways, sizes → variants generated as a size × colour matrix with stock per cell; status toggle.
- **Photos:** drag-drop / picker (≤ 8 MB picked, downscaled in the browser to ≤ 2000 px before upload because Vercel caps request bodies at 4.5 MB; jpeg / png / webp, several at once, sent one per request) → `POST /owner/products/{id}/photos` → pipeline (Pillow sniff, EXIF orientation + strip, resize ≤ 2000 px, ThumbHash, dominant colour, Blob, Jina 512-d embedding) → thumbnail appears with its colour swatch and a "embedded ✓" tick; reorder (first = hero, per colourway), delete (removes the Blob).
- **Accept (tests):** a pipeline run yields a 512-d unit vector, a ThumbHash and a hex colour; a 9 MB or `.gif` upload is refused with a message; a product with no live variants never appears in the shop.

### R8. Owner console — inventory & orders
- `/owner/inventory`: variant table with stock, reserved, available (`stock − reserved`); adjust with a reason (received / correction / damaged) → `inventory_moves` row; low-stock filter (≤ 3).
- `/owner/orders`: board columns paid / packed / shipped / delivered (+ tabs for pending, expired, cancelled); an order card opens a drawer with lines, address, payment; **only legal next transitions are offered** (`paid → packed → shipped → delivered`; `paid → cancelled` with a Razorpay refund); shipped takes an optional courier + tracking id.
- **Accept (test):** every edge of the transition table is allowed exactly as listed; an illegal transition → `409 invalid_transition`; adjusting stock below `reserved` is refused.

### R9. Seed & content
- Seed script (idempotent): owner + demo shopper, 36 products / ~150 variants / ~100 photos (decision 2) pulled by `seed/fetch_photos.py` from Wikimedia Commons with a licence filter and `CREDITS.md`; each photo runs through the real pipeline (so seed = the first pipeline test); one delivered demo order; 10 held-out query photos in `seed/queries/` for the eval script.
- **Accept:** `seed` runs twice without duplicates; every product has ≥ 1 embedded photo; `eval_similar.py` reports ≥ 36/36 same-category top-3.

---

## v2 — Lens (mid, ≈ 11 h)

### R2-1. Shop the look
- `/lens`: drop zone (drag, picker, **paste** from clipboard, camera on phone) → crop step (`react-easy-crop`, free aspect, "use whole photo") → `POST /lens/search` (multipart + crop box) → results: the query crop pinned top-left, 12 matches ranked with match % and category chips to filter, each opens the product page. "Search from this photo" on every product-page image opens `/lens` with that photo preloaded.
- Client downscales the picked photo (≤ 5 MB) to ≤ 1024 px before upload. Server: sniff, crop applied, embed, one pgvector query (hero-only excluded from nothing — all photos searched), group by product, top 12; the query image is never stored; ≤ 1.5 s p50.
- **Accept:** eval script — 8 / 10 held-out outfit photos put a correct-category product in the top 3; a 6 MB file is refused before upload finishes; results render with blur-up, no CLS.

### R2-2. Text-to-image search
- `/search?q=` becomes hybrid: full-text ranks ∪ Jina text-embedding ranks, fused by reciprocal-rank fusion (k = 60); a "semantic" hint shows when the top result came from the vector side.
- **Accept:** "olive cargo pants" returns cargo trousers first even though no product name contains "olive".

### R2-3. Returns & refunds
- Shopper: on a `delivered` order ≤ 7 days old, **Request return** per line with a reason → `return_requested`. Owner: approve (→ Razorpay refund for the line amount → `returned`, stock back) or reject (→ `return_rejected`, note).
- **Accept (test):** refund amount equals the line total; a second approval is a no-op; a return on a 9-day-old order is refused.

### R2-4. Emails
- Resend + React Email: order confirmed (with the tracking `key` link), shipped (courier + id), return decision; forgot / reset password.
- **Accept:** the confirmation arrives within a minute of `paid` with a working link.

### R2-5. Owner dashboard
- `/owner`: revenue, orders, average order value, top 5 products, low-stock count for 7 / 30 days; small sparklines.
- **Accept:** numbers match a SQL check over the seeded orders.

---

## v3 — Full fit (advanced, ≈ 8 h)

### R3-1. Shop the whole look
- `/lens` gains multi-crop: draw up to 4 boxes on one photo (top, bottom, shoes, accessory) → one query per box in a single request → an **outfit board**: best match per box with alternates, "Add the fit to bag" adds the four default sizes (editable in the drawer).
- **Accept:** four boxes → four ranked lists in one response ≤ 2.5 s.

### R3-2. For you
- Recently viewed product ids in a cookie (last 20) → centroid of their hero embeddings → nearest 8 on the home page ("For you"), excluding viewed ones. No account needed.
- **Accept:** viewing three jackets makes the rail mostly jackets; a fresh browser shows "New in" instead.

### R3-3. Owner: near-duplicates & low-stock alerts
- On photo upload, if the nearest existing photo scores ≥ 0.95, the console shows "looks like *Boxy Tee 03* — reuse that photo?" with both thumbnails. Low-stock alert email (daily digest, Resend) when any live variant ≤ 3.
- **Accept:** uploading the same file twice triggers the prompt; the digest lists the right variants.

### R3-4. Discount codes
- `discounts(code, type percent | flat, value, min_order, expires_at, uses)`; applied at checkout; owner CRUD.
- **Accept:** an expired or minimum-unmet code is refused with a reason; the Razorpay amount reflects the discount.

---

## Out of scope (all versions)
Marketplace / multi-brand · wishlists · reviews · multi-currency · shipping-rate APIs · marketing emails · COD · mobile owner console · real-money billing · storing shopper query photos · size recommendation · inventory across warehouses.
