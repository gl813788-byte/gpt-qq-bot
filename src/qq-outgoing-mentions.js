const defaultCacheTtlMs = 5 * 60 * 1000;
const defaultMaxCachedGroups = 64;
const defaultMaxMentions = 8;

export function createQqOutgoingMentionResolver({
  loadGroupMembers = async () => [],
  cacheTtlMs = defaultCacheTtlMs,
  maxCachedGroups = defaultMaxCachedGroups
} = {}) {
  const cache = new Map();
  const ttl = normalizeBoundedInteger(cacheTtlMs, 1_000, 60 * 60 * 1000, defaultCacheTtlMs);
  const cacheLimit = normalizeBoundedInteger(maxCachedGroups, 1, 256, defaultMaxCachedGroups);

  async function getGroupMembers(groupId) {
    const key = normalizeId(groupId);
    if (!key) return [];
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.members;
    const members = await Promise.resolve(loadGroupMembers(key));
    const normalized = normalizeMentionIdentities(members);
    cache.delete(key);
    cache.set(key, {
      members: normalized,
      expiresAt: now + ttl
    });
    while (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
    return normalized;
  }

  return {
    async resolve({
      groupId,
      text,
      localIdentities = [],
      selfId = "",
      maxMentions = defaultMaxMentions
    } = {}) {
      const source = String(text || "");
      if (!source.includes("@")) {
        return buildQqOutgoingMentionSegments(source, {
          identities: localIdentities,
          selfId,
          maxMentions
        });
      }
      let groupMembers = [];
      let loadError = null;
      try {
        groupMembers = await getGroupMembers(groupId);
      } catch (error) {
        loadError = error;
      }
      return {
        ...buildQqOutgoingMentionSegments(source, {
          identities: [...localIdentities, ...groupMembers],
          selfId,
          maxMentions
        }),
        loadError
      };
    },

    clear(groupId = "") {
      const key = normalizeId(groupId);
      if (key) return cache.delete(key);
      cache.clear();
      return true;
    },

    snapshot() {
      return { cachedGroups: cache.size };
    }
  };
}

export function buildQqOutgoingMentionSegments(text, {
  identities = [],
  selfId = "",
  maxMentions = defaultMaxMentions
} = {}) {
  const source = String(text || "");
  const self = normalizeId(selfId);
  const limit = normalizeBoundedInteger(maxMentions, 1, 16, defaultMaxMentions);
  const aliases = buildUniqueAliasTargets(identities, self);
  const segments = [];
  const mentionIds = [];
  const mentionLabels = [];
  const unresolvedMentions = [];
  let cursor = 0;
  let searchFrom = 0;

  while (mentionIds.length < limit) {
    const atIndex = source.indexOf("@", searchFrom);
    if (atIndex < 0) break;
    const resolved = resolveMentionAt(source, atIndex, aliases, self);
    if (!resolved) {
      const unresolved = readPotentialMention(source, atIndex);
      if (unresolved && !unresolvedMentions.includes(unresolved)) unresolvedMentions.push(unresolved);
      searchFrom = atIndex + 1;
      continue;
    }
    appendTextSegment(segments, source.slice(cursor, atIndex));
    segments.push({
      type: "at",
      data: { qq: resolved.userId }
    });
    appendTextSegment(segments, " ");
    mentionIds.push(resolved.userId);
    mentionLabels.push(resolved.label);
    cursor = consumeFollowingWhitespace(source, resolved.end);
    searchFrom = cursor;
  }

  appendTextSegment(segments, source.slice(cursor));
  return {
    segments,
    mentionIds,
    mentionLabels,
    unresolvedMentions,
    loadError: null
  };
}

function resolveMentionAt(source, atIndex, aliases, selfId) {
  const rest = source.slice(atIndex + 1);
  const numeric = rest.match(/^(\d{4,20})(?=$|[\s,，。.!！?？:：;；、)\]）}])/);
  if (numeric) {
    const userId = normalizeId(numeric[1]);
    if (userId && userId !== selfId) {
      return {
        userId,
        label: numeric[1],
        end: atIndex + 1 + numeric[1].length
      };
    }
  }
  for (const alias of aliases) {
    if (!rest.startsWith(alias.name)) continue;
    const end = atIndex + 1 + alias.name.length;
    if (!isMentionBoundary(source[end])) continue;
    return {
      userId: alias.userId,
      label: alias.name,
      end
    };
  }
  return null;
}

function buildUniqueAliasTargets(identities, selfId) {
  const aliasTargets = new Map();
  for (const identity of Array.isArray(identities) ? identities : []) {
    const userId = normalizeId(
      identity?.userId
      ?? identity?.senderId
      ?? identity?.qq
      ?? identity?.id
      ?? identity?.uin
      ?? identity?.user_id
    );
    if (!userId || userId === selfId) continue;
    const names = [
      identity?.card,
      identity?.nickname,
      identity?.name,
      identity?.userName,
      identity?.senderName,
      identity?.senderLabel,
      ...(Array.isArray(identity?.aliases) ? identity.aliases : [])
    ].map(normalizeAlias).filter(Boolean);
    for (const name of names) {
      if (/^\d{4,20}$/.test(name)) continue;
      const targets = aliasTargets.get(name) || new Set();
      targets.add(userId);
      aliasTargets.set(name, targets);
    }
  }
  return [...aliasTargets.entries()]
    .filter(([, targets]) => targets.size === 1)
    .map(([name, targets]) => ({
      name,
      userId: [...targets][0]
    }))
    .sort((left, right) => right.name.length - left.name.length || left.name.localeCompare(right.name, "zh-CN"));
}

function normalizeMentionIdentities(identities) {
  return (Array.isArray(identities) ? identities : [])
    .map((identity) => ({
      userId: normalizeId(
        identity?.userId
        ?? identity?.senderId
        ?? identity?.qq
        ?? identity?.id
        ?? identity?.uin
        ?? identity?.user_id
      ),
      card: normalizeAlias(identity?.card),
      nickname: normalizeAlias(identity?.nickname),
      name: normalizeAlias(identity?.name),
      aliases: Array.isArray(identity?.aliases) ? identity.aliases.map(normalizeAlias).filter(Boolean) : []
    }))
    .filter((identity) => identity.userId);
}

function normalizeAlias(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalizeId(value) {
  const id = String(value ?? "").trim();
  return /^\d{4,20}$/.test(id) ? id : "";
}

function isMentionBoundary(value) {
  return value == null || /[\s,，。.!！?？:：;；、)\]）}]/.test(value);
}

function consumeFollowingWhitespace(source, start) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function readPotentialMention(source, atIndex) {
  const value = source.slice(atIndex + 1).match(/^([^\s,，。.!！?？:：;；、)\]）}]{1,80})/u)?.[1];
  return value ? `@${value}` : "";
}

function appendTextSegment(segments, text) {
  if (!text) return;
  const previous = segments.at(-1);
  if (previous?.type === "text") previous.data.text += text;
  else segments.push({ type: "text", data: { text } });
}

function normalizeBoundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(minimum, Math.min(maximum, Math.floor(number)))
    : fallback;
}
