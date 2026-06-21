---
name: components-composition
description: sfab house style for authoring UI components across the sfab repos (React 19 + Tailwind v4 + shadcn/cva, unified radix-ui Slot, Base UI incoming). Load before building or refactoring any component in packages/ui or apps/web. Covers flat naming, cn/cva variants, asChild over polymorphic `as`, data-slot, compound + Provider state, Radix/Base-UI interop, and the packages/ui-imports-no-core boundary. The repo-specific rulebook that applies the generic composition patterns (compound components, avoid-boolean-props, lift-state) to this stack.
---

# sfab Components Composition

Build components the way this repo already builds them. This is the **house style** — the
*build* discipline from components.build plus the *composition* rules from Vercel's patterns,
filtered through this repo's reality. The reference component is
`packages/ui/src/components/shadcn/button.tsx`; when in doubt, mirror it.

> **Scope frame.** components.build is written for *publishing* reusable component libraries
> (Registry / Marketplace / NPM). We are building **an app + a forkable base**, not a
> distributed library — take its build-quality rules, drop the publish posture and the
> library-grade "maximal flexibility everywhere" ceremony. (A full Radix→Base UI migration is
> also out of scope here — a separate decision.)

> Stack: React **19.2**, Tailwind **v4**, `class-variance-authority` + `clsx` + `tailwind-merge`
> (`cn` at `@workspace/ui/lib/utils`), the unified **`radix-ui`** package, and shadcn primitives
> under `packages/ui/src/components/shadcn`. **Base UI** (`@base-ui/react`) is being adopted in the
> starter first (e.g. `combobox.tsx`, already mixed with radix in one tree); the main platform repo
> is radix-only today — the Base UI interop rules (4, 7) apply where/when it lands.

## The rules

### 1. Naming — FLAT, not dot-namespace
Export each part as a **flat named function**: `Card`, `CardHeader`, `CardTitle`, `CardContent`,
`CardFooter`. **Reject** components.build's `Card.Header` dot-namespace — it diverges from the
shadcn baseline (every file under `packages/ui/src/components/shadcn`) and the registry model. This
applies to **internal feature compounds too** (`DocumentEditorHeader`, `DocumentEditorLines`), not
just primitives. The part-of relationship is expressed by the **name prefix + `data-slot`**, and
shared state by a **Provider** (rule 5/6) — not by a dot object.
- **This governs *our own* exports.** Third-party primitives keep their vendor namespace —
  `Slot.Root`, `ComboboxPrimitive.Trigger`, `Dialog.Root`. Do not rewrap them to flatten.

### 2. One element per *leaf* component; props spread; className last
Each **leaf/part** component wraps a single element and spreads through. Type as
`React.ComponentProps<"div"> & { …custom }`. Spread `{...props}`, merge `className` **last** with
`cn` so callers win.
```tsx
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("rounded-xl border bg-card", className)} {...props} />
}
```
- **Exempt:** orchestrator/variant components (rule 3) and Providers (rule 5/6) compose parts —
  they don't wrap a single DOM element and have nothing to spread. The single-element/spread rule
  is for leaves.

### 3. Variants — visual via `cva`, structural via explicit components, never *mode* flags
- **Visual** (same DOM tree, same handlers, only classes/tokens differ) → a `cva` **variant/size
  union prop** (defined **outside** the component, typed with `VariantProps`). A **bare 2-value
  `data-size`/`data-variant` enum without a full `cva` block is also fine** (this is what
  `card.tsx` does — it is *not* a violation).
- **Structural** (different parts mounted, or different handlers/behavior) → **explicit variant
  components that share internal parts** via a Provider/compound. Canonical: `FastSaleEditor` and
  `FullDocumentEditor` are two thin components composing the same flat `DocumentEditor*` parts —
  **one route, two components**, not one component with an `isFast` branch.
- **The test:** *would you need a `{cond && <Part/>}` (different tree) or a different handler?* →
  structural. Same tree, same handlers, only classes → visual.
- **Never** a boolean/enum **mode** flag on a *single public component* that selects *which parts
  render or which flow runs* (`<MemoryCard variant="inline"|"dialog">`, `isFast`, `isEditing`).
  Each doubles the state space. An *internal* Provider receiving a `variant` from its two thin
  wrappers (below) is **fine** — the ban is on exposing the mode as the public entry point, not on
  configuring shared parts.
- **Exemptions to the mode-flag ban** (these are *not* mode flags):
  1. **Responsive branching** — a separate mobile shell component / `useIsMobile` split.
  2. **Async/data state** — `loading` / `error` / `empty` early-returns (and spinner + `disabled`
     on a button). Orthogonal state, not a variant.
  3. **Vendor composition flags** — `viewport`, `collapsible`, etc. on a Radix/Base UI primitive.
  4. **Optional subpart visibility** — a boolean that mounts/hides *one optional part*
     (`showTrigger`/`showClear` on combobox, `showHeader`) — not a flow selector.
