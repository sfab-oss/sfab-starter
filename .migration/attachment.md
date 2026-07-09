# attachment

2026-07-09, golden pair via CLI after rebase onto ALW-459. Migrated.

## Changed

- `packages/ui/src/components/shadcn/attachment.tsx` — Slot/asChild → useRender + mergeProps (base-vega).
- Leftover scan clean of radix-ui / @radix-ui.

## Left alone

- Consumers already used composition without asChild on these wrappers.

## Behavior changes

- Polymorphic parts now take `render` instead of `asChild`.

## Verify by hand

- Chat attachment chips, bubble content, and markers in chat UI.
