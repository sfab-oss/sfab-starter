import {
  Banknote,
  FileText,
  Package,
  ShoppingCart,
  User,
  Warehouse,
} from "lucide-react";
import type {
  CommandPaletteAction,
  CommandPaletteSearchGroup,
} from "./command-palette";

/** Gallery mock — labeled sample results across resource types (not wired to a backend). */
export const COMMAND_PALETTE_MOCK_ACTIONS: CommandPaletteAction[] = [
  {
    id: "new-sale",
    label: "New sale",
    icon: <ShoppingCart className="size-4" />,
  },
  {
    id: "collect-payment",
    label: "Collect payment",
    icon: <Banknote className="size-4" />,
  },
];

export const COMMAND_PALETTE_MOCK_SEARCH_GROUPS: CommandPaletteSearchGroup[] = [
  {
    heading: "People",
    items: [
      {
        id: "person-northside",
        title: "Northside Distributors",
        subtitle: "Customer · open AR $75,000",
        path: "/people/northside-distributors",
        type: "Customer",
        icon: User,
        keywords: ["client", "distributor", "northside"],
      },
      {
        id: "person-central-grocery",
        title: "Central Grocery",
        subtitle: "Customer · 1 open invoice",
        path: "/people/central-grocery",
        type: "Customer",
        icon: User,
        keywords: ["grocery", "retail"],
      },
      {
        id: "person-valley",
        title: "Valley Beverages",
        subtitle: "Customer · paid in full",
        path: "/people/valley-beverages",
        type: "Customer",
        icon: User,
        keywords: ["beverages", "valley"],
      },
      {
        id: "person-carlos",
        title: "Carlos Mendez",
        subtitle: "Operator · Northside Distributors",
        path: "/people/carlos-mendez",
        type: "Contact",
        icon: User,
        keywords: ["team", "member"],
      },
    ],
  },
  {
    heading: "Products",
    items: [
      {
        id: "product-arabica",
        title: "Arabica Green 1kg",
        subtitle: "SKU ARB-1KG · below reorder (42 units)",
        path: "/inventory/arabica-green-1kg",
        type: "Product",
        icon: Package,
        keywords: ["coffee", "green", "low stock"],
      },
      {
        id: "product-robusta",
        title: "Robusta Blend 500g",
        subtitle: "SKU ROB-500 · 128 units on hand",
        path: "/inventory/robusta-blend-500g",
        type: "Product",
        icon: Package,
        keywords: ["coffee", "robusta"],
      },
      {
        id: "product-espresso",
        title: "Espresso Roast 250g",
        subtitle: "SKU ESP-250 · below reorder (18 units)",
        path: "/inventory/espresso-roast-250g",
        type: "Product",
        icon: Package,
        keywords: ["espresso", "roast", "low stock"],
      },
      {
        id: "product-filter",
        title: "Paper Filter #4 (box)",
        subtitle: "SKU FLT-4 · non-stock consumable",
        path: "/inventory/paper-filter-4",
        type: "Product",
        icon: Package,
        keywords: ["filter", "supplies"],
      },
    ],
  },
  {
    heading: "Invoices",
    items: [
      {
        id: "inv-1042",
        title: "INV-1042",
        subtitle: "Northside Distributors · $75,000 balance · due Tue",
        path: "/documents/inv-1042",
        type: "Invoice",
        icon: FileText,
        keywords: ["partial", "open", "collect"],
      },
      {
        id: "inv-1043",
        title: "INV-1043",
        subtitle: "Central Grocery · $42,500 balance · unpaid",
        path: "/documents/inv-1043",
        type: "Invoice",
        icon: FileText,
        keywords: ["unpaid", "open"],
      },
      {
        id: "inv-1035",
        title: "INV-1035",
        subtitle: "Hernandez Trading · $18,750 balance",
        path: "/documents/inv-1035",
        type: "Invoice",
        icon: FileText,
        keywords: ["hernandez", "trading"],
      },
      {
        id: "inv-1038",
        title: "INV-1038",
        subtitle: "Valley Beverages · paid in full",
        path: "/documents/inv-1038",
        type: "Invoice",
        icon: FileText,
        keywords: ["paid", "closed"],
      },
    ],
  },
  {
    heading: "Warehouses",
    items: [
      {
        id: "wh-main",
        title: "Main DC",
        subtitle: "Primary fulfillment · 214 SKUs",
        path: "/inventory/warehouses/main-dc",
        type: "Warehouse",
        icon: Warehouse,
        keywords: ["distribution", "main"],
      },
      {
        id: "wh-cold",
        title: "Cold storage annex",
        subtitle: "Temperature-controlled · 38 SKUs",
        path: "/inventory/warehouses/cold-storage",
        type: "Warehouse",
        icon: Warehouse,
        keywords: ["cold", "refrigerated"],
      },
    ],
  },
];
