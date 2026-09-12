# PRD — Offcut: D2C fashion store + AI visual search

**Status:** draft v0 (basic) · to be detailed together
**Name:** Offcut · *streetwear, no filler*
**URL:** https://offcut.virajdomadia.com
**Slot:** #4 · Budget ~35 h · Build third

## One-liner
A complete streetwear brand store — products with variants, cart, Razorpay checkout, orders and returns, admin — plus "upload a photo, find the look": AI visual search that matches items in the catalogue.

## Who it's for
- **Shopper:** buying clothes on mobile.
- **Store owner/admin:** managing catalogue, stock, orders.

## Why this project
- Clients ask for stores more than anything else; proves you can ship one end to end.
- E-commerce data modelling (variants, inventory, order state machine) is what recruiters probe.
- Visual search adds a second AI shape (vision + embeddings) distinct from project #1's agent.

## Core features (thin vertical slice)
**Shopper**
- Home, collection pages, product page (gallery, size/colour variants, stock)
- Search + filters (category, size, colour, price), sort
- Cart (guest + logged-in, persists), Razorpay checkout, address book
- Orders: status timeline (placed → packed → shipped → delivered), request a return
- Visual search: upload/drag a photo → top matching products with similarity score

**Admin**
- Products & variants CRUD, inventory adjustments, image upload
- Orders board: update status, approve returns
- Basic sales numbers

## The wow moment
Drop a screenshot of an outfit from Instagram; the store shows the closest items it sells.

## Out of scope (v1)
Discount codes, wishlists, reviews, multi-currency, shipping-rate APIs, marketing emails.

## Tech notes (to discuss)
- Catalogue model: product → variants (size × colour) → inventory; order state machine with explicit transitions
- Visual search: CLIP-style image embeddings (via an API or a small FastAPI service) stored in pgvector; cosine search
- Images: Cloudinary transforms for responsive product images
- Payments: Razorpay Checkout + webhook; stock decrement inside the transaction

## Success criteria
- Full purchase on a phone in under 2 minutes; stock can't go negative under concurrent checkout
- Visual search returns a sensible match for 8/10 test images

## Open questions
- Fictional brand name and how many SKUs to seed (30–40?)
- Embeddings: hosted API vs self-hosted model?
