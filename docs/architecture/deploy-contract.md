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

A single `workflow_run` for `Deploy` covers the whole unit:

| Phase | `workflow_run` / run fields |
|---|---|
| **Start** | `action: requested` (or the run entering `in_progress` / `queued`) after CI on `main` succeeds |
| **Success** | `action: completed` with `conclusion: success` |
| **Failure** | `action: completed` with `conclusion: failure` (or `cancelled` / `timed_out`) |

`deployment_status` is **not** part of this contract. The deploy job does not
create a GitHub Deployment entity; `workflow_run` on `Deploy` is sufficient for
queued → in_progress → completed granularity.

## Trigger & CI gate

1. `CI` runs on every push to `main` (and on PRs).
2. `Deploy` starts via `workflow_run` when that `CI` run completes with
   `conclusion == success`, `event == push`, and `head_branch == main`.
3. The deploy job checks out `workflow_run.head_sha` (the commit CI validated).

PR-only CI completions do not deploy. Manual `workflow_dispatch` of CI does not
deploy unless it was a push to `main`.

## Pipeline (order is fixed)

1. **Build** the web app (prerequisite for Wrangler upload).
2. **`wrangler d1 migrations apply sfab-starter-db --remote`** — migrations
   first. Additive-only migrations (ALW-111) mean old Worker code on a new
   schema is safe; new code on an old schema is not.
3. **`wrangler deploy --no-x-provision`** — a missing binding resource fails
   the job; Wrangler must not auto-create anything from CI.
4. **Secrets sync** — `wrangler secret bulk` for the Worker secret names listed
   in `apps/web/.dev.vars.example`, reading same-named GitHub Actions secrets.
   Absent or empty Actions secrets are skipped with a log line; the deploy does
   not fail. Secrets run **after** deploy because `wrangler secret` 404s before
   the Worker script exists; values persist across later deploys (bootstrap +
   drift correction).

Auth for all Wrangler steps: Actions secret `CLOUDFLARE_API_TOKEN` only (scoped
deploy token written by the platform). No account-id secret and no management
token.

## Concurrency

```yaml
concurrency:
  group: deploy
  cancel-in-progress: false
```

One deploy at a time; overlapping merges queue. A deploy must never be cancelled
mid-flight.

## First-boot secrets

The Worker must accept a deploy before every secret is present: missing secrets
fail the requests that need them, not isolate startup. Email and org-chat
inference already throw when their keys are read. Auth resolves
`BETTER_AUTH_SECRET` lazily on first auth use (better-auth's async context
init); until the platform syncs that secret, auth routes error per-request.
