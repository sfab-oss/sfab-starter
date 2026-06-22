import type { AIDataPart, AIMetadata } from "@workspace/contract/ai";
import type { DynamicToolUIPart, UIMessage } from "ai";

export type GalleryChatMessage = UIMessage<AIMetadata, AIDataPart>;

function mockTool(
  toolCallId: string,
  toolName: string,
  input: unknown,
  output: unknown
): DynamicToolUIPart {
  return {
    type: "dynamic-tool",
    toolCallId,
    toolName,
    state: "output-available",
    input,
    output,
  };
}

export const MOCK_CHAT_MESSAGES: GalleryChatMessage[] = [
  {
    id: "1",
    role: "user",
    parts: [{ type: "text", text: "Who owes us money this week?" }],
  },
  {
    id: "2",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        text: "The user wants open receivables due this week. I'll query finalized invoices with balance > 0 and due dates in the current week, then summarize by customer.",
      },
      mockTool(
        "tc-1",
        "list_open_invoices",
        {
          dueWithinDays: 7,
          status: "finalized",
        },
        {
          count: 3,
          totalBalanceMinor: 9_140_000,
          invoices: [
            {
              id: "INV-1042",
              customer: "Northside Distributors",
              balanceMinor: 7_500_000,
              dueDate: "2026-06-24",
            },
            {
              id: "INV-1038",
              customer: "Bayview Supply",
              balanceMinor: 1_240_000,
              dueDate: "2026-06-26",
            },
            {
              id: "INV-1035",
              customer: "Lakeside Foods",
              balanceMinor: 420_000,
              dueDate: "2026-06-27",
            },
          ],
        }
      ),
      {
        type: "text",
        text: `Three customers have open balances due this week:

- **Northside Distributors** — $75,000 on INV-1042 (due Tuesday)
- **Bayview Supply** — $12,400 on INV-1038 (due Thursday)
- **Lakeside Foods** — $4,200 on INV-1035 (due Friday)

Want me to draft collection reminders?`,
      },
    ],
  },
  {
    id: "3",
    role: "user",
    parts: [{ type: "text", text: "Show low stock in the main warehouse." }],
  },
  {
    id: "4",
    role: "assistant",
    parts: [
      {
        type: "data-plan",
        data: {
          entries: [
            {
              content: "Load warehouse context for Main DC",
              status: "completed",
            },
            { content: "Query SKUs below reorder point", status: "completed" },
            { content: "Format results as a table", status: "completed" },
          ],
        },
      },
      {
        type: "reasoning",
        text: "Inventory list filtered to Main DC. I'll rank by severity (zero on-hand first) and include reorder quantities.",
      },
      mockTool(
        "tc-2",
        "list_inventory",
        {
          warehouseId: "main-dc",
          belowReorderPoint: true,
        },
        {
          warehouse: "Main DC",
          skuCount: 12,
          sample: [
            { sku: "WD-4420", onHand: 4, reorderPoint: 24 },
            { sku: "CL-1180", onHand: 0, reorderPoint: 12 },
            { sku: "PK-9031", onHand: 8, reorderPoint: 40 },
          ],
        }
      ),
      {
        type: "text",
        text: `12 SKUs are below reorder point at **Main DC**:

| SKU | On hand | Reorder |
| --- | --- | --- |
| WD-4420 | 4 | 24 |
| CL-1180 | 0 | 12 |
| PK-9031 | 8 | 40 |

I can open the inventory list filtered to these items.`,
      },
    ],
  },
];

export function createMockAssistantReply(seed: number): GalleryChatMessage {
  const variants: GalleryChatMessage[] = [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "reasoning",
          text: "Summarizing from open receivables and recent invoice activity.",
        },
        {
          type: "text",
          text: "Bayview Supply's balance is due Thursday — I can draft a reminder or show their payment history.",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        mockTool(
          "tc-reply-1",
          "get_customer",
          {
            customerId: "cust_northside",
          },
          {
            name: "Northside Distributors",
            openBalanceMinor: 7_500_000,
          }
        ),
        {
          type: "text",
          text: "**Northside Distributors** has **$75,000** open across two invoices. Say if you want payment history or a collection draft.",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "reasoning",
          text: "User asked about reorder quantities — I'll highlight zero on-hand SKUs first.",
        },
        {
          type: "text",
          text: "**CL-1180** is at zero on-hand at Main DC (reorder point 12). Want a restock suggestion or a purchase order draft?",
        },
      ],
    },
  ];

  return variants[seed % variants.length] as GalleryChatMessage;
}
