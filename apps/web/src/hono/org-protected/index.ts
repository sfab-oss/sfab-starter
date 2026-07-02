import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import catalogRoutes from "./catalog";
import transcribeRoutes from "./transcribe";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/catalog", catalogRoutes)
  .route("/transcribe", transcribeRoutes);
