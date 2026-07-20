const validStickerSendModes = new Set(["combined", "sticker_only", "separate"]);

export function formatQqStickerSendModeInstruction({ bubbleSeparator = "|||" } = {}) {
  const separator = normalizeBubbleSeparator(bubbleSeparator);
  return [
    "表情包每轮最多 1 张：图文合并=文字后同气泡写 [[qq_sticker:真实表情名]]；仅表情包=只写该标记。",
    `分开发送=文字后单独一行写 ${separator}，下一气泡只写表情标记。三种方式选一种，不重复标记。`
  ].join("\n");
}

export function buildQqStickerReply(text, stickerName, {
  mode = "combined",
  bubbleSeparator = "|||"
} = {}) {
  const visibleText = String(text || "").trim();
  const name = String(stickerName || "").trim();
  if (!name) return visibleText;
  const marker = `[[qq_sticker:${name}]]`;
  const normalizedMode = validStickerSendModes.has(mode) ? mode : "combined";
  if (normalizedMode === "sticker_only" || !visibleText) return marker;
  if (normalizedMode === "separate") {
    return `${visibleText}\n${normalizeBubbleSeparator(bubbleSeparator)}\n${marker}`;
  }
  return `${visibleText}\n${marker}`;
}

function normalizeBubbleSeparator(value) {
  return String(value || "").trim() || "|||";
}
