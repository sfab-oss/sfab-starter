import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import inventoryRoutes from "./catalog";
import transcribeRoutes from "./transcribe";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/inventory", inventoryRoutes)
  .route("/transcribe", transcribeRoutes);
