import { searchCatalog } from "@workspace/core/catalog";
import { errorMessage, structuredLog } from "@workspace/log";
import { Hono } from "hono";
import type { HonoContextWithAuthAndOrg } from "../../types";

const searchRoute = new Hono<HonoContextWithAuthAndOrg>().get(
  "/",
  async (c) => {
    const orgId = c.get("session").activeOrganizationId;
    const query = c.req.query("q") || "";

    if (!query) {
      return c.json({ results: [] });
    }

    try {
      const results = await searchCatalog(orgId, query);
      return c.json({ results });
    } catch (e) {
      structuredLog({
        kind: "catalog_search_failed",
        severity: "error",
        organizationId: orgId,
        error: errorMessage(e),
      });
      return c.json({ error: "Failed to perform search" }, 500);
    }
  }
);

export default searchRoute;
