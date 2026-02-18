# ADR-002: Type-Safe Environment Variables with @t3-oss/env

**Status:** Accepted
**Date:** 2026-01-17
**Authors:** AI Assistant

## Context

The project was using manual environment variable validation with runtime throws and no type safety. This approach had several issues:

- Manual validation with `if (!process.env.VAR) throw new Error()`
- No TypeScript type safety for environment variables
- Inconsistent validation patterns across packages
- Runtime errors instead of build-time detection
- No centralized documentation of required variables
- Difficult to maintain as the project grew

The monorepo structure with multiple packages (db, auth, web) required a solution that could:
- Validate environment variables at package boundaries
- Provide type safety across the entire codebase
- Support both server and client-side variables
- Work with Next.js App Router and Turborepo
- Be monorepo-friendly with package-level isolation

## Decision

We will implement type-safe environment variable validation using `@t3-oss/env` with a hybrid package-level approach:

> We will use `@t3-oss/env` with each package defining its own env schema, and the web app extending package schemas for centralized validation.

## Options Considered

### Option 1: Manual Validation (Current Approach)

**Description:** Continue using `process.env` with manual validation and runtime throws.

**Pros:**
- Simple implementation
- No additional dependencies
- Full control over validation logic

**Cons:**
- No type safety
- Runtime errors instead of build-time detection
- Manual validation in every file
- Hard to maintain as project grows
- No centralized documentation

### Option 2: Single Centralized Env Package

**Description:** Create a dedicated `packages/env` package that exports all environment variables.

**Pros:**
- Single source of truth for all env vars
- Centralized validation
- Easy to maintain

**Cons:**
- Tight coupling between packages
- All packages depend on env package
- Harder to test packages in isolation
- Doesn't align with existing package boundaries

### Option 3: @t3-oss/env with Package-level Schemas (Chosen)

**Description:** Each package defines its own env schema, web app composes them together.

**Pros:**
- Type-safe access to environment variables
- Build-time validation
- Package-level isolation maintained
- Works with monorepo structure
- Centralized documentation via composition
- Zod integration for powerful validation

**Cons:**
- Additional dependency
- Learning curve for @t3-oss/env patterns
- More complex setup than manual validation

## Consequences

### Positive

- **Type Safety:** Environment variables are now fully typed, preventing typos and invalid access
- **Build-time Validation:** Invalid env vars caught during build/startup, not runtime
- **Better DX:** IDE autocomplete and type checking for env vars
- **Documentation:** `.env.example` provides clear setup instructions
- **Consistency:** Standardized validation patterns across all packages
- **Maintainability:** Centralized env configuration with clear boundaries

### Negative

- **Dependency:** Added `@t3-oss/env` packages to the project
- **Complexity:** More complex setup than simple `process.env` access
- **Migration:** Required updating all existing env var usage

### Neutral

- **Single .env file:** All env vars now configured in one place at monorepo root
- **Package boundaries:** Each package still defines what it needs

## Implementation Notes

### File Structure
```
packages/
├── db/src/env.ts      # POSTGRES_URL validation
├── auth/src/env.ts    # BETTER_AUTH_SECRET, Vercel vars
└── web/lib/env.ts     # Composes dbEnv + authEnv + app vars
.env                   # Monorepo root (gitignored)
.env.example          # Template (committed)
```

### Key Patterns
- Packages use `@t3-oss/env-core` (framework-agnostic)
- Web app uses `@t3-oss/env-nextjs` with `extends`
- Single `.env` file loaded via `dotenv` in `next.config.mjs`
- Validation happens at import time

### Migration Steps
1. Install @t3-oss/env packages
2. Create package-level env schemas
3. Update existing env var usage to use typed schemas
4. Configure Next.js to load .env from monorepo root
5. Update documentation

### Testing
- TypeScript compilation validates env var access
- Runtime validation catches missing/invalid vars at startup
- Build process includes env validation

## Related Decisions

- [ADR-001: Monorepo Structure](./001-monorepo-structure.md) - Establishes the package boundaries this decision builds upon

## References

- [@t3-oss/env Documentation](https://env.t3.gg/)
- [Zod Schema Validation](https://zod.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)