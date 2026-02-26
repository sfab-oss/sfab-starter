import { Hono } from "hono";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";

export const app = new Hono()
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes);

export type AppType = typeof app;
