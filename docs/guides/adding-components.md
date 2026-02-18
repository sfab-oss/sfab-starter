# Adding Components

This guide explains how to add, customize, and build composable UI components following shadcn/ui patterns.

## Understanding shadcn/ui

shadcn/ui is not a traditional component library. Instead of installing components as npm packages, you copy the source code into your project. This gives you:

- Full control over component code
- No version lock-in
- Easy customization
- Understanding of implementation

## Adding a New Component

### Method 1: Using the CLI (Recommended)

The shadcn CLI can add components directly:

```bash
# Navigate to the UI package
cd packages/ui

# Add a component
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
```

The CLI will:

1. Download the component source
2. Place it in `src/components/`
3. Add any required dependencies

### Method 2: Manual Copy

1. Visit [ui.shadcn.com](https://ui.shadcn.com)
2. Find the component you need
3. Copy the source code
4. Create file in `packages/ui/src/components/`
5. Install any peer dependencies

## Composable Component Architecture

Modern components should be **composable** - broken into smaller, focused sub-components that can be combined flexibly. This is the shadcn/ui way.

### The Problem with Monolithic Components

Avoid cramming all functionality into a single component:

```typescript
// Bad: Monolithic component with too many responsibilities
const Card = ({ title, description, footer, image, actions }) => (
  <div className="card">
    {image && <img src={image} />}
    <div className="card-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="card-footer">{footer}</div>
    <div className="card-actions">{actions}</div>
  </div>
)
```

Problems with this approach:

- Can't customize individual parts without adding more props
- Can't control the HTML elements used
- Forced into a specific DOM structure
- Prop drilling becomes unwieldy

### The Composable Pattern

Break components into focused sub-components:

```typescript
// Good: Composable component structure
import * as Card from "@workspace/ui/components/card"

<Card.Root>
  <Card.Header>
    <Card.Title>Project Statistics</Card.Title>
    <Card.Description>View performance over time</Card.Description>
  </Card.Header>
  <Card.Content>
    {/* Your content here */}
  </Card.Content>
  <Card.Footer>
    <Button>View Details</Button>
  </Card.Footer>
</Card.Root>
```

Benefits:

- **Maximum customization** - Style and modify each layer independently
- **No prop drilling** - Props go directly to the element that needs them
- **Semantic HTML** - Control the exact DOM structure
- **Better accessibility** - Direct control over ARIA attributes

### Building a Composable Component

Here's how to build a composable Accordion from scratch:

#### 1. Root Component (Context Provider)

```typescript
// packages/ui/src/components/accordion.tsx
import { createContext, useContext, useState } from "react"
import { cn } from "../lib/utils"

type AccordionContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordion() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within Accordion.Root")
  }
  return context
}

export type AccordionRootProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean
}

export function Root({ defaultOpen = false, className, ...props }: AccordionRootProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <AccordionContext.Provider value={{ open, setOpen }}>
      <div
        data-slot="accordion"
        data-state={open ? "open" : "closed"}
        className={cn("border rounded-lg", className)}
        {...props}
      />
    </AccordionContext.Provider>
  )
}
```

#### 2. Trigger Component

```typescript
export type AccordionTriggerProps = React.ComponentProps<"button">

export function Trigger({ className, children, ...props }: AccordionTriggerProps) {
  const { open, setOpen } = useAccordion()

  return (
    <button
      data-slot="accordion-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex w-full items-center justify-between p-4 font-medium",
        "hover:bg-muted/50 transition-colors",
        className
      )}
      {...props}
    >
      {children}
      <ChevronIcon className={cn(
        "h-4 w-4 transition-transform",
        open && "rotate-180"
      )} />
    </button>
  )
}
```

#### 3. Content Component

```typescript
export type AccordionContentProps = React.ComponentProps<"div">

export function Content({ className, ...props }: AccordionContentProps) {
  const { open } = useAccordion()

  if (!open) return null

  return (
    <div
      data-slot="accordion-content"
      data-state={open ? "open" : "closed"}
      className={cn("p-4 pt-0", className)}
      {...props}
    />
  )
}
```

#### 4. Export Everything

```typescript
// End of accordion.tsx
export { Root, Trigger, Content }
```

### Naming Conventions for Sub-components

| Name | Purpose | Example |
|------|---------|---------|
| `Root` | Main container, manages state/context | `<Accordion.Root>` |
| `Trigger` | Element that initiates an action | `<Accordion.Trigger>` |
| `Content` | Main content area | `<Accordion.Content>` |
| `Header` | Top section with titles/controls | `<Card.Header>` |
| `Footer` | Bottom section for actions | `<Card.Footer>` |
| `Title` | Primary heading | `<Dialog.Title>` |
| `Description` | Supporting text | `<Dialog.Description>` |
| `Item` | Individual item in a list | `<Accordion.Item>` |

## The asChild Pattern

The `asChild` prop allows you to replace the default element with a custom one while preserving all functionality.

### How It Works

```typescript
import { Slot } from "@radix-ui/react-slot"

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean
}

function Button({ asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return <Comp {...props} />
}
```

### Usage Examples

```typescript
// Default: renders as a button
<Button>Click me</Button>

// With asChild: renders as an anchor with button behavior
<Button asChild>
  <a href="/home">Go Home</a>
</Button>

// Compose with other components
<Dialog.Trigger asChild>
  <Button variant="outline">Open Dialog</Button>
</Dialog.Trigger>
```

### Benefits of asChild

1. **Semantic HTML** - Use the appropriate element for context
2. **Clean DOM** - No unnecessary wrapper elements
3. **Design system integration** - Works with your existing components
4. **Composition** - Layer multiple behaviors onto one element

## Data Attributes for Styling

Use data attributes to expose component state for CSS styling.

### data-state for Visual States

Instead of multiple className props, use `data-state`:

```typescript
// Component exposes state via data attribute
<div
  data-state={isOpen ? "open" : "closed"}
  className="transition-all"
/>
```

```typescript
// Style based on state using Tailwind
<Dialog
  className={cn(
    "data-[state=open]:animate-in data-[state=open]:fade-in",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out"
  )}
/>
```

### data-slot for Component Targeting

Use `data-slot` to identify component types for parent-aware styling:

```typescript
function Card({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg border p-4",
        // Target child slots
        "[&_[data-slot=card-header]]:mb-4",
        "[&_[data-slot=card-title]]:text-lg",
        className
      )}
      {...props}
    />
  )
}
```

### Common Data Attributes

| Attribute | Values | Use Case |
|-----------|--------|----------|
| `data-state` | `open`, `closed`, `active`, `inactive` | Toggle states |
| `data-disabled` | `true`, `false` | Disabled styling |
| `data-loading` | `true`, `false` | Loading states |
| `data-orientation` | `horizontal`, `vertical` | Layout direction |
| `data-side` | `top`, `right`, `bottom`, `left` | Positioned elements |
| `data-slot` | component name | Component identification |

## TypeScript Best Practices

### Extend HTML Attributes

Every component should extend native HTML attributes:

```typescript
export type CardProps = React.ComponentProps<"div"> & {
  variant?: "default" | "outlined"
}

export function Card({ variant = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        variant === "outlined" && "border-2",
        className
      )}
      {...props}
    />
  )
}
```

### Export Your Types

Always export prop types for consumer use:

```typescript
// Consumers can extend or reference your types
import type { CardProps } from "@workspace/ui/components/card"

type MyCardProps = CardProps & { isLoading?: boolean }
```

### Spread Props Last

Ensure user props can override defaults:

```typescript
// Good: user className is merged, other props override
<div className={cn("default-class", className)} {...props} />

// Bad: defaults override user props
<div {...props} className="default-class" />
```

## Component Structure with CVA

Use Class Variance Authority (CVA) for variant management:

```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base classes (always applied)
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

## Controlled vs Uncontrolled State

Support both patterns for maximum flexibility:

```typescript
import { useControllableState } from "@radix-ui/react-use-controllable-state"

type AccordionProps = {
  open?: boolean           // Controlled
  defaultOpen?: boolean    // Uncontrolled
  onOpenChange?: (open: boolean) => void
}

function Accordion({ open: controlledOpen, defaultOpen, onOpenChange }: AccordionProps) {
  const [open, setOpen] = useControllableState({
    prop: controlledOpen,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // Component uses `open` and `setOpen` internally
}
```

Usage:

```typescript
// Uncontrolled: manages its own state
<Accordion defaultOpen={true} />

// Controlled: parent manages state
const [isOpen, setIsOpen] = useState(false)
<Accordion open={isOpen} onOpenChange={setIsOpen} />
```

## Accessibility Essentials

### Semantic HTML First

Always start with the appropriate HTML element:

```typescript
// Bad: div pretending to be a button
<div onClick={handleClick} className="button">Click me</div>

// Good: actual button element
<button onClick={handleClick}>Click me</button>
```

### Keyboard Navigation

Interactive elements must be keyboard accessible:

```typescript
function Menu({ items }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        focusNextItem()
        break
      case "ArrowUp":
        focusPreviousItem()
        break
      case "Home":
        focusFirstItem()
        break
      case "End":
        focusLastItem()
        break
      case "Escape":
        closeMenu()
        break
    }
  }

  return (
    <div role="menu" onKeyDown={handleKeyDown}>
      {items.map(item => (
        <div key={item.id} role="menuitem" tabIndex={-1}>
          {item.label}
        </div>
      ))}
    </div>
  )
}
```

### ARIA Attributes

Use ARIA to communicate state to assistive technologies:

```typescript
<button
  aria-expanded={isOpen}
  aria-controls="panel-1"
  aria-haspopup="true"
>
  Toggle Panel
</button>

<div
  id="panel-1"
  role="region"
  aria-labelledby="panel-heading"
  hidden={!isOpen}
>
  Panel content
</div>
```

### Focus Management

Manage focus appropriately for modals and dynamic content:

```typescript
function Dialog({ isOpen, onClose }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement
      dialogRef.current?.focus()
    } else {
      previousFocus.current?.focus()
    }
  }, [isOpen])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* Dialog content */}
    </div>
  )
}
```

## Using Components in Apps

Import from the UI package:

```typescript
// apps/web/app/page.tsx
import { Button } from "@workspace/ui/components/button"
import * as Card from "@workspace/ui/components/card"

