# Structured logging

One helper, one envelope, one `kind` vocabulary — the Workers Logs mirror is
the real-time observability surface for this template. Every server-side log
line should be a single JSON object emitted through `structuredLog` from
`@workspace/log` (ALW-700).

`@workspace/log` is a **zero-dependency** package so any server runtime
(`apps/web`, `@workspace/email`, `@workspace/agent`) can share it without
pulling the domain layer (`@workspace/core`).

Client / browser `console.*` usage is out of scope (chat UI and `packages/ui`
keep raw consoles under Biome carve-outs).

ERP / activity UI persistence is a **separate** concern (ALW-699) — this
package does not write to D1.

| | Ops (`@workspace/log`) | Domain activity (`activity_log`) |
| --- | --- | --- |
| Audience | Builders / Cloudflare Workers Logs | End users on a record page |
| API | `structuredLog({ kind, … })` | `listActivity` / finalize & payment writers |
| UI | None | Document `ActivityTimeline` on `/documents/$id` |
| Example | `email_send_failed` | `document_finalized`, `payment_recorded` |

See `packages/db/src/schema/activity.ts` and `docs/architecture/transaction-core.md` §7–§8.

---

## Helper

```ts
import { errorMessage, structuredLog } from "@workspace/log";

structuredLog({
  kind: "email_sent",
  to: "user@example.com",
  templateId: "password-reset",
});

structuredLog({
  kind: "org_chat_turn_failed",
  severity: "error",
  organizationId: orgId,
  chatName: chatName,
  error: errorMessage(err),
});
```

### Envelope

| Field | Required | Notes |
| --- | --- | --- |
| `kind` | yes | Stable snake_case event name from `LOG_KINDS` (`LogKind`) |
| `severity` | no | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `organizationId` | when known | Org subject id |
| `userId` | when known | User subject id |
| *(payload)* | — | Additional fields flattened onto the same object |

The helper always writes **one console line** (`JSON.stringify` of the
envelope) via the matching `console.*` method for `severity`.

### Rules

1. **Never log secrets** — tokens, cookies, `Authorization` headers, invite
   URLs in email props. Prefer `error: errorMessage(err)` over raw `Error`
   objects (stacks may contain credentialed URLs).
2. **Do not call `console.*` directly** in server code. Biome
   `suspicious/noConsole` (error) enforces this via root `biome.jsonc`, with
   carve-outs for the helper module, client UI, `packages/ui`, docs, and
   scripts.
3. **Keep `hono/logger()`** — request access logs stay on Hono's middleware;
   structured kinds cover application events only.
4. New kinds must be added to `LOG_KINDS` in `packages/log/src/kinds.ts`
   (TypeScript rejects unregistered strings). Keep the list small.

---

## Kind vocabulary

| Kind | When |
| --- | --- |
| `email_sent` | Outbound email accepted (incl. mock) |
| `email_send_failed` | Resend / send threw |
| `unhandled_error` | Root Hono `onError` unexpected failure |
| `catalog_search_failed` | Org catalog search threw |
| `org_chat_turn_failed` | OrgChat turn error (`onChatError`) |
| `org_chat_auto_compaction_failed` | Think auto-compaction error callback |
| `org_chat_usage_compaction_failed` | Usage-driven compaction threw |
| `org_chat_touch_failed` | Parent `touchChat` fire-and-forget failed |
| `org_sub_agent_auto_compaction_failed` | OrgSubAgent auto-compaction error |

---

## Enforcement

```bash
pnpm lint:check   # Biome noConsole:error + carve-outs
```

Deny-by-default everywhere Biome scans. Documented carve-outs in root
`biome.jsonc`:

- `packages/log/src/structured-log.ts` — the helper
- `apps/web/src/{components,routes,hooks}/**` — browser UI
- `apps/docs/src/**` — docs site
- `packages/ui/src/**` — shared UI
- `**/scripts/**`, `**/*.{mjs,cjs}` — scripts / CLIs
- test files (inherited from `@workspace/biome-config`)

---

## Non-goals

- D1 / activity UI persistence — [[ALW-699]]
- Porting the platform's large kind registry or `request_log` middleware
- Client-side structured logging
