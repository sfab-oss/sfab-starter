import handler from "@tanstack/react-start/server-entry";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { app as honoApp } from "./hono";

const app = new Hono()
  .use("*", logger())
  .use("*", cors())
  .route("/api", honoApp)
  .all("*", (c) => handler.fetch(c.req.raw));

export default { fetch: app.fetch };
