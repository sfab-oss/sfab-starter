# apps/web

The main Next.js web application.

## Overview

| Property | Value |
|----------|-------|
| Package name | `web` |
| Location | `apps/web/` |
| Framework | Next.js 16 |
| Purpose | Main web application |

## Package Structure

```
apps/web/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── favicon.ico
├── components/           # App-specific components
│   └── providers.tsx     # Context providers
├── hooks/                # App-specific hooks
├── lib/                  # App-specific utilities
├── public/               # Static assets
├── next.config.mjs       # Next.js configuration
├── postcss.config.mjs    # PostCSS configuration
├── tsconfig.json         # TypeScript config
└── package.json          # Package manifest
```

## App Router Structure

### layout.tsx

The root layout wraps all pages with providers and global styles.

```tsx
import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import "@workspace/ui/globals.css"

export const metadata: Metadata = {
  title: "App Title",
  description: "App description",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### page.tsx

Route pages are Server Components by default.

```tsx
import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <main>
      <h1>Hello World</h1>
      <Button>Click me</Button>
    </main>
  )
}
```

## Components

### providers.tsx

Client component that wraps the app with context providers.

```tsx
"use client"

import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

**Current providers:**

- `ThemeProvider` - Dark mode support via next-themes

**Adding new providers:**

```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

## Adding Routes

### Basic Page

```
app/
├── about/
│   └── page.tsx          # /about
├── blog/
│   ├── page.tsx          # /blog
│   └── [slug]/
│       └── page.tsx      # /blog/:slug
```

### With Layout

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

### Loading States

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />
}
```

### Error Handling

```tsx
// app/dashboard/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Server vs Client Components

### Server Components (Default)

- Can be `async` and fetch data directly
- No access to browser APIs
- No hooks or event handlers
- Smaller bundle size

```tsx
// This is a Server Component
async function ServerPage() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Client Components

- Use `"use client"` directive
- Can use hooks, event handlers
- Access browser APIs
- Required for interactivity

```tsx
"use client"

import { useState } from "react"

function ClientComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

## Configuration

### next.config.mjs

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
```

**Key settings:**

- `reactStrictMode` - Enable React strict mode
- `transpilePackages` - Transpile workspace packages

### TypeScript

Extends the shared Next.js config:

```json
{
  "extends": "@workspace/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm typecheck` | Run TypeScript compiler |

## Dependencies

### From Workspace

- `@workspace/ui` - Shared UI components

### External

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react` | UI library |
| `react-dom` | React DOM |
| `next-themes` | Theme switching |

## Environment Variables

### Client-side (Public)

Prefix with `NEXT_PUBLIC_`:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

Access in code:

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

### Server-side

No prefix needed:

```bash
DATABASE_URL=postgres://...
API_SECRET=...
```

Access only in Server Components or API routes:

```typescript
const dbUrl = process.env.DATABASE_URL
```

## Folder Conventions

| Folder | Purpose | Example |
|--------|---------|---------|
| `app/` | Routes and layouts | `app/dashboard/page.tsx` |
| `components/` | App-specific components | `components/header.tsx` |
| `hooks/` | App-specific hooks | `hooks/use-auth.ts` |
| `lib/` | Utilities and helpers | `lib/api.ts` |
| `public/` | Static files | `public/logo.svg` |

## When to Use This App vs Packages

**Put in `apps/web`:**

- App-specific components (Header, Footer)
- Routes and pages
- App-specific hooks and utilities
- Business logic

**Put in `packages/ui`:**

- Reusable UI components
- Generic hooks
- Design system tokens
