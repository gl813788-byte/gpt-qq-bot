import { isAbsolute } from "node:path";
import { extractQqRichMessageContent } from "../../qq-message-content.js";
import { normalizeMentionIdentity } from "./mention-identities.js";

export function normalizeOneBotEvent(payload, { extractImageInputs = () => [] } = {}) {
  const segments = Array.isArray(payload?.message) ? payload.message : [];
  const hasAudioSegment = segments.some((segment) => ["record", "voice", "audio"].includes(
    String(segment?.type || "").toLowerCase()
  ));
  const textFromSegments = segments
    .filter((segment) => segment?.type === "text")
    .map((segment) => segment.data?.text ?? "")
    .join("")
    .trim();
  const hasAtSegment = segments.some((segment) => segment?.type === "at");
  const hasSelfAtSegment = segments.some((segment) => isSelfAtSegment(segment, payload.self_id));
  const atMentions = segments
    .filter((segment) => segment?.type === "at")
    .map((segment) => normalizeMentionIdentity({
      userId: segment.data?.qq ?? segment.data?.id ?? segment.data?.uin,
      name: segment.data?.name ?? segment.data?.card ?? segment.data?.nickname
    }))
    .filter(Boolean)
    .slice(0, 16);
  const atTargets = [...new Set(atMentions.map((mention) => mention.userId))];
  const replySegment = segments.find((segment) => segment?.type === "reply");
  const replyMessageId = replySegment?.data?.id || replySegment?.data?.message_id;
  const messageType = payload.message_type === "private" ? "private_message" : "group_message";
  const images = extractImageInputs(payload);
  const contentContext = extractQqRichMessageContent(segments, payload.raw_message || textFromSegments);
  const forwardIds = segments
    .filter((segment) => String(segment?.type || "").toLowerCase() === "forward")
    .map((segment) => String(segment?.data?.id || segment?.data?.res_id || "").trim())
    .filter(Boolean);
  for (const match of String(payload.raw_message || "").matchAll(/\[CQ:forward,[^\]]*\bid=([^,\]]+)/gi)) {
    if (match[1]) forwardIds.push(match[1]);
  }

  return {
    type: payload.message_type === "group" && hasSelfAtSegment ? "group_at" : messageType,
    selfId: normalizeQqIdentifier(payload.self_id),
    groupId: normalizeQqIdentifier(payload.group_id),
    groupName: compactGroupName(payload.group_name || payload.group?.name),
    senderId: normalizeQqIdentifier(payload.user_id),
    senderName: payload.sender?.card || payload.sender?.nickname || String(payload.user_id || "群友"),
    text: contentContext.displayText || payload.raw_message || textFromSegments,
    contentContext: {
      ...contentContext,
      forwardIds: [...new Set(forwardIds)]
    },
    images,
    hasAudioSegment,
    hasAtSegment,
    hasSelfAtSegment,
    atTargets,
    atMentions,
    hasReplySegment: Boolean(replySegment),
    replyMessageId: replyMessageId == null ? undefined : String(replyMessageId),
    isReplyToSelf: false,
    raw: payload
  };
}

export function isOneBotPokeNotice(payload) {
  return payload?.post_type === "notice"
    && payload?.notice_type === "notify"
    && payload?.sub_type === "poke";
}

export function isOneBotPokeToSelf(payload) {
  if (!isOneBotPokeNotice(payload)) return false;
  const selfId = normalizeQqIdentifier(payload.self_id) || "";
  const targetId = normalizeQqIdentifier(payload.target_id) || "";
  const senderId = getOneBotPokeSenderId(payload);
  return Boolean(selfId && targetId === selfId && senderId && senderId !== selfId);
}

export function getOneBotPokeSenderId(payload) {
  return normalizeQqIdentifier(payload?.sender_id ?? payload?.user_id ?? payload?.operator_id) || "";
}

export function normalizeOneBotPokeEvent(payload) {
  const senderId = getOneBotPokeSenderId(payload);
  const targetId = normalizeQqIdentifier(payload.target_id);
  const isGroup = payload.group_id != null;
  const senderName = payload.sender?.card || payload.sender?.nickname || `QQ ${senderId || "群友"}`;
  return {
    type: isGroup ? "group_poke" : "private_poke",
    selfId: normalizeQqIdentifier(payload.self_id),
    groupId: isGroup ? normalizeQqIdentifier(payload.group_id) : undefined,
    senderId,
    senderName,
    text: `${senderName} 拍了拍你。`,
    images: [],
    hasAudioSegment: false,
    hasAtSegment: false,
    hasSelfAtSegment: false,
    atTargets: [],
    hasReplySegment: false,
    replyMessageId: undefined,
    isReplyToSelf: false,
    poke: {
      targetId,
      rawInfo: payload.raw_info
    },
    raw: payload
  };
}

export function normalizeQqIdentifier(value) {
  const id = String(value ?? "").trim();
  return /^\d{4,20}$/.test(id) ? id : undefined;
}

function compactGroupName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function stripUntrustedQqLocalImagePaths(event) {
  if (!Array.isArray(event?.images)) return event;
  return {
    ...event,
    images: event.images.map((image) => {
      const file = String(image?.file || "").replace(/^file:\/\//, "");
      if (!isAbsolute(file)) return image;
      return { ...image, file: "", path: "", file_path: "", filePath: "" };
    })
  };
}

export function getEventDedupeKey(event) {
  const raw = event?.raw || {};
  if (raw.message_id != null) return `message_id:${raw.message_id}`;
  if (raw.message_seq != null && event.groupId && event.senderId) {
    return `message_seq:${event.groupId}:${event.senderId}:${raw.message_seq}`;
  }
  if (event?.poke || String(event?.type || "").endsWith("_poke")) {
    const scope = event.groupId ? `group:${event.groupId}` : `private:${event.senderId || ""}`;
    const targetId = event.poke?.targetId || raw.target_id || "";
    return `poke:${scope}:${event.senderId || ""}:${targetId}:${raw.time || ""}`;
  }
  return null;
}

export function createOneBotEventDeduplicator({
  ttlMs = 10 * 60_000,
  maxEntries = 10_000,
  now = () => Date.now()
} = {}) {
  const entries = new Map();
  return {
    remember(key) {
      if (!key) return false;
      const normalizedKey = String(key).slice(0, 256);
      const currentTime = now();
      while (entries.size > 0) {
        const [oldestKey, oldestAt] = entries.entries().next().value;
        if (currentTime - oldestAt <= ttlMs && entries.size < maxEntries) break;
        entries.delete(oldestKey);
      }
      if (entries.has(normalizedKey)) return true;
      entries.set(normalizedKey, currentTime);
      return false;
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    }
  };
}

function isSelfAtSegment(segment, selfId) {
  if (segment?.type !== "at" || selfId == null) return false;
  const target = segment.data?.qq ?? segment.data?.id ?? segment.data?.uin;
  return target != null && String(target) === String(selfId);
}
