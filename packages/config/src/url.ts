import { configEnv } from "./env";

/**
 * Returns the base URL of the application.
 *
 * Detection order:
 * 1. Browser: uses window.location.origin
 * 2. Vercel production: uses NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
 * 3. Vercel preview: uses NEXT_PUBLIC_VERCEL_BRANCH_URL
 * 4. Fallback: http://localhost:3000
 */
export const BASE_URL = (() => {
  // Client-side: use current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Vercel production deployment
  if (
    configEnv.NEXT_PUBLIC_VERCEL_ENV === "production" &&
    configEnv.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${configEnv.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // Vercel preview deployment
  if (
    configEnv.NEXT_PUBLIC_VERCEL_ENV === "preview" &&
    configEnv.NEXT_PUBLIC_VERCEL_BRANCH_URL
  ) {
    return `https://${configEnv.NEXT_PUBLIC_VERCEL_BRANCH_URL}`;
  }

  // Local development fallback
  return "http://localhost:3000";
})();
