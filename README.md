# ops/verify-browser-input

Tooling only: no site code. `.github/workflows/verify-browser-input.yml` checks the protected ERP browser app's input
and access corrections of 2026-10-24 end to end on GitHub runners — the backend's unit suite and real-MySQL gates, then
MySQL 8.4, the API from the backend commit, and the app's web export from the mobile commit, in **Chromium and WebKit**:

- one focus ring on the sign-in fields (touch and keyboard focus), no browser outline, no layout shift;
- sheet fields that take a tap and keep what is typed — Add an account (every service), New team member (Name, Phone,
  Email, with role and store changes), New category — and a validation error followed by a correction, saved for real;
- the Owner's setup code: redeemed once, signed in at once with no approval step, "no active access yet" without an
  entitlement (EN/FR/AR), no paid subscription created, and a no-payment grant that opens the ERP at once;

at 320/375/390 px, EN/FR/AR (RTL), light and dark. The commits are in `verify/target.env`; push this branch to run it.
Evidence is committed to `ci-evidence` under `evidence/browser-input/`. WebKit here is browser automation on Linux, not
a physical iPhone: the owner's iPhone retest stays open after deployment.

Locally the input matrix also runs against a mocked API (`MOCK=1 APPDIR=… node verify/ui-input.mjs`), which is how it
was shown to fail on the app before the fix (`da5c73c`) and pass after it.
