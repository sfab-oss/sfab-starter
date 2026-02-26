import { Hono } from "hono";
import { extractAuth } from "../middleware/auth";
import type { HonoContext } from "../types";
import { statusRoutes } from "./status";
import { todosRoute } from "./todos";

export const publicRoutes = new Hono<HonoContext>()
  .use("*", extractAuth)
  .route("/status", statusRoutes)
  .route("/todos", todosRoute);
