# Coding Standards

This document covers coding standards beyond what Biome enforces automatically.

## General Principles

### Code Should Be Self-Documenting

Prefer clear, descriptive code over comments:

```typescript
// Avoid
const d = 86400 // seconds in a day

// Prefer
const SECONDS_PER_DAY = 86400
```

### Comments for "Why", Not "What"

```typescript
// Avoid - describes what the code does
// Loop through users and filter active ones
const activeUsers = users.filter(u => u.isActive)

// Prefer - explains why
// Only active users should receive notifications per compliance requirements
const notifiableUsers = users.filter(u => u.isActive)
```

### Single Responsibility

Each function should do one thing well:

```typescript
// Avoid
function processUser(user: User) {
  validateUser(user)
  saveToDatabase(user)
  sendWelcomeEmail(user)
  updateAnalytics(user)
}

// Prefer
function processUser(user: User) {
  const validatedUser = validateUser(user)
  return saveUser(validatedUser)
}

// Then compose at a higher level
async function onboardUser(user: User) {
  const savedUser = await processUser(user)
  await sendWelcomeEmail(savedUser)
  trackUserCreation(savedUser)
}
```

## TypeScript Patterns

### Prefer Interfaces Over Types for Objects

```typescript
// Prefer for object types (especially public APIs)
interface User {
  id: string
  name: string
}

// Use type for unions, tuples, and complex types
type Result<T> = { success: true; data: T } | { success: false; error: string }

// Use interface when you need to extend/implement
interface Repository<T> {
  find(id: string): Promise<T>
  save(entity: T): Promise<void>
}
```

### Use Discriminated Unions

```typescript
// For state that has mutually exclusive cases
type Result<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: Error }
  | { status: "loading" }

function handleResult<T>(result: Result<T>) {
  switch (result.status) {
    case "success":
      return result.data // TypeScript knows data exists
    case "error":
      throw result.error
    case "loading":
      return null
  }
}
```

### Explicit Return Types for Public Functions

```typescript
// For exported functions, be explicit
export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// For internal/callback functions, inference is fine
const doubled = numbers.map(n => n * 2)
```

### Avoid Type Assertions

```typescript
// Avoid
const user = data as User

// Prefer type guards
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data
  )
}

if (isUser(data)) {
  // data is now typed as User
}
```

## React Patterns

### Component Organization

```typescript
// Order within a component file
// 1. Imports
import { useState } from "react"

// 2. Types
type ButtonProps = {
  variant: "primary" | "secondary"
  children: React.ReactNode
}

// 3. Component
export function Button({ variant, children }: ButtonProps) {
  // 3a. Hooks
  const [isHovered, setIsHovered] = useState(false)

  // 3b. Derived state
  const className = variant === "primary" ? "bg-blue-500" : "bg-gray-500"

  // 3c. Handlers
  const handleMouseEnter = () => setIsHovered(true)

  // 3d. Render
  return (
    <button className={className} onMouseEnter={handleMouseEnter}>
      {children}
    </button>
  )
}
```

### Props Patterns

```typescript
// Extend HTML attributes for DOM components
type ButtonProps = React.ComponentProps<"button"> & {
  variant: "primary" | "secondary"
}

// Use children for composition
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>
}

// Use render props sparingly, prefer composition
function DataFetcher<T>({
  url,
  children,
}: {
  url: string
  children: (data: T) => React.ReactNode
}) {
  const data = useFetch<T>(url)
  return children(data)
}
```

### Avoid Inline Object/Array Creation in JSX

```typescript
// Avoid - creates new object every render
<Component style={{ color: "red" }} />
<Component items={[1, 2, 3]} />

// Prefer - stable references
const style = { color: "red" }
const items = [1, 2, 3]

<Component style={style} />
<Component items={items} />

// Or use useMemo for computed values
const style = useMemo(() => ({ color: theme.primary }), [theme.primary])
```

## Async Patterns

### Error Handling

```typescript
// Always handle errors explicitly
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      console.error(`Failed to fetch user: ${response.status}`)
      return null
    }
    return response.json()
  } catch (error) {
    console.error("Network error fetching user:", error)
    return null
  }
}
```

### Prefer async/await Over Promise Chains

```typescript
// Avoid
function loadData() {
  return fetch("/api/data")
    .then(res => res.json())
    .then(data => processData(data))
    .catch(err => handleError(err))
}

// Prefer
async function loadData() {
  try {
    const res = await fetch("/api/data")
    const data = await res.json()
    return processData(data)
  } catch (err) {
    handleError(err)
  }
}
```

## File Organization

### Colocation

Keep related files together:

```
components/
├── user-card/
│   ├── user-card.tsx        # Component
│   ├── user-card.test.tsx   # Tests
│   └── use-user-data.ts     # Hook used only here
```

### Barrel Files

Avoid barrel files (index.ts that re-exports everything) as they hurt tree-shaking:

```typescript
// Avoid
// components/index.ts
export * from "./button"
export * from "./card"
export * from "./dialog"

// Prefer direct imports
import { Button } from "./components/button"
import { Card } from "./components/card"
```

## Testing Standards

### Test Behavior, Not Implementation

```typescript
// Avoid - tests implementation details
it("calls setCount when clicked", () => {
  const setCount = vi.fn()
  // ...
  expect(setCount).toHaveBeenCalledWith(1)
})

// Prefer - tests behavior
it("increments the displayed count when clicked", () => {
  render(<Counter />)
  fireEvent.click(screen.getByRole("button"))
  expect(screen.getByText("1")).toBeInTheDocument()
})
```

### Arrange-Act-Assert

```typescript
it("filters users by role", () => {
  // Arrange
  const users = [
    { id: "1", role: "admin" },
    { id: "2", role: "user" },
  ]

  // Act
  const result = filterByRole(users, "admin")

  // Assert
  expect(result).toHaveLength(1)
  expect(result[0].id).toBe("1")
})
```

## What Biome Handles

These are enforced automatically - you don't need to think about them:

- Import ordering
- Semicolons and quotes
- Trailing commas
- Indentation
- Unused variables
- Missing dependencies in hooks
- Accessibility issues
- Most common anti-patterns

Run `pnpm lint:fix` to auto-fix any issues.
