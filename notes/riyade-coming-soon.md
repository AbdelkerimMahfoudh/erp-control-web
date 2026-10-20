# Website: Riyade, coming soon

Branch `site-riyade-coming-soon`, from production `origin/tsx-public-site` `5f666ea` (2026-10-20); the change is commit
`cfd207b`, this record the commit after it. Session identity: **CLAUDE** (cloud). Status: **in development — not for
production until the owner approves its appearance.**

## Scope and coordination

- **Writable:** `erp-control-web`, this branch only. The owner's brief of 2026-10-20 names `tsx-public-site` as the
  target; that branch is what Cloudflare Pages publishes at tsxmr.com (`erp-docs/docs/95`), so the work is pushed to
  this candidate branch and reaches production only by the usual fast-forward, after approval (as D216 was).
- **Not touched:** `erp-backend`, `erp-mobile`, `erp-docs` (the brief excludes them); authentication, the portal and the
  account systems; DNS, Cloudflare and preview settings; `tsx-public-site` and `main`.
- **Shared handoff.** `erp-docs` `CURRENT_HANDOFF.md` read `READY_FOR_HANDOFF`, owner NONE (`6ea8f9b`). It was read, not
  claimed: the brief keeps `erp-docs` out of scope, so this file is the record and its last section is written for
  later integration there.
- **No approved Riyade identity exists** in any repository (no logo, wordmark, colour or Arabic name), so none was made.

## 1. What the site says, and where

The approved copy, word for word (`src/content/riyade.ts`; `{displayName}` renders TSX-MR):

| | English | French | Arabic |
| --- | --- | --- | --- |
| Name | Riyade | Riyade | Riyade (Latin letters, never transliterated) |
| Line | School life, simply connected. | La vie scolaire, simplement connectée. | حياة مدرسية أكثر ترابطًا وبساطة |
| Who and for whom | A new TSX-MR product for schools and their communities. | Un nouveau produit TSX-MR destiné aux établissements scolaires et à leur communauté. | منتج جديد من TSX-MR للمؤسسات التعليمية ومجتمعاتها. |
| Status | Coming soon | Bientôt disponible | قريبًا |

- **Its page** — `/products/riyade`, `/fr/products/riyade`, `/ar/products/riyade` (the pattern of `/products/dukan-erp`):
  one navy band with the name as the `h1`, the line, the sentence and the status, beside an abstract drawing. No link,
  button, form, field, image or embed in the page.
- **Products** — a second card after Dukan ERP's: the wordmark as its heading, the line, the sentence, the status and one
  secondary button to its page. Dukan ERP's card is unchanged and stays first and larger, with its primary button.
- **Home** — one row under the featured Dukan ERP card, in its tinted band: the name, the sentence, the status and an
  arrow; the whole row is the link to its page. The featured card is unchanged.
- **Footer** — the products column lists Dukan ERP, Riyade, then the Products page.
- **Head** — title "Riyade — TSX-MR"; description = the sentence and the status; canonical, `hreflang` en/fr/ar/x-default
  and Open Graph as every page; in the sitemap in three languages. Structured data: the Organization only, as on every
  page — no `SoftwareApplication`, product, offer, price, rating, platform or date.
- **Never said anywhere** (a unit test refuses each in three languages, in its texts and its head, and any digit): a
  feature or module, attendance, grades, finance, payments, timetables, communications, facial recognition or
  biometrics, an API or the architecture, a free period, paid modules, advertising, Bankily, Sedad or a sponsor, a
  price or a subscription, a figure, a screenshot, a date or a delay, a beta, a registration, sign-in, trial,
  preorder or payment, a waiting list, documentation.

**Existing wording changed, because it became untrue** (owner to confirm):

