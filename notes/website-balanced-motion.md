# Website: Balanced motion and the dual-mode Dukan ERP demonstration

Branch `website-balanced-motion`, from production `origin/tsx-public-site` `e953c58` (verified 2026-10-18: production,
`site-redesign` and `site-positioning` all at `e953c58`; working tree clean). Session identity: **CLAUDE** (cloud).
Status: **in development — not for production until the owner approves it.**

## Scope and coordination

- **Writable:** `erp-control-web`, this branch only.
- **Not touched:**
  - `erp-backend`, `erp-mobile`, `erp-docs`;
  - the Hetzner server;
  - DNS, Cloudflare and preview settings;
  - SMTP, WhatsApp, credentials, databases, migrations and Apple configuration;
  - the production branches `tsx-public-site` and `main`.
- **Shared handoff.** On 2026-10-18 `erp-docs` `CURRENT_HANDOFF.md` reads `IN_PROGRESS`, owner CLAUDE (local session):
  the backend production deployment package and a disposable rehearsal. Its scope excludes the website.
  - The repository rule says another session must not mutate anything while the handoff is `IN_PROGRESS`.
  - The owner's brief of 2026-10-18 explicitly authorises this concurrent, website-only work. The handoff was read,
    not claimed and not edited.
  - This file is the record. Its last section is written for later integration into `erp-docs`.
  - By the end of this work the local session had finished: `erp-docs` `origin/master` `5ed2849` reads
    `READY_FOR_HANDOFF`, owner NONE ("Production API package rehearsed on tsxmr-app-01 and torn down", D200). The
    brief still keeps `erp-docs` out of this task's scope, so nothing was written there; D200 is the latest decision
    number, so the entry proposed in §6 would be the next free one at integration time.
- **Reference concept.** The owner's private concept page (`tsxmr-motion-study…chatgpt.site`) did not resolve from this
  environment (DNS failure). It was not inspected, and no attempt was made to reach it otherwise. Everything here
  follows the written specification in the brief.

## 1. The motion system (one system, consolidated)

**Audit of what was there.**

- `lib/reveal.ts` marked `[data-reveal]` cards `.in` as they entered, but a 700 ms "show everything" fallback revealed
  every card on every page shortly after load, so below-the-fold cards never entered as the reader reached them.
- The entrance moved position only (`transform` 14 px, 0.55 s), staggered by `.stagger > :nth-child(n)` rules.
- The hover rise was `.elevated` (`translate: 0 var(--lift)`, `--lift: -3px`, 200 ms), on hover-capable devices and
  on keyboard focus within the card.
- Reduced motion: a global `transition/animation: none !important` and `--lift: 0`.

**What it is now.** The same two mechanisms — `[data-reveal]` and `.elevated` — with the Balanced values and the
holes closed. No second system was added.

| Token (`theme/global.css`) | Value | Use |
| --- | --- | --- |
| `--ease-enter` | `cubic-bezier(0.2, 0.75, 0.25, 1)` | the entrance |
| `--dur-enter` | `650ms` | the entrance |
| `--rise` | `18px` | the entrance starts this much lower |
| `--stagger` | `75ms` | between cards entering together; capped at 4 steps (300 ms) |
| `--lift` | `-4px` | hover and keyboard-focus rise |
| `--dur-lift` | `210ms` | hover/focus rise, shadow and edge |
| `--border-brand` (`tokens.css`, light `#b6b0ef` / dark `#4c4793`) | — | the subtle brand edge on hover/focus |

- **Entrance** (`lib/reveal.ts`, `public.css`): opacity 0 → 1 while rising 18 px, 650 ms, once per card.
  - Cards are hidden only after the script has set up its observer and marked the document `reveal-ready`. Without a
    script, without `IntersectionObserver`, or if the set-up throws, nothing is ever hidden.
  - What is already on screen at first paint stays as it is (no blink); what is above the screen is shown at once;
    the rest enters once and never again.
  - Cards entering together take `data-reveal-order` 0–4 (an attribute, not an inline style, for the CSP), each
    `--stagger` after the previous; the fifth and later share the last delay.
  - The hidden state has no transition, so a card is never animated away.
- **Hover and focus** (`.elevated`): resting shadow; on hover (only `(hover: hover) and (pointer: fine)`) or while
  holding the keyboard focus, 4 px higher, a stronger shadow and the brand edge, in 210 ms. The rise uses
  `translate` and the entrance `transform`, so they compose. A card that does nothing when pressed gets no pointer
  cursor and no tab stop (checked in the browser).
