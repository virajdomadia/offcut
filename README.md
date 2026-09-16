# Offcut

**Streetwear, no filler.** A complete D2C streetwear store — variants, inventory, cart, orders, returns, admin — plus "upload a photo, shop the look" visual search.

> Status: lifecycle steps 1–7 (PRD, requirements, flows, technical design, mockup brief, architecture, data + API, plan) in progress — see [PRD.md](PRD.md) and [docs/](docs/). Build starts after Frontrow. One of six portfolio projects by [Viraj Domadia](https://virajdomadia.vercel.app). **Live (landing page):** https://offcut-viraj.vercel.app — will move to `offcut.virajdomadia.com` later.

## What it proves
E-commerce data model (variants, reservations, order state machine) · an image pipeline (Pillow → ThumbHash → Blob → Jina CLIP embeddings → pgvector) · visual + text search in one embedding space · Razorpay with idempotent confirmation

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS 4 · FastAPI · PostgreSQL (Neon) + pgvector · Vercel Blob · Jina CLIP v2 · Razorpay · Resend (v2) · pytest · Vercel

## In this repo
```
web/        Next.js 15 (App Router, TypeScript, Tailwind 4) — the landing page lives here
  src/app/            layout.tsx, page.tsx, globals.css
  src/components/     landing/ (one component per section), ui/
  src/lib/
api/        FastAPI backend — folder structure only until the build starts
  app/core · routers · models · schemas · services
  tests/
PRD.md      product requirements v1 — locked decisions + versions table
docs/       03 requirements · 03 user flows · 04 technical design · 04 ui mockups · 05 architecture · 06 data + API · 07 plan
mockups/    landing.html — the design source the web/ page was ported from
brand/      logo, mark and favicon
```

### Run the landing page
```
cd web
pnpm install
pnpm dev
```

## Roadmap
v1 **Store** (≈ 16 h) → v2 **Lens** (≈ 11 h) → v3 **Full fit** (≈ 8 h) — rows and estimates in [docs/07-plan.md](docs/07-plan.md).
