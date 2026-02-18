# System Overview Diagram

This document provides visual representations of the system architecture.

## Monorepo Structure

```mermaid
graph TB
    subgraph "app-root"
        subgraph "Applications"
            WEB["apps/web<br/>━━━━━━━━━━━━<br/>Next.js 16<br/>App Router<br/>Server Components"]
        end

        subgraph "Shared Packages"
            UI["packages/ui<br/>━━━━━━━━━━━━<br/>shadcn/ui Components<br/>Radix Primitives<br/>Tailwind Styles"]

            TSCONFIG["packages/typescript-config<br/>━━━━━━━━━━━━<br/>Shared TS Configs<br/>base.json<br/>nextjs.json"]
        end

        subgraph "Tooling"
            TURBO["Turbo<br/>Build Orchestration"]
            BIOME["Biome<br/>Lint + Format"]
            PNPM["pnpm<br/>Package Manager"]
        end
    end

    WEB -->|imports| UI
    WEB -->|extends| TSCONFIG
    UI -->|extends| TSCONFIG

    TURBO -->|orchestrates| WEB
    TURBO -->|orchestrates| UI
    BIOME -->|checks| WEB
    BIOME -->|checks| UI
    PNPM -->|manages| WEB
    PNPM -->|manages| UI
```

## Package Dependencies

```mermaid
graph LR
    subgraph "apps/web"
        LAYOUT[layout.tsx]
        PAGE[page.tsx]
        PROVIDERS[providers.tsx]
    end

    subgraph "packages/ui"
        BUTTON[button.tsx]
        UTILS[utils.ts]
        GLOBALS[globals.css]
    end

    subgraph "External Dependencies"
        RADIX[Radix UI]
        TAILWIND[Tailwind CSS]
        NEXTTHEMES[next-themes]
        CVA[class-variance-authority]
    end

    PAGE -->|uses| BUTTON
    LAYOUT -->|imports| GLOBALS
    LAYOUT -->|wraps with| PROVIDERS
    PROVIDERS -->|uses| NEXTTHEMES

    BUTTON -->|built on| RADIX
    BUTTON -->|styled with| TAILWIND
    BUTTON -->|variants via| CVA
    BUTTON -->|uses| UTILS
```

## Component Architecture

```mermaid
graph TB
    subgraph "Component Layers"
        subgraph "Presentation"
            SHADCN["shadcn/ui Components<br/>Button, Card, Dialog, etc."]
        end

        subgraph "Primitives"
            RADIX["Radix UI Primitives<br/>Accessible, Unstyled"]
        end

        subgraph "Styling"
            CVA["CVA Variants<br/>Type-safe props"]
            TW["Tailwind Classes<br/>Utility styles"]
            THEME["CSS Variables<br/>Theme tokens"]
        end
    end

    SHADCN --> RADIX
    SHADCN --> CVA
    CVA --> TW
    TW --> THEME
```

## Build Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[pnpm dev]
    end

    subgraph "Turbo Pipeline"
        BUILD[turbo build]
        LINT[turbo lint]
        TYPECHECK[turbo check-types]
    end

    subgraph "Outputs"
        NEXT[.next/]
        CACHE[.turbo/]
    end

    DEV -->|hot reload| NEXT
    BUILD -->|cached| NEXT
    BUILD -->|stores| CACHE
    LINT -->|validates| BUILD
    TYPECHECK -->|validates| BUILD
```

## Future Growth

As the project grows, additional apps and packages can be added:

```mermaid
graph TB
    subgraph "Potential Future State"
        subgraph "Apps"
            WEB[apps/web]
            ADMIN[apps/admin]
            MOBILE[apps/mobile]
            STORYBOOK[apps/storybook]
        end

        subgraph "Packages"
            UI[packages/ui]
            API[packages/api-client]
            UTILS[packages/utils]
            TSCONFIG[packages/typescript-config]
        end
    end

    WEB --> UI
    WEB --> API
    ADMIN --> UI
    ADMIN --> API
    MOBILE --> UI
    STORYBOOK --> UI

    UI --> UTILS
    API --> UTILS
```
