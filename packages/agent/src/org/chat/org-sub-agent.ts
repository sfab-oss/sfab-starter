import { type Session, Think, type TurnContext } from "@cloudflare/think";
import { createExecuteTool } from "@cloudflare/think/tools/execute";
import { createCompactFunction } from "agents/experimental/memory/utils";
import { generateText, type LanguageModel, type ToolSet } from "ai";
import { buildOrgContext } from "../../context/assemble";
import {
  getCompactionLimit,
  getOrgChatModelId,
  resolveOrgChatModel,
} from "../../inference/chat-models";
import { getOrgAgentReadOnlyTools } from "../../tools/compose-org-tools";

const SUB_AGENT_INSTRUCTIONS = `You are a focused sub-agent invoked by the main organization assistant to complete ONE self-contained task, handed to you as the first message.

You do not see the parent conversation — work only from the task you are given. You have READ-ONLY access to the organization's data (catalog products, business documents) through the code sandbox (\`tools.*\`), and you can run JavaScript to gather and analyze it. You CANNOT modify any data.

Do the task thoroughly, then return a concise, self-contained result the parent assistant can relay to the user. Prefer a direct answer over narrating your steps.`;

/**
 * A general-purpose delegation sub-agent (ALW-401). The main `OrgChat` exposes
 * it as the `delegate` tool via `agentTool(OrgSubAgent, …)`; the model calls it
 * to run a self-contained research/analysis task in its OWN context window
 * (keeping heavy work out of the main chat's tokens) with read-only org reach
 * plus the codemode sandbox.
 *
 * Topology: it is a facet under `OrgChat` under `OrgAgent`
 * (`OrgAgent → OrgChat → OrgSubAgent`), so it needs no wrangler binding or
 * migration — just a named export from the worker entry — and the existing
 * `/agents/org-agent/` gate org-scopes the whole subtree. Its `organizationId`
 * comes from the trusted parent path (the root `OrgAgent` entry), never from
 * model input.
 */
export class OrgSubAgent extends Think<Cloudflare.Env> {
  override maxSteps = 30;

  private organizationId!: string;
  private resolvedChatModel!: LanguageModel;
  private resolvedModelId!: string;

  override onStart(): void {
    this.organizationId = this.resolveOrganizationId();
    this.resolvedChatModel = resolveOrgChatModel();
    this.resolvedModelId = getOrgChatModelId();
  }

  // `parentPath` is root-first: [{ OrgAgent, org }, { OrgChat, chatId }]. The
  // organization is the OrgAgent ancestor at the root — the trusted source of
  // scope for this facet (the model cannot forge it).
  private resolveOrganizationId(): string {
    const organizationId = this.parentPath[0]?.name;
    if (!organizationId) {
      throw new Error(
        `OrgSubAgent ${this.name}: missing OrgAgent ancestor in parent path`
      );
    }
    return organizationId;
  }

  override getModel(): LanguageModel {
    return this.resolvedChatModel;
  }

  override configureSession(session: Session): Session {
    return session
      .onCompaction(
        createCompactFunction({
          summarize: (prompt) =>
            generateText({ model: this.resolveModel(), prompt }).then(
              (r) => r.text
            ),
        })
      )
      .onCompactionError((error) => {
        console.error(
          `[OrgSubAgent ${this.organizationId}/${this.name}] auto-compaction failed:`,
          error
        );
      })
      .compactAfter(getCompactionLimit(this.resolvedModelId));
  }

  override getTools(): ToolSet {
    // Read-only reach only (list/get products, list documents), exposed as the
    // codemode `tools.*` connector — the sub-agent has no acting user and can
    // never mutate. Org scope is the trusted `this.organizationId`.
    const readTools = getOrgAgentReadOnlyTools({
      organizationId: this.organizationId,
    });
    return {
      codemode: createExecuteTool(this, { tools: readTools }),
    };
  }

  override async beforeTurn(_ctx: TurnContext) {
    const { header } = await buildOrgContext(this.organizationId);
    return {
      system: `${header}\n\n${SUB_AGENT_INSTRUCTIONS}`,
      model: this.resolvedChatModel,
    };
  }
}
