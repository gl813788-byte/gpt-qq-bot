import { parseAllowedOrigins } from "../http-utils.js";

const DEFAULT_QQ_PROACTIVE_JUDGE_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free";

export function createEnvironmentConfig(env = process.env) {
  const oneBotMaxConcurrency = boundedInteger(
    env.CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY,
    { defaultValue: 8, min: 1, max: 32 }
  );
  const oneBotMaxPending = boundedInteger(env.CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING, {
    defaultValue: 32,
    min: 0,
    max: 256
  });
  const codexMaxConcurrency = boundedInteger(env.CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY, {
    defaultValue: 2,
    min: 1,
    max: 8
  });
  const codexMaxPending = boundedInteger(env.CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING, {
    defaultValue: 32,
    min: 0,
    max: 256
  });
  const sqliteTimeoutMs = boundedInteger(env.CODEX_REMOTE_CONTACT_SQLITE_TIMEOUT_MS, {
    defaultValue: 8_000,
    min: 1_000,
    max: 30_000
  });
  const sqliteMaxOutputBytes = boundedInteger(env.CODEX_REMOTE_CONTACT_SQLITE_MAX_OUTPUT_BYTES, {
    defaultValue: 2 * 1024 * 1024,
    min: 64 * 1024,
    max: 16 * 1024 * 1024
  });
  const codexQuotaCacheTtlMs = boundedInteger(env.CODEX_REMOTE_CONTACT_QUOTA_CACHE_TTL_MS, {
    defaultValue: 30_000,
    min: 5_000,
    max: 5 * 60_000
  });
  const qqImageMaxBytes = boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_IMAGE_MAX_BYTES, {
    defaultValue: 20 * 1024 * 1024,
    min: 256 * 1024,
    max: 100 * 1024 * 1024
  });
  const hubPort = parsePort(env.CODEX_REMOTE_CONTACT_PORT, 3789);
  const qqWebLookupTimeoutMs = numberOrDefault(
    env.CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS
      || env.CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP_TIMEOUT_MS,
    12_000
  );
  const imessageAttachmentSendingEnabled = env.CODEX_REMOTE_CONTACT_IMESSAGE_ATTACHMENTS === "1";
  const imessageCodexModel = env.CODEX_REMOTE_CONTACT_IMESSAGE_CODEX_MODEL || "gpt-5.4";
  const imessageCodexReasoningEffort = env.CODEX_REMOTE_CONTACT_IMESSAGE_REASONING_EFFORT || "medium";

  return {
    logMaxBytes: numberOrDefault(env.CODEX_REMOTE_CONTACT_LOG_MAX_BYTES, 5 * 1024 * 1024),
    logMaxFiles: numberOrDefault(env.CODEX_REMOTE_CONTACT_LOG_MAX_FILES, 5),
    logLevel: env.CODEX_REMOTE_CONTACT_LOG_LEVEL || "debug",
    logConsoleOutput: env.CODEX_REMOTE_CONTACT_LOG_CONSOLE !== "0",
    logConsoleLevels: env.CODEX_REMOTE_CONTACT_LOG_CONSOLE_LEVELS || "success,warn,error",

    oneBotApiBase: env.ONEBOT_API_BASE || "http://127.0.0.1:3000",
    oneBotAccessToken: String(env.ONEBOT_ACCESS_TOKEN || env.CODEX_REMOTE_CONTACT_ONEBOT_TOKEN || "").trim(),
    environmentManagementApiToken: String(env.CODEX_REMOTE_CONTACT_API_TOKEN || "").trim(),
    oneBotRequestTimeoutMs: boundedInteger(env.CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS, {
      defaultValue: 10_000,
      min: 1_000,
      max: 30_000
    }),
    oneBotHealthTtlMs: boundedInteger(env.CODEX_REMOTE_CONTACT_ONEBOT_HEALTH_TTL_MS, {
      defaultValue: 15_000,
      min: 5_000,
      max: 60_000
    }),
    oneBotMaxConcurrency,
    oneBotMaxPending,

    codexCliPath: env.CODEX_CLI_PATH || "/Applications/Codex.app/Contents/Resources/codex",
    codexModel: env.CODEX_REMOTE_CONTACT_CODEX_MODEL || "gpt-5.4-mini",
    codexReasoningEffort: env.CODEX_REMOTE_CONTACT_REASONING_EFFORT || "low",
    codexMaxConcurrency,
    codexMaxPending,
    imessageCodexModel,
    imessageCodexReasoningEffort,
    codexQuotaCacheTtlMs,

    qqEnhancerEnabled: env.CODEX_REMOTE_CONTACT_QQ_ENHANCER !== "0",
    qqMemoryLimit: numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT, 10),
    qqGroupMemoryLimit: numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT, 200),
    qqProactiveReplyEnabled: env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE !== "0",
    qqProactiveJudgeEveryMessages: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE_EVERY_MESSAGES, {
      defaultValue: 20,
      min: 1,
      max: 1_000
    }),
    qqProactiveJudgeEveryMinutes: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE_EVERY_MINUTES, {
      defaultValue: 5,
      min: 0,
      max: 1_440
    }),
    qqProactiveMinutePollMs: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_MINUTE_POLL_MS, {
      defaultValue: 15_000,
      min: 5_000,
      max: 60_000
    }),
    qqProactiveJudgeEnabled: env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE !== "0",
    qqAccountStickersEnabled: env.CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKERS !== "0",
    qqAccountStickerCount: Math.max(1, numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKER_COUNT, 80)),
    qqAccountStickerCacheMs: Math.max(
      30_000,
      numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKER_CACHE_MS, 5 * 60_000)
    ),
    defaultQqProactiveJudgeModel: DEFAULT_QQ_PROACTIVE_JUDGE_MODEL,
    qqProactiveJudgeModel: env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE_MODEL || DEFAULT_QQ_PROACTIVE_JUDGE_MODEL,
    qqProactiveJudgeTimeoutMs: numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE_TIMEOUT_MS, 6_500),
    qqProactiveJudgeMinInterest: 20,
    qqSelfPersonaScopeInitialMessages: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_INITIAL_MESSAGES, {
      defaultValue: 64,
      min: 16,
      max: 200
    }),
    qqSelfPersonaScopeMessages: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_MESSAGES, {
      defaultValue: 96,
      min: 16,
      max: 400
    }),
    qqSelfPersonaScopeBotReplies: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_BOT_REPLIES, {
      defaultValue: 24,
      min: 4,
      max: 160
    }),
    qqSelfPersonaScopeCooldownHours: boundedNumber(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_COOLDOWN_HOURS, {
      defaultValue: 4,
      min: 1,
      max: 168
    }),
    qqSelfPersonaGenerationInitialMessages: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_INITIAL_MESSAGES, {
      defaultValue: 160,
      min: 40,
      max: 1_000
    }),
    qqSelfPersonaGenerationMessages: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_MESSAGES, {
      defaultValue: 320,
      min: 40,
      max: 2_000
    }),
    qqSelfPersonaGenerationBotReplies: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_BOT_REPLIES, {
      defaultValue: 80,
      min: 12,
      max: 600
    }),
    qqSelfPersonaGenerationScopeSummaries: boundedInteger(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_SCOPE_SUMMARIES, {
      defaultValue: 12,
      min: 2,
      max: 40
    }),
    qqSelfPersonaGenerationCooldownHours: boundedNumber(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_COOLDOWN_HOURS, {
      defaultValue: 12,
      min: 1,
      max: 720
    }),
    qqSelfPersonaFailureRetryHours: boundedNumber(env.CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_FAILURE_RETRY_HOURS, {
      defaultValue: 1,
      min: 0.25,
      max: 24
    }),
    qqWebLookupEnabled: env.CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP !== "0",
    qqWebLookupTimeoutMs,
    qqWebLookupAttemptTimeoutMs: numberOrDefault(
      env.CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS,
      Math.min(6_500, Math.max(2_500, Math.floor(qqWebLookupTimeoutMs * 0.55)))
    ),
    qqWebSearchProvider: String(env.CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER || "auto").trim().toLowerCase(),
    qqWebSearchPreset: String(env.CODEX_REMOTE_CONTACT_QQ_WEB_PRESET || "balanced").trim().toLowerCase(),
    qqWebSearchProviderConfig: String(env.CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS || "").trim(),
    qqSocialExtensionBase: String(env.CODEX_REMOTE_CONTACT_QQ_SOCIAL_API_BASE || "").trim().replace(/\/$/, ""),
    qqOwnerFileImageTasksEnabled: env.CODEX_REMOTE_CONTACT_QQ_OWNER_FILE_IMAGE_TASKS !== "0",
    qqImageMaxBytes,
    qqBubbleSeparator: normalizeBubbleSeparator(env.CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR),
    qqBubbleSendDelayMs: Math.max(0, numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEND_DELAY_MS, 650)),
    qqBubbleMaxCount: Math.max(1, numberOrDefault(env.CODEX_REMOTE_CONTACT_QQ_BUBBLE_MAX_COUNT, 6)),

    openRouterApiKey: env.OPENROUTER_API_KEY || env.CODEX_REMOTE_CONTACT_OPENROUTER_API_KEY || "",
    openRouterBaseUrl: env.OPENROUTER_BASE_URL || env.CODEX_REMOTE_CONTACT_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    tavilyApiKey: env.TAVILY_API_KEY || env.CODEX_REMOTE_CONTACT_TAVILY_API_KEY || "",

    imessageMemoryLimit: numberOrDefault(env.CODEX_REMOTE_CONTACT_IMESSAGE_MEMORY_LIMIT, 120),
    imessageAttachmentSendingEnabled,
    imessageImageDelivery: env.CODEX_REMOTE_CONTACT_IMESSAGE_IMAGE_DELIVERY
      || (imessageAttachmentSendingEnabled ? "attachment" : "photos"),
    remoteExecutionMemoryLimit: numberOrDefault(env.CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MEMORY_LIMIT, 160),
    remoteExecutionIdleTtlMs: numberOrDefault(env.CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_IDLE_TTL_MS, 15 * 60_000),
    remoteExecutionModel: env.CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MODEL || imessageCodexModel,
    remoteExecutionReasoningEffort: env.CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_REASONING_EFFORT || imessageCodexReasoningEffort,
    remoteExecutionSkill: env.CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_SKILL || "none",
    sqliteTimeoutMs,
    sqliteMaxOutputBytes,

    hubPort,
    hubHostOverride: String(env.CODEX_REMOTE_CONTACT_HOST || "").trim(),
    hubAllowedOrigins: parseAllowedOrigins(env.CODEX_REMOTE_CONTACT_CORS_ORIGINS, [
      `http://127.0.0.1:${hubPort}`,
      `http://localhost:${hubPort}`,
      `http://[::1]:${hubPort}`
    ]),
    allowRemoteHubBinding: env.CODEX_REMOTE_CONTACT_ALLOW_REMOTE === "1",
    proxyShortcutName: env.CODEX_REMOTE_CONTACT_PROXY_TOGGLE_SHORTCUT || "切换VPN",
    proxyConfirmTtlMs: numberOrDefault(env.CODEX_REMOTE_CONTACT_PROXY_CONFIRM_TTL_MS, 3 * 60_000)
  };
}

function numberOrDefault(value, defaultValue) {
  return Number(value || defaultValue);
}

function boundedInteger(value, { defaultValue, min, max }) {
  const number = Number(String(value ?? "").trim() || defaultValue);
  if (!Number.isFinite(number)) return defaultValue;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function boundedNumber(value, { defaultValue, min, max }) {
  const number = Number(value || defaultValue);
  if (!Number.isFinite(number)) return defaultValue;
  return Math.max(min, Math.min(max, number));
}

function normalizeBubbleSeparator(value) {
  return String(value || "").trim() || "|||";
}

function parsePort(value, defaultValue) {
  const port = Number(value || defaultValue);
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : defaultValue;
}
