import { createEmptyQqConversationMemory } from "../qq-conversation-memory.js";
import { createEmptyQqKnowledgeBase } from "../qq-knowledge-base.js";
import { createEmptyQqPeriodicRuntime } from "../qq-periodic-runtime.js";
import { createEmptyQqSelfPersona } from "../qq-self-persona.js";
import {
  createEmptyQqCodexSessionStore,
  normalizeQqCodexSessionSettings
} from "../qq-codex-session.js";
import { resolveInterestModelRuntimeConfig } from "../interest-model-provider.js";

export function createInitialState({
  config,
  codexWorkspaceDir,
  qqProactiveInterestPreset,
  startedAt = new Date().toISOString()
}) {
  const interestModel = resolveInterestModelRuntimeConfig(config.qqProactiveJudgeProvider, config);
  return {
    network: {
      allowLanAccess: false,
      publicTunnelEnabled: false
    },
    ai: {
      provider: "codex-cli",
      model: config.codexModel || "default",
      reasoningEffort: config.codexReasoningEffort,
      workspace: codexWorkspaceDir
    },
    channels: {
      qq: false
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
          provider: interestModel.provider,
          model: config.qqProactiveJudgeModel,
          baseUrl: interestModel.baseUrl,
          timeoutMs: config.qqProactiveJudgeTimeoutMs,
          minInterest: config.qqProactiveJudgeMinInterest,
          maxRecentMessages: 8,
          apiKeyConfigured: interestModel.apiKeyConfigured,
          preset: qqProactiveInterestPreset
        }
      },
      commandPermissions: {
        publicCommands: createRecord(),
        userCommands: createRecord()
      },
      codexSession: {
        settings: normalizeQqCodexSessionSettings(),
        store: createEmptyQqCodexSessionStore()
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
        recentMessages: createRecord(),
        shortTermNotes: createRecord()
      },
      publicMemory: {
        enabled: true,
        maxEntries: 120,
        entries: []
      },
      knowledgeBase: createEmptyQqKnowledgeBase(),
      personas: {
        groups: createRecord()
      },
      selfPersona: createEmptyQqSelfPersona(),
      periodicRuntime: createEmptyQqPeriodicRuntime(),
      conversationMemory: createEmptyQqConversationMemory()
    },
    unifiedMemory: {
      autoWriteOnSkillRecall: false,
      manualHandoffCommand: true
    },
    unifiedMemoryPendingClear: null,
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
