import type { HonoContext } from "@workspace/types/hono";
import { Hono } from "hono";
import {
  honoAuthCheckMiddleware,
  honoAuthMiddleware,
} from "../../middleware/auth";
import chatRoutes from "./chat";
import inventoryRoutes from "./inventory";
import transcribeRoutes from "./transcribe";

const protectedRoutes = new Hono<HonoContext>()
  .use(honoAuthMiddleware)
  .use(honoAuthCheckMiddleware)
  .route("/chat", chatRoutes)
  .route("/inventory", inventoryRoutes)
  .route("/transcribe", transcribeRoutes);

export default protectedRoutes;
