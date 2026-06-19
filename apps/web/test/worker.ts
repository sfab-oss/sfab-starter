// Test worker entry — mounts the real Hono API for SELF-based API tests

import { Hono } from "hono";
import { cors } from "hono/cors";
import { app as honoApp } from "../src/hono";

const app = new Hono()
  .use("*", cors())
  .route("/api", honoApp)
  .all("*", (c) => c.text("Not found", 404));

export default { fetch: app.fetch };
