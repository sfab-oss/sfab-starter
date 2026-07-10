import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "@workspace/ui/components/shadcn/sonner";

import { QueryProvider } from "../components/providers/query-provider";
import { ThemeProvider } from "../components/providers/theme-provider";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Acme Inc.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* biome-ignore lint/style/noHeadElement: TanStack Start requires <head> element */}
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
        <Toaster />
        <TanStackDevtools
          config={{
            position: "bottom-right",
            // Hide FAB unless ?tanstack-devtools — docs opt-in pattern.
            // Config persists in localStorage after first load.
            requireUrlFlag: true,
            urlFlag: "tanstack-devtools",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
