# ops/verify-provisioning

Tooling only: no site code. `.github/workflows/verify-provisioning.yml` checks platform-superadmin provisioning and
persistent test businesses (D217) end to end on a GitHub runner — MySQL, the API from the backend commit, the console
and the app — in WebKit, at the three commits named in `verify/target.env`. Push this branch to run it; the evidence
is committed to `ci-evidence` under `evidence/provisioning/`. WebKit here is browser automation on Linux, not a
physical iPhone.
