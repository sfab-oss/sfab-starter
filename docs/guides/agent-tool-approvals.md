# Agent tool approvals: which writes ask a human first

How the org agent decides whether a write runs autonomously, pauses for an
in-chat **Approve/Reject**, or isn't an agent tool at all — and how the approval
flow is wired on our installed `@cloudflare/think` / `@cloudflare/codemode`.
Introduced in ALW-348.

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
sandbox execution (output `status: "paused"` with a `pending[]`), resumable via
Think's client-callable `approveExecution` / `rejectExecution` /
`pendingApprovals` (all `@callable()` on `Think`, inherited by `OrgChat`).

So on our version, `needsApproval` **pauses; it does not strip or error.** This is
locked by a test (`apps/web/src/workerd-test/tool-approvals.workerd.test.ts`)
that feeds a `needsApproval` tool through a real `ToolSetConnector` and asserts
the emitted descriptor carries `requiresApproval: true`.

## The per-tool-class rule

Choose the **lowest** class that's still safe:

1. **Autonomous + RBAC** — the default. The tool runs the moment the model calls
   it, gated only by `assertCan(...)` (`packages/agent/src/tools/guard.ts`). Use
   for reversible, low-stakes writes: `create-product`, `update-product`. These
   live **inside** codemode (`getOrgAgentTools`).

2. **Top-level human approval** — the tool is hoisted **out** of codemode and
   exposed as a top-level AI-SDK tool (a sibling of `codemode` in `getTools()`)
   with `needsApproval: true`. The call surfaces as an `approval-requested`
   transcript part; the chat renders Approve/Reject
   (`apps/web/src/components/chat/tools/default-tool.tsx`), and `execute` runs
   only after the human approves. **RBAC still applies** post-approval — approval
   is not authorization. Use for destructive / hard-to-reverse or high-stakes
   writes: **`delete-product`** (`getOrgAgentApprovalTools`), and future money /
   document actions if they ever become agent tools.

3. **No agent tool at all** — money & document *mutations* are never exposed to
   the agent; they hand off to the real screen (the guard.ts invariant). Class 2
   is the mechanism they'd adopt *if* that ever changed — it does not open the
   door by itself.

> Why top-level (class 2) and not durable-in-codemode for `delete-product`? A
> rare, destructive action reads better as a direct, explicit tool call the human
> confirms than as a step buried in generated sandbox code — and it reuses the
> finished approval UI unchanged. The durable in-codemode pause (approve/resume a
> paused *execution* mid-script) stays available for a future case where a gated
> step must happen inside a larger codemode plan; it would need its own renderer
> over `pendingApprovals()` / `approveExecution()`.

## Adding a gated write

1. Author the tool with `needsApproval: true` and keep its `assertCan(...)` guard
   in `execute` (see `createProductApprovalTools` in
   `packages/agent/src/tools/catalog/products.ts`).
2. Compose it into `getOrgAgentApprovalTools` (`compose-org-tools.ts`) — **not**
   `getOrgAgentTools`, so it stays out of the codemode sandbox.
3. It's already spread top-level in `OrgChat.getTools()`; the UI in
   `default-tool.tsx` renders Approve/Reject with no further wiring.

## Files of interest

- `packages/agent/src/org/chat/org-chat.ts` — `getTools()`: `codemode` (autonomous
  set) + spread top-level approval tools.
- `packages/agent/src/tools/catalog/products.ts` — `createProductWriteTools`
  (class 1) vs `createProductApprovalTools` (class 2, `needsApproval`).
- `packages/agent/src/tools/compose-org-tools.ts` — `getOrgAgentTools` vs
  `getOrgAgentApprovalTools`; the rule is documented on `getOrgAgentTools`.
- `packages/agent/src/tools/guard.ts` — `assertCan` RBAC, orthogonal to approval.
- `apps/web/src/components/chat/tools/default-tool.tsx` — the Approve/Reject UI.
- `apps/web/src/workerd-test/tool-approvals.workerd.test.ts` — proves
  `needsApproval` → `requiresApproval` (not stripped) and the composition split.
- ALW-347 (RBAC spine, dropped the old `needsApproval`), ALW-398 (the
  think/codemode upgrade), ALW-402 (read reach).
