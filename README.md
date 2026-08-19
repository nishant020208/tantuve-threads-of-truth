# Tantuve: Threads of Truth

Lovable build prompt — GI Handloom Traceability Platform (deep build)

Paste everything below as your first prompt in Lovable. It's written in build-order: get Part 1 (core) fully working end-to-end first, then layer Part 2 (depth features) on top. Build the whole thing in one go, but treat Part 1 as the non-negotiable spine — if something in Part 2 would break Part 1's wiring, keep Part 1 correct and simplify Part 2 instead.

Build a full-stack web app called "Tantuve" (or suggest a better name) — a blockchain-secured traceability platform for Indian GI (Geographical Indication) handloom textiles like Patola and Sambalpuri Bandha. Problem it solves: machine-made clones are sold as authentic handwoven textiles, cheating buyers and robbing artisans of income. This app gives every genuine textile a tamper-proof digital identity from loom to consumer.

Design direction — this is a hackathon, the UI needs a genuine "wow" moment, not just "clean"

This app will be judged in a 3-5 minute demo. The landing page is the first 10 seconds of that demo — it has to look unmistakably different from every other Bootstrap-looking hackathon project in the room. Treat visual design as a core deliverable, not polish.

Saree-palette design system — use this everywhere, not just the landing page:

Primary: deep indigo (#1B2A4A-ish) — the base of most Bandha/ikat sarees

Secondary/accent: madder red or Patola crimson (#8B1E3F-ish)

Highlight/CTA: turmeric-gold (#D4A017-ish) — use sparingly, for buttons and key accents only, so it pops

Support: deep teal-green (like Sambalpuri motifs) as a tertiary accent for charts/tags

Background: warm ivory/handspun-cotton off-white (#F5EFE4-ish), never pure white

Text: charcoal/near-black, not pure black

Build this as an actual design token set (CSS variables / Tailwind theme extension) so it's consistent across every page, including dashboards — dashboards should feel like the same product wearing work clothes, not a different app.

Landing page — the wow-factor page, spend the most effort here:

Full-bleed hero with a striking real photo of a saree in motion or draped (rich color, visible weave texture) — layered with a subtle animated gradient overlay in the indigo/madder palette so it feels alive, not static.

Animate the hero headline in with a subtle staggered fade/slide — first impression should feel designed, not default.

Add a thin animated "weaving thread" motif — an SVG line or border that draws itself across section dividers like a loom thread being pulled through, echoing the ikat/bandha geometric pattern. Use this as a recurring signature element site-wide, not just once.

"How it works" section: represent the 4-step flow (weave → hash-chain ledger → QR tag → consumer verifies) as an animated horizontal or vertical journey with icons/photos, scroll-triggered reveal animations, not a static bullet list.

Include a live, interactive mini-demo widget directly on the landing page: an embedded QR code judges can literally scan with their own phone right there, pointing to a real seeded example product on /verify/:id — this is a strong differentiator, most hackathon teams only show this inside a login flow.

Subtle hover/micro-interactions throughout (buttons, cards) using color shifts within the saree palette (e.g., indigo to madder on hover) rather than generic scale/shadow effects.

Section backgrounds should alternate ivory and a very deep indigo "dark mode" band (like the deep-colored border of a saree) for visual rhythm down the page, rather than one flat background the whole way down.

Typography:

A serif or editorial display font for headings (something with craft/heritage character, not a default geometric sans) — this alone does a lot of the "wow" work.

Clean, highly legible sans-serif for body text and all dashboard/data UI.

Motifs:

Subtle ikat/bandha-inspired geometric border patterns as section dividers, card borders, and loading states — used consistently as a signature, not randomly scattered.

Photography over icons wherever a role, weaver, or product is represented — real or realistic photography, not generic flat icons or emoji.

The consumer verification page (/verify/:productId) is the second wow moment — it should feel like unveiling a story: large weaver photo, name, region, a narrated timeline (not a data table), the saree-palette verified badge with a satisfying reveal animation when the hash chain checks out. This is the page judges will personally scan and look at on their own phones — it needs to feel premium.

Dashboards (weaver/admin/retailer) stay functional and legible first, but carry the same color tokens, typography, and thread-motif dividers so the whole product feels like one coherent, designed system rather than a landing page bolted onto a generic admin template.

Fully responsive, mobile-first — most verification scans happen on a phone, so /verify/:productId and the landing page must look excellent on mobile, not just desktop.

PART 1 — CORE (must be fully working before anything else matters)

Roles & real auth

Build real Supabase email/password auth with role-based access — no fake "click to log in as X" shortcuts in the UI.

Weaver / Artisan

GI Authority / Verifier (Admin)

Distributor / Retailer

Consumer — no account, no login, ever.

After login, redirect each role to its own dashboard. Protect all role routes so a weaver can't reach admin pages and vice versa.

Core data model (Supabase tables)

weavers: id, user_id, name, photo_url, region, craft_type, gi_registered (bool), bio

products: id (short public-facing code), weaver_id, craft_type, yarn_source, status (in_progress / completed / with_retailer / sold), created_at

ledger_entries: id, product_id, step_name, step_data (jsonb), timestamp, entry_hash, previous_entry_hash

gi_registry: craft_type, region, official_description

retailers: id, user_id, name, location

Core flow (this must work end-to-end before adding anything else)

Weaver logs in → creates a new product → logs production steps (yarn source, dyeing, weaving, finishing) each timestamped.

Each step write triggers a Supabase Edge Function that computes a SHA-256 hash of (step data + previous entry's hash) and stores it as entry_hash — this is the tamper-evident hash chain, the core technical feature. If any past entry were altered, every hash after it would break.

On final step, auto-generate the product's public ID and a QR code (encoding yourapp.app/verify/:productId), shown on a "Product complete" screen with download/print buttons.

Anyone opening /verify/:productId (no login) sees: product/weaver photo, verified badge (chain recomputed client-side + weaver's gi_registered checked) or a clear "could not verify / possible counterfeit" state, full step timeline with dates, weaver name/region/craft, current status.

GI Authority can log in, see all weavers and approve new ones, see all products and their full ledgers, and manage gi_registry entries.

Retailer can log in, enter/scan a product ID to log "received by retailer," and see their current inventory.

Core pages (all must be linked with real navigation — no dead ends)

/ landing (hero, problem explainer, how-it-works, role login CTAs)

/login (role-aware login form)

/verify/:productId (public)

/weaver dashboard → /weaver/products, /weaver/products/new, /weaver/products/:id, /weaver/profile

/admin dashboard → /admin/weavers, /admin/products, /admin/registry

/retailer dashboard → /retailer/inventory, /retailer/receive

Do not move to Part 2 until this loop works cleanly: weaver creates product → completes steps → QR generated → verify page shows correct verified story → admin can see it in the products list.

PART 2 — DEPTH FEATURES (layer on top of the working core)

Add these once Part 1 is solid, using the same tables/auth — extend, don't replace.

Certificate & documentation

On the verify page and weaver dashboard, add a "Download Certificate of Authenticity" button that generates a printable PDF with the product's photo, weaver details, GI registry reference, and the hash chain's final hash as a verification code.

Dispute & counterfeit reporting

Add a "Report as suspicious" button on the verify page (no login needed) that creates a disputes table entry (product_id, reason, reporter_contact optional, status).

New admin tab: Disputes — list open disputes, allow admin to mark resolved/confirmed-counterfeit, and flag the product's status accordingly so future verify-page visits show a warning.

Weaver onboarding flow

Public "Apply to become a registered weaver" form (name, craft, region, sample photo) → creates a pending row in weavers with gi_registered = false → appears in admin's "Pending applications" list for approval/rejection.

Analytics dashboard (Admin)

Charts: products registered per month, products by region/craft, verification scans over time, disputes over time, top weavers by product count. Use simple aggregate queries against existing tables — no new heavy infra.

Consumer-facing explore page

/explore — public gallery of verified products/weavers, filterable by craft type and region, each card linking to its /verify/:productId page. Helps judges see the "global validation" angle from the original problem statement, not just the single-scan demo.

Batch/lot tracking

Allow a weaver to tag a product with an optional lot_id when multiple pieces share the same yarn source/dye batch, so the yarn-sourcing step can be shared across a batch while each product still gets its own unique ledger and QR.

Notifications (lightweight, in-app only — skip email infra unless time allows)

In-app notification bell for weavers: "Your product was scanned N times," "A dispute was raised on your product," "Your registration was approved."

Multi-language toggle

Add English/Hindi toggle (static UI string translation is enough) on the landing and verify pages, since the real end users (weavers, regional buyers) may not read English — this is a strong feasibility point for judges.

Retailer marketplace stub

Retailer can mark a product "listed for sale" with a price; add a simple public /marketplace page showing listed, verified products — demonstrates the commercial angle without needing real payments (no checkout required, just a "contact retailer" mailto/phone link).

CSV export (Admin)

Button to export all products or all weavers as CSV, for GI authority record-keeping — small effort, reads well in a feasibility pitch.

Authentication — demo accounts (applies across both parts)

Seed one real, working demo account per role (weaver, GI authority/admin, retailer) via Supabase, with real credentials.

Do not hardcode or display these credentials anywhere in the UI (no demo-login hints on the login page).

After building, reply to me in chat with a clear list:

Weaver demo — email: ___, password: ___

GI Authority demo — email: ___, password: ___

Retailer demo — email: ___, password: ___

Consumers never need an account — /verify and /explore stay fully public.

Scale/feasibility note (for the landing page "Tech" section)

Note briefly that this MVP demonstrates tamper-evident ledger logic using a Supabase-backed hash chain; a production version would anchor periodic checkpoint hashes to a public blockchain (e.g. Polygon) for full decentralization, and integrate with the actual GI registry maintained by the Indian government.

Build the complete app with all pages wired together and no placeholder screens. Prioritize Part 1 working perfectly; add Part 2 features without breaking Part 1's core loop.

Final priority reminder for the build

The core loop (Part 1) must work perfectly and be bug-free — a broken demo loses more points than a missing feature ever will.

The landing page and verify page must hit the "wow" bar described above — these are the two screens judges will actually look at closely.

Part 2 features add depth and answer judges' "does this scale" questions, but only after 1 and 2 are solid.

Everything must share one consistent saree-palette design system — no page should look like it belongs to a different app.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ce4ea9b7-261e-475c-ae25-9fafe5605007).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
