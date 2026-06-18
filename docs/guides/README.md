# Guides

Code-anchored how-to and "how X works" notes for *this* repo. A guide answers a
practical question ("how do I add a capability?", "what's the safe way to write a
D1 migration?") by pointing at real files and the preferred pattern — grounded in
this codebase, not a generic tutorial.

## What a guide is (and isn't)

- **A guide is:** repo-specific convention + explanation, written when the index
  or a reviewer would otherwise have to re-explain the same thing. It cites
  **Files of Interest** (`path:line`) so it stays honest and verifiable.
- **A guide is *not*:**
  - A **decision** — *why we chose X over alternatives* lives in
    [`../decisions/`](../decisions/) under the ADR significance bar
    ([ADR-005](../decisions/005-documentation-and-knowledge-layer.md)).
  - The **architecture map** — *what the system is* lives in
    [`../architecture.md`](../architecture.md).
  - A **skill** — procedural, domain-bounded knowledge the AI agent triggers
    autonomously lives in [`.agents/skills/`](../../.agents/skills/), discovered by
    its `description`.

## House style

Each guide follows the same shape, so it's copy-pasteable and stays true:

1. **The smell / the question** — the concrete situation, ideally a real one hit
   in this repo.
2. **The preferred pattern** — what to do instead, with a runnable snippet.
3. **Files of Interest** — `path:line` references (and the relevant ADR/migration)
   so a reader can jump straight to the source and the entry can't silently rot.

Only add a guide for something actually encountered here — not a hypothetical.

## Index

_(Guides are added as conventions earn one. Start with the architecture map and
the ADRs; this folder grows as recurring "how does X work here?" questions show
up — e.g. adding a capability slice, the D1 migration house style, the AI
tool/skill wiring.)_
