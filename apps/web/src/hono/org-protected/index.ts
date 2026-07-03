import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import catalogRoutes from "./catalog";
import documentsRoutes from "./documents";
import { entitiesRoute, paymentsRoute } from "./payments";
import transcribeRoutes from "./transcribe";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/catalog", catalogRoutes)
  .route("/documents", documentsRoutes)
  .route("/payments", paymentsRoute)
  .route("/entities", entitiesRoute)
  .route("/transcribe", transcribeRoutes);
