# https://admin.tsxmr.com: activation and rollback

**Not live.** No DNS record, edge change, deployment or API configuration has been made. Nothing below runs without the
owner's explicit coordinated release decision.

Branches: `ops/admin-console-host` in `erp-control-web` and `erp-backend`, both based on the D227 line.

## State read on 2026-11-02 (read-only)

| Name | DNS | Serves |
| --- | --- | --- |
| `admin.tsxmr.com` | none | nothing; no certificate ever logged |
| `dukan.tsxmr.com` | none | nothing: the customers' portal is not live either |
| `dukan-test.tsxmr.com` | A, the server | 401 password, then the portal surface's preview build, console included |
| `api.tsxmr.com` | A, the server | API `fbe4778`; credentialed CORS for `dukan`, `erp-test`, `dukan-test` |
| `tsxmr.com` | Cloudflare | the public site |

## Order: the console goes after the API it needs

The D227 console calls routes production does not have (`fbe4778`, migrations to 0115). So never publish the admin build
ahead of the D227 API, and never build it from an older console commit.

1. Merge `refs/heads/ops/admin-console-host` into `post-testflight-feedback` in both repositories (main D227 session).
2. Deploy the D227 API by its own release plan, with `CORS_ORIGINS` and `ADMIN_ORIGINS` as in step 5 below.
3. Build the admin release from the **merged D227 console commit**, not from this branch.

## Activation (each step: owner's go)

1. **Backup.** The fresh, verified off-host backup the API deployment already requires.
2. **Decide the preview's console** (below): `ADMIN_ORIGINS` with or without `https://dukan-test.tsxmr.com`.
3. **DNS, Cloudflare.** One record: `A admin` → the same IPv4 as `api`, **DNS only**, TTL Auto, no AAAA. Change nothing else.
   Confirm it from 1.1.1.1 and 8.8.8.8 before going on. The edge needs it to obtain the certificate.
4. **`stack.env`.** `ADMIN_CONSOLE_HOST=admin.tsxmr.com`.
5. **`api.env`.** Append `https://admin.tsxmr.com` to `CORS_ORIGINS`, and set `ADMIN_ORIGINS=https://admin.tsxmr.com`, plus the
   preview if so decided. Preflight and the production guard refuse an entry CORS does not allow, or the customers' portal.
   Recreate the API. Record the fingerprints of both files before and after, as the deployment does.
6. **Build, on CI's Linux runner** (Smart App Control blocks Vite on the owner's PC):
   `VITE_SITE_SURFACE=admin VITE_ADMIN_SITE_ORIGIN=https://admin.tsxmr.com VITE_PUBLIC_SITE_ORIGIN=https://tsxmr.com VITE_API_BASE=https://api.tsxmr.com/api/v1 npm run build`,
   then `node scripts/audit-bundle.mjs dist --admin` and `node scripts/caddy-admin-release.mjs dist <dir> <commit>`. CI
   keeps exactly this as `evidence/<commit>/admin-release.tar.gz`. Check that `admin-release.txt` names the merged commit.
7. **Install.** Copy the release to the server, `chmod -R u=rwX,go=rX`, then
   `deploy/production/admin-site.sh install <release-dir> --confirm api.tsxmr.com`. It validates the edge first; the
   restart interrupts the API for a few seconds. It then requires: `/admin` 200 and noindex; `/subscription` 404; the API
   granting this origin; 401 with no session; 403 from the customers' portal's origin.
8. **By hand, a real browser, the existing administrator only.** Sign-in, second factor, step-up, sign-out, in EN, FR and AR
   (Arabic reads right to left). Check the cookie in the browser's tools: host-only on `api.tsxmr.com`, HttpOnly, Secure,
   SameSite=Lax. Open a payment proof's file. Then `https://dukan-test.tsxmr.com/admin`, as decided in step 2.
9. **Record** the commits, release name, and results in the handoff. Remind the owner: `ssh-add -D`, `Stop-Service ssh-agent`.

## Rollback, narrowest first

| What went wrong | Do | Effect |
| --- | --- | --- |
| A bad console release | `admin-site.sh rollback <release-name> --confirm api.tsxmr.com` | previous release; a few seconds' API interruption |
| The site should not be up | `admin-site.sh off --confirm api.tsxmr.com` | host stops answering; API and data untouched |
| The origin rule locks out the console | correct `ADMIN_ORIGINS` and recreate the API; emptying it stops enforcement and reopens the finding below | no data change |
| DNS | delete the `admin` A record | certificate stays on the host, unused |
| The API | `rollback.sh`, per the D227 release plan; an older API ignores `ADMIN_ORIGINS`, and a database is restored separately | the origin rule is gone with it |

The preview site is untouched by all of these: its release, password and file are separate.

## Decisions for the owner

- **The preview's console.** Recommended: leave `dukan-test` **out** of `ADMIN_ORIGINS` once `admin.tsxmr.com` is verified. It
  shares the production API and the one administrator cookie; keeping it leaves a second page that can drive every business.
  Its portal pages keep working, but its `/admin` then answers 403.
- **Why the ADMIN gate skips the legal blocker.** The PORTAL gate's `operator_registration` still blocks the customers' portal.
  The console sells nothing and publishes no service text, so its gate does not carry it.

## Apple

No change, none authorised. The app's source names neither `admin.tsxmr.com` nor `dukan-test`, and this touches no bundle ID,
privacy or support URL, or App Store Connect field. Build 4 is unaffected.

## Known limits

- The origin rule is proven at guard level, in CI. It has not been exercised over HTTP against a running API; step 7 does that.
- Sign-in, MFA, step-up and cookie attributes are unchanged and rest on existing tests and code reading. They have never run on
  this hostname; step 8 does that.
- The admin bundle still carries the translation catalogue with the customers' wording, and route names such as `/subscription`.
  It holds no portal page, API route or data.
- Cookie names and `SameSite` are unchanged. A `__Host-` prefix and `Strict` are worth considering later; both sign everyone out.
- `https://tsxmr.com` sends HSTS without `includeSubDomains`, so `admin.tsxmr.com` relies on its own header.
