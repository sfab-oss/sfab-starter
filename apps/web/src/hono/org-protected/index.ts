import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import catalogRoutes from "./catalog";
import documentsRoutes from "./documents";
import transcribeRoutes from "./transcribe";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/catalog", catalogRoutes)
  .route("/documents", documentsRoutes)
  .route("/transcribe", transcribeRoutes);
