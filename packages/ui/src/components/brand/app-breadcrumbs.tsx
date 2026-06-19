"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/shadcn/breadcrumb";
import { Fragment } from "react";

export interface AppBreadcrumbItem {
  title: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items?: AppBreadcrumbItem[];
  showHome?: boolean;
  linkComponent?: React.ComponentType<{
    href: string;
    children: React.ReactNode;
  }>;
}

export function AppBreadcrumbs({
  items = [],
  showHome = true,
  linkComponent: LinkComponent,
}: AppBreadcrumbsProps) {
  const Link = LinkComponent || "a";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {showHome && (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={item.href || item.title}>
              {(showHome || index > 0) && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.title}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.title}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
