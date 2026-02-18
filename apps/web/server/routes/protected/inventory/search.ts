import { searchInventory } from "@workspace/db/services/search";
import type { HonoContextWithAuth } from "@workspace/types/hono";
import { Hono } from "hono";

const searchRoutes = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const userId = c.get("auth").userId;
  const query = c.req.query("q") || "";

  if (!query) {
    return c.json({ results: [] });
  }

  try {
    const results = await searchInventory(userId, query);
    return c.json({ results });
  } catch (e) {
    console.error("Search error:", e);
    return c.json({ error: "Failed to perform search" }, 500);
  }
});

export default searchRoutes;
