import type { DocumentType } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/shadcn/badge";

const TYPE_LABEL: Record<string, string> = {
  quote: "Quote",
  invoice: "Invoice",
  credit_note: "Credit note",
  bill: "Bill",
  sales_order: "Sales order",
  purchase_order: "Purchase order",
  receipt: "Receipt",
};

const TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  quote: "outline",
  invoice: "default",
  credit_note: "destructive",
  bill: "secondary",
};

export function documentTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type.replaceAll("_", " ");
}

export function DocumentTypeBadge({ type }: { type: DocumentType | string }) {
  return (
    <Badge variant={TYPE_VARIANT[type] ?? "secondary"}>
      {documentTypeLabel(type)}
    </Badge>
  );
}

export function documentFolioLabel(doc: {
  type: string;
  series: string | null;
  folio: number | null;
}): string {
  if (doc.folio == null) {
    return "Draft";
  }
  return `#${doc.series ?? doc.type}-${doc.folio}`;
}

/** UI percent (e.g. 16) ↔ storage basis points. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}
