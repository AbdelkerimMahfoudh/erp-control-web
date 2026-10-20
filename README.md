# ops/build-test-console

Tooling only: no site code. It builds the two private test sites of D217 on a Linux runner, because Windows Smart App
Control on the owner's PC blocks both builds' native binaries:
- Rolldown (Vite), for the console at `https://dukan-test.tsxmr.com`;
- lightningcss 1.33 (Expo's Metro config), for the app at `https://erp-test.tsxmr.com`.

- **Input:** `build/target.env`: the console and app commits, production's API base and the test console's origin.
- **Output:** the console's `dist` and the app's web export, each with its SHA-256 list. They are committed to
  `ci-evidence` under `evidence/test-console/<console>-<app>-<run>/`.
- **Then, on the owner's PC:**
  - check the checksums;
  - package with `scripts/caddy-release.mjs` (console) and `scripts/web-test-release.mjs --production-api` (app),
    from the same commits;
  - install with the backend's `deploy/production/test-sites.sh` (backend `docs/100` §16.7).

It deploys nothing and touches no secret.
