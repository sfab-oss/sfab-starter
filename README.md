# Full-Stack Monorepo Starter

A modern, full-stack TypeScript monorepo template with end-to-end type safety, client-side data fetching, and AI capabilities.

## Features

### 🎯 Core Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with Server Components
- **TypeScript 5.9** - Strict type checking throughout
- **Tailwind CSS v4** - Modern utility-first styling with OKLch colors
- **Turbo** - High-performance monorepo build system
- **pnpm** - Fast, efficient package management

### 🔐 Backend & Data

- **Hono RPC** - Type-safe API routes with zero code generation
- **React Query** - Powerful client-side data fetching and caching
- **Drizzle ORM** - TypeScript-first database toolkit
- **PostgreSQL** - Robust relational database
- **Better Auth** - Modern, type-safe authentication
- **Zod** - Runtime type validation

### 🎨 UI & Design

- **shadcn/ui** - Beautiful, accessible components built on Radix UI
- **Design System Registry** - Browse and document components
- **Dark Mode** - Built-in theme switching
- **Responsive** - Mobile-first design approach

### 🤖 AI Integration

- **Vercel AI SDK** - Streaming AI responses
- **Chat Interface** - Built-in AI chat with message persistence
- **Tool Calling** - Dynamic AI function execution

## Architecture Highlights

### End-to-End Type Safety

Complete type safety from database to UI without code generation:

```
PostgreSQL → Drizzle Schema → Service Layer → Hono Route → RPC Client → React Query → UI
```

All types are inferred automatically using TypeScript's type system.

### Client-Side Data Fetching

Unlike traditional Next.js patterns, this starter uses **React Query for all data fetching**:

- ✅ Optimistic updates for instant feedback
- ✅ Background refetching for fresh data
- ✅ Granular loading and error states
- ✅ Perfect for interactive UIs
- ✅ Works seamlessly with streaming AI

### Service Layer Pattern

All business logic is centralized in reusable service functions:

```
packages/db/src/services/
├── chat.ts          # Chat operations
├── products.ts      # Product management
├── warehouses.ts    # Warehouse operations
└── search.ts        # Global search
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for PostgreSQL)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd simple-monorepo-starter

# Install dependencies
pnpm install

# Start PostgreSQL
pnpm db:up

# Run database migrations
cd packages/db
pnpm db:migrate
pnpm db:seed

# Start development server
cd ../..
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Project Structure

```
.
├── apps/
│   └── web/              # Next.js application
│       ├── app/          # App Router pages
│       ├── server/       # Hono API routes
│       ├── components/   # React components
│       └── hooks/        # React Query hooks
├── packages/
│   ├── db/              # Database schema & services
│   ├── types/           # Shared TypeScript types
│   ├── auth/            # Authentication config
│   ├── ui/              # UI component library
│   ├── ui-ds/           # Design system registry
│   └── config/          # Shared configuration
└── docs/                # Documentation
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture Overview](docs/architecture/overview.md)** - System design and principles
- **[Tech Stack](docs/architecture/tech-stack.md)** - Technologies and rationale
- **[Folder Structure](docs/architecture/folder-structure.md)** - Code organization
- **[Data Fetching Guide](docs/guides/data-fetching.md)** - How to fetch and mutate data
- **[Getting Started](docs/guides/getting-started.md)** - Setup and development workflow

## Available Scripts

```bash
# Development
pnpm dev                 # Start all apps
pnpm build              # Build all apps
pnpm lint               # Lint all code
pnpm typecheck          # Check types

# Database
pnpm db:up              # Start PostgreSQL
pnpm db:down            # Stop PostgreSQL
pnpm db:studio          # Open Drizzle Studio
pnpm db:generate        # Generate migrations
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed database

# Formatting
pnpm lint:fix   # Format and fix all issues
pnpm lint:check # Check for issues
```

## Code Quality

This project uses **Biome** for code quality:

- **Biome** - Fast formatting and linting
- **Strict TypeScript** - Full type safety
- **Git hooks** - Pre-commit checks

Run `pnpm lint:fix` before committing.

## License

MIT

