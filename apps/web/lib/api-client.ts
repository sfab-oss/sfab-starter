import { BASE_URL } from "@workspace/config";
import { hc } from "hono/client";
import type { AppType } from "@/server";

const apiClient = hc<AppType>(`${BASE_URL}/`);

export { apiClient };
