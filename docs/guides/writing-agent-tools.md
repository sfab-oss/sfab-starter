# Writing org-agent ERP tools

How to author, compose, and test the snake_case `tools.*` surface the org agent
exposes inside **codemode**. Covers layout, context vs parameters, tool *design*
principles, the `ToolResult` fail contract, approval gates, sandbox field reach,
and common gotchas. Supersedes the narrower approval-only guide (see stub at
`agent-tool-approvals.md`).

Design principles below are adapted from Korra’s `platform-tool-design`
methodology (agent-facing contract, composability, shape matching); the
implementation details are specific to this starter + Think/codemode stack.

## Layout: catalog, transaction, display

```
packages/agent/src/tools/
├── compose-org-tools.ts   # getOrgAgentTools / ReadOnly / Display
├── define-org-tool.ts     # thin helper wrapping asToolResult
├── tool-result.ts         # ToolResult types + requireFound + asToolResult
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

## Design before you wrap

Wrapping every `@workspace/core` function one-to-one is almost always wrong:
too many tools, the wrong granularity, and “tools” that are just two other
tools glued together.

**Composability rule:** a tool earns its place only if it grants a capability
the agent **cannot already compose** — an atomic write, an irreducible guard /
transaction, or (later) an external/async job. If the candidate is “read X,
then write Y” with nothing lost in between, **don’t build it**; teach the
sequence in a skill or system-prompt note instead.

Name the cut:

| Cut | Meaning | Example |
|-----|---------|---------|
| **Composability drop** | Agent can compose it → drop permanently | Hypothetical “create product then list” mega-tool |
| **Scope defer** | Irreducible but not needed for the current goal → defer explicitly | Money/doc mutations (UI-only today) |

**Bundle** only when a sequence is obligatory, has **no intermediate decision**,
and intermediate ids are pure plumbing. Prefer separate tools when the model
must choose or inspect between steps.

Ground every cut in the **real** core function (signature, cascades, sync vs
async) — not assumptions.

## Match shape to the step

Not every domain is CRUD. Pick the shape before naming tools:

| Shape | When | Starter pattern |
|-------|------|-----------------|
| **CRUD + lifecycle** | Draft you author, then lock/delete | `list`/`get`/`create`/`update` + gated `delete_*` |
| **Pure persist** | Config with no cascade | upsert-style write + reads |
| **Approval-gated destructive** | Irreversible / hard to undo | `needsApproval: true` (codemode pause) + RBAC in `execute` |
| **No agent tool** | Money/doc mutations, or pure UI flows | Hand off to the real screen |
| **Pipeline trigger + poll** | Async external work (future) | `trigger_*` + `get_*_status` + `get_*` — don’t lead with the override upsert |

**Finalize / delete as their own verbs.** Don’t bury a one-way transition in a
boolean on a generic `update` (e.g. `update(..., deleted: true)`). We already
treat `delete_product` as a separate approval-gated tool for that reason.

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

**Getters:** when core returns `null` / `undefined`, call `requireFound(data, detail)`
inside `execute` — it throws `DomainError("…", "not_found")`, which `asToolResult`
maps to `{ ok: false, code: "not_found", error: detail }`. **Lists:** empty arrays
stay `{ ok: true, data: [] }`.

Prefer `defineOrgTool` (`define-org-tool.ts`) — it applies `asToolResult` and
`toModelOutput` (`error-text` on fail, `json` on success).

The system prompt tells the model to check `ok` before using `data`.

**Errors are an interface:** the `error` string is what the model reads to
self-correct. Prefer actionable text with a recovery hint (“Product not found:
no match for id, name, or sku …”; “ambiguous product ref: N matches …”) over
generic “failed”. Surface meaningful `DomainError` messages; don’t flatten them.

## Agent-facing contract

At runtime the model sees **name, description, params, output, and `error`** —
not your composability ledger. Design that contract deliberately.

### Naming

- **snake_case**, `verb_object` / `verb_domain_object`
  (`list_products`, `get_credit_balance`, `delete_product`).
- Consistent domain prefixes so related tools cluster for selection.
- Match sandbox identifiers (no reliance on hyphen→underscore sanitization).

### Descriptions (write them for the model)

In 1–3 sentences cover: **what it does, when to use it, what it returns, what
to do next.** Include what types alone don’t say:

- **Units / formats** — money is integer **minor units**; dates ISO if relevant.
- **Chaining hint** — “returns the new product `id`; pass it to `get_product`
  or `update_product`.”
- **Preconditions** — “only works on an existing product; ambiguous name →
  `conflict`.”
- **Destructiveness** — say so for gated tools (“Requires explicit user
  approval”; destructive delete).

### Params

- One-line `.describe()` on non-obvious fields; **enums** over free strings when
  the set is closed.
- **Explicit ids** — no hidden “current product”; pair with `list_*` / `get_*`
  (and ref resolution where we intentionally allow name/SKU).
- Only ask for fields that change (unless the service is full-replace — then say
  so).

### Outputs

- **Lean lists** — enough to *choose* (id, name, sku, …) with limits/filters as
  needed; **fat gets** — enough to *act*.
- Return **chainable ids** from every create/update.
- Same units in as out so values round-trip without conversion.

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
  SKU via `resolveProductRef`; ambiguous refs → `conflict` (an **ask-point**:
  don’t silently pick one match).
- **Verify after write:** a successful `{ ok: true }` means the mutation landed;
  still re-read (or rely on UI invalidation) before telling the user “done” if
  downstream views can lag.
- **Codemode outer status:** intentional `{ ok: false }` from a tool must **not**
  rewrite completed codemode to `status: "error"` — only legacy throw-shaped
  `{ error: string }` without `ok` triggers that path (`codemode-output.ts`).

## Adding a new tool

### Read tool

1. Add `defineOrgTool` in the right domain file (`catalog/`, `transaction/`).
2. Close over `organizationId` from context; put ids/filters in `inputSchema`.
3. For single-row getters: `requireFound(await getFoo(...), "Foo not found: …")`
   inside `execute`.
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

## Designing a new domain (optional grill)

When adding a **whole new domain** (not a single CRUD tool), don’t dump a full
toolset in one shot:

1. Read the real core functions first (`file:line`).
2. State the **shape** of the step (table above).
3. Ask **one** decision with a recommendation (which tools / bundle vs compose /
   defer), then wait.
4. Record a ledger: step → tools → composability drop vs scope defer.
5. Next step.

For day-to-day “add `get_foo`,” skip the grill and follow **Adding a new tool**.

## Tests

- Unit: `packages/agent/src/tools/tool-result.test.ts` — `requireFound` and
  `asToolResult` mapping.
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
