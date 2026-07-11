# Deploy contract (Option Y)

How a fabricated project ships itself to the customer's Cloudflare account, and
how the SFAB platform observes that deploy. This is the template side of
Option Y (user-repo deploys itself; the platform only orchestrates and
observes). Resource IDs are committed in `wrangler.jsonc` by the provisioner
before the first deploy — CI never creates D1/R2/KV.

## Observation interface

| Field | Value |
|---|---|
| Workflow file | `.github/workflows/deploy.yml` |
| Workflow `name:` | **`Deploy`** |
| Event the platform listens on | GitHub `workflow_run` filtered to workflow name `Deploy` |

Do not rename the workflow (`name: Deploy`) without coordinating with the
platform observer (ALW-125). GitHub matches `workflow_run.workflows` against
this `name:` string (falling back to the filename only when `name:` is omitted).

### What start / success / failure look like

| Phase | How to read it |
|---|---|
| **Start** | A `Deploy` run is `queued` / `in_progress` (or `workflow_run` `action: requested`) after CI on `main` completes |
| **Success** | Run `conclusion == success` **and** the `deploy` job conclusion is `success` (the job actually ran). Do **not** treat run-level success alone if you also inspect jobs — prefer checking the `deploy` job. |
| **Skipped (not a deploy)** | Run `conclusion == skipped` — the job-level gate did not pass (e.g. CI on main was not green, or was not a `push`). **Not** a successful deploy. |
| **Failure** | Run `conclusion == failure` (or `cancelled` / `timed_out`), or the `deploy` job conclusion is `failure` |

Verified (2026-07-11) against live GitHub Actions API data
(`ihhub/fheroes2` run
[29155689737](https://github.com/ihhub/fheroes2/actions/runs/29155689737)):
when every job in a `workflow_run`-triggered workflow is skipped by a job-level
`if`, the **workflow run conclusion is `skipped`**, not `success`. (Separate
GitHub docs note that a skipped *job* can still report Success as a *required
status check* for branch protection — that is a different surface from
`workflow_run.conclusion`, which is what ALW-125 observes.)

`deployment_status` is **not** part of this contract. The deploy job does not
create a GitHub Deployment entity.

## Trigger & CI gate

1. `CI` runs on every push to `main` (and on PRs).
2. `Deploy` is triggered via `workflow_run` with `branches: [main]` — PR-branch
   CI completions do not create a Deploy run at all.
3. The `deploy` job additionally requires
   `conclusion == success`, `event == push`, and `head_branch == main`.
4. The deploy job checks out `workflow_run.head_sha` (the commit CI validated).

### Converge-to-latest on rapid merges

`CI` uses `concurrency: group: ci-${{ github.ref }}` with
`cancel-in-progress: true`. On `main`, a newer push **cancels** an in-flight CI
run for an older SHA. Cancelled CI never reaches `conclusion == success`, so
that older SHA never gets a Deploy run. Deploys therefore **converge to the
latest** main tip. ALW-125 will see some merges with no Deploy signal — that is
expected, not a missed ingest bug.

## Pipeline (order is fixed)

1. **Build** the web app (prerequisite for Wrangler upload).
2. **Optional account id** — if Actions secret `CLOUDFLARE_ACCOUNT_ID` is
   present and non-empty, export it for Wrangler; otherwise leave unset.
3. **`wrangler d1 migrations apply DB --remote`** — migrations first, addressed
   by the stable D1 **binding** `DB` (not `database_name`, which the provisioner
   rewrites per fabricated project). Additive-only migrations (ALW-111) mean
   old Worker code on a new schema is safe; new code on an old schema is not.
4. **`wrangler deploy --no-x-provision`** — a missing binding resource fails
   the job; Wrangler must not auto-create anything from CI.
5. **Secrets sync** — `wrangler secret bulk` for the Worker secret names listed
   in `apps/web/.dev.vars.example`, reading same-named GitHub Actions secrets.
   Absent or empty Actions secrets are skipped with a log line; the deploy does
   not fail. Secrets run **after** deploy because `wrangler secret` 404s before
   the Worker script exists; values persist across later deploys (bootstrap +
   drift correction).

### Auth / account resolution

- Required: Actions secret `CLOUDFLARE_API_TOKEN` (scoped deploy token).
- Optional: Actions secret `CLOUDFLARE_ACCOUNT_ID`. Narrow deploy tokens may not
  be able to list `/accounts`; if Wrangler cannot resolve the account from the
  token alone, the platform should write `CLOUDFLARE_ACCOUNT_ID` alongside the
  token (platform-side follow-up). An absent/empty secret must not break the
  token-only path.
- **First thing testbed E2E must check:** that `d1 migrations apply` / `deploy`
  can resolve the Cloudflare account with the credentials present in the
  fabricated repo's Actions secrets.

## Concurrency

```yaml
concurrency:
  group: deploy
  cancel-in-progress: false
```

One deploy at a time; overlapping merges queue. A deploy must never be cancelled
mid-flight. (This is independent of CI's cancel-in-progress converge-to-latest
behavior above.)

## First-boot secrets

The Worker must accept a deploy before every secret is present: missing secrets
fail the requests that need them, not isolate startup. Email and org-chat
inference already throw when their keys are read. Auth resolves
`BETTER_AUTH_SECRET` lazily on first auth use (better-auth's async context
init); until the platform syncs that secret, auth routes error per-request.
