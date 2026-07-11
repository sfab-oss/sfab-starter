import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { Suspense } from "react";
import { getMDXComponents } from "@/components/mdx";
import { DocsNotFound } from "@/components/not-found";
import docsCss from "@/docs.css?url";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

const LEGACY_BLOCK_REDIRECTS: Record<string, string> = {
  "blocks/app-shell": "blocks/resource-list-page",
  "blocks/dashboard": "blocks/resource-list-page",
  "blocks/hoy-overview": "blocks/today-overview",
  "blocks/master-data-list-page": "blocks/resource-list-page",
  "blocks/operator-home": "blocks/today-overview",
};

const LEGACY_COMPONENT_REDIRECTS: Record<string, string> = {
  "components/badge": "components/resource-table",
  "components/button": "components/shell",
  "components/command-palette": "blocks/command-palette",
  "components/confirm-ladder": "components/shell",
  "components/contract-form": "components/shell",
  "components/filter-preset-bar": "components/resource-table",
  "components/list-page-shell": "components/shell",
  "components/money-display": "components/resource-table",
  "components/money-fields": "components/resource-table",
  "components/primary-action-bar": "components/shell",
  "components/record-page-shell": "components/shell",
  "components/side-sheet-host": "components/shell",
  "components/status-badges": "components/resource-table",
};

export const Route = createFileRoute("/docs/$")({
  component: Page,
  head: () => ({
    links: [{ href: docsCss, rel: "stylesheet" }],
  }),
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await serverLoader({ data: slugs });
    // browserCollections only exists on the client — awaiting preload during SSR
    // blocks the stream until timeout (hangs / and /docs on first load).
    if (!import.meta.env.SSR) {
      await clientLoader.preload(data.path);
    }
    return data;
  },
  notFoundComponent: DocsNotFound,
});

const serverLoader = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const path = slugs.join("/");
    if (path in LEGACY_BLOCK_REDIRECTS) {
      throw redirect({ href: `/docs/${LEGACY_BLOCK_REDIRECTS[path]}` });
    }
    const legacyComponentTarget = LEGACY_COMPONENT_REDIRECTS[path];
    if (legacyComponentTarget) {
      throw redirect({ href: `/docs/${legacyComponentTarget}` });
    }

    const page = source.getPage(slugs);
    if (!page) {
      throw notFound();
    }

    return {
      pageTree: await source.serializePageTree(source.getPageTree()),
      path: page.path,
    };
  });

function isBlocksDocsPath(path: string) {
  return path === "blocks" || path.startsWith("blocks/");
}

const clientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }) {
    // biome-ignore lint/correctness/useHookAtTopLevel: fumadocs clientLoader `component` is a React component
    const path = Route.useLoaderData().path;
    const isBlocksSection = isBlocksDocsPath(path);

    return (
      <DocsPage
        full={isBlocksSection}
        tableOfContent={{ enabled: !isBlocksSection }}
        tableOfContentPopover={{ enabled: !isBlocksSection }}
        toc={isBlocksSection ? undefined : toc}
      >
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout {...baseOptions()} tree={data.pageTree}>
        <Suspense fallback={<DocsPageLoading />}>
          {clientLoader.useContent(data.path)}
        </Suspense>
      </DocsLayout>
    </RootProvider>
  );
}

function DocsPageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-muted-foreground text-sm">
      Loading…
    </div>
  );
}
