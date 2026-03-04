import { Hono } from "hono";
import { extractAuth } from "../middleware/auth";
import type { HonoContext } from "../types";

export const publicRoutes = new Hono<HonoContext>().use("*", extractAuth);
