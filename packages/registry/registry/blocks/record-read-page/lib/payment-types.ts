/** Gallery default — org currency; amounts are always integer minor units. */
export const GALLERY_CURRENCY_CODE = "MXN";

export interface OpenInvoiceRow {
  id: string;
  folio: string;
  client: string;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  dueDate: string;
  notes?: string;
}

export function toPaymentInvoiceContext(
  row: OpenInvoiceRow
): PaymentInvoiceContext {
  return {
    folio: row.folio,
    client: row.client,
    totalMinor: row.totalMinor,
    paidMinor: row.paidMinor,
    balanceMinor: row.balanceMinor,
    currencyCode: GALLERY_CURRENCY_CODE,
  };
}

export interface PaymentInvoiceContext {
  folio: string;
  client: string;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  currencyCode: string;
}
