import {
  type OrgInferenceEnv,
  resolveOrgChatCapabilities,
} from "@workspace/agent/inference";
import { Hono } from "hono";
import type { HonoContextWithAuth } from "../types";

/**
 * Expose the active org-chat provider's input capabilities so the composer can
 * gate attachments before send (ALW-453). Env-driven — same resolution as the
 * Durable Object model pick; no secrets returned.
 */
const chatRoutes = new Hono<HonoContextWithAuth>().get("/capabilities", (c) => {
  const capabilities = resolveOrgChatCapabilities(
    c.env as unknown as OrgInferenceEnv
  );
  return c.json(capabilities);
});

export default chatRoutes;
