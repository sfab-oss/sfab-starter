# ADR-001: Monorepo Structure with Turbo and pnpm

**Status:** Accepted
**Date:** 2024-01-01
**Authors:** Team

## Context

We needed to establish a project structure for building web applications that:

- Supports code sharing between multiple applications
- Enables efficient builds and development workflows
- Maintains clear boundaries between packages
- Scales as the project grows
- Works well with modern React and Next.js

The project will start with a single web application but may grow to include:
- Additional web applications (admin panel, marketing site)
- Mobile applications
- Shared component libraries
- Utility packages

## Decision

> We will use a monorepo structure managed by Turbo and pnpm workspaces.

The structure separates code into:
- `apps/` - Deployable applications
- `packages/` - Shared libraries

## Options Considered

### Option 1: Monorepo with Turbo + pnpm

**Description:** Single repository with multiple packages, orchestrated by Turbo

**Pros:**
- Single source of truth for all code
- Efficient caching and parallel builds
- Easy to share code between apps
- Atomic changes across packages
- pnpm is fast and disk-efficient

**Cons:**
- Initial setup complexity
- All teams work in same repo
- Large repository over time

### Option 2: Polyrepo (Separate Repositories)

**Description:** Each package in its own repository, published to npm

**Pros:**
- Clear ownership boundaries
- Independent versioning
- Smaller repositories

**Cons:**
- Coordination overhead for cross-repo changes
- Version management complexity
- Harder to share unpublished code
- More CI/CD configuration

### Option 3: Monorepo with Nx

**Description:** Similar to Turbo but using Nx as the build orchestrator

**Pros:**
- More features out of the box
- Strong dependency graph analysis
- Good VS Code extension

**Cons:**
- Heavier framework with more opinions
- Steeper learning curve
- More configuration required

### Option 4: Monorepo with npm/yarn workspaces only

**Description:** Workspaces without a dedicated build orchestrator

**Pros:**
- No additional tooling
- Simple setup

**Cons:**
- No build caching
- No parallel task execution
- Manual dependency management

## Consequences

### Positive

- **Fast builds:** Turbo caches build outputs, only rebuilding what changed
- **Parallel execution:** Independent tasks run simultaneously
- **Code sharing:** `packages/ui` is immediately available to all apps
- **Consistent tooling:** Same TypeScript, linting, and formatting everywhere
- **Atomic commits:** Changes to shared code and consumers in one commit

### Negative

- **Learning curve:** Team needs to understand Turbo and workspace concepts
- **Single point of failure:** Issues in shared packages affect all apps
- **Repository size:** Will grow larger over time (mitigated by shallow clones)

### Neutral

- Requires pnpm (not npm or yarn) - this is a tooling preference
- All developers see all code - transparency by default

## Implementation Notes

### Package Naming Convention

All packages use the `@workspace/` scope:
- `@workspace/ui` - UI component library
- `@workspace/typescript-config` - Shared TypeScript configs

### Turbo Configuration

Key settings in `turbo.json`:
- `build` depends on `^build` (dependencies first)
- Output caching enabled for `.next/` directories
- `dev` task is persistent (doesn't exit)

### Adding New Packages

1. Create directory in `apps/` or `packages/`
2. Add `package.json` with `@workspace/` scoped name
3. Run `pnpm install` to link
4. Add to consuming packages' dependencies

## Related Decisions

- ADR-002 (future): Component library architecture
- ADR-003 (future): Shared TypeScript configuration

## References

- [Turbo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Explained](https://monorepo.tools/)
