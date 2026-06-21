import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-semibold text-base text-foreground">
          SFab Starter
          <span className="ml-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Docs
          </span>
        </span>
      ),
    },
    links: [
      {
        text: "Home",
        url: "/",
      },
    ],
  };
}
