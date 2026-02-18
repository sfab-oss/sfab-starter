# Data Flow Diagram

This document illustrates how data flows through the application.

## Request/Response Flow

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js Server
    participant RSC as React Server Components
    participant RCC as React Client Components
    participant API as External APIs

    Browser->>NextJS: HTTP Request
    NextJS->>RSC: Route to Server Component

    alt Server-side data fetching
        RSC->>API: Fetch data
        API-->>RSC: Return data
    end

    RSC-->>NextJS: Rendered HTML + RSC Payload
    NextJS-->>Browser: Initial HTML

    Note over Browser: Hydration begins

    Browser->>RCC: Interactive events
    RCC->>RCC: Local state updates

    alt Client-side data fetching
        RCC->>API: Fetch/mutate data
        API-->>RCC: Return response
        RCC->>RCC: Update state
    end
```

## Component Rendering Flow

```mermaid
flowchart TB
    subgraph "Server"
        LAYOUT["layout.tsx<br/>(Server Component)"]
        PAGE["page.tsx<br/>(Server Component)"]
    end

    subgraph "Client"
        PROVIDERS["Providers<br/>(Client Component)"]
        THEME["ThemeProvider<br/>(next-themes)"]
        INTERACTIVE["Interactive Components<br/>(Client Components)"]
    end

    LAYOUT --> PROVIDERS
    PROVIDERS --> THEME
    THEME --> PAGE
    PAGE --> INTERACTIVE

    style LAYOUT fill:#e1f5fe
    style PAGE fill:#e1f5fe
    style PROVIDERS fill:#fff3e0
    style THEME fill:#fff3e0
    style INTERACTIVE fill:#fff3e0
```

## Theme Data Flow

```mermaid
flowchart LR
    subgraph "Theme System"
        PROVIDER["ThemeProvider<br/>(next-themes)"]
        STORAGE["localStorage<br/>theme preference"]
        SYSTEM["System Preference<br/>prefers-color-scheme"]
    end

    subgraph "CSS Layer"
        ROOT[":root CSS Variables<br/>(light theme)"]
        DARK[".dark CSS Variables<br/>(dark theme)"]
    end

    subgraph "Components"
        COMP["UI Components<br/>use CSS variables"]
    end

    SYSTEM -->|default| PROVIDER
    STORAGE -->|override| PROVIDER
    PROVIDER -->|sets class| ROOT
    PROVIDER -->|sets class| DARK
    ROOT --> COMP
    DARK --> COMP

    COMP -->|toggle| PROVIDER
    PROVIDER -->|persist| STORAGE
```

## State Management Patterns

```mermaid
flowchart TB
    subgraph "Server State"
        DB[(Database)]
        CACHE[Server Cache]
        RSC[Server Components]
    end

    subgraph "Client State"
        CONTEXT[React Context]
        HOOKS[Custom Hooks]
        LOCAL[Local State]
    end

    subgraph "Persistent State"
        LS[localStorage]
        COOKIES[Cookies]
    end

    DB --> CACHE
    CACHE --> RSC
    RSC -->|props| CONTEXT
    CONTEXT --> HOOKS
    HOOKS --> LOCAL

    LOCAL <-->|persist| LS
    LOCAL <-->|persist| COOKIES
```

## Form Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Form as Form Component
    participant Zod as Zod Validation
    participant Action as Server Action
    participant DB as Database

    User->>Form: Enter data
    Form->>Form: Local state update

    User->>Form: Submit
    Form->>Zod: Validate input

    alt Validation fails
        Zod-->>Form: Validation errors
        Form-->>User: Show errors
    end

    alt Validation passes
        Zod-->>Form: Valid data
        Form->>Action: Call server action
        Action->>DB: Persist data
        DB-->>Action: Confirm
        Action-->>Form: Success response
        Form-->>User: Show success
    end
```

## Import Resolution Flow

```mermaid
flowchart LR
    subgraph "apps/web"
        IMPORT["import { Button } from '@workspace/ui/components/button'"]
    end

    subgraph "Resolution"
        PNPM["pnpm workspace protocol"]
        PKG["packages/ui/package.json exports"]
    end

    subgraph "packages/ui"
        COMP["src/components/button.tsx"]
    end

    IMPORT --> PNPM
    PNPM --> PKG
    PKG --> COMP
```

## CSS Cascade

```mermaid
flowchart TB
    subgraph "Tailwind CSS v4"
        BASE["@layer base<br/>CSS reset, defaults"]
        THEME["@theme<br/>Design tokens"]
        COMPONENTS["@layer components<br/>Component styles"]
        UTILITIES["@layer utilities<br/>Utility classes"]
    end

    subgraph "Application"
        GLOBALS["globals.css<br/>Theme variables"]
        COMPONENT["Component classes<br/>Tailwind utilities"]
    end

    BASE --> THEME
    THEME --> COMPONENTS
    COMPONENTS --> UTILITIES

    GLOBALS --> BASE
    COMPONENT --> UTILITIES
```
