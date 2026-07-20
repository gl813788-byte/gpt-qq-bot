import { normalizeQqKnowledgeBase } from "./qq-knowledge-base.js";

export function buildQqKnowledgeStoreLogDetails(store, details = {}) {
  const normalized = normalizeQqKnowledgeBase(store);
  return {
    source: String(details.source || "startup"),
    outcome: String(details.outcome || "loaded"),
    created: Boolean(details.created),
    migrated: Boolean(details.migrated),
    writable: details.writable !== false,
    titleCount: normalized.entries.length,
    slangCount: normalized.entries.filter((entry) => entry.kind === "slang").length,
    variantCount: normalized.entries.reduce((total, entry) => total + entry.variants.length, 0),
    groupCount: Object.keys(normalized.groups).length,
    personCount: Object.keys(normalized.people).length,
    reviewHistoryCount: normalized.reviewHistory.length,
    updatedAt: normalized.updatedAt || null
  };
}

export function buildQqKnowledgePatchLogDetails(result, details = {}) {
  const applied = Array.isArray(result?.applied) ? result.applied : [];
  const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
  const actionCounts = countBy(applied, (item) => item?.action || "unknown");
  const kindCounts = countBy(applied, (item) => item?.kind || "unknown");
  return {
    source: String(details.source || "unknown"),
    outcome: applied.length > 0 ? "updated" : rejected.length > 0 ? "rejected" : "unchanged",
    groupId: optionalId(details.groupId),
    senderId: optionalId(details.senderId),
    appliedCount: applied.length,
    rejectedCount: rejected.length,
    actionCounts,
    kindCounts,
    titles: unique(applied.map((item) => item?.title)).slice(0, 12),
    items: applied.slice(0, 12).map((item) => ({
      action: String(item?.action || "unknown"),
      kind: String(item?.kind || "unknown"),
      title: String(item?.title || "").slice(0, 120),
      entryId: optionalId(item?.entryId),
      variantId: optionalId(item?.variantId),
      removedCount: Math.max(0, Number(item?.removed) || 0),
      scope: summarizeQqKnowledgeScope(item?.scope)
    })),
    rejectionReasons: unique(rejected.map((item) => item?.reason)).slice(0, 8)
  };
}

export function buildQqKnowledgeMatchLogDetails(matches, usageResult = {}, details = {}) {
  const normalizedMatches = Array.isArray(matches) ? matches : [];
  const recorded = Array.isArray(usageResult?.recorded) ? usageResult.recorded : [];
  return {
    source: String(details.source || "qq-message"),
    outcome: recorded.length > 0 ? "recorded" : normalizedMatches.length > 0 ? "duplicate" : "no-match",
    groupId: optionalId(details.groupId),
    senderId: optionalId(details.senderId),
    messageId: optionalId(details.messageId),
    matchedTitleCount: normalizedMatches.length,
    recordedHitCount: recorded.length,
    contextExtendedCount: Math.max(0, Number(usageResult?.contextExtendedCount) || 0),
    titles: unique(normalizedMatches.map((item) => item?.title)).slice(0, 12),
    matchedTerms: unique(normalizedMatches.map((item) => item?.matchedTerm)).slice(0, 12),
    hits: recorded.slice(0, 24).map((item) => ({
      entryId: optionalId(item?.entryId),
      variantId: optionalId(item?.variantId),
      title: String(item?.title || "").slice(0, 120),
      matchedTerm: String(item?.matchedTerm || "").slice(0, 80),
      hitCount: Math.max(0, Number(item?.hitCount) || 0),
      scope: summarizeQqKnowledgeScope(item?.scope)
    }))
  };
}

export function buildQqKnowledgeQueryLogDetails(details = {}) {
  return {
    source: String(details.source || "internal-tool"),
    action: String(details.action || "list"),
    outcome: "completed",
    groupId: optionalId(details.groupId),
    senderId: optionalId(details.senderId),
    query: details.query == null ? null : String(details.query).slice(0, 160),
    range: summarizeQqKnowledgeScope(details.range),
    resultCount: Math.max(0, Number(details.resultCount) || 0)
  };
}

export function summarizeQqKnowledgeScope(scope = {}) {
  const type = String(scope?.type || "unknown");
  const output = { type };
  if (scope?.groupId != null && scope.groupId !== "") output.groupId = String(scope.groupId);
  if (scope?.groupName) output.groupName = String(scope.groupName).slice(0, 100);
  if (scope?.userId != null && scope.userId !== "") output.userId = String(scope.userId);
  if (scope?.userName) output.userName = String(scope.userName).slice(0, 100);
  if (Array.isArray(scope?.groups) && scope.groups.length > 0) {
    output.groups = scope.groups.slice(0, 12).map((group) => ({
      groupId: optionalId(group?.groupId),
      groupName: String(group?.groupName || "").slice(0, 100)
    }));
  }
  return output;
}

function countBy(items, select) {
  const output = {};
  for (const item of items) {
    const key = String(select(item) || "unknown");
    output[key] = Number(output[key] || 0) + 1;
  }
  return output;
}

function unique(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function optionalId(value) {
  return value == null || value === "" ? null : String(value).slice(0, 120);
}
