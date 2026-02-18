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

/**
 * A standard breadcrumb component for the application.
 * Automatically handles separators and distinguishes between links and current page.
 *
 * @param items - Array of breadcrumb items. Each item has a title and optional href.
 * @param showHome - Whether to show the "Home" root item. Defaults to true.
 * @param linkComponent - Custom link component to use for navigation (e.g., Next.js Link)
 */
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
            <Fragment key={`${item.title}-${index}`}>
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
