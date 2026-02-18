# @workspace/ui

The shared UI component library for the monorepo.

## Overview

| Property | Value |
|----------|-------|
| Package name | `@workspace/ui` |
| Location | `packages/ui/` |
| Purpose | Reusable React components |
| Built with | shadcn/ui, Radix UI, Tailwind CSS |

## Package Structure

```
packages/ui/
├── src/
│   ├── components/       # React components
│   │   └── button.tsx
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   │   └── utils.ts
│   └── styles/           # Global styles
│       └── globals.css
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Exports

The package exports are defined in `package.json`:

```json
{
  "exports": {
    "./components/*": "./src/components/*",
    "./hooks/*": "./src/hooks/*",
    "./lib/*": "./src/lib/*",
    "./globals.css": "./src/styles/globals.css",
    "./postcss.config": "./src/postcss.config.mjs"
  }
}
```

### Import Examples

```typescript
// Components
import { Button } from "@workspace/ui/components/button"

// Utilities
import { cn } from "@workspace/ui/lib/utils"

// Hooks (when added)
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
```

## Components

### Button

A versatile button component with multiple variants and sizes.

**Location:** `src/components/button.tsx`

**Usage:**

```tsx
import { Button } from "@workspace/ui/components/button"

// Basic
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// As child (polymorphic)
<Button asChild>
  <a href="/somewhere">Link styled as button</a>
</Button>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Size variant |
| `asChild` | `boolean` | `false` | Render as child element |

## Utilities

### cn()

Merges class names with Tailwind conflict resolution.

**Location:** `src/lib/utils.ts`

**Usage:**

```typescript
import { cn } from "@workspace/ui/lib/utils"

// Merge classes
cn("px-4 py-2", "px-6")
// Result: "py-2 px-6" (px-6 overrides px-4)

// Conditional classes
cn("base-class", isActive && "active-class")

// With clsx syntax
cn("base", { "conditional": condition }, ["array", "of", "classes"])
```

**Implementation:**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Styles

### globals.css

Global styles and CSS custom properties for theming.

**Location:** `src/styles/globals.css`

**Contents:**

- Tailwind CSS imports
- CSS custom property definitions (color tokens)
- Light mode defaults (`:root`)
- Dark mode overrides (`.dark`)
- Base layer styles

**Usage in consuming apps:**

```typescript
// apps/web/app/layout.tsx
import "@workspace/ui/globals.css"
```

## Adding New Components

1. Create component file in `src/components/`
2. Follow the shadcn/ui pattern (CVA for variants)
3. Export types and component
4. No need to update `package.json` (wildcard exports)

See [Adding Components Guide](../guides/adding-components.md) for details.

## Adding New Hooks

1. Create hook file in `src/hooks/`
2. Export the hook function
3. Import using `@workspace/ui/hooks/<name>`

**Example hook:**

```typescript
// src/hooks/use-media-query.ts
import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}
```

## Dependencies

### Production

| Package | Purpose |
|---------|---------|
| `@radix-ui/react-slot` | Polymorphic component support |
| `class-variance-authority` | Type-safe variants |
| `clsx` | Conditional class names |
| `tailwind-merge` | Tailwind class merging |

### Peer Dependencies

| Package | Purpose |
|---------|---------|
| `react` | React runtime |
| `react-dom` | React DOM |

## Development

### Type Checking

```bash
pnpm --filter @workspace/ui typecheck
```

### Adding Components via CLI

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name>
```

## Design Principles

1. **Generic** - Components should work for any use case
2. **Accessible** - Use Radix primitives, proper ARIA
3. **Customizable** - Use CSS variables, expose variants
4. **Type-safe** - Full TypeScript support with prop types
