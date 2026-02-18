# Documentation

Welcome to the documentation. This documentation is designed to serve both human developers and AI assistants, providing comprehensive guidance for building with this full-stack monorepo.

## 📚 Quick Navigation

### Architecture

- [Overview](./architecture/overview.md) - System architecture, design principles, and data flow
- [Folder Structure](./architecture/folder-structure.md) - Detailed codebase organization
- [Tech Stack](./architecture/tech-stack.md) - Technologies used and rationale

### Architecture Diagrams

- [System Overview](./architecture/diagrams/system-overview.md) - Visual representation of system components
- [Data Flow](./architecture/diagrams/data-flow.md) - How data moves through the application

### Decision Records

- [ADR Template](./decisions/template.md) - Template for creating new decision records
- [001 - Monorepo Structure](./decisions/001-monorepo-structure.md) - Why we chose this monorepo approach

### Developer Guides

- [Getting Started](./guides/getting-started.md) - Quick setup for new developers
- [Development Workflow](./guides/development-workflow.md) - Day-to-day development practices
- **[Data Fetching](./guides/data-fetching.md)** - How to fetch and mutate data with React Query and Hono RPC ⭐
- [Adding Components](./guides/adding-components.md) - How to add and customize shadcn/ui components
- [Theming](./guides/theming.md) - Theme system and customization
- [Deployment](./guides/deployment.md) - Build and deployment instructions

### Package Documentation

- [@workspace/db](./packages/db.md) - Database schema, services, and Drizzle ORM
- [@workspace/types](./packages/types.md) - Shared TypeScript types and Zod schemas
- [@workspace/ui](./packages/ui.md) - Shared UI component library
- [apps/web](./packages/web.md) - Main Next.js application

### Conventions

- [Coding Standards](./conventions/coding-standards.md) - Project-specific coding patterns
- [Naming Conventions](./conventions/naming-conventions.md) - Naming patterns for files, components, and variables
- [Git Workflow](./conventions/git-workflow.md) - Branch naming, commits, and PR practices

## 🎯 Documentation Philosophy

This documentation follows these principles:

1. **AI-Friendly** - Structured for easy parsing by AI assistants with clear hierarchies and explicit relationships
2. **Evergreen** - Focus on "why" over "what" to stay relevant as code evolves
3. **Actionable** - Every guide should help someone accomplish a specific task
4. **Visual** - Use Mermaid diagrams to illustrate complex relationships
5. **Comprehensive** - Cover the full stack from database to UI

## 🚀 Essential Reading

### For New Developers

Start here to understand the system:

1. **[Architecture Overview](./architecture/overview.md)** - Understand the big picture
2. **[Data Fetching Guide](./guides/data-fetching.md)** - Learn the core pattern for working with data
3. **[Folder Structure](./architecture/folder-structure.md)** - Know where things go
4. **[Getting Started](./guides/getting-started.md)** - Set up your dev environment

### For Specific Tasks

| Task | Read First |
|------|------------|
| Understanding the overall system | [Architecture Overview](./architecture/overview.md) |
| Fetching or mutating data | **[Data Fetching Guide](./guides/data-fetching.md)** |
| Adding database tables | [Architecture Overview](./architecture/overview.md) + [Data Fetching Guide](./guides/data-fetching.md) |
| Adding/modifying components | [Adding Components](./guides/adding-components.md), [@workspace/ui](./packages/ui.md) |
| Working on apps/web | [@workspace/web](./packages/web.md) |
| Theming or styling | [Theming](./guides/theming.md) |
| Understanding a past decision | [ADRs](./decisions/) |
| Naming something | [Naming Conventions](./conventions/naming-conventions.md) |
| Git operations | [Git Workflow](./conventions/git-workflow.md) |

## 🏗️ Architecture at a Glance

This is a **full-stack TypeScript monorepo** with:

- **End-to-end type safety** - Database to UI with zero code generation
- **Client-side data fetching** - React Query for all data operations
- **Service layer pattern** - Centralized business logic
- **Hono RPC** - Type-safe API routes
- **Drizzle ORM** - Type-safe database operations
- **shadcn/ui** - Beautiful, accessible components

### Data Flow

```
PostgreSQL → Drizzle Schema → Service Layer → Hono Route → RPC Client → React Query → UI
```

All types inferred automatically!

## 📦 Package Overview

- **`apps/web`** - Next.js application with Hono API server
- **`packages/db`** - Database schema, migrations, and service layer
- **`packages/types`** - Shared TypeScript types and Zod schemas
- **`packages/auth`** - Authentication configuration
- **`packages/ui`** - UI component library (shadcn/ui)
- **`packages/ui-ds`** - Design system registry
- **`packages/config`** - Shared configuration

## 📝 Contributing to Docs

When adding new documentation:

1. Use the appropriate directory based on content type
2. Update this README with a link to the new document
3. Include Mermaid diagrams for architectural concepts
4. For significant decisions, create an ADR in `decisions/`
5. Keep the focus on "why" to make docs evergreen

## 🆕 Recent Updates

See [UPDATES.md](./UPDATES.md) for a summary of recent documentation changes.

## 💡 Tips for AI Agents

When working on this codebase:

1. **Read architecture docs first** to understand the overall system
2. **Follow the data fetching pattern** documented in the guide
3. **Use the service layer** for all database operations
4. **Maintain type safety** at all boundaries
5. **Update docs** when making architectural changes

