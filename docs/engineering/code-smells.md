# Code Smells

A living catalog of recurring code smells in this repo and the preferred
alternative. Each entry should be grounded in a **real example from this
codebase** — not a generic style lecture — so the fix is copy-pasteable.

## How to use this

- Reviewers: link to an entry instead of re-explaining the same problem.
- Authors: skim before opening a PR that touches one of these areas.
- Adding an entry: only add a smell you've actually hit here. Include the
  bad pattern, the preferred one, and a `path:line` reference to where it was
  fixed so the entry stays honest and verifiable.

---

## 1. `useEffect` to sync external state into local state

**Smell.** Mirroring server/query/prop data into `useState`, then keeping the
two in sync with an effect:

```tsx
const { data: settings } = useAiSettings();
const [selected, setSelected] = useState(FALLBACK);

useEffect(() => {
  if (settings) {
    setSelected(settings.field ?? FALLBACK);
  }
}, [settings]);
```

**Why it's a smell.**

- It's a redundant render: the effect runs *after* paint, so the UI flashes
  the initial value, then re-renders with the synced one.
- It's a stale-state trap: the effect re-fires whenever `settings` changes and
  silently clobbers whatever the user had selected mid-edit.
- It hides the real relationship — the local state *is* the server state, just
  copied. React's own guidance is explicit here: ["You Might Not Need an
  Effect"](https://react.dev/learn/you-might-not-need-an-effect).

**Preferred.** Don't copy — bind reactively.

- For forms, this repo standardizes on **react-hook-form**. Its `values` prop
  sources the field reactively from the query data and is the documented
  replacement for "effect + reset".
- For non-form display state, **derive during render** instead of storing:
  `const selected = settings?.field ?? FALLBACK;`

**When an effect IS right.** Effects are for synchronizing with systems
*outside* React — subscriptions, timers, imperative DOM/3rd-party widgets,
logging. The smell is specifically using one to keep two pieces of React state
in lockstep.

**Lint gate (ALW-672).** Biome GritQL plugins
`packages/biome-config/plugins/no-use-effect.grit` and
`no-use-layout-effect.grit` ban direct `useEffect` / `useLayoutEffect` at
**error** outside vendored shadcn. Legitimate external sync must use
`// biome-ignore lint/plugin/no-use-effect: <reason>` (or
`no-use-layout-effect`) on the call site.
