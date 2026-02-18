# Naming Conventions

Consistent naming improves code readability and helps both humans and AI understand the codebase.

## Files and Directories

### General Rules

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `user-card.tsx` |
| Hooks | kebab-case with `use-` prefix | `use-media-query.ts` |
| Utilities | kebab-case | `format-date.ts` |
| Types | kebab-case | `user-types.ts` |
| Constants | kebab-case | `api-endpoints.ts` |
| Test files | Same name + `.test` | `user-card.test.tsx` |

### Directory Names

Use kebab-case for directories:

```
src/
├── components/
│   ├── user-card/
│   └── data-table/
├── hooks/
├── lib/
└── types/
```

### Route Segments (Next.js)

Use kebab-case for URL-friendly routes:

```
app/
├── user-profile/
│   └── page.tsx      # /user-profile
├── blog-posts/
│   └── [slug]/
│       └── page.tsx  # /blog-posts/:slug
```

## TypeScript

### Types and Interfaces

Use PascalCase:

```typescript
type User = {
  id: string
  name: string
}

type UserRole = "admin" | "user" | "guest"

interface Repository<T> {
  find(id: string): Promise<T>
}
```

### Type Suffixes

Use descriptive suffixes when helpful:

```typescript
type UserProps = { ... }        // Component props
type UserState = { ... }        // State shape
type CreateUserInput = { ... }  // Function input
type UserResponse = { ... }     // API response
```

### Generics

Use descriptive names for complex generics:

```typescript
// Simple - single letter is fine
function identity<T>(value: T): T

// Complex - use descriptive names
function merge<TSource, TTarget>(
  source: TSource,
  target: TTarget
): TSource & TTarget
```

## React Components

### Component Names

Use PascalCase matching the filename:

```typescript
// user-card.tsx
export function UserCard() { ... }

// data-table.tsx
export function DataTable() { ... }
```

### Props Types

Name props types after the component:

```typescript
type UserCardProps = {
  user: User
  onSelect?: (user: User) => void
}

export function UserCard({ user, onSelect }: UserCardProps) { ... }
```

### Event Handlers

Prefix with `on` for props, `handle` for implementations:

```typescript
type ButtonProps = {
  onClick?: () => void        // Prop name
  onHover?: () => void
}

function Button({ onClick }: ButtonProps) {
  const handleClick = () => {  // Implementation
    // Do something
    onClick?.()
  }

  return <button onClick={handleClick} />
}
```

## Hooks

### Custom Hooks

Always prefix with `use`:

```typescript
// use-media-query.ts
export function useMediaQuery(query: string): boolean { ... }

// use-local-storage.ts
export function useLocalStorage<T>(key: string): [T, (value: T) => void] { ... }
```

### Return Values

For single values, return directly. For multiple, return object or tuple:

```typescript
// Single value
function useIsOnline(): boolean

// Multiple values - object (named access)
function useForm<T>(): {
  values: T
  errors: Record<string, string>
  handleChange: (field: keyof T, value: unknown) => void
}

// Multiple values - tuple (positional, like useState)
function useToggle(): [boolean, () => void]
```

## Variables and Functions

### Variables

Use camelCase:

```typescript
const userName = "John"
const isLoading = true
const userList = []
```

### Constants

Use SCREAMING_SNAKE_CASE for true constants:

```typescript
const MAX_RETRY_COUNT = 3
const API_BASE_URL = "https://api.example.com"
const DEFAULT_PAGE_SIZE = 20
```

### Functions

Use camelCase with verb prefixes:

```typescript
// Actions
function createUser() { ... }
function updateUser() { ... }
function deleteUser() { ... }

// Getters
function getUserById() { ... }
function fetchUsers() { ... }

// Booleans
function isValidEmail() { ... }
function hasPermission() { ... }
function canAccessResource() { ... }

// Transformers
function formatDate() { ... }
function parseResponse() { ... }
function toDisplayName() { ... }
```

## CSS and Tailwind

### CSS Variables

Use kebab-case with semantic names:

```css
:root {
  --color-primary: ...;
  --color-primary-foreground: ...;
  --spacing-page: ...;
  --radius-default: ...;
}
```

### Tailwind Custom Classes

If extending Tailwind, use kebab-case:

```css
@layer components {
  .btn-primary { ... }
  .card-elevated { ... }
}
```

## API and Data

### API Endpoints

Use kebab-case for URL paths:

```
/api/users
/api/user-profiles
/api/blog-posts/:slug
```

### JSON Keys

Use camelCase for JSON (matches JavaScript):

```json
{
  "userId": "123",
  "firstName": "John",
  "createdAt": "2024-01-01"
}
```

### Database Fields

If using a database, follow its conventions (often snake_case):

```sql
user_id, first_name, created_at
```

Transform at the API boundary:

```typescript
function toUser(row: DbRow): User {
  return {
    userId: row.user_id,
    firstName: row.first_name,
  }
}
```

## Package Names

### Workspace Packages

Use `@workspace/` prefix with kebab-case:

```
@workspace/ui
@workspace/api-client
@workspace/typescript-config
```

## Summary Table

| Category | Convention | Example |
|----------|------------|---------|
| Files | kebab-case | `user-card.tsx` |
| Directories | kebab-case | `components/` |
| Components | PascalCase | `UserCard` |
| Types | PascalCase | `UserProps` |
| Functions | camelCase | `getUserById` |
| Variables | camelCase | `userName` |
| Constants | SCREAMING_SNAKE | `MAX_COUNT` |
| Hooks | camelCase with `use` | `useMediaQuery` |
| CSS variables | kebab-case | `--color-primary` |
| URLs | kebab-case | `/user-profile` |
