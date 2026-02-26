import { hc } from "hono/client";
import type { AppType } from "../hono";

export const client = hc<AppType>("/api");
