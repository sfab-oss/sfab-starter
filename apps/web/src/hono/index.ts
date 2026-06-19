import { auth } from "@workspace/auth";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";

export const app = new Hono()
  .onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error("Unhandled error:", err);
    return c.json({ error: "Internal server error" }, 500);
  })
  .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes);

export type AppType = typeof app;
