# ops/build-test-console

Tooling only: no site code. It builds the private test console (`https://dukan-test.tsxmr.com`, D217) on a Linux
runner, because Windows Smart App Control on the owner's PC blocks Vite's native binary (Rolldown).

- **Input:** `build/target.env`, with the console commit, production's API base and the test console's origin.
- **Output:** the `dist` and its SHA-256 list, committed to `ci-evidence` under `evidence/test-console/<commit>-<run>/`.
- **Then, on the owner's PC:**
  - check the checksums;
  - package with `scripts/caddy-release.mjs` from the same commit;
  - install with the backend's `deploy/production/test-sites.sh` (backend `docs/100` §16.7).

It deploys nothing and touches no secret.
