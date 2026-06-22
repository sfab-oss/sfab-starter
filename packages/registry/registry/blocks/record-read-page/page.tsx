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
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import { DEFAULT_GALLERY_INVOICE } from "../../_shared/collect/invoice-table";
import { PaymentStatusBadge } from "../../_shared/collect/payment-status-badge";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { InvoiceRecordView } from "./components/invoice-record-view";

export default function RecordReadPage() {
  const invoice = DEFAULT_GALLERY_INVOICE;

  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="collect" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs
                items={[{ title: "Collect" }, { title: invoice.folio }]}
                showHome={false}
              />
              <PaymentStatusBadge status={invoice.paymentStatus} />
              <span className="truncate text-muted-foreground text-sm">
                · {invoice.client}
              </span>
              <ShellHeaderActions>
                <Button size="sm" type="button" variant="outline">
                  Edit
                </Button>
                {invoice.balanceMinor > 0 ? (
                  <Button size="sm" type="button">
                    Record payment
                  </Button>
                ) : null}
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent>
              <InvoiceRecordView invoice={invoice} />
            </ShellContent>
          </ShellPage>
        </ShellInset>
      </Shell>
    </RegistryQueryProvider>
  );
}
