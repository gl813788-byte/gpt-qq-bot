const repeatCountKey = "consecutiveRepeatCount";

export function compactConsecutiveQqMessages(messages = [], { isConsecutive } = {}) {
  const input = Array.isArray(messages) ? messages : [];
  const output = [];
  let run = [];
  let runSignature = "";

  const flush = () => {
    if (run.length === 0) return;
    const total = run.reduce((sum, item) => sum + normalizeRepeatCount(item?.[repeatCountKey]), 0);
    if (total < 2) {
      output.push(run[0]);
    } else {
      const representative = run.at(-1);
      output.push({
        ...representative,
        [repeatCountKey]: total,
        consecutiveRepeatStartedAt: run[0]?.consecutiveRepeatStartedAt || run[0]?.at || null
      });
    }
    run = [];
    runSignature = "";
  };

  for (const message of input) {
    const signature = buildQqMessageRepeatSignature(message);
    if (!signature) {
      flush();
      output.push(message);
      continue;
    }
    if (run.length > 0 && (signature !== runSignature
      || typeof isConsecutive === "function" && !isConsecutive(run.at(-1), message))) flush();
    run.push(message);
    runSignature = signature;
  }
  flush();
  return output;
}

export function getQqMessageConsecutiveRepeatCount(messages = [], messageId = "") {
  const targetId = String(messageId || "");
  if (!targetId) return 1;
  const found = compactConsecutiveQqMessages(messages)
    .find((message) => String(message?.messageId || message?.raw?.message_id || "") === targetId);
  return normalizeRepeatCount(found?.[repeatCountKey]);
}

export function formatQqConsecutiveRepeatSuffix(messageOrCount) {
  const count = normalizeRepeatCount(
    typeof messageOrCount === "number"
      ? messageOrCount
      : messageOrCount?.[repeatCountKey]
  );
  return count >= 2 ? `（连续重复 ${count} 条）` : "";
}

export function appendQqConsecutiveRepeatSuffix(text, messageOrCount) {
  return `${String(text || "")}${formatQqConsecutiveRepeatSuffix(messageOrCount)}`;
}

function buildQqMessageRepeatSignature(message = {}) {
  if (!message || typeof message !== "object") return "";
  const text = normalizeText(message.text ?? message.message);
  const mentions = normalizeMentions(message);
  const images = normalizeImages(message.images);
  const reply = normalizeReply(message.replyContext);
  const structural = {
    text,
    assistant: Boolean(message.isAssistant || message.senderId === "assistant" || message.sender === "bot"),
    mentions,
    images,
    reply,
    hasAtSegment: Boolean(message.hasAtSegment),
    hasReplySegment: Boolean(message.hasReplySegment)
  };
  if (!text && mentions.length === 0 && images.length === 0 && !reply
    && !structural.hasAtSegment && !structural.hasReplySegment) return "";
  return stableStringify(structural);
}

function normalizeRepeatCount(value) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count >= 2 ? count : 1;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeMentions(message) {
  const mentions = Array.isArray(message.atMentions) && message.atMentions.length > 0
    ? message.atMentions
    : Array.isArray(message.atTargets)
      ? message.atTargets.map((userId) => ({ userId }))
      : Array.isArray(message.mentions)
        ? message.mentions
        : [];
  return mentions.map((mention) => {
    if (mention && typeof mention === "object") {
      const userId = String(mention.userId ?? mention.qq ?? mention.id ?? "");
      return userId || normalizeText(mention.name ?? mention.userName ?? mention.label);
    }
    return String(mention || "");
  });
}

function normalizeImages(images) {
  return (Array.isArray(images) ? images : []).map((image) => {
    if (!image || typeof image !== "object") return String(image || "");
    const raw = image.raw && typeof image.raw === "object" ? image.raw : {};
    return String(image.file
      || raw.emoji_id
      || raw.emojiId
      || raw.key
      || image.url
      || stableStringify(raw));
  });
}

function normalizeReply(reply) {
  if (!reply || typeof reply !== "object") return null;
  return {
    text: normalizeText(reply.text),
    senderId: String(reply.senderId || ""),
    isSelf: Boolean(reply.isSelf),
    imageCount: Math.max(0, Number(reply.imageCount || (Array.isArray(reply.images) ? reply.images.length : 0))),
    images: normalizeImages(reply.images)
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