- Products page summary: "The software TSX-MR builds as its own products. ~~Today there is one: Dukan ERP.~~" (the same
  sentence removed in FR and AR; it is also that page's meta description).
- Footer column title "Product" → "Products" (FR « Produits », AR «المنتجات»).

Nothing of Dukan ERP changed: its page, wording, documentation link, routes, card and featured card are as before. Its
three built pages differ from production only in the shared footer (the page-by-page comparison in §3).

## 2. Look and behaviour

- **No new colour and no symbol.** The wordmark is the name set in the display face (Bricolage Grotesque, already
  preloaded on every page) — on Arabic pages too, so it is the same letters in every language. Dukan ERP keeps its
  indigo "D" mark, its phone and the larger cards; Riyade has no mark beside its name.
- **The drawing** (`RiyadeArt`): three thin rings around an amber centre, seven points on them and two dotted links —
  inline SVG, no text, `aria-hidden`, coloured from the surrounding band's tokens, so it follows the theme. No image,
  font or dependency was added.
- **Status in words, never colour alone**: a small pill with the status text — amber on navy (like Dukan ERP's hero
  pill), the info tone on light surfaces. Dukan ERP's own status line is unchanged.
- **Motion** (the Balanced system, nothing new): the page's band rises once like every hero; the Products card and the
  home row enter and lift like the other cards. Reduced motion: at rest, no movement.
- **Accessibility:** one `h1`; heading order kept on Products (two `h2`); the home row is one link whose name is its
  words; focus lifts the card and draws the ring; the drawing is hidden from assistive technology; TSX-MR is isolated
  inside the Arabic sentence; complete without a script (prerendered).

## 3. Verification (2026-10-20, final tree)

The CI workflow's steps, run on this machine (Linux, Chromium 1194 by `executablePath`, since the pinned 1248 build is not
installed here); evidence was written outside the repository. CI runs the same steps, with gitleaks, on the push.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (Vitest) | 31 files, **552/552** (was 519; the new `test/riyade.test.tsx` among them) |
| Full surface: production build without its inputs | refused, gate PORTAL, nothing written |
| Full surface: `build:preview`, link and `--preview` bundle audits | 79 pages, 3 716 links, 0 broken; PASS |
| Full surface: `e2e/site.spec.ts` | **134/134** |
| Public surface: production build without its inputs | refused, gate PUBLIC_WEBSITE, no portal or app input asked, nothing written |
| Public surface: `build:preview`, link and `--preview --public` bundle audits | 69 pages, 3 048 links, 0 broken; PASS |
| Public surface: `e2e/public-site.spec.ts` on that preview | **172/172** (was 163) |
| `build:public-release` with tsxmr.com's public inputs | 91 files (88 + the three pages); 3 114 links, 0 broken; PASS |
| Public suite on that production build | **172/172** |
| Release verdicts on that build | **PUBLIC_WEBSITE: GO**; PORTAL and APP_STORE NO-GO for their existing reasons, unchanged |
| `npm audit` | 0 vulnerabilities (no dependency changed) |

**Against production's own build** (`5f666ea`, built the same way): the three Riyade pages are new; the home pages
differ in `main` (the row) and the footer; the Products pages in the head (their description is the summary), `main` and
the footer; the 36 other pages, the three Dukan ERP pages among them, in the footer only. The sitemap gains exactly the
three Riyade entries (39 → 42 URLs); `security.txt` differs only by its build-time `Expires`; `robots.txt`, `_headers`,
`_redirects` and the manifest are identical.

**Found and fixed during verification:** the home row first sat on its band's top edge, which hides what overflows,
so its 4 px hover rise and its focus ring would have been cut; it now has 12 px above it, and the e2e test measures it
(8 px of room as built; −4 px without the padding, checked).

**Seen once, not reproduced:** the existing showcase test "one height whatever it shows" failed once at 1280 px in
Arabic under the full suite's load (four workers on four cores). It passed nine times in a row on this build and nine
times on production's build, and in both final suites. The showcase's page is unchanged by this branch.

**Observed, not changed (outside the brief):** while a French or Arabic page starts, the outer language provider
(`main.tsx`, which has no fixed language) applies the device's language for a moment before following the address, so
`dir` can read `ltr` briefly on an Arabic page; the Riyade test waits for it to settle, as the language-switch tests do.
Whether a frame is painted in that state was not measured.

**Review screenshots:** EN/FR/AR × light/dark × 375 and 1280 px — its page, the Products cards, the home row and the
footer — taken from the production build and delivered with the report; CI's evidence on `ci-evidence` adds the
per-page screenshots and contact sheets of both surfaces.

## 4. For the owner

1. Approve the appearance (the review screenshots; CI also commits them to `ci-evidence`).
2. The home-page row is the one placement the brief did not name: keep it, or it is one component to remove.
3. The Arabic line is kept exactly as approved, without a final full stop; the English and French lines have one.
4. Confirm the two wording changes in §1.
5. On promotion (fast-forward `tsx-public-site`): the production verifier on `ops/verify-production` counts the
   sitemap's URLs (39 → 42) and the built files; its expectations move with this page.

## 5. For integration into `erp-docs` (not done here: the brief keeps `erp-docs` out of scope)

Proposed decision entry (`docs/21_PRODUCT_DECISIONS.md`, next free number — D217 at the time of writing), to be
recorded once the owner approves the branch:

> **Riyade on tsxmr.com, coming soon (website).** Riyade is TSX-MR's second own product, presented with as little as
> possible until it launches: its name, the line "School life, simply connected.", "A new TSX-MR product for schools and
> their communities." and "Coming soon", in EN/FR/AR (the owner's approved copy). It is listed after Dukan ERP on the
> Products page, in the footer's products and as one row under the featured Dukan ERP card on the home page, with a
> page of its own at `/products/riyade` (`/fr/…`, `/ar/…`) that offers no action. It names no feature, price, trial,
> date, beta, registration, waiting list or documentation; its structured data is the Organization only. Its mark is its
> name in type; no logo was made. This supersedes D195's "Products shows the one own product". *As built:* website
> branch `site-riyade-coming-soon`.

Also to update on integration: `docs/74_TSX_MR_PUBLIC_WEBSITE.md` (the route table and a Riyade section) and
`SESSION_LOG.md` (one entry for this session).
