# popover

2026-07-09, golden pair via CLI (shadcn add --overwrite after style flip to base-vega). Migrated.

## Changed

- `packages/ui/src/components/shadcn/popover.tsx` — Radix primitives replaced with `@base-ui/react` base-vega registry variant.
- Leftover scan: `grep -n "radix-ui|@radix-ui" packages/ui/src/components/shadcn/popover.tsx` → clean.

## Left alone

- Non-radix wrappers (command/cmdk, drawer/vaul, sonner, input-otp, calendar, chart) intentionally untouched.

## Behavior changes

- See `.migration/project.md` for shared deltas (asChild→render, Select nullability, ToggleGroup array values, HoverCard delays on Trigger, menu closeOnClick defaults).

## Verify by hand

- Smoke the surfaces that import this wrapper; keyboard + focus return for overlays/menus.
