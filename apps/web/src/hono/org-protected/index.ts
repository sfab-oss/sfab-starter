import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import catalogRoutes from "./catalog";
import documentsRoutes from "./documents";
import { entitiesRoute } from "./entities";
import mcpRoutes from "./mcp";
import { paymentsRoute } from "./payments";
import { walletRoute } from "./wallet";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/catalog", catalogRoutes)
  .route("/documents", documentsRoutes)
  .route("/payments", paymentsRoute)
  .route("/entities", entitiesRoute)
  .route("/wallet", walletRoute)
  .route("/mcp", mcpRoutes);
