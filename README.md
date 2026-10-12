# erp-control-web

**Since 2026-10-12 this is also the official website of TSX-MR and the product site of Dukan ERP**
(`erp-docs/docs/74`): public pages in English, French and Arabic (`/`, `/fr`, `/ar`), prerendered at build time,
beside the unchanged business account (`/account`) and console (`/admin`).

- `npm run build` — production; **refuses** until every input in `.env.example` is real and every legal blocker in
  `src/content` is resolved (`docs/74` §3, §7).
- `npm run build:preview` — marked test values, a banner, `noindex` everywhere.
- `npm test` — unit and component tests; `npx playwright test` — browser checks against `dist/` (CI).
- On the owner's Windows PC only `npm run typecheck` runs (Smart App Control blocks Vite 8's bundler); everything else
  runs in GitHub Actions, which commits its evidence to the `ci-evidence` branch.

The description below is the portal as built on 2026-10-05, still accurate for `/account` and `/admin`.

The control website of the Electronics Retail Management System: the public
subscription site, the business Owner's account area and the platform's Super
Admin console. Built from scratch on 2026-10-05 against the backend's contract
(`erp-docs/docs/68`); it replaces the earlier `retail-erp-control-web`, which
exists only on one machine and has no remote.

It is **not** the customer app. The mobile app shows a neutral access status and
nothing else about money; every price, payment request and administrative
decision lives here and on the server.

## What it does

| Area | Route | Who | How it signs in |
| --- | --- | --- | --- |
| Public | `/`, `/apply`, `/privacy`, `/terms`, `/support`, `/account-deletion` | anybody | — |
| Business | `/account` | the business Owner | email or WhatsApp number + password (bearer token in memory), or the portal cookie set by the app's handoff |
| Platform | `/admin` | a platform administrator | a separate realm: HttpOnly cookie, password re-asked for every decision |

- **Prices and estimates come from the server.** `GET platform/plan` and
  `POST platform/quote` — the site renders them and a test refuses any source
  line that multiplies or adds a price field.
- **Applications** go through `POST platform/register`; the server refuses
  before saving anything when no verification message can be sent, and the page
  says so.
- **The account page** shows the application/subscription status, the period,
  the per-store seat quote, payments ("recorded by the platform, not confirmed
  by a provider"), the history, and lets the Owner request an additional seat
  or store — priced by the server, nothing activated until an administrator
  confirms the payment.
- **Each store has an activity** (D154, `erp-docs/docs/73` §6): an electronics
  store, a money services agent, or both — priced by the server
  (`GET platform/plan` carries the three prices; `POST platform/quote` takes
  `activities[]`). The application asks the first store's activity; the
  account page lists each store's activity and any change scheduled for the
  renewal, asks a new store's activity, and lets the Owner ask for another
  activity per store. Before that request the page *explains* the consequence
  from the plan's prices (the one subtraction the site does, pinned by
  `test/source-rules.test.ts`); after it, it renders the row the server
  recorded — awaiting payment of the difference, waiting for the renewal, or a
  scheduled change withdrawn — and never infers "upgrade, so pay now".
- **The console** lists applications and businesses, shows each business's
  stores, seats, people and status, and takes every lifecycle decision
  (approve / refuse with dates, extend, correct the period, suspend, reinstate,
  cancel, grant) and every seat, store and activity decision (confirm a
  payment **with a reference**, refuse, release; an activity change shows
  from → to, when it takes effect and the amount). Prices are scheduled per
  activity (electronics, money services agent, both). Each mutation carries `expectedVersion`; a 409
  is shown as "somebody else changed this" and the page reloads.
- English, French and Arabic with exact key parity (tested); Arabic sets
  `dir="rtl"` on the document. Light and dark themes from one token set.

## What awaits real providers (not pretended)

- **No payment provider.** `src/providers/payment.ts` is the seam; it is
  `available: false`. No destination number, no pay button, no "paid" badge the
  server did not send. Payments are confirmed by hand against a reference.
- **No email / WhatsApp delivery** unless the backend has a provider configured
  (`WHATSAPP_CHANNEL`, the outbox is development-only). Until then applications
  are refused honestly and staff invitations show "delivery unavailable".
- **Support address**: `VITE_SUPPORT_EMAIL` / `VITE_SUPPORT_WHATSAPP` are empty
  until a real address exists; the Support page says so.

## Running it

```bash
cp .env.example .env     # set VITE_API_BASE, e.g. http://127.0.0.1:3010/api/v1
npm install
npm run dev              # http://127.0.0.1:5173
npm run typecheck && npm test && npm run build
```

The backend's `CORS_ORIGINS` must include this site's origin with credentials.
The administrator cookie is `SameSite=Lax`, so the API must be reached on the
page's own hostname (docs/38).

## Not production-ready until

A real email provider is configured and a delivery is tested; HTTPS deployment
with the cookie `secure`; a domain; the privacy and support addresses; and the
payment procedure (how a business pays, who confirms, with which evidence) is
written down and rehearsed. None of that is in this repository.
