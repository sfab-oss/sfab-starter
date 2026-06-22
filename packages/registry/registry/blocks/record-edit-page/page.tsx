"use client";

import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useCallback, useState } from "react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { ActivityTimeline } from "../../_shared/collect/activity-timeline";
import { DEFAULT_GALLERY_INVOICE } from "../../_shared/collect/invoice-table";
import { PaymentStatusBadge } from "../../_shared/collect/payment-status-badge";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { InvoiceEditForm } from "./components/invoice-edit-form";
import type { InvoiceEditValues } from "./lib/invoice-edit-schema";
import { getInvoiceActivity } from "./lib/mock-invoice-activity";

export default function RecordEditPage() {
  const invoice = DEFAULT_GALLERY_INVOICE;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditSubmit = useCallback(async (_data: InvoiceEditValues) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="collect" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[
                  { title: "Collect" },
                  { title: invoice.folio },
                  { title: "Edit" },
                ]}
                showHome={false}
              />
              <PaymentStatusBadge status={invoice.paymentStatus} />
              <span className="truncate text-muted-foreground text-sm">
                · {invoice.client}
              </span>
              <ShellHeaderActions>
                <Button size="sm" type="button" variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={isSubmitting}
                  form="invoice-edit-form"
                  size="sm"
                  type="submit"
                >
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent className="flex flex-col">
              <div className="mx-auto w-full max-w-3xl px-6 py-6">
                <InvoiceEditForm
                  formId="invoice-edit-form"
                  invoice={invoice}
                  onSubmit={handleEditSubmit}
                />
              </div>
              <div className="border-t" data-slot="invoice-edit-activity">
                <div className="mx-auto w-full max-w-3xl px-6 pt-4">
                  <ActivityTimeline entries={getInvoiceActivity(invoice)} />
                </div>
              </div>
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
