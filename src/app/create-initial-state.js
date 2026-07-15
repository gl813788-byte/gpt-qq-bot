import { createEmptyQqConversationMemory } from "../qq-conversation-memory.js";
import { createEmptyQqSelfPersona } from "../qq-self-persona.js";

export function createInitialState({
  config,
  codexWorkspaceDir,
  qqProactiveInterestPreset,
  startedAt = new Date().toISOString()
}) {
  return {
    network: {
      allowLanAccess: false
    },
    ai: {
      provider: "codex-cli",
      model: config.codexModel || "default",
      reasoningEffort: config.codexReasoningEffort,
      imessageModel: config.imessageCodexModel,
      imessageReasoningEffort: config.imessageCodexReasoningEffort,
      workspace: codexWorkspaceDir
    },
    channels: {
      qq: false,
      imessage: true
    },
    qq: {
      groupMode: "mention-only",
      allowedGroups: [],
      ownerUserIds: [],
      bannedUserIds: [],
      bannedUntilByUserId: createRecord(),
      enhancer: {
        enabled: config.qqEnhancerEnabled
      },
      webLookup: {
        enabled: config.qqWebLookupEnabled
      },
      proactive: {
        enabled: config.qqEnhancerEnabled && config.qqProactiveReplyEnabled,
        judgeEveryMessages: config.qqProactiveJudgeEveryMessages,
        judgeEveryMinutes: config.qqProactiveJudgeEveryMinutes,
        messageCountByGroupId: createRecord(),
        lastJudgeAtByGroupId: createRecord(),
        judgeInFlightByGroupId: createRecord(),
        pendingImageRequests: createRecord(),
        judge: {
          enabled: config.qqProactiveJudgeEnabled,
          provider: "openrouter",
          model: config.qqProactiveJudgeModel,
          baseUrl: config.openRouterBaseUrl,
          timeoutMs: config.qqProactiveJudgeTimeoutMs,
          minInterest: config.qqProactiveJudgeMinInterest,
          maxRecentMessages: 8,
          apiKeyConfigured: Boolean(config.openRouterApiKey),
          preset: qqProactiveInterestPreset
        }
      },
      commandPermissions: {
        publicCommands: createRecord(),
        userCommands: createRecord()
      },
      activeGeneration: null,
      activeGenerations: createRecord(),
      pendingReplies: createRecord(),
      events: [],
      memory: {
        enabled: true,
        perGroupLimit: config.qqMemoryLimit,
        groupRecentLimit: config.qqGroupMemoryLimit,
        entries: createRecord(),
        recentMessages: createRecord()
      },
      publicMemory: {
        enabled: true,
        maxEntries: 120,
        entries: []
      },
      personas: {
        groups: createRecord()
      },
      selfPersona: createEmptyQqSelfPersona(),
      conversationMemory: createEmptyQqConversationMemory()
    },
    imessage: {
      trustedHandles: [],
      replyHandle: "",
      lastRowId: 0,
      cursorReady: false,
      watchStartedAtAppleDate: 0,
      status: "idle",
      lastError: null,
      events: [],
      memory: {
        perHandleLimit: config.imessageMemoryLimit,
        entries: createRecord()
      }
    },
    proxy: {
      pendingAction: null
    },
    unifiedMemory: {
      autoWriteOnSkillRecall: false,
      autoWriteOnIMessageRecall: true,
      manualHandoffCommand: true
    },
    unifiedMemoryPendingClear: null,
    remoteExecution: {
      enabled: false,
      pendingAction: null,
      model: config.remoteExecutionModel,
      reasoningEffort: config.remoteExecutionReasoningEffort,
      skill: config.remoteExecutionSkill,
      idleTtlMs: config.remoteExecutionIdleTtlMs,
      lastActivityAt: null,
      busy: false,
      memory: {
        limit: config.remoteExecutionMemoryLimit,
        entries: []
      }
    },
    maintenance: {
      startedAt,
      oneBot: {
        ok: false,
        lastCheckedAt: null,
        lastError: null,
        selfId: null,
        nickname: null
      },
      codex: {
        path: config.codexCliPath,
        lastRunAt: null,
        lastDurationMs: null,
        lastOk: null,
        lastError: null,
        quota: null
      },
      webLookup: {
        enabled: config.qqWebLookupEnabled,
        effectiveProvider: null,
        providerPreset: config.qqWebSearchPreset,
        configuredProviders: [],
        lastQuery: null,
        lastRunAt: null,
        lastDurationMs: null,
        lastOk: null,
        lastError: null,
        lastProviderErrors: [],
        lastAttempts: []
      }
    }
  };
}

function createRecord() {
  return Object.create(null);
}
