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
import { agentTool } from "agents/agent-tools";
import type { ChatResponseResult } from "agents/chat";
import { createCompactFunction } from "agents/experimental/memory/utils";
import {
  generateText,
  type LanguageModel,
  type LanguageModelUsage,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { buildOrgContext } from "../../context/assemble";
import {
  buildPageContextSection,
  getLatestUserPageContext,
} from "../../context/page-context";
import {
  gateChatAttachments,
  getCompactionLimit,
  type OrgChatModelCapabilities,
  resolveOrgChatModel,
} from "../../inference/chat-models";
import {
  getOrgAgentDisplayTools,
  getOrgAgentTools,
} from "../../tools/compose-org-tools";
import { resolveTurnUserId } from "../bootstrap";
import { OrgAgent } from "../org-agent";
import { OrgMemoryProvider } from "./org-memory-provider";
import { OrgSubAgent } from "./org-sub-agent";
import { SharedWorkspace } from "./shared-workspace";

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
  private resolvedContextWindow!: number;
  private resolvedCapabilities!: OrgChatModelCapabilities;
  private lastTurnUsage: LanguageModelUsage | undefined;
  /** Acting user for tool execute / approve-resume (WebSocket ALS is often unset). */
  private turnUserId: string | undefined;

  override onStart(): void {
    this.organizationId = this.requireOrganizationId();
    // The chat model is a constant env-driven resolution — resolve it once here
    // rather than re-resolving every turn.
    const resolved = resolveOrgChatModel(this.env);
    this.resolvedChatModel = resolved.model;
    this.resolvedModelId = resolved.modelId;
    this.resolvedContextWindow = resolved.contextWindow;
    this.resolvedCapabilities = resolved.capabilities;
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
    // Survive DO hibernation (onConnect does not re-run on wake).
    connection.setState({ userId });
    // In-memory copy for tool closures: getTools/codemode often lack WebSocket ALS.
    this.turnUserId = userId;
  }

  override getModel(): LanguageModel {
    return this.resolvedChatModel;
  }

  override configureSession(session: Session): Session {
    return (
      session
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
            // Side inference (outside the turn) resolves through `resolveModel()`
            // per Think 0.12 — it returns our explicit LanguageModel as-is, and
            // stays correct if `getModel()` ever returns a model-id string.
            summarize: (prompt) =>
              generateText({ model: this.resolveModel(), prompt }).then(
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
        // Primary trigger: Think's heuristic auto-compacts *before* a turn is
        // assembled once its token estimate crosses this budget, giving real
        // headroom below the model ceiling (unlike pinning it to the full window).
        // The budget is per-model — the chat model is fixed per instance, so this
        // one-time set is correct. `maybeCompactByUsage` layers a stricter
        // real-usage trigger on top for tool-heavy histories the estimate
        // under-counts.
        .compactAfter(getCompactionLimit(this.resolvedContextWindow))
    );
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
    const limit = getCompactionLimit(this.resolvedContextWindow);
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
    // Reject unsupported attachment parts on the inbound user turn before the
    // provider call so text-only models (e.g. zai-coding-plan) never surface an
    // opaque content-type error. Only the latest user message is gated — older
    // history is left alone so a prior failed attach cannot block later text.
    const latestUser = [...this.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (latestUser) {
      const attachmentParts = latestUser.parts.map((part) => ({
        type: part.type,
        mediaType:
          "mediaType" in part && typeof part.mediaType === "string"
            ? part.mediaType
            : undefined,
      }));
      const gate = gateChatAttachments(
        attachmentParts,
        this.resolvedCapabilities
      );
      if (!gate.ok) {
        throw new Error(gate.reason);
      }
    }

    const parent = await this.getParent();
    const organizationId = this.requireOrganizationId();
    // Refresh after hibernation (onConnect does not re-run).
    try {
      this.turnUserId = this.requireConnectedUserId();
    } catch {
      // Keep onConnect value when ALS is unset (approve/resume paths).
    }
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

  /**
   * Acting user for tool execute / approve-resume: turnUserId, then ALS
   * connection, then any live connection attachment (resume often has no ALS).
   */
  private requireTurnUserId(): string {
    if (this.turnUserId) {
      return this.turnUserId;
    }
    try {
      const userId = this.requireConnectedUserId();
      this.turnUserId = userId;
      return userId;
    } catch {
      // fall through to connection scan
    }
    for (const connection of this.getConnections<{ userId?: string }>()) {
      const userId = connection.state?.userId;
      if (userId) {
        this.turnUserId = userId;
        return userId;
      }
    }
    const orgId = this.parentPath.at(-1)?.name ?? "?";
    throw new Error(
      `OrgAgent ${orgId}/${this.name}: no active connection for this turn`
    );
  }

  override getTools(): ToolSet {
    const self = this;
    // Lazy: getTools runs before beforeTurn; codemode execute often has no ALS.
    const toolsCtx = {
      get userId() {
        return self.requireTurnUserId();
      },
      organizationId: this.organizationId,
      waitUntil: (promise: Promise<unknown>) => this.ctx.waitUntil(promise),
    };
    const erpTools = getOrgAgentTools(toolsCtx);
    const displayTools = getOrgAgentDisplayTools(toolsCtx);

    return {
      // ERP tools as `tools.*` inside the sandbox; `needsApproval` pauses mid-script.
      codemode: createExecuteTool(this, { tools: erpTools }),
      // Child facet with its own context window — see `OrgSubAgent`.
      delegate: agentTool(OrgSubAgent, {
        description:
          "Delegate ONE self-contained research or analysis task to a focused sub-agent that works in its own context window with read-only access to org data (catalog products, documents) and a code sandbox. Use this for multi-step data gathering or analysis that would otherwise clutter this conversation. The sub-agent cannot see this conversation and cannot modify any data — give it a complete, standalone task description. Returns the sub-agent's result summary.",
        inputSchema: z.object({
          task: z
            .string()
            .min(10)
            .describe(
              "A complete, standalone description of the task, including every detail the sub-agent needs. It does not see this conversation."
            ),
        }),
        displayName: "Sub-agent",
      }),
      ...displayTools,
    };
  }
}
