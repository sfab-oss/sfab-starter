import { Hono } from "hono";
import { requireActiveOrg } from "../middleware/auth";
import type { HonoContextWithAuthAndOrg } from "../types";
import chatRoutes from "./chat";
import inventoryRoutes from "./inventory";
import transcribeRoutes from "./transcribe";

export const orgProtectedRoutes = new Hono<HonoContextWithAuthAndOrg>()
  .use("*", requireActiveOrg)
  .route("/chat", chatRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/transcribe", transcribeRoutes);
