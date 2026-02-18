# Deployment

This guide covers building and deploying the application.

## Build Process

### Local Build

```bash
# Build all packages
pnpm build
```

This runs Turbo, which:

1. Builds dependencies first (`packages/ui`)
2. Then builds apps (`apps/web`)
3. Caches outputs for faster subsequent builds

### Build Output

After building, the Next.js output is in:

```
apps/web/.next/
├── cache/           # Build cache (not deployed)
├── server/          # Server-side code
├── static/          # Static assets
└── standalone/      # Standalone server (if configured)
```

## Deployment Options

### Vercel (Recommended)

Vercel has first-class Next.js support:

1. Connect your repository to Vercel
2. Configure build settings:
   - Build Command: `pnpm build`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install`
3. Set the root directory to `apps/web` or configure monorepo settings

**Vercel-specific configuration:**

```json
// vercel.json (in apps/web)
{
  "buildCommand": "cd ../.. && pnpm build --filter=web",
  "outputDirectory": ".next"
}
```

### Docker

For containerized deployments:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .
RUN pnpm build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

**Enable standalone output in Next.js:**

```javascript
// apps/web/next.config.mjs
export default {
  output: 'standalone',
}
```

### Static Export

For static hosting (no server required):

```javascript
// apps/web/next.config.mjs
export default {
  output: 'export',
}
```

Then deploy the `apps/web/out/` directory to any static host.

**Limitations of static export:**

- No Server Components
- No API routes
- No dynamic routes without `generateStaticParams`

### Node.js Server

For traditional Node.js hosting:

```bash
# Build
pnpm build

# Start
pnpm --filter web start
```

Configure your process manager (PM2, systemd) to run the start command.

## Environment Variables

This project uses `@t3-oss/env` for type-safe environment variable validation. All environment variables are validated at application startup.

### Environment File Structure

```
/
├── .env                  # Local development (gitignored)
├── .env.example          # Template with documentation (committed)
```

**Single .env file at monorepo root:**
- Contains all environment variables for the entire project
- Loaded by all packages that need env vars
- Type-safe validation ensures required vars are present

### Required Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `POSTGRES_URL` | Server | PostgreSQL database connection string |
| `BETTER_AUTH_SECRET` | Server | Authentication secret (min 32 chars) |
| `NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED` | Client | Enable design system routes |

### Build-time vs Runtime Variables

- **Server variables**: Validated at startup, available in Server Components
- **Client variables**: Embedded during build, prefixed with `NEXT_PUBLIC_`

### Setting Variables in Production

```bash
# For Vercel
vercel env add POSTGRES_URL

# For Docker
docker run -e POSTGRES_URL=... -e BETTER_AUTH_SECRET=... myapp

# For traditional hosting
POSTGRES_URL=... BETTER_AUTH_SECRET=... pnpm start
```

All variables must be set - the app will fail to start with validation errors if any required variables are missing.

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Deploy
        run: # Your deployment command
```

### Turbo Remote Caching

Speed up CI builds with Turbo remote caching:

```bash
# Set in CI environment
TURBO_TOKEN=your_token
TURBO_TEAM=your_team
```

## Pre-deployment Checklist

- [ ] All tests passing
- [ ] TypeScript compilation succeeds (`pnpm build`)
- [ ] Linting passes (`pnpm lint:check`)
- [ ] Environment variables configured
- [ ] Database migrations applied (if applicable)
- [ ] Monitoring/logging configured
- [ ] Error tracking set up (Sentry, etc.)

## Monitoring

### Recommended Tools

- **Vercel Analytics** - Performance monitoring (if on Vercel)
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Datadog/New Relic** - APM

### Health Check Endpoint

Add a health check route:

```typescript
// apps/web/app/api/health/route.ts
export function GET() {
  return Response.json({ status: 'ok', timestamp: Date.now() })
}
```

## Rollback Strategy

1. **Vercel** - Use deployment history to instantly rollback
2. **Docker** - Tag images and redeploy previous tag
3. **Node.js** - Keep previous build artifacts, swap symlinks

## Troubleshooting

### Build Fails in CI

1. Ensure `pnpm-lock.yaml` is committed
2. Check Node.js version matches local
3. Verify all environment variables are set

### Slow Builds

1. Enable Turbo remote caching
2. Check for large dependencies
3. Review build logs for slow steps

### Runtime Errors After Deploy

1. Check environment variables are set
2. Verify database connectivity
3. Review application logs
