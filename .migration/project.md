# project

2026-07-09, whole-project radix-vega → base-vega migration via shadcn CLI golden pairs + consumer codemod.

## Style / deps

- Flipped `packages/ui/components.json` and `apps/web/components.json` `style`: `radix-vega` → `base-vega`.
- Installed/kept `@base-ui/react`; removed `radix-ui` from `packages/ui` after wrappers were clean.
- Skills added project-locally: `.agents/skills/{migrate-radix-to-base,shadcn}` + `skills-lock.json`.

## Wrappers

- 33 radix-backed wrappers overwritten with `pnpm dlx shadcn@latest add <c> --overwrite -c packages/ui`.
- Customizations replayed: `button` (secondary hover, lg icon padding), `dialog` (DialogBody + scrollable layout), `sidebar` (`useOptionalSidebar`), `form` (engine: Label native + useRender FormControl; registry form item has no files).
- Intentionally untouched: command, drawer, sonner, input-otp, calendar, chart.

## Consumer sweep

- `asChild` → `render` across apps/web, apps/docs, brand, ai-elements, registry (Drawer/vaul left on asChild).
- `delayDuration` → `delay` on TooltipProvider.
- `onOpenAutoFocus` preventDefault → `initialFocus={false}` on SheetContent (chat-dock).
- Select `onValueChange` nullability wrappers; ToggleGroup single → array value; HoverCard open/closeDelay moved to Trigger.

## Behavior deltas (flagged, not patched)

- DropdownMenu CheckboxItem/RadioItem `closeOnClick` defaults false in Base UI.
- NavigationMenu hover delay feel may differ (200→50 upstream).
- Tabs activation is manual by default in Base UI.
- Menu items: Radix `onSelect` is gone at the primitive; existing `onSelect` props on DropdownMenuItem may be ignored unless mapped to `onClick` (prompt-input attachment item remapped; other call sites still use `onSelect` and need follow-up if menus stop firing).

## Verify

- `pnpm --filter @workspace/ui typecheck` ✅
- `pnpm --filter web typecheck` ✅
- `pnpm --filter @workspace/registry typecheck` ✅
- `pnpm --filter docs typecheck` ✅
- Remaining radix imports in packages/ui + apps: none.
