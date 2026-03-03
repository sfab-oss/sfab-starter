import { Hono } from "hono";
import { extractAuth } from "../middleware/auth";
import type { HonoContext } from "../types";
import { statusRoutes } from "./status";

export const publicRoutes = new Hono<HonoContext>()
  .use("*", extractAuth)
  .route("/status", statusRoutes);
