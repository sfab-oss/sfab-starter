# Writing org-agent ERP tools

How to author, compose, and test the snake_case `tools.*` surface the org agent
exposes inside **codemode**. Covers layout, context vs parameters, the
`ToolResult` fail contract, approval gates, sandbox field reach, and common
gotchas. Supersedes the narrower approval-only guide (see stub at
`agent-tool-approvals.md`).

## Layout: catalog, transaction, display

```
packages/agent/src/tools/
├── compose-org-tools.ts   # getOrgAgentTools / ReadOnly / Display
├── define-org-tool.ts     # thin helper wrapping asToolResult
├── tool-result.ts         # ToolResult types + asToolResult
├── guard.ts               # assertCan RBAC
├── display.ts             # top-level display_* (UI echoes)
├── catalog/               # products, documents
└── transaction/           # payments, wallet, entities, org, activity
```

| Compose entry | What it returns | Where it runs |
|---------------|-----------------|---------------|
| `getOrgAgentTools(ctx)` | All 15 ERP tools (reads + catalog writes + `delete_product`) | Inside codemode sandbox (`tools.*`) |
| `getOrgAgentReadOnlyTools(ctx)` | Same reads, no writes | Delegated sub-agent (`OrgSubAgent`) |
| `getOrgAgentDisplayTools(ctx)` | `display_product_list`, `display_memory` | Top-level peers of `codemode` |

`org-chat.getTools()` wires ERP tools **only** through codemode; display and
delegate are top-level. Display tools are top-level UI echoes and may keep their
own return shapes — do not block ERP work on wrapping them.

## Context globals vs `inputSchema`

`AgentToolsContext`: `{ organizationId, userId, waitUntil }`

| Closed in context | Passed per call (`inputSchema`) |
|-------------------|----------------------------------|
| `organizationId` (every tool) | Entity/document/product ids, filters, payloads |
| `userId` (writes — `assertCan`; codemode often lacks ALS) | `limit`, `type`, create/update fields |
| `waitUntil` | Unused today |

Reads take `Pick<AgentToolsContext, "organizationId">` so sub-agents work
without an acting user. Writes need full context for RBAC.

## Result contract + `asToolResult`

ERP tools return a discriminated union — never throw for expected domain misses:

```ts
type ToolErrorCode =
  | "not_found"
  | "conflict"
  | "forbidden"
  | "unprocessable"
  | "unknown";

type ToolOk<T> = { ok: true; data: T };
type ToolErr = { ok: false; error: string; code: ToolErrorCode };
type ToolResult<T> = ToolOk<T> | ToolErr;
```

`asToolResult(fn)` wraps `execute`:

- `DomainError` → `{ ok: false, error: message, code: map DomainErrorCode }`
- `Error` with `PERMISSION_DENIED_MESSAGE` → `{ ok: false, code: "forbidden" }`
- other `Error` → `{ ok: false, code: "unknown" }`
- success → `{ ok: true, data }`

**Getters:** `null` / `undefined` from core must become
`{ ok: false, code: "not_found", error: "…" }` — use `defineOrgTool` with
`requireData: true` or `asToolResultFound`. **Lists:** empty arrays stay
`{ ok: true, data: [] }`.

Prefer `defineOrgTool` (`define-org-tool.ts`) — it applies `asToolResult`,
optional `requireData`, and `toModelOutput` (`error-text` on fail, `json` on
success).

The system prompt tells the model to check `ok` before using `data`.

## `needsApproval` ↔ codemode pause / approve

On `@cloudflare/think@0.12.1` + `@cloudflare/codemode@0.4.2`:

- `needsApproval: true` on a tool maps to codemode `requiresApproval: true`
  via `ToolSetConnector` — the tool is **not stripped**.
- A script calling `tools.delete_product` **pauses** (`status: "paused"`,
  `executionId`, `pending[]` preview); the chat renders Approve/Reject
  (`paused-execution-card.tsx`); resume uses `approveExecution` /
  `rejectExecution`.
- **Pause happens before `execute`.** After approve, `execute` runs and returns
  `ToolResult` — a miss is a soft `{ ok: false }`, not a throw.

### Per-tool-class rule

1. **Autonomous + RBAC** — `create_product`, `update_product` in
   `getOrgAgentTools`; `assertCan("catalog:write")` in `execute`.
2. **In-codemode approval** — `delete_product` with `needsApproval: true`;
   RBAC still runs post-approval (approval ≠ authorization).
3. **No agent tool** — money and document **mutations** are never exposed;
   they hand off to the real screen (`guard.ts` invariant).

## Which AI SDK fields reach the sandbox

`ToolSetConnector` forwards to codemode:

| Field | Reaches sandbox? |
|-------|------------------|
| `description` | Yes |
| `inputSchema` | Yes |
| `needsApproval` | Yes → `requiresApproval` |
| `outputSchema` | Yes |
| `inputExamples` | **No** |

Author snake_case tool names so sandbox identifiers match without rename.

## Gotchas

- **Money** fields are integer **minor units** (ADR-006) — say so in descriptions.
- **No money/doc mutations** as agent tools — finalize, record payment, etc.
  stay UI-gated.
- **`assertCan` on every write** — approval does not grant permission.
- **Product refs:** `update_product` / `delete_product` accept id, exact name, or
  SKU via `resolveProductRef`; ambiguous refs → `conflict`.
- **Codemode outer status:** intentional `{ ok: false }` from a tool must **not**
  rewrite completed codemode to `status: "error"` — only legacy throw-shaped
  `{ error: string }` without `ok` triggers that path (`codemode-output.ts`).

## Adding a new tool

### Read tool

1. Add `defineOrgTool` in the right domain file (`catalog/`, `transaction/`).
2. Close over `organizationId` from context; put ids/filters in `inputSchema`.
3. For single-row getters: `requireData: true` + `notFoundMessage`.
4. Export from the domain index; compose in `getOrgAgentTools` and
   `getOrgAgentReadOnlyTools` if sub-agent should see it.

### Write tool (autonomous)

1. `defineOrgTool` with full `AgentToolsContext`.
2. First line in `execute`: `await assertCan("catalog:write", ctx)` (or the
   right action).
3. Add to `AGENT_WRITE_TOOL_NAMES` / web invalidation registry if it mutates
   persisted state the UI should refresh.

### Approval-gated write

1. `needsApproval: true` on `defineOrgTool`.
2. Keep `assertCan` inside `execute` (runs after user approves).
3. Compose into `getOrgAgentTools` only — not as a top-level sibling of
   codemode.
4. Extend `tool-approvals.workerd.test.ts` if you add a new gated tool.

## Tests

- Unit: `packages/agent/src/tools/tool-result.test.ts` — `asToolResult` mapping.
- Agent: `packages/agent/src/tools/catalog/products.test.ts` — execute returns
  `ToolResult`, no throw on miss.
- Workerd: `apps/web/src/workerd-test/tool-approvals.workerd.test.ts` —
  `needsApproval` → `requiresApproval`.

## Files of interest

- `packages/agent/src/org/chat/org-chat.ts` — `getTools()` / codemode wiring
- `packages/agent/src/tools/catalog/products.ts` — read / write / approval factories
- `packages/agent/src/tools/compose-org-tools.ts` — compose entry points
- `packages/agent/src/tools/guard.ts` — RBAC
- `packages/agent/src/codemode-output.ts` — outer completed vs error rewrite
- `apps/web/src/components/chat/tools/paused-execution-card.tsx` — Approve/Reject UI
