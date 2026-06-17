import type { WritableContextProvider } from "agents/experimental/memory/session";
import type { OrgAgent } from "../org-agent";

type OrgAgentParent = Pick<OrgAgent, "readOrgMemory" | "writeOrgMemory">;

export class OrgMemoryProvider implements WritableContextProvider {
  private label = "org_memory";

  private readonly getParent: () => Promise<OrgAgentParent>;

  constructor(getParent: () => Promise<OrgAgentParent>) {
    this.getParent = getParent;
  }

  init(label: string): void {
    this.label = label;
  }

  async get(): Promise<string | null> {
    const parent = await this.getParent();
    return parent.readOrgMemory(this.label);
  }

  async set(content: string): Promise<void> {
    const parent = await this.getParent();
    await parent.writeOrgMemory(this.label, content);
  }
}