export default function Page() {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Welcome</Card.Title>
      </Card.Header>
      <Card.Content>
        <p>Content here</p>
      </Card.Content>
      <Card.Footer>
        <Button variant="default" size="lg">
          Get Started
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}
```

## Common Components to Add

| Component | Use Case |
|-----------|----------|
| `button` | Actions and form submissions |
| `card` | Content containers |
| `dialog` | Modal windows |
| `dropdown-menu` | Action menus |
| `form` | Form handling with validation |
| `input` | Text inputs |
| `select` | Dropdown selections |
| `tabs` | Tabbed content |
| `toast` | Notifications |
| `accordion` | Collapsible content sections |
| `popover` | Floating content panels |
| `tooltip` | Contextual information |

## Best Practices Summary

1. **Compose, don't configure** - Break into sub-components instead of adding props
2. **Single element per export** - Each component wraps one HTML element
3. **Extend HTML attributes** - Always spread props to the underlying element
4. **Export types** - Let consumers reference and extend your types
5. **Use data attributes** - Expose state via `data-state` for styling
6. **Support both modes** - Allow controlled and uncontrolled usage
7. **Accessibility first** - Use semantic HTML and proper ARIA
8. **Document variants** - Use CVA with clear variant names

## Troubleshooting

### Component Not Found

1. Check the file exists in `packages/ui/src/components/`
2. Verify the export path in `package.json`
3. Run `pnpm install` to refresh links

### Styles Not Applied

1. Ensure `globals.css` is imported in the app
2. Check CSS variable definitions in `:root`
3. Verify Tailwind is processing the component file

### TypeScript Errors

1. Check for missing peer dependencies
2. Ensure `@types/*` packages are installed
3. Restart TypeScript server
