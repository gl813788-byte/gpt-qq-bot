export const QQ_CODEX_SESSION_MODES = Object.freeze({
  TEMPORARY: "temporary",
  PERSISTENT: "persistent",
  AUTO: "auto"
});

const validModes = new Set(Object.values(QQ_CODEX_SESSION_MODES));
const maxStoredThreads = 64;

export function normalizeQqCodexSessionMode(value, fallback = QQ_CODEX_SESSION_MODES.AUTO) {
  const normalized = String(value || "").trim().toLowerCase();
  const aliases = {
    temporary: "temporary",
    temp: "temporary",
    ephemeral: "temporary",
    临时: "temporary",
    一次性: "temporary",
    persistent: "persistent",
    long: "persistent",
    长期: "persistent",
    长会话: "persistent",
    auto: "auto",
    automatic: "auto",
    自动: "auto"
  };
  const mode = aliases[normalized] || normalized;
  return validModes.has(mode) ? mode : fallback;
}

export function normalizeQqCodexSessionSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const scopes = Object.create(null);
  for (const [rawScopeId, rawMode] of Object.entries(source.scopes || {})) {
    const scopeId = String(rawScopeId || "").trim();
    const mode = normalizeQqCodexSessionMode(rawMode, "");
    if (scopeId && mode) scopes[scopeId] = mode;
  }
  return {
    defaultMode: normalizeQqCodexSessionMode(source.defaultMode),
    scopes
  };
}

export function createEmptyQqCodexSessionStore() {
  return {
    version: 1,
    updatedAt: null,
    threads: Object.create(null)
  };
}

export function normalizeQqCodexSessionStore(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const entries = Object.entries(source.threads || {})
    .map(([scopeId, thread]) => normalizeThreadRecord(scopeId, thread))
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.updatedAt || "") - Date.parse(left.updatedAt || ""))
    .slice(0, maxStoredThreads);
  const threads = Object.create(null);
  for (const entry of entries) threads[entry.scopeId] = entry;
  return {
    version: 1,
    updatedAt: normalizeIso(source.updatedAt),
    threads
  };
}

export function resolveQqCodexSessionPlan({
  settings,
  store,
  scopeId,
  recentReplyEntries = [],
  now = Date.now()
} = {}) {
  const normalizedSettings = normalizeQqCodexSessionSettings(settings);
  const key = String(scopeId || "").trim();
  const configuredMode = normalizeQqCodexSessionMode(
    normalizedSettings.scopes[key],
    normalizedSettings.defaultMode
  );
  const existingThread = normalizeThreadRecord(key, store?.threads?.[key]);
  const recent6h = countRecentEntries(recentReplyEntries, now - 6 * 60 * 60 * 1000);
  const recent24h = countRecentEntries(recentReplyEntries, now - 24 * 60 * 60 * 1000);
  const existingThreadFresh = Boolean(
    existingThread
    && Date.parse(existingThread.updatedAt || "") >= now - 72 * 60 * 60 * 1000
  );
  const autoPersistent = existingThreadFresh || recent6h >= 3 || recent24h >= 5;
  const persistent = configuredMode === QQ_CODEX_SESSION_MODES.PERSISTENT
    || (configuredMode === QQ_CODEX_SESSION_MODES.AUTO && autoPersistent);
  return {
    scopeId: key,
    configuredMode,
    effectiveMode: persistent ? QQ_CODEX_SESSION_MODES.PERSISTENT : QQ_CODEX_SESSION_MODES.TEMPORARY,
    persistent,
    autoPersistent,
    existingThread,
    recentReplies6h: recent6h,
    recentReplies24h: recent24h,
    reason: configuredMode === QQ_CODEX_SESSION_MODES.AUTO
      ? existingThreadFresh
        ? "auto_existing_thread"
        : recent6h >= 3
          ? "auto_recent_6h"
          : recent24h >= 5
            ? "auto_recent_24h"
            : "auto_low_frequency"
      : `configured_${configuredMode}`
  };
}

export function upsertQqCodexSessionThread(store, {
  scopeId,
  threadId,
  model,
  reasoningEffort,
  lastContextAt,
  now = new Date().toISOString()
} = {}) {
  const normalized = normalizeQqCodexSessionStore(store);
  const key = String(scopeId || "").trim();
  const id = String(threadId || "").trim();
  if (!key || !id) return normalized;
  const previous = normalized.threads[key];
  normalized.threads[key] = {
    scopeId: key,
    threadId: id,
    createdAt: previous?.createdAt || normalizeIso(now) || new Date().toISOString(),
    updatedAt: normalizeIso(now) || new Date().toISOString(),
    lastContextAt: normalizeIso(lastContextAt) || previous?.lastContextAt || null,
    model: String(model || previous?.model || "").slice(0, 160),
    reasoningEffort: String(reasoningEffort || previous?.reasoningEffort || "").slice(0, 40)
  };
  return pruneQqCodexSessionThreads(normalized);
}

export function removeQqCodexSessionThread(store, scopeId) {
  const normalized = normalizeQqCodexSessionStore(store);
  delete normalized.threads[String(scopeId || "").trim()];
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function pruneQqCodexSessionThreads(store, limit = maxStoredThreads) {
  const normalized = normalizeQqCodexSessionStore(store);
  const keep = Math.max(1, Math.min(maxStoredThreads, Number(limit) || maxStoredThreads));
  const entries = Object.values(normalized.threads)
    .sort((left, right) => Date.parse(right.updatedAt || "") - Date.parse(left.updatedAt || ""))
    .slice(0, keep);
  const threads = Object.create(null);
  for (const entry of entries) threads[entry.scopeId] = entry;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    threads
  };
}

function normalizeThreadRecord(scopeId, value) {
  const key = String(scopeId || "").trim();
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const threadId = String(source.threadId || "").trim();
  if (!key || !threadId) return null;
  return {
    scopeId: key,
    threadId,
    createdAt: normalizeIso(source.createdAt),
    updatedAt: normalizeIso(source.updatedAt) || normalizeIso(source.createdAt),
    lastContextAt: normalizeIso(source.lastContextAt),
    model: String(source.model || "").slice(0, 160),
    reasoningEffort: String(source.reasoningEffort || "").slice(0, 40)
  };
}

function countRecentEntries(entries, cutoffMs) {
  return (Array.isArray(entries) ? entries : []).reduce((count, entry) => {
    const at = Date.parse(entry?.at || "");
    return count + (Number.isFinite(at) && at >= cutoffMs ? 1 : 0);
  }, 0);
}

function normalizeIso(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
