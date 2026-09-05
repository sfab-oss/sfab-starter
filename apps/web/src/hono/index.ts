import { auth } from "@workspace/auth";
import { Hono } from "hono";
import { appErrorHandler } from "./middleware/error-handler";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";

export const app = new Hono()
  .onError(appErrorHandler)
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes);

export type AppType = typeof app;