- **Card families** with the entrance: services, capabilities (bento), problems, activities, previews, language cards,
  launch steps, process steps, the featured product card, the Products page card (added), the Services page's
  own-product card (added), the contact-method cards on the Contact page only (added, via `ContactMethods reveal`),
  and the product page's showcase card. Legal pages, their contents lists, `/in-app/` pages and the 404 have none
  (checked in the browser).
- **Reduced motion** (at load and switched on while the page is open): every card shown at rest at once; `--lift`,
  `--nudge`, `--rise` 0 and `--stagger` 0; transitions and animations off (the existing global rule); the showcase's
  Play button removed. Print shows every card.
- **Kept as they were:** the hero's one-time rise, the button and hamburger interactions, the scan line and bar growth
  (both finite, both off under reduced motion), and every scroll/focus/anchor/history behaviour. No route transition.

## 2. The Dukan ERP showcase

One component, `components/public/DukanShowcase.tsx`, its words in `content/dukan-demo.ts` (EN/FR/AR):

- **Home page**, in the "TSX-MR's own product" card, in place of the six capability chips (whose detail is on the
  product page). At ≥ 1100 px the card's copy and the showcase sit side by side (4 : 7).
- **Product page**, in the "Two activities, one platform" band, after the two activity cards and before the note that
  no provider is connected, in its own card with a heading and a lead.

