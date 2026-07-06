import { DomainError, type DomainErrorCode } from "@workspace/core/errors";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/** Domain error codes → HTTP status. The `core` layer stays transport-agnostic;
 * this is the one place the mapping lives. */
const DOMAIN_ERROR_STATUS: Record<DomainErrorCode, 404 | 409 | 422> = {
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
};

/**
 * The app's single error handler. Maps framework HTTP errors and `core`
 * {@link DomainError}s to JSON responses; anything else is an unexpected failure,
 * logged and returned as a generic 500.
 *
 * Registered once on the root app (`app.onError`), so every route — current and
 * future — gets uniform error mapping without per-router wiring.
 */
export function appErrorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof DomainError) {
    return c.json({ error: err.message }, DOMAIN_ERROR_STATUS[err.code]);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
}
