import { auth } from "@workspace/auth";
import { Hono } from "hono";
import { protectedRoutes } from "./protected";
import { inventoryRoutes } from "./protected/inventory";
import { publicRoutes } from "./public";

export const app = new Hono()
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes)
  .route("/protected/inventory", inventoryRoutes);

export type AppType = typeof app;