**Layout.** Two equal tabs ("Electronics stores" / "Money-service agents"); the phone (the product visual's frame)
with the steps beside it when the showcase is at least 560 px wide, stacked below that (a container query, so the
same component fits both places); the tabs stack one above the other below 420 px (FR's long names). Every screen
of both walkthroughs shares one grid cell, so the showcase keeps one height whatever step, activity or direction is
shown (checked at 320, 375, 393, 768 and 1280 px, in three languages). Disclosure under it: "Interactive illustration ·
fictional data · no real transactions".

**Electronics (one phone at 20,000 MRU, paid in full in cash):**

1. *Select the product* — "Smartphone · 128 GB", "Black · IMEI ···4821", price 20,000 MRU, "In stock". No customer.
2. *Record the payment* — sale amount 20,000 MRU, received 20,000 MRU, paid by Cash (Sedad shown as the other
   option), "Paid in full". The step says Dukan ERP records the payment; it does not take it.
3. *Review* — "Sale recorded", the phone marked "Sold", Cash 20,000 MRU, and today: 1 sale, 20,000 MRU. No history.

**Money-service agents (1,000 MRU, 20 MRU commission; either direction):**

1. *Choose the provider and direction* — Bankily (chosen) or Sedad, text labels only; "Receive cash · give electronic
   credit" or "Give cash · receive electronic credit", chosen with the selector beside the phone.
2. *Enter the amount and commission* — amount 1,000 MRU; "Commission paid by the customer" 20 MRU, "Typed for this
   exchange"; operator "Demo operator", locked, "From the sign-in" (never a field or a choice); "Example figures, not
   a tariff". The step says there is no fixed rate.
3. *Review* — "Transaction recorded"; provider and direction; amount 1,000 MRU; the commission in its own list;
   today: 1 exchange, commission earned 20 MRU. No cash or credit balance and no arithmetic between the amount and
   the commission (D164's legs are the app's to show). The step says Dukan ERP does not send or receive money.

Never shown: "transfer sent", a provider confirming anything, real provider movement, a bank, a partner, or a
provider paying the commission (unit-tested in three languages).

**Behaviour.**

- Three selectable steps; Play walks through them once, 2.8 s each (`STEP_MS`, the same as CSS `--sc-step`), and
  stops on the result, where the button becomes Replay. Nothing starts by itself.
- Choosing a step, a tab or a direction stops it; a tab or direction change also returns to step 1.
- It pauses when its phone leaves the screen or the page is hidden, and does not restart by itself.
- One timer at most (a single effect), cleared on every change and on leaving the page; the observer and the
  visibility listener exist only while it plays.
- Reduced motion: no Play (CSS, from the first paint), steps chosen one by one; switching reduced motion on while it
  plays stops it.
- Accessibility: an ARIA tablist (arrow keys follow the page's direction, plus Up/Down where stacked, Home/End; one
  tab stop); the hidden panel is invisible and `inert`; the steps are buttons with `aria-current="step"`, described
  by their text, pointing at the phone screen (`role="group"`, labelled); the focus ring is drawn around the whole
  step card; no live region (nothing is announced as it plays); every control is at least 44 × 44 px.
- RTL: amounts, provider names and the IMEI are isolated left to right; the progress line fills from the right.
- Nothing typed, no request, no storage, no cookie, no camera, no tracking (unit- and browser-tested). No new
  dependency; no image, video or embed; local assets only; CSP and headers unchanged.

## 3. Guards adjusted, and why (for review)

- **Provider names** (`test/source-rules.test.ts`): sources may name no provider. The brief requires the Bankily and
  Sedad labels, so one line is exempt — `export const DEMO_PROVIDERS = ['Bankily', 'Sedad'] as const;` in
  `content/dukan-demo.ts`, cut out exactly once like the existing agent-trade exemption — and a new test pins that
  only `DukanShowcase.tsx` reads it (three uses) and that it carries no sent/verified/partner/bank wording. The
  content-parity test (no provider in any text, in three languages) applies to the showcase's words unchanged.
- **"No price" on the pre-launch pages** (`test/site-surface-render.test.tsx`, `e2e/public-site.spec.ts`): docs/96 §2
  says nothing is on sale — no subscription, no prices. The checks used to refuse the letters "MRU" anywhere on the
  page. They now refuse it everywhere **outside** the showcase, and hold the showcase to more: its amounts must be
  exactly the three fictional figures, each isolated as a value, under the fictional-data disclosure; the home page
  is now checked too. These are a customer's sale and exchange in an illustration, never a price of Dukan ERP; the
  owner should confirm this reading of docs/96 §2 before publication.
- **Old motion values** in `test/site-refinement.test.tsx` and the e2e Launch-card test were updated to the Balanced
  values (4 px, brand edge, the token-based transitions) and extended.

## 4. Verification (2026-10-18, final tree)

All runs on this machine (Linux, Playwright Chromium); evidence was written outside the repository.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (vitest, no production inputs) | 29 files, **503/503** (was 490 before this branch) |
| `build:public-release` with the production inputs (links + public bundle audit) | pass: 88 files, no secret, source map, credential or private address |
| Public browser suite on that production build (`E2E_SURFACE=public`) | **160/160** |
| Release verdicts on that build, with its inputs and browser results | **PUBLIC_WEBSITE: GO**; PORTAL and APP_STORE NO-GO for their existing reasons, unchanged |
| CI public path: production build refused without inputs (gate PUBLIC_WEBSITE); `build:preview`; link and `--preview --public` bundle audits; browser suite | all pass; **160/160** |
| CI full path: production build refused (gate PORTAL); `build:preview`; link and `--preview` bundle audits; `site.spec.ts` | all pass; **130/130** |

**The brief's items 1–13**, and where each is proven (`U` = `test/dukan-showcase.test.tsx` and the other unit tests;
`B` = `e2e/public-site.spec.ts` on the built site):

1. Tabs and all six steps — U (every screen's words, one screen at a time, the hidden ones `aria-hidden`); B (all
   six, at 320/375/393/768/1280 px, three languages, both pages).
2. Both directions — U (selector, phone and review agree; a change returns to step 1); B (both, every width).
3. Commission semantics — U (paid by the customer, typed per exchange, no rate, operator from the sign-in and never a
   field, commission in its own list, no A ± C anywhere, no transfer/bank/partner wording in three languages).
4. Consistent amounts — U (electronics only 20,000 MRU, five times; agent only 1,000 and 20; counts 1; formatted per
   language); unit + B (the page names no other amount; docs/96 §2 guard).
5. Play, pause, replay, rapid switching — U (fake timers: one timer at most, stops on the result, Replay, Pause holds,
   steps/tabs/directions stop it); B (real time: 2.5–3.3 s per step, nothing starts by itself, repeated
   play/pause never shortens a step).
6. Off-screen and background pause, cleanup — U (observer and listener only while playing, let go on pause and
   unmount, no timer left); B (scrolled away: paused, not resumed; hidden document: paused).
7. Reduced motion, at load and after a change — U; B on the **built CSS**: every card at rest, Play `display: none`,
   frame transitions `0s`, `--rise`/`--lift`/`--stagger` 0, and the same when switched on live (the minified
   `@media (prefers-reduced-motion: reduce)` block was also read: intact).
8. Visible without JS — U (prerendered markup); B (script disabled: no card hidden, the first walkthrough shown, in
   three languages); B (no `IntersectionObserver`, or one that throws: nothing hidden).
9. Keyboard and focus — U (arrows follow the direction, Up/Down, Home/End, one tab stop, `inert` panel); B (Tab walks
   the open panel only, every focus ring drawn, Enter selects).
10. EN/FR/AR, RTL, narrow widths, both themes — B (axe WCAG 2.1 AA on every page at 375 and desktop with the showcase
    in it; no overflow from 320 px; 200 % zoom as 640 × 450 at 2×; equal tabs; one height per page and width).
11. No API, provider or storage — U (no fetch/XHR/beacon/storage/cookie during every interaction; sources have none);
    B (no request to another origin; local and session storage and cookies unchanged).
12. No navigation regressions — the existing navigation, scroll, focus, history, language and theme tests: pass.
13. Legal, in-app, 404, headers, release boundaries — B (no entrance or showcase on legal, `/in-app/` or 404 pages;
    headers and CSP unchanged); the release verdicts above.

**Sizes** (production public build, before = `e953c58`):

| Asset | Before (raw / gzip / brotli) | After | Change |
| --- | --- | --- | --- |
| All JS | 665,716 / 190,959 / 153,747 | 683,055 / 195,782 / 157,472 | +17,339 / **+4,823** / +3,725 |
| All CSS | 53,063 / 11,108 / 9,736 | 60,227 / 12,406 / 10,776 | +7,164 / **+1,298** / +1,040 |
| `index.html` | 17,628 / 4,039 | 27,588 / 5,499 | +9,960 / **+1,460** |
| `products/dukan-erp.html` | 27,974 / 6,820 | 40,245 / 8,469 | +12,271 / **+1,649** |

The HTML grows because both walkthroughs are prerendered (so the page reads without a script and keeps one height).

**Review evidence** (screenshots and WebM recordings, delivered with the report): card entrance and hover; the
electronics walkthrough (home, desktop); the agent walkthrough in both directions (product page, desktop); the agent
walkthrough in French at 375 px; the electronics walkthrough in Arabic at 393 px, dark; stills of all six screens;
dark mode; reduced motion at load.

## 5. Limitations

- **No iPhone or Safari verification.** Everything above ran in desktop Chromium, at phone widths by viewport
  emulation. That is not an iPhone, and no claim is made for one.
- "Page hidden" was tested by setting `document.visibilityState` and firing the event, not by a real tab switch;
  200 % zoom by a 640 × 450 viewport at 2×, not the browser's zoom control.
- The recordings come from the DevTools screencast at its own frame timing, re-timed to 25 fps.
- The reference concept page could not be reached (§ Scope); its look was not compared.
- The showcase reserves the height of its taller walkthrough (the agent's, with the direction selector), so the
  electronics walkthrough has some empty space under its steps on wide screens. This is the price of never moving
  the page; a more compact home-page variant (titles only) is possible if the owner prefers.
- The FR and AR texts are mine, checked against the app's own wording for the directions and the commission; a
  native reader's pass before publication is advisable.

## 6. For integration into `erp-docs` (not done here: shared documentation is frozen during the backend phase)

Proposed decision entry (`docs/21_PRODUCT_DECISIONS.md`, next free number), to be recorded only once the owner
approves the branch:

> **The Balanced motion treatment and the Dukan ERP showcase (website).** One motion system for every card family:
> cards fade in and rise 18 px in 650 ms (`cubic-bezier(.2,.75,.25,1)`), once, 75 ms apart (four steps at most), never
> hidden without a script or under reduced motion; on hover (hover-capable devices only) and keyboard focus a card
> rises 4 px with a stronger shadow and a brand edge in 210 ms. No motion on legal, `/in-app/` or 404 pages. The home
> page's product card and the product page show one interactive phone walkthrough per activity — a phone sold at
> 20,000 MRU paid in cash; a 1,000 MRU exchange (either direction) with a 20 MRU commission typed by the operator and
> paid by the customer, provider Bankily or Sedad as text labels, operator from the sign-in — labelled "Interactive
> illustration · fictional data · no real transactions". It plays only when asked, once, pauses off screen or in a
> hidden tab, and offers no Play under reduced motion. It shows no balance, no transfer, no provider confirmation and
> no bank. The pre-launch rule "no prices" (docs/96 §2) is read as "no price of Dukan ERP": the walkthrough's fictional
> customer amounts are the one exception, fenced by the tests. *As built:* website branch `website-balanced-motion`.

Also to update on integration:

- `docs/74_TSX_MR_PUBLIC_WEBSITE.md` — the motion values (§ design) and the showcase (home and product page sections).
- `docs/96_RELEASE_GATES_PUBLIC_PORTAL_APP_STORE.md` §2 — the "no prices" sentence, with the walkthrough exception.
- `SESSION_LOG.md` — one entry for this session (CLAUDE, cloud, concurrent with the local backend session, website
  only, branch not promoted).
