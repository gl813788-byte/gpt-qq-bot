const BOT_MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

export function readDashboardBotSettings(state) {
  const qq = state?.qq || {};
  const proactive = qq.proactive || {};
  const judge = proactive.judge || {};
  return {
    enhancerEnabled: qq.enhancer?.enabled !== false,
    webLookupEnabled: qq.webLookup?.enabled !== false,
    proactiveEnabled: proactive.enabled === true,
    judgeEnabled: judge.enabled !== false,
    judgeEveryMessages: boundedInteger(proactive.judgeEveryMessages, 1, 1000, 20),
    judgeEveryMinutes: boundedInteger(proactive.judgeEveryMinutes, 0, 1440, 5),
    judgeModel: String(judge.model || ""),
    judgeTimeoutMs: boundedInteger(judge.timeoutMs, 1500, 20000, 6500),
    judgeMaxRecentMessages: boundedInteger(judge.maxRecentMessages, 1, 12, 8),
    judgeProvider: String(judge.provider || "openrouter"),
    judgeApiKeyConfigured: Boolean(judge.apiKeyConfigured)
  };
}

export function applyDashboardBotSettings(state, input) {
  if (!state?.qq || !input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Bot settings must be a JSON object");
  }
  const previous = readDashboardBotSettings(state);
  const next = normalizePatch(input, previous);

  state.qq.enhancer.enabled = next.enhancerEnabled;
  state.qq.webLookup.enabled = next.webLookupEnabled;
  state.qq.proactive.enabled = next.proactiveEnabled;
  state.qq.proactive.judge.enabled = next.judgeEnabled;
  state.qq.proactive.judgeEveryMessages = next.judgeEveryMessages;
  state.qq.proactive.judgeEveryMinutes = next.judgeEveryMinutes;
  state.qq.proactive.judge.model = next.judgeModel;
  state.qq.proactive.judge.timeoutMs = next.judgeTimeoutMs;
  state.qq.proactive.judge.maxRecentMessages = next.judgeMaxRecentMessages;

  return {
    settings: readDashboardBotSettings(state),
    restore() {
      state.qq.enhancer.enabled = previous.enhancerEnabled;
      state.qq.webLookup.enabled = previous.webLookupEnabled;
      state.qq.proactive.enabled = previous.proactiveEnabled;
      state.qq.proactive.judge.enabled = previous.judgeEnabled;
      state.qq.proactive.judgeEveryMessages = previous.judgeEveryMessages;
      state.qq.proactive.judgeEveryMinutes = previous.judgeEveryMinutes;
      state.qq.proactive.judge.model = previous.judgeModel;
      state.qq.proactive.judge.timeoutMs = previous.judgeTimeoutMs;
      state.qq.proactive.judge.maxRecentMessages = previous.judgeMaxRecentMessages;
    }
  };
}

function normalizePatch(input, current) {
  const next = { ...current };
  assignBoolean(input, "enhancerEnabled", next);
  assignBoolean(input, "webLookupEnabled", next);
  assignBoolean(input, "proactiveEnabled", next);
  assignBoolean(input, "judgeEnabled", next);

  next.judgeEveryMessages = optionalInteger(input, "judgeEveryMessages", 1, 1000, next.judgeEveryMessages);
  next.judgeEveryMinutes = optionalInteger(input, "judgeEveryMinutes", 0, 1440, next.judgeEveryMinutes);
  next.judgeTimeoutMs = optionalInteger(input, "judgeTimeoutMs", 1500, 20000, next.judgeTimeoutMs);
  next.judgeMaxRecentMessages = optionalInteger(input, "judgeMaxRecentMessages", 1, 12, next.judgeMaxRecentMessages);

  if (Object.hasOwn(input, "judgeModel")) {
    const model = String(input.judgeModel || "").trim();
    if (!model || model.length > 160 || !BOT_MODEL_PATTERN.test(model)) {
      throw new RangeError("judgeModel must be a valid provider model id");
    }
    next.judgeModel = model;
  }

  if (Object.hasOwn(input, "proactiveEnabled") && next.proactiveEnabled) next.enhancerEnabled = true;
  else if (!next.enhancerEnabled) next.proactiveEnabled = false;
  return next;
}

function assignBoolean(input, key, output) {
  if (!Object.hasOwn(input, key)) return;
  if (typeof input[key] !== "boolean") throw new TypeError(`${key} must be a boolean`);
  output[key] = input[key];
}

function optionalInteger(input, key, min, max, fallback) {
  if (!Object.hasOwn(input, key)) return fallback;
  const number = Number(input[key]);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new RangeError(`${key} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function boundedInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}
