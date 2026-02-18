# Getting Started

This guide will help you set up your development environment and start working with the codebase.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20+ | `node --version` |
| pnpm | 10+ | `pnpm --version` |
| Git | Latest | `git --version` |

### Installing pnpm

If you don't have pnpm installed:

```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using Corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd project-folder
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo.

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```bash
# Database
POSTGRES_URL=postgresql://devuser:devpassword@127.0.0.1:5439/postgres

# Authentication
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long

# App Features
NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED=true
```

**Required environment variables:**
- `POSTGRES_URL` - PostgreSQL database connection string
- `BETTER_AUTH_SECRET` - Secret key for authentication (min 32 chars)

See `.env.example` for detailed documentation of all variables.

### 4. Start Development Server

```bash
pnpm dev
```

This starts the Next.js development server with Turbopack at `http://localhost:3000`.

## Project Structure Quick Reference

```
├── apps/web/          # Main Next.js application
├── packages/ui/       # Shared component library
└── packages/typescript-config/  # Shared TS configs
```

See [Folder Structure](../architecture/folder-structure.md) for details.

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm lint:check` | Check code quality |
| `pnpm lint:fix` | Auto-fix code issues |

## IDE Setup

### VS Code (Recommended)

The project includes VS Code settings in `.vscode/settings.json` that:

- Set Biome as the default formatter
- Enable format on save
- Configure Tailwind CSS IntelliSense

**Recommended Extensions:**

1. **Biome** - Formatting and linting
2. **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
3. **ES7+ React/Redux/React-Native snippets** - React snippets

### Other Editors

Ensure your editor:

- Uses Biome for formatting (or run `pnpm lint:fix` before committing)
- Supports TypeScript for type checking
- Has Tailwind CSS support for class autocomplete

## Verifying Your Setup

After setup, verify everything works:

1. **Dev server runs:** `pnpm dev` starts without errors
2. **Build succeeds:** `pnpm build` completes successfully
3. **Linting passes:** `pnpm lint:check` shows no errors
4. **Types check:** Run TypeScript check in your editor

## Next Steps

- [Development Workflow](./development-workflow.md) - Day-to-day development practices
- [Adding Components](./adding-components.md) - How to add shadcn/ui components
- [Architecture Overview](../architecture/overview.md) - Understand the system design

## Troubleshooting

### pnpm install fails

```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### Port 3000 already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
pnpm dev -- --port 3001
```

### TypeScript errors in editor

1. Restart TypeScript server (VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server")
2. Ensure `pnpm install` completed successfully
3. Check that your editor is using the workspace TypeScript version

### Turbo cache issues

```bash
# Clear Turbo cache
rm -rf .turbo
pnpm build
```