- **Standard orthogonal booleans are fine and expected:** `disabled`, `asChild`, `open`,
  `checked`, `defaultOpen`, `loading`. The ban is *only* on booleans that select parts/flow.
```tsx
<Button variant="destructive" size="sm" />            // visual → cva
function FastSaleEditor() {                            // structural → explicit
  return <DocumentEditorProvider variant="fast"><DocumentEditorLines/><DocumentEditorCobrarBar/></DocumentEditorProvider>
}
// NEVER: <DocumentEditor isFast isEditing isQuote />
```

### 4. Element swapping — `asChild` for our components; the primitive's API for vendors
**Drop** the generic polymorphic `as` prop and its `ElementType` generics — `asChild` covers it.
- **Our own components** → `asChild` via the unified `radix-ui` `Slot` (mirrors `button.tsx`):
  ```tsx
  import { Slot } from "radix-ui"
  const Comp = asChild ? Slot.Root : "button"
  ```
- **Wrapping a Base UI primitive** → use *its* `render` prop, which accepts an element **or** a
  `(props, state) => ReactElement` function. Base UI types come as `Primitive.Part.Props`
  (e.g. `Combobox.Trigger.Props`), and `className`/`style` may be **functions of state**, not just
  strings. Example: `<ComboboxPrimitive.Clear render={<InputGroupButton/>} />`.
- **Base UI interop landmines** (both libs coexist today in the starter's `combobox.tsx`):
  - **`nativeButton`** — on a button-like Base UI part, if you `render` a non-`<button>` element,
    set `nativeButton={false}`. Default is context-dependent (native-button parts → `true`;
    non-native parts like `ComboboxItem` (a `<div>`) → `false`).
  - **Different merge engines** — radix `Slot` and Base UI `render`/`useRender` are *not* the same:
    Base UI's `mergeProps` does **not** merge `ref` (separate merged-refs path), merges handlers
    **right-to-left** with an `event.preventBaseUIHandler()` escape hatch, and has **no
    `Slottable`**. Nesting both on one node works but don't assume radix Slot prop/handler order.
  - Base UI's own composition primitives are **`useRender` + `mergeProps`** (from
    `@base-ui/react/use-render` and `@base-ui/react/merge-props` — hyphenated paths), the analog to
    radix `Slot` for authoring your own composable Base UI-style parts.
- **Exception to "drop `as`":** a constrained tag-from-a-fixed-set (e.g. a `Heading` rendering
  `h1`–`h6` via a `level` union) may take that constrained union — *not* an open `ElementType`
  generic. The ban is on library-grade open polymorphism.

### 5. Compound components + Context for shared parts
Anything with parts: Root / Item / Trigger / Content (+ Header / Body / Footer / Title /
Description). Share state through **Context** (rule 6), not prop drilling. Parts stay flat-named
(rule 1) with a throwing guard hook (`useX` throws if used outside its Provider).
```tsx
const DocumentEditorContext = createContext<DocumentEditorValue | null>(null)
function useDocumentEditor() {
  const ctx = useContext(DocumentEditorContext)
  if (!ctx) throw new Error("useDocumentEditor must be used within <DocumentEditorProvider>")
  return ctx
}
function DocumentEditorHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { customer } = useDocumentEditor()
  return <div data-slot="document-editor-header" className={cn("…", className)} {...props}>{customer?.name}</div>
}
// FastSaleEditor / FullDocumentEditor wrap <DocumentEditorProvider variant="…"> and compose the flat parts.
```

### 6. State: simplest mode by default; flat context grouped by concern
- **Default to the single simplest mode.** Most state lives in the **URL (TanStack) or React
  Query** — call the hook in the component that **owns the action** (often the orchestrator/
  container, e.g. `create-product-dialog.tsx` calls `useCreateProduct()` at its top), no Context.
  Do **not** cargo-cult controlled+uncontrolled onto every component.
- **When parts must share state, the house default is a flat context value object** (state fields
  and action functions together — `chat-window.tsx`, `sidebar.tsx`). **Split into multiple
  contexts by concern** when a part shouldn't re-render on changes it doesn't use
  (`prompt-input.tsx` splits `textInput` vs `attachments`). This is the only built-in way to get
  re-render isolation — `useContext` has no selector.
- **Extract derivations to pure functions** (`computeTotal(lines)`, `canFinalize(state)`) and call
  them from the provider memo — so money/validation logic is unit-testable without rendering.
- **Escape hatch — `{ state, actions, meta }`:** *only* when the **same parts must run against 2+
  interchangeable data sources** (e.g. a live server doc vs an offline local draft), isolate *that
  one surface* behind a `{ state, actions, meta }` contract so adapters are compile-time
  interchangeable. **Never the default**, and don't introduce a `meta` bucket otherwise.

