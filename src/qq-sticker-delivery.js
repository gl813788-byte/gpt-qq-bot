const validStickerSendModes = new Set(["combined", "sticker_only", "separate"]);

export function formatQqStickerSendModeInstruction({ bubbleSeparator = "|||" } = {}) {
  const separator = normalizeBubbleSeparator(bubbleSeparator);
  return [
    "表情包按当前语境选择一种发送方式，三种都支持：",
    "1. 图文合并：先写文字，再在同一个气泡内写 [[qq_sticker:真实表情名]]，两者之间不要放多气泡分隔符。",
    "2. 仅表情包：最终可见回复只写 [[qq_sticker:真实表情名]]，不要补文字。",
    `3. 分开发送：先写文字，再单独一行写 ${separator}，下一条气泡只写 [[qq_sticker:真实表情名]]；Hub 会按“文字、表情包”的顺序分别发送。`,
    "每轮最多选择 1 张表情包和 1 种发送方式，不要重复表情包 marker。"
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
