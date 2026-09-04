import { auth } from "@workspace/auth";
import { Hono } from "hono";
import { handleMcpConsent } from "../mcp/consent-handler";
import { appErrorHandler } from "./middleware/error-handler";
import { protectedRoutes } from "./protected";
import { publicRoutes } from "./public";

const REPEAT_SLASH_RE = /\/+/g;
const TRAILING_SLASH_RE = /\/$/;
const normalizePath = (pathname: string): string =>
  pathname
    .toLowerCase()
    .replace(REPEAT_SLASH_RE, "/")
    .replace(TRAILING_SLASH_RE, "");

const handleAuth = (raw: Request): Promise<Response> => {
  const url = new URL(raw.url);
  const normalized = normalizePath(url.pathname);

  if (
    normalized.endsWith("/oauth2/authorize") &&
    url.searchParams.get("prompt") !== "consent"
  ) {
    url.searchParams.set("prompt", "consent");
    return auth.handler(new Request(url.toString(), raw));
  }

  return auth.handler(raw);
};

export const app = new Hono()
  .onError(appErrorHandler)
  .on(["POST", "GET"], "/auth/*", (c) => handleAuth(c.req.raw))
  .post("/mcp/consent", (c) => handleMcpConsent(c.req.raw))
  .route("/", publicRoutes)
  .route("/protected", protectedRoutes);

export type AppType = typeof app;
