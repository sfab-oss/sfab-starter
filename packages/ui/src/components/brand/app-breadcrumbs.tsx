"use client";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/shadcn/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { Fragment, useSyncExternalStore } from "react";
export interface AppBreadcrumbItem {
  title: string;
  href?: string;
}
export interface AppBreadcrumbsProps {
  items?: AppBreadcrumbItem[];
  showHome?: boolean;
  /**
   * Max visible crumb slots before collapsing the middle into a "…" dropdown.
   * The ellipsis counts as a slot; the first item and the last item(s) stay
   * visible. Set to 0 to disable collapsing. Omit to use 2 below `sm`
   * (Home › … › current) and 4 on `sm+` (first + last 2).
   */
  maxItems?: number;
  linkComponent?: React.ComponentType<{
    href: string;
    children?: React.ReactNode;
  }>;
  className?: string;
}
const MOBILE_MAX_ITEMS = 2;
const DESKTOP_MAX_ITEMS = 4;
function subscribeSmUp(onStoreChange: () => void) {
  const media = window.matchMedia("(min-width: 640px)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}
function getSmUpSnapshot() {
  return window.matchMedia("(min-width: 640px)").matches;
}
function getSmUpServerSnapshot() {
  return true;
}
function useResponsiveMaxItems(explicit?: number) {
  const smUp = useSyncExternalStore(
    subscribeSmUp,
    getSmUpSnapshot,
    getSmUpServerSnapshot
  );
  if (explicit !== undefined) {
    return explicit;
  }
  return smUp ? DESKTOP_MAX_ITEMS : MOBILE_MAX_ITEMS;
}
export function AppBreadcrumbs({
  items = [],
  showHome = true,
  maxItems: maxItemsProp,
  linkComponent: LinkComponent,
  className,
}: AppBreadcrumbsProps) {
  const Link = LinkComponent || "a";
  const maxItems = useResponsiveMaxItems(maxItemsProp);
  const all: AppBreadcrumbItem[] = showHome
    ? [
        {
          title: "Home",
          href: "/",
        },
        ...items,
      ]
    : items;
  const renderCrumb = (item: AppBreadcrumbItem, isLast: boolean) => {
    if (item.href && !isLast) {
      return (
        <BreadcrumbLink render={<Link href={item.href} />}>
          {item.title}
        </BreadcrumbLink>
      );
    }
    return (
      <BreadcrumbPage className={isLast ? "block min-w-0 truncate" : undefined}>
        {item.title}
      </BreadcrumbPage>
    );
  };
  const renderFirstCrumb = (item: AppBreadcrumbItem) => {
    if (item.href) {
      return (
        <BreadcrumbLink render={<Link href={item.href} />}>
          {item.title}
        </BreadcrumbLink>
      );
    }
    return <BreadcrumbPage>{item.title}</BreadcrumbPage>;
  };
  const renderMiddleMenuItem = (item: AppBreadcrumbItem, index: number) => {
    const key = `${index}-${item.href ?? item.title}`;
    if (item.href) {
      return (
        <DropdownMenuItem key={key} render={<Link href={item.href} />}>
          {item.title}
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuItem disabled key={key}>
        {item.title}
      </DropdownMenuItem>
    );
  };
  const shouldCollapse = maxItems > 0 && all.length > maxItems;
  // Mobile (2): first + … + last. Desktop (4): first + … + last 2.
  const tailCount = shouldCollapse ? Math.max(1, maxItems - 1) : all.length;
  const first = shouldCollapse ? all[0] : null;
  const middle = shouldCollapse
    ? all.slice(1, Math.max(1, all.length - tailCount))
    : [];
  const tail = shouldCollapse ? all.slice(all.length - tailCount) : all;
  return (
    <Breadcrumb className={cn("min-w-0 flex-1 overflow-hidden", className)}>
      <BreadcrumbList className="min-w-0 flex-nowrap">
        {shouldCollapse && first ? (
          <>
            <BreadcrumbItem className="shrink-0">
              {renderFirstCrumb(first)}
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Show hidden breadcrumb segments"
                  className="flex items-center rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <BreadcrumbEllipsis className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middle.map((item, index) =>
                    renderMiddleMenuItem(item, index)
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        ) : null}
        {tail.map((item, index) => {
          const isLast = index === tail.length - 1;
          const isFirstOfRow = index === 0 && !shouldCollapse;
          const key = `${shouldCollapse ? "tail" : "all"}-${index}-${item.href ?? item.title}`;
          return (
            <Fragment key={key}>
              {isFirstOfRow ? null : (
                <BreadcrumbSeparator className="shrink-0" />
              )}
              <BreadcrumbItem
                className={
                  isLast ? "min-w-0 flex-1 overflow-hidden" : "shrink-0"
                }
              >
                {renderCrumb(item, isLast)}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
