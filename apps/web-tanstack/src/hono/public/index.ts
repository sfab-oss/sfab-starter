import { Hono } from "hono";
import type { AuthVars } from "../middleware/auth";
import { extractAuth } from "../middleware/auth";
import { statusRoutes } from "./status";

export const publicRoutes = new Hono<{ Variables: AuthVars }>()
  .use("*", extractAuth)
  .route("/status", statusRoutes);
