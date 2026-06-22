import { simulateRequest } from "../../../_shared/lib/simulate-request";
import type { MockOrganization } from "./mock-organization";
import { MOCK_ORGANIZATION } from "./mock-organization";

export async function fetchOrganizationSettings(): Promise<MockOrganization> {
  return await simulateRequest(MOCK_ORGANIZATION);
}
