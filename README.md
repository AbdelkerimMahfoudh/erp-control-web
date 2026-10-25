# ops/verify-promoter-attribution

Tooling only — never merged. Runs the promoter-attribution journey (0103, D221) on GitHub runners, in Chromium and in
WebKit, against MySQL 8.4, the API built from the backend commit with every migration applied, an administrator made
from the shell with MFA, the console/site build and the app's web export (commits in `verify/target.env`).

WebKit here is browser automation on Linux, not a physical iPhone. Everything is disposable and fictional: the
database, the secrets (generated in the job, never printed) and the accounts end with the runner. It deploys nothing;
its evidence goes to `ci-evidence` under `evidence/promoter-attribution/`.
