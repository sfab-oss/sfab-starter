import { searchInventory } from "@workspace/db-d1/services/search";
import { Hono } from "hono";
import type { HonoContextWithAuth } from "../../types";

const searchRoute = new Hono<HonoContextWithAuth>().get("/", async (c) => {
  const userId = c.get("user").id;
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

export default searchRoute;
