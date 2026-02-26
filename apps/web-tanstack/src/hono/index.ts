import { Hono } from "hono";
import { auth } from "@/server/auth";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";

export const app = new Hono()
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes);

export type AppType = typeof app;