### 7. `data-*` for identity & state, props for configuration
`data-slot` mirrors the **full flat export name in kebab-case** (`document-editor-header`) for
unique descendant selectors. Purpose-named (`submit-button`, not `blueButton`). Style children
from a parent via `has-[…]`, `[&_[data-slot=…]]`, named `group/*` scopes. Props stay for
variants/behavior/handlers.
- **State attributes are primitive-specific — never copy a selector across libs:**
  - **Radix** emits `data-state="open|closed"`.
  - **Base UI** never emits `data-state`; it uses `data-open`/`data-closed` (popups),
    `data-popup-open`/`data-pressed` (triggers), `data-highlighted`/`data-selected`/`data-disabled`
    (items), `data-starting-style`/`data-ending-style` (transitions), and **logical** `data-side`
    values (`inline-start`/`inline-end`) Radix never emits.
  - Check the part's own DataAttributes before writing `data-[state=…]`.

### 8. Styling — `cn`, caller's `className` wins
`cn` = `clsx` + `twMerge` from `@workspace/ui/lib/utils`. The caller's `className` must resolve
**last** so `twMerge` lets it win. Two house forms, both correct: pass it **through `cva`** —
`cn(buttonVariants({ variant, size, className }))` (the canonical `button.tsx`) — or as the **last
`cn` arg** on non-cva leaves — `cn("base classes", className)`. Never hand-concatenate.

### 9. React 19 idioms
No `forwardRef` — `ref` is a normal prop (`React.ComponentProps<T>` already carries it; use
`ComponentPropsWithRef` only when wrapping a primitive that needs the ref typed, see
`combobox.tsx`). `Slot.Root` forwards `ref` to the `asChild` child, so ref + asChild compose for
free. **`useContext(Context)` is the house default** (matches all current consumers); reach for
`use(Context)` only when you need a conditional read (after an early return) or to unwrap a promise
under Suspense — do **not** mass-migrate existing `useContext`.

### 10. Types & a11y
Export a `<Name>Props` type for **app/feature composites**; shadcn-style primitives may keep an
inline `React.ComponentProps<…>` intersection (the baseline does — don't force an export there).
**In *prop* names**, avoid native-attribute clashes (a prop named `heading`,
not `title`, since `title` is a native attribute) — this does **not** affect component names
(`CardTitle` the component is correct). Children over render props, except when a child needs
per-item data the parent owns (virtualized/data-driven lists). Semantic elements +
keyboard/focus by default; ARIA only to supplement; preserve role/keyboard behavior when `asChild`
swaps the element.

## sfab layering & placement (non-negotiable)
- **`packages/ui`** = pure, **no `core`/`contract` imports**. Tiers under `components/`:
  `shadcn/*` (primitives), plus app-flavored composite tiers (`brand/*` — `DataTable`, `AppLayout`;
  `ai-elements/*` — chat). A piece that knows nothing about Transaction Core lives here.
- **`apps/web`** = domain composites, in **feature folders** (`components/<cap>/` — `catalog/`,
  `chat/`, `organization/`). **kebab-case filenames** (`create-product-dialog.tsx`). Add
  `"use client"` to any file using hooks/context/state.
- **Money:** money is `MoneyMinor` (integer minor units), rendered via a `MoneyDisplay` primitive
  (planned in the starter — build it rather than reaching for `Intl.NumberFormat`). When you touch
  money, never add a new ad-hoc money `Intl.NumberFormat`; route it through `MoneyDisplay`.
  (Non-money `Intl` — dates, quantities — is fine.)
- **RBAC-gated controls:** a gated action stays **visible but `disabled` with a reason**, never
  hidden for role. `packages/ui` stays pure (takes `disabled` + `disabledReason`); the `apps/web`
  composite computes `disabled={!can(action)}` against the role gate.
- **Responsive:** tablet-primary, phone supported — responsive from the start, no desktop-only
  layouts.

## Pre-PR checklist
- [ ] Right tier/folder (`shadcn`/`brand`/`ai-elements` or `apps/web/components/<cap>/`); kebab filename; `"use client"` if stateful
- [ ] Flat-named exports; single element on leaves; `...props` spread; caller's `className` resolves last via `cn`
- [ ] Visual variants via `cva`/bare `data-*` enum; structural = explicit components; **no public mode flags** (async/responsive/vendor/optional-subpart exempt)
- [ ] `asChild` via `radix-ui` `Slot.Root` (our components) or the primitive's `render` (Base UI); no generic `as`
- [ ] Base UI part wrapped? `nativeButton` set if non-button; correct `data-*` selectors for *that* lib
- [ ] Parts share state via a flat context grouped by concern; derivations as pure fns; `{state,actions,meta}` only for multi-source
- [ ] Simplest state mode (URL/React Query in the action owner first); no needless dual-mode
- [ ] `data-slot` = full kebab export name; identity/UI state via `data-*`, behavior/controlled state via props
- [ ] No `forwardRef`; `useContext` (not `use()`) unless conditional/Suspense
- [ ] In `packages/ui`? Zero `core`/`contract` imports
- [ ] Gated control visible + `disabled`+reason, not hidden; money never ad-hoc `Intl`; `<Name>Props` exported for composites
