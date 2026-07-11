import { describe, expect, it } from "vitest";
import { buildPageContextSection } from "./page-context";

describe("buildPageContextSection", () => {
  it("renders detail-style context without a view fingerprint", () => {
    const section = buildPageContextSection({
      page: "products",
      params: {
        entityType: "products",
        entityId: "prod_abc123",
        title: "Widget Pro",
      },
    });

    expect(section).toContain("## Current page context");
    expect(section).toContain("- Page: products");
    expect(section).toContain("- Entity type: products");
    expect(section).toContain("- Id: prod_abc123");
    expect(section).toContain("- Title: Widget Pro");
    expect(section).not.toContain("- View:");
    expect(section).not.toContain("view fingerprint");
    expect(section).toContain(
      "fetch current state with the matching get_*/list_* tool"
    );
  });

  it("renders list context with a URL-backed view fingerprint", () => {
    const section = buildPageContextSection({
      page: "products",
      params: {
        entityType: "products",
        entityId: "list",
        title: "Products",
        view: {
          search: "widget",
          page: 2,
          pageSize: 20,
          sortBy: "name",
          sortOrder: "asc",
        },
      },
    });

    expect(section).toContain(
      "- View: search=widget page=2 pageSize=20 sortBy=name sortOrder=asc"
    );
    expect(section).toContain(
      "view fingerprint mirrors the user's visible list filters"
    );
    expect(section).not.toContain("widget pro");
    expect(section).toContain(
      "fetch current state with the matching get_*/list_* tool"
    );
  });
});
