import { DomainError, type DomainErrorCode } from "@workspace/core/errors";
import type { Context } from "hono";

const DOMAIN_ERROR_STATUS: Record<DomainErrorCode, 404 | 409 | 422> = {
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
};

/**
 * Maps thrown `DomainError` instances to the appropriate HTTP response.
 * Register via `app.onError(domainErrorHandler)`.
 */
export function domainErrorHandler(
  err: Error,
  c: Context
): Response | Promise<Response> {
  if (err instanceof DomainError) {
    return c.json({ error: err.message }, DOMAIN_ERROR_STATUS[err.code]);
  }
  throw err;
}
