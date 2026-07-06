import type { WorkspaceFsLike } from "@cloudflare/shell";
import {
  type Session,
  type StepContext,
  Think,
  type TurnContext,
} from "@cloudflare/think";
import { createExecuteTool } from "@cloudflare/think/tools/execute";
import { auth } from "@workspace/auth";
import {
  type Connection,
  type ConnectionContext,
  callable,
  getCurrentAgent,
} from "agents";
import type { ChatResponseResult } from "agents/chat";
import { createCompactFunction } from "agents/experimental/memory/utils";
import {
  generateText,
  type LanguageModel,
  type LanguageModelUsage,
  type ToolSet,
} from "ai";
import { buildOrgContext } from "../../context/assemble";
import {
  buildPageContextSection,
  getLatestUserPageContext,
} from "../../context/page-context";
import {
  getCompactionLimit,
  getMaxContextTokens,
  getOrgChatModelId,
  resolveOrgChatModel,
} from "../../inference/chat-models";
import {
  getOrgAgentDisplayTools,
  getOrgAgentTools,
} from "../../tools/compose-org-tools";
import { resolveTurnUserId } from "../bootstrap";
import { OrgAgent } from "../org-agent";
import { OrgMemoryProvider } from "./org-memory-provider";
import { SharedWorkspace } from "./shared-workspace";

const DEFAULT_COMPACTION_BACKSTOP = 200_000;

type OrgAgentParent = Pick<
  OrgAgent,
  "readOrgMemory" | "writeOrgMemory" | "touchChat"
>;

export class OrgChat extends Think<Cloudflare.Env> {
  override maxSteps = 50;

  override workspace: WorkspaceFsLike = new SharedWorkspace(this);

  private organizationId!: string;
  private resolvedChatModel!: LanguageModel;
  private resolvedModelId!: string;
  private lastTurnUsage: LanguageModelUsage | undefined;

  override onStart(): void {
    this.organizationId = this.requireOrganizationId();
    // The chat model is a constant gateway resolution — resolve it once here
    // rather than re-resolving every turn.
    this.resolvedChatModel = resolveOrgChatModel();
    this.resolvedModelId = getOrgChatModelId();
  }

  private getParent(): Promise<OrgAgentParent> {
    return this.parentAgent(OrgAgent);
  }

  private requireOrganizationId(): string {
    const organizationId = this.parentPath.at(-1)?.name;
    if (!organizationId) {
      throw new Error(`OrgChat ${this.name}: missing parent OrgAgent name`);
    }
    return organizationId;
  }

  override async onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): Promise<void> {
    const session = await auth.api.getSession({
      headers: ctx.request.headers,
    });
    const userId = session?.user?.id;
    if (!userId) {
      connection.close(1008, "unauthenticated");
      return;
    }
    // Persist the resolved user on the connection's WebSocket attachment
    // (not an in-memory Map) so it survives DO hibernation — onConnect does
    // not re-run when a hibernated DO wakes on the next message.
    connection.setState({ userId });
  }

  override getModel(): LanguageModel {
    return this.resolvedChatModel;
  }

  override configureSession(session: Session): Session {
    return session
      .withContext("org_memory", {
        description:
          "Shared, persistent facts about this organization — conventions, " +
          "policies, recurring issues. Visible to every chat. Use `set_context` " +
          "to update when you learn something worth remembering.",
        maxTokens: 2000,
        provider: new OrgMemoryProvider(() => this.getParent()),
      })
      .onCompaction(
        createCompactFunction({
          summarize: (prompt) =>
            generateText({ model: this.getModel(), prompt }).then(
              (r) => r.text
            ),
        })
      )
      .onCompactionError((error) => {
        const orgId = this.parentPath.at(-1)?.name ?? "?";
        console.error(
          `[OrgChat ${orgId}/${this.name}] auto-compaction failed:`,
          error
        );
      })
      .compactAfter(DEFAULT_COMPACTION_BACKSTOP);
  }

  override onChatError(error: unknown): unknown {
    const err = error instanceof Error ? error : new Error(String(error));
    const orgId = this.parentPath.at(-1)?.name ?? "?";
    console.error(`[OrgChat ${orgId}/${this.name}] chat turn failed:`, {
      message: err.message,
      stack: err.stack,
    });
    return super.onChatError(error);
  }

  override onStepFinish(ctx: StepContext): void {
    super.onStepFinish(ctx);
    if (ctx.usage) {
      this.lastTurnUsage = ctx.usage;
    }
  }

  override async onChatResponse(result: ChatResponseResult): Promise<void> {
    await super.onChatResponse(result);

    const usage = this.lastTurnUsage;
    const modelId = this.resolvedModelId;
    this.lastTurnUsage = undefined;

    if (result.status !== "completed" || !usage?.inputTokens || !modelId) {
      return;
    }

    const safe = await this.updateMessageInHistory({
      ...result.message,
      metadata: {
        ...(result.message.metadata ?? {}),
        createdAt: new Date().toISOString(),
        status: "success",
        modelId,
        usage,
      },
    });

    await this.syncMessagesFromStorage();
    if (safe) {
      this.broadcast(
        JSON.stringify({
          type: "cf_agent_message_updated",
          message: safe,
        })
      );
    }

    await this.maybeCompactByUsage(usage.inputTokens);
  }

  private async maybeCompactByUsage(inputTokens: number): Promise<void> {
    const limit = getCompactionLimit();
    if (!limit || inputTokens <= limit) {
      return;
    }
    try {
      const result = await this.session.compact();
      if (result) {
        await this.syncMessagesFromStorage();
      }
    } catch (err) {
      const orgId = this.parentPath.at(-1)?.name ?? "?";
      console.error(
        `[OrgChat ${orgId}/${this.name}] usage-driven compaction failed:`,
        err
      );
    }
  }

  @callable()
  async compactNow(): Promise<{ compacted: boolean }> {
    const result = await this.session.compact();
    if (!result) {
      return { compacted: false };
    }
    await this.syncMessagesFromStorage();
    return { compacted: true };
  }

  override async beforeTurn(ctx: TurnContext) {
    const backstop = getMaxContextTokens();
    this.session.compactAfter(backstop);

    const parent = await this.getParent();
    const organizationId = this.requireOrganizationId();
    const { header } = await buildOrgContext(organizationId);

    const pageContext = getLatestUserPageContext(this.messages);
    const pageSection = pageContext
      ? `${buildPageContextSection(pageContext)}\n\n`
      : "";
    const orgBlock = `${header}\n\n${pageSection}${ctx.system}`;

    this.ctx.waitUntil(
      parent.touchChat(this.name).catch((err: unknown) => {
        console.error(
          `[OrgChat ${organizationId}/${this.name}] touchChat failed:`,
          err
        );
      })
    );

    return {
      system: orgBlock,
      model: this.resolvedChatModel,
    };
  }

  private requireConnectedUserId(): string {
    const { connection } = getCurrentAgent();
    const orgId = this.parentPath.at(-1)?.name ?? "?";
    return resolveTurnUserId(connection, `${orgId}/${this.name}`);
  }

  override getTools(): ToolSet {
    const self = this;
    const toolsCtx = {
      get userId() {
        return self.requireConnectedUserId();
      },
      organizationId: this.organizationId,
      waitUntil: (promise: Promise<unknown>) => this.ctx.waitUntil(promise),
    };
    const erpTools = getOrgAgentTools(toolsCtx);
    const displayTools = getOrgAgentDisplayTools(toolsCtx);

    return {
      codemode: createExecuteTool({
        tools: erpTools,
        loader: this.env.LOADER,
      }),
      ...displayTools,
    };
  }
}
