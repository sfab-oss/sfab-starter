import type { DocumentType } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { m } from "@/paraglide/messages.js";

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
  switch (type) {
    case "quote":
      return m.documents_type_quote();
    case "invoice":
      return m.documents_type_invoice();
    case "credit_note":
      return m.documents_type_credit_note();
    case "bill":
      return m.documents_type_bill();
    case "sales_order":
      return m.documents_type_sales_order();
    case "purchase_order":
      return m.documents_type_purchase_order();
    case "receipt":
      return m.documents_type_receipt();
    default:
      return type.replaceAll("_", " ");
  }
}

export function documentStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return m.documents_status_draft();
    case "finalized":
      return m.documents_status_finalized();
    case "accepted":
      return m.documents_status_accepted();
    case "converted":
      return m.documents_status_converted();
    default:
      return status;
  }
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
    return m.documents_status_draft();
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
