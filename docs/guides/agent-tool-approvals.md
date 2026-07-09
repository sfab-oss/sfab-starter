# Agent tool approvals: which writes ask a human first

How the org agent decides whether a write runs autonomously, pauses for an
in-chat **Approve/Reject**, or isn't an agent tool at all — and how the approval
flow is wired on our installed `@cloudflare/think` / `@cloudflare/codemode`.
Introduced in ALW-348; class-2 path moved in-codemode in ALW-456.

## The question

The agent exposes ERP tools to the model through **codemode** — a sandbox where
the model writes TypeScript that calls `tools.*` (`createExecuteTool(this, {
tools })` in `packages/agent/src/org/chat/org-chat.ts`). When is a human gate
appropriate, and how do we add one without the call silently disappearing?

The original worry (recorded on ALW-348): an older codemode (`0.3.8`) **silently
stripped** any tool with `needsApproval` via `filterTools`, so an approval-gated
tool never reached the sandbox and the model just... couldn't call it, with no
error. That is no longer our stack.

## Installed behaviour — verified against the dist, not the docs

We are on **`@cloudflare/think@0.12.1` + `@cloudflare/codemode@0.4.2`** (upgraded
in ALW-398; the codemode approval runtime the old task speculated about already
shipped — **no further upgrade is needed**).

`createExecuteTool` → `createExecuteRuntime` builds a **`ToolSetConnector`** and a
`createCodemodeRuntime` (`@cloudflare/think/dist/tools/execute.js`). It does **not**
use the legacy `createCodeTool`/`filterTools` path. In the connector,
`needsApproval !== false` maps to codemode `requiresApproval: true`
(`@cloudflare/codemode/dist/ai.js`, `ToolSetConnector.tools()`) — the tool is
**preserved, not stripped**. A gated call inside codemode **durably pauses** the
sandbox execution (output `status: "paused"` with an `executionId` and a
truncated `pending[]` preview), resumable via Think's client-callable
`approveExecution` / `rejectExecution` / `pendingExecutions` /
`pendingApprovals` (all `@callable()` on `Think`, inherited by `OrgChat`).

So on our version, `needsApproval` **pauses; it does not strip or error.** This is
locked by a test (`apps/web/src/workerd-test/tool-approvals.workerd.test.ts`)
that feeds a `needsApproval` tool through a real `ToolSetConnector` and asserts
the emitted descriptor carries `requiresApproval: true`.

## The per-tool-class rule

Choose the **lowest** class that's still safe:

1. **Autonomous + RBAC** — the default. The tool runs the moment the model calls
   it, gated only by `assertCan(...)` (`packages/agent/src/tools/guard.ts`). Use
   for reversible, low-stakes writes: `create_product`, `update_product`. These
   live **inside** codemode (`getOrgAgentTools`).

2. **Durable in-codemode approval** — the tool stays in the codemode tool set
   with `needsApproval: true`. When a script calls it (`tools.delete_product`),
   the sandbox pauses; the chat renders a paused-execution card
   (`paused-execution-card.tsx`) from the paused output's `pending` preview
   and resumes with `approveExecution` / `rejectExecution`. **RBAC still
   applies** post-approval — approval is not authorization. Use for
   destructive / hard-to-reverse writes: **`delete_product`**
   (`createProductApprovalTools` → `getOrgAgentTools`). Tool names are
   authored in **snake_case** so they match sandbox identifiers without
   relying on hyphen→underscore sanitization.

3. **No agent tool at all** — money & document *mutations* are never exposed to
   the agent; they hand off to the real screen (the guard.ts invariant). Class 2
   is the mechanism they'd adopt *if* that ever changed — it does not open the
   door by itself.

> Why in-codemode (class 2) and not a top-level AI-SDK tool? Destructive deletes
> almost always happen mid-plan (list → pick → delete). Pausing the *execution*
> keeps that plan intact and uses the durable Think resume path. Top-level
> `approval-requested` parts remain supported by `default-tool.tsx` if a future
> tool needs them, but `delete_product` is no longer hoisted that way (ALW-456;
> also retires the ALW-454 tool-call-id Approve bug on the old path).

## Adding a gated write

1. Author the tool with `needsApproval: true` and keep its `assertCan(...)` guard
   in `execute` (see `createProductApprovalTools` in
   `packages/agent/src/tools/catalog/products.ts`).
2. Compose it into `getOrgAgentTools` (`compose-org-tools.ts`) so it is available
   inside the codemode sandbox — **not** as a top-level sibling of `codemode`.
3. The paused-execution UI in `paused-execution-card.tsx` already handles
   paused / completed / rejected codemode outputs with an `executionId`; no
   further wiring for the common case.

## Files of interest

- `packages/agent/src/org/chat/org-chat.ts` — `getTools()`: `codemode` only for
  ERP writes (including gated delete).
- `packages/agent/src/tools/catalog/products.ts` — `createProductWriteTools`
  (class 1) vs `createProductApprovalTools` (class 2, `needsApproval`).
- `packages/agent/src/tools/compose-org-tools.ts` — `getOrgAgentTools` owns both
  classes; `getOrgAgentApprovalTools` is an empty deprecated stub.
- `packages/agent/src/tools/guard.ts` — `assertCan` RBAC, orthogonal to approval.
- `apps/web/src/components/chat/tools/paused-execution-card.tsx` — Approve/Reject
  for paused codemode executions (uses `pending` on the paused output; same card
  stays mounted after settle via a session-only flag).
- `apps/web/src/workerd-test/tool-approvals.workerd.test.ts` — proves
  `needsApproval` → `requiresApproval` (not stripped) and the composition split.
- ALW-347 (RBAC spine), ALW-398 (think/codemode upgrade), ALW-402 (read reach),
  ALW-456 (in-codemode delete + pending-execution UI).
