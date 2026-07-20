import { formatQqStickerSendModeInstruction } from "./qq-sticker-delivery.js";

const mediaOnlyPattern = /^(?:\[(?:图片|表情|语音|文件)(?:[^\]]*)?\]|[\p{Extended_Pictographic}\uFE0F\s]+)$/u;
const casualEmotionPattern = /(累|困|晕|烦|气死|难受|开心|高兴|想睡|睡懵|绷不住|笑死|离谱|无语|我去|卧槽|草|好耶|寄了|麻了)/i;
const imageQuestionPattern = /(看|看看|识别|评价|锐评|什么图|这是啥|这是什么|什么梗|什么意思|图里|截图|表情包)/i;
const socialRequestPattern = /(叫.{0,8}(?:爸爸|爹|妈)|揍|打|锤|夸我|骂我|亲一个|抱一下|给.{0,8}(?:点.{0,4}赞|点赞)|充.{0,8}(?:会员|svip)|借我|唱一个)/i;
const protectedMarkerPattern = /\[\[qq_(?:memory|image|file|sticker|command):[^\n]*?\]\]|\[\[qq_done\]\]/g;
const emojiCharacterPattern = /\p{Extended_Pictographic}/u;
const compactMediaTokenPattern = /\[(?:图片|表情|语音|文件)(?:[^\]]*)?\]/giu;

export function isQqStickerStyleMessage(entry = {}) {
  if (Number(entry?.stickerCount || 0) > 0) return true;
  const text = String(entry?.text || entry?.reply || "").trim();
  if (!text) return false;
  if (/\[\[qq_sticker:[^\]]+\]\]/i.test(text) || /^\[表情/.test(text)) return true;
  if (/\[CQ:face,/i.test(text)) return true;
  const cqImage = /\[CQ:image,/i.test(text) || /^,?file=[^,]+,/i.test(text);
  return cqImage && (
    /summary=\[(?:动画表情|动态表情|表情)[^\]]*\]/i.test(text)
    || /(?:emoji_id|emoji_package_id|package_id)=/i.test(text)
    || /(?:^|,)sub_type=1(?:,|\])/i.test(text)
  );
}

export function isQqImageStyleMessage(entry = {}) {
  const text = String(entry?.text || "").trim();
  if (isQqStickerStyleMessage(entry)) return false;
  return /^\[图片/.test(text)
    || /\[CQ:image,/i.test(text)
    || /^,?file=[^,]+,[\s\S]*url=/i.test(text)
    || (Array.isArray(entry?.images) && entry.images.length > 0);
}

export function getQqAdaptiveStickerChance(style = {}, { privateChat = false } = {}) {
  const learned = clamp(Number(style?.stickerMessageRatio || 0), 0, 1);
  return clamp(learned * 1.35 + 0.035, privateChat ? 0.08 : 0.10, privateChat ? 0.26 : 0.34);
}

export function analyzeQqHumanChatStyle(entries = [], { privateChat = false, windowSize = 160 } = {}) {
  const window = (Array.isArray(entries) ? entries : []).slice(-Math.max(20, windowSize));
  const humans = window.filter((entry) => !entry?.isAssistant && entry?.senderId !== "assistant");
  const textMessages = humans
    .map((entry) => getQqHumanVisibleText(entry))
    .filter((text) => text && !text.startsWith("/"));
  const lengths = textMessages.map(characterLength).sort((left, right) => left - right);
  const stickerMessages = humans.filter(isQqStickerStyleMessage).length;
  const imageMessages = humans.filter(isQqImageStyleMessage).length;
  const mediaMessages = humans.filter((entry) => isQqStickerStyleMessage(entry)
    || isQqImageStyleMessage(entry)
    || mediaOnlyPattern.test(String(entry?.text || "").trim())).length;
  const emojiMessages = humans.filter((entry) => emojiCharacterPattern.test(String(entry?.text || ""))).length;
  const emojiPalette = collectEmojiPalette(humans);
  const shortMessages = lengths.filter((length) => length <= 12).length;
  const multilineMessages = textMessages.filter((text) => /\n/.test(text)).length;
  const terminalPeriodMessages = textMessages.filter((text) => /。$/.test(text)).length;
  const questionMessages = textMessages.filter((text) => /[?？]/.test(text)).length;
  const runs = buildHumanMessageRuns(window);
  const multiRuns = runs.filter((run) => run.count >= 2);
  const messagesInMultiRuns = multiRuns.reduce((sum, run) => sum + run.count, 0);
  const runLengths = runs.map((run) => run.count).sort((left, right) => left - right);
  const timing = analyzeHumanTiming(window, humans);
  const median = quantile(lengths, 0.5, privateChat ? 16 : 8);
  const p90 = quantile(lengths, 0.9, privateChat ? 48 : 24);
  const reactionMax = clamp(Math.max(median, p90), 8, privateChat ? 30 : 18);
  const casualMax = clamp(Math.max(p90, median * 2), privateChat ? 18 : 10, privateChat ? 54 : 28);
  const answerMax = clamp(Math.max(p90 * 4, median * 6), privateChat ? 64 : 36, privateChat ? 180 : 96);
  return {
    sampleSize: humans.length,
    textSampleSize: textMessages.length,
    confidence: textMessages.length >= 40 ? "high" : textMessages.length >= 16 ? "medium" : "low",
    medianTextChars: median,
    p90TextChars: p90,
    shortMessageRatio: ratio(shortMessages, lengths.length),
    mediaMessageRatio: ratio(mediaMessages, humans.length),
    imageMessageRatio: ratio(imageMessages, humans.length),
    stickerMessageRatio: ratio(stickerMessages, humans.length),
    emojiMessageRatio: ratio(emojiMessages, humans.length),
    emojiPalette,
    replyMessageRatio: ratio(humans.filter((entry) => Boolean(entry?.replyContext)).length, humans.length),
    mentionMessageRatio: ratio(humans.filter((entry) => Array.isArray(entry?.atTargets) && entry.atTargets.length > 0).length, humans.length),
    multilineRatio: ratio(multilineMessages, textMessages.length),
    terminalPeriodRatio: ratio(terminalPeriodMessages, textMessages.length),
    questionRatio: ratio(questionMessages, textMessages.length),
    noTerminalPunctuationRatio: ratio(textMessages.filter((text) => !/[。！？!?…~～）)]$/.test(text)).length, textMessages.length),
    sameSpeakerContinuationRatio: ratio(Math.max(0, humans.length - runs.length), humans.length),
    multiMessageRunRatio: ratio(multiRuns.length, runs.length),
    messagesInMultiRunsRatio: ratio(messagesInMultiRuns, humans.length),
    runP90: quantile(runLengths, 0.9, 2),
    maxRun: runLengths.at(-1) || 1,
    messagesPerHour: timing.messagesPerHour,
    activeMinuteMedianMessages: timing.activeMinuteMedianMessages,
    activeMinuteP90Messages: timing.activeMinuteP90Messages,
    sameSpeakerGapMedianSeconds: timing.sameSpeakerGapMedianSeconds,
    speakerSwitchGapMedianSeconds: timing.speakerSwitchGapMedianSeconds,
    reactionMax,
    casualMax,
    answerMax,
    privateChat
  };
}

export function analyzeQqBotChatStyle(entries = [], { windowSize = 160 } = {}) {
  const window = (Array.isArray(entries) ? entries : []).slice(-Math.max(20, windowSize));
  const bots = window.filter((entry) => entry?.isAssistant || entry?.senderId === "assistant");
  const textMessages = bots
    .map((entry) => getQqHumanVisibleText(entry))
    .filter(Boolean);
  const lengths = textMessages.map(characterLength).sort((left, right) => left - right);
  const stickerMessages = bots.filter(isQqStickerStyleMessage).length;
  const multiBubbleMessages = bots.filter((entry) => Number(entry?.bubbleCount || 0) > 1
    || /(?:^|\n)\s*\|\|\|\s*(?:\n|$)/.test(String(entry?.text || ""))).length;
  const genericOpeningMessages = textMessages.filter((text) => /^(?:好的|好嘞|收到|明白了?|当然|没问题)[，,：:\s]?/.test(text)).length;
  const serviceEndingMessages = textMessages.filter((text) => /(?:如果|要是|需要|想要).{0,12}(?:我可以|我能|再帮|继续帮)|(?:还有什么|希望能帮到|随时告诉我)[^。！？!?]{0,8}[。！？!?]?$/.test(text)).length;
  return {
    sampleSize: bots.length,
    textSampleSize: textMessages.length,
    averageTextChars: lengths.length > 0 ? Number((lengths.reduce((sum, length) => sum + length, 0) / lengths.length).toFixed(1)) : 0,
    medianTextChars: quantile(lengths, 0.5, 0),
    p90TextChars: quantile(lengths, 0.9, 0),
    shortMessageRatio: ratio(lengths.filter((length) => length <= 12).length, lengths.length),
    stickerMessages,
    stickerMessageRatio: ratio(stickerMessages, bots.length),
    emojiMessageRatio: ratio(textMessages.filter((text) => emojiCharacterPattern.test(text)).length, textMessages.length),
    terminalPeriodRatio: ratio(textMessages.filter((text) => /。$/.test(text)).length, textMessages.length),
    noTerminalPunctuationRatio: ratio(textMessages.filter((text) => !/[。！？!?…~～）)]$/.test(text)).length, textMessages.length),
    questionRatio: ratio(textMessages.filter((text) => /[?？]/.test(text)).length, textMessages.length),
    multiBubbleRatio: ratio(multiBubbleMessages, bots.length),
    genericOpeningRatio: ratio(genericOpeningMessages, textMessages.length),
    serviceEndingRatio: ratio(serviceEndingMessages, textMessages.length)
  };
}

export function buildQqHumanBehaviorPlan(event = {}, intent = {}, style = {}, { text = "" } = {}) {
  const source = String(text || event?.text || "").replace(/\s+/g, " ").trim();
  const privateChat = Boolean(style.privateChat || event.type === "private_message" || !event.groupId);
  const hasImages = Boolean(intent.hasImages);
  const explicitImageQuestion = hasImages && imageQuestionPattern.test(source);
  const barePing = !source || /^[?？!！~～。\s]+$/.test(source);
  const emotional = casualEmotionPattern.test(source);
  let mode = "casual";
  let goal = "接住当前一句，不扩写成说明文";
  let maxChars = Number(style.casualMax || (privateChat ? 48 : 24));
  let maxSentences = privateChat ? 2 : 1;
  let compact = true;
  let openEnded = false;

  if (event.qqPrivateProactive) {
    mode = "private_proactive";
    goal = "结合这段私聊的频率、最近话题和自己的兴趣自然联系一次；没有具体内容就保持沉默";
    maxChars = Math.min(Number(style.casualMax || 28), 32);
    maxSentences = 1;
  } else if (event.qqColdProactive) {
    mode = "cold_proactive";
    goal = "知道当前是冷群场景后，根据自己的兴趣自由检索、探索并决定是否自然开启话题";
    maxChars = Number(style.answerMax || 88);
    maxSentences = 3;
    compact = false;
    openEnded = true;
  } else if (barePing) {
    mode = "ping";
    goal = "短促回应自己在场，必要时只问一句怎么了";
    maxChars = privateChat ? 12 : 8;
  } else if (event.queuedAggregate) {
    mode = "multi_turn";
    goal = "抓住连续消息里最后仍有效的主线，不逐条点名复述";
    maxChars = Number(style.answerMax || (privateChat ? 140 : 80));
    maxSentences = privateChat ? 3 : 2;
    compact = false;
  } else if (intent.hasForward || intent.links?.length) {
    mode = "shared_content";
    goal = intent.asksOpinion || intent.isQuestion
      ? "回应对方分享内容里真正问的点"
      : "先对分享内容作一个具体反应，不擅自写长篇摘要";
    maxChars = Math.min(Number(style.answerMax || 80), privateChat ? 130 : 72);
    maxSentences = privateChat ? 3 : 2;
    compact = !(intent.asksOpinion || intent.isQuestion);
  } else if (intent.asksRecent) {
    mode = "context_answer";
    goal = "直接承接前文回答，省略双方已经知道的背景";
    maxChars = Number(style.answerMax || (privateChat ? 140 : 88));
    maxSentences = privateChat ? 3 : 2;
    compact = false;
  } else if (intent.asksAction && source.length <= 40 && socialRequestPattern.test(source)) {
    mode = "social_request";
    goal = "把它当作群聊里的轻量请求或玩笑，能做就短报结果，不能做就短拒绝或接梗，不展开权限说明";
    maxChars = Math.min(Number(style.casualMax || 28) + 12, privateChat ? 62 : 38);
    maxSentences = 2;
  } else if (intent.asksAction) {
    mode = "task";
    goal = "先完成事情或给结果，再补唯一必要的说明";
    maxChars = privateChat ? 180 : 110;
    maxSentences = privateChat ? 4 : 3;
    compact = false;
  } else if (hasImages && !explicitImageQuestion) {
    mode = "visual_reaction";
    goal = "像群友看见图后接一句，不主动做图片解析报告";
    maxChars = Number(style.reactionMax || (privateChat ? 24 : 16));
  } else if (intent.asksOpinion) {
    mode = "opinion";
    goal = "先给鲜明但有分寸的看法，只补一个关键理由";
    maxChars = Math.min(Number(style.answerMax || 80), privateChat ? 110 : 64);
    maxSentences = 2;
    compact = false;
  } else if (intent.isQuestion || explicitImageQuestion) {
    mode = source.length <= 14 ? "casual_answer" : "answer";
    goal = source.length <= 14
      ? "直接回答短问题，不把它升级成百科说明"
      : "先给答案，再补最关键依据";
    maxChars = source.length <= 14
      ? Math.min(Number(style.answerMax || 72), privateChat ? 88 : 52)
      : Number(style.answerMax || (privateChat ? 150 : 88));
    maxSentences = source.length <= 14 ? 2 : (privateChat ? 3 : 2);
    compact = source.length <= 14;
  } else if (emotional) {
    mode = "social_emotion";
    goal = "回应情绪或处境本身，不立刻分析、教育或给方案";
    maxChars = Math.min(Number(style.casualMax || 28) + 8, privateChat ? 64 : 34);
    maxSentences = 2;
  }

  const multiBubbleChance = getMultiBubbleChance(mode, privateChat, style);
  const preferMultiBubble = multiBubbleChance > 0
    && stableFraction(`${event.groupId || "private"}:${event.senderId || ""}:${event.raw?.message_id || ""}:${source}`) < multiBubbleChance;
  const emojiChance = getEmojiChance(mode, source, style);
  const preferEmoji = emojiChance > 0
    && stableFraction(`emoji:${event.groupId || "private"}:${event.senderId || ""}:${event.raw?.message_id || ""}:${source}`) < emojiChance;
  const stickerChance = getStickerChance(mode, source, style, { privateChat, hasImages });
  const preferSticker = stickerChance > 0
    && stableFraction(`sticker:${event.groupId || "private"}:${event.senderId || ""}:${event.raw?.message_id || ""}:${source}`) < stickerChance;
  return {
    mode,
    goal,
    maxChars,
    maxSentences,
    compact,
    openEnded,
    preferMultiBubble,
    multiBubbleChance,
    maxBubbles: preferMultiBubble ? clamp(Number(style.runP90 || 2), 2, 3) : 1,
    preferEmoji,
    emojiChance,
    emojiPalette: Array.isArray(style.emojiPalette) ? style.emojiPalette.slice(0, 5) : [],
    preferSticker,
    stickerChance
  };
}

export function formatQqHumanBehaviorContext(style = {}, plan = {}, {
  proactive = false,
  bubbleSeparator = "|||"
} = {}) {
  const bubbles = plan.preferMultiBubble
    ? `本轮倾向连续发 2 条短气泡（最多 ${plan.maxBubbles || 2} 条）：第一条先接住/给结论，后面只补细节、后劲或接梗；没有自然的第二层意思就仍发 1 条，严禁凑数。`
    : "本轮默认 1 条气泡；确实有自然的补一句时才用 2 条，不把长文机械切碎。";
  const emojiInstruction = plan.preferEmoji
    ? `本轮可以自然带 1 个 emoji${plan.emojiPalette?.length ? `，近期群里常见的是 ${plan.emojiPalette.join(" ")}` : ""}；只在语气确实需要时用，不要每条固定挂同一个。`
    : "本轮不必为了像人而强塞文字 emoji。";
  const stickerInstruction = plan.preferSticker
    ? `本轮适合发 1 张语境匹配的表情包；如果可用表情库里有合适项，可以按语境选图文合并、仅表情包或文字与表情包分开发送。不要为了完成指标硬配无关表情。\n${formatQqStickerSendModeInstruction({ bubbleSeparator })}`
    : "本轮默认不发表情包；只有语境非常贴合时才例外使用 1 张。";
  return [
    `真人化动态规划（匿名统计样本 ${style.sampleSize || 0} 条；不模仿具体个人）：`,
    `- 模式：${plan.mode || "casual"}；目标：${plan.goal || "自然承接"}。`,
    plan.openEnded
      ? "- 冷群分支不额外设置硬性字数或句数限制；按找到的内容自然组织，但仍要像群聊而不是写报告。"
      : `- 可见正文建议控制在 ${plan.maxChars || 48} 字以内、最多 ${plan.maxSentences || 2} 句；任务正确性、必要解释和安全提示优先于字数。QQ 内部标记、链接和文件路径不计入字数。`,
    `- ${bubbles}`,
    `- ${emojiInstruction}`,
    `- 表情包规划：${stickerInstruction}`,
    "- 真人群聊通常只回应当前最值得接的一点，会省略双方已经知道的主语和背景；不要复述问题，不要把每句口语补成完整书面语。",
    "- 对方只是在分享、感叹或发图时，先给具体反应；没有求建议就不要自动分析、科普、安慰教程或列能力清单。",
    "- 可以自然用短句、语气词、问号或一个合适表情，但不要强塞网络黑话、错别字、口癖或装作真人。被问身份时仍如实说是 QQ 上的 AI 助手。",
    proactive
      ? "- 这是兴趣模型已经批准的执行轮。不要再次判断是否发言；只把批准的语义或主动模式写成自然消息。仅在安全边界或关键事实无法可靠确认时输出 [[qq_silent]]。"
      : null
  ].filter(Boolean).join("\n");
}

export function applyQqHumanReplyGuard(reply, plan = {}, style = {}, { bubbleSeparator = "|||" } = {}) {
  const raw = String(reply || "").trim();
  if (!raw || !plan.compact) return raw;
  const markers = [];
  let visible = raw.replace(protectedMarkerPattern, (marker) => {
    markers.push(marker);
    return "";
  }).trim();
  if (!visible) return raw;
  visible = visible.replace(/^(?:好的|好嘞|收到|明白了)[，,：:\s]+/, "");
  const maxChars = Math.max(6, Number(plan.maxChars || style.casualMax || 28));
  const hardMax = Math.ceil(maxChars * (plan.preferMultiBubble ? 2.3 : 1.45));
  let units = splitNaturalUnits(visible, bubbleSeparator);
  if (units.length === 1) {
    const clauses = splitNaturalClauses(visible);
    if (clauses.length > 1) units = clauses;
  }
  const allowedUnits = plan.preferMultiBubble
    ? Math.max(2, Number(plan.maxBubbles || 2))
    : Math.max(1, Number(plan.maxSentences || 1));
  const overBudget = characterLength(visible.replaceAll(bubbleSeparator, "")) > hardMax
    || (characterLength(visible.replaceAll(bubbleSeparator, "")) > maxChars && units.length > allowedUnits);
  if (overBudget && units.length > 1) {
    visible = units.slice(0, allowedUnits).join(plan.preferMultiBubble ? `\n${bubbleSeparator}\n` : "");
  }
  if (plan.preferMultiBubble && !visible.includes(bubbleSeparator)) {
    const refreshed = units.length >= 2 ? units : splitNaturalUnits(visible, bubbleSeparator);
    const bubbleCount = Math.min(Math.max(2, Number(plan.maxBubbles || 2)), refreshed.length);
    if (refreshed.length >= 2 && refreshed.slice(0, bubbleCount).every((unit) => characterLength(unit) <= Math.ceil(maxChars * 1.3))) {
      visible = refreshed.slice(0, bubbleCount).join(`\n${bubbleSeparator}\n`);
    }
  }
  visible = visible
    .split(`\n${bubbleSeparator}\n`)
    .map((bubble) => characterLength(bubble) <= 18 ? bubble.replace(/。$/u, "") : bubble)
    .join(`\n${bubbleSeparator}\n`)
    .trim();
  return [visible, ...markers].filter(Boolean).join("\n");
}

export function isQqSilentReply(reply) {
  const visible = String(reply || "").replace(protectedMarkerPattern, "").trim();
  return visible === "[[qq_silent]]";
}

export function getQqAdaptiveBubbleDelayMs(style = {}, { configuredMs = 650 } = {}) {
  const base = clamp(Number(configuredMs || 0), 0, 5000);
  const learnedSeconds = Number(style.sameSpeakerGapMedianSeconds || 0);
  if (!Number.isFinite(learnedSeconds) || learnedSeconds <= 0) return base;
  const compressedHumanDelay = Math.round(learnedSeconds * 150);
  return clamp(Math.max(base, compressedHumanDelay), base, 1800);
}

function getMultiBubbleChance(mode, privateChat, style) {
  const learned = Number(style?.multiMessageRunRatio);
  const socialBase = Number.isFinite(learned) && learned > 0
    ? clamp(learned + 0.08, privateChat ? 0.28 : 0.36, privateChat ? 0.48 : 0.58)
    : (privateChat ? 0.34 : 0.44);
  if (["casual", "social_emotion", "social_request", "opinion", "shared_content", "casual_answer"].includes(mode)) return socialBase;
  if (["answer", "context_answer", "task", "multi_turn"].includes(mode)) return socialBase * 0.68;
  if (mode === "visual_reaction") return socialBase * 0.5;
  return 0;
}

function getEmojiChance(mode, source, style) {
  if (!["casual", "social_emotion", "social_request", "opinion", "visual_reaction", "casual_answer"].includes(mode)) return 0;
  if (emojiCharacterPattern.test(source)) return 0.32;
  const learned = Number(style?.emojiMessageRatio || 0);
  return clamp(learned * 1.6, 0.04, 0.18);
}

function getStickerChance(mode, source, style, { privateChat = false, hasImages = false } = {}) {
  if (!["ping", "casual", "social_emotion", "social_request", "opinion", "visual_reaction", "casual_answer", "shared_content"].includes(mode)) return 0;
  let chance = getQqAdaptiveStickerChance(style, { privateChat });
  if (hasImages || isQqStickerStyleMessage({ text: source })) chance += 0.06;
  if (mode === "visual_reaction") chance += 0.04;
  if (mode === "ping") chance *= 0.65;
  return clamp(chance, 0, privateChat ? 0.30 : 0.40);
}

export function getQqHumanVisibleText(entry) {
  const text = String(entry?.text || "")
    .replace(protectedMarkerPattern, "")
    .replace(compactMediaTokenPattern, "")
    .replace(/\[CQ:(?:image|face|video|record|voice|audio|file),[\s\S]*$/i, "")
    .replace(/^,?file=[^,]+,[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text && (isQqStickerStyleMessage(entry) || isQqImageStyleMessage(entry))) return "";
  return text;
}

function splitNaturalUnits(text, bubbleSeparator) {
  const normalized = String(text || "")
    .replace(new RegExp(`\\s*${escapeRegExp(bubbleSeparator)}\\s*`, "g"), "\n")
    .replace(/\n+/g, "\n")
    .trim();
  const units = [];
  for (const line of normalized.split("\n")) {
    const matches = line.match(/[^。！？!?~～]+[。！？!?~～]?/gu) || [];
    for (const match of matches) {
      const value = match.trim();
      if (value) units.push(value);
    }
  }
  return units.length ? units : [normalized];
}

function splitNaturalClauses(text) {
  return String(text || "")
    .split(/[，,；;]\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildHumanMessageRuns(entries) {
  const runs = [];
  let current = null;
  for (const entry of entries) {
    if (entry?.isAssistant || entry?.senderId === "assistant") {
      if (current) runs.push(current);
      current = null;
      continue;
    }
    const senderId = String(entry?.senderId || "");
    if (!senderId) continue;
    const at = Date.parse(entry?.at || "");
    const closeInTime = current && Number.isFinite(at) && Number.isFinite(current.lastAt) && at - current.lastAt <= 120000;
    if (current && current.senderId === senderId && closeInTime) {
      current.count += 1;
      current.lastAt = at;
    } else {
      if (current) runs.push(current);
      current = { senderId, count: 1, lastAt: at };
    }
  }
  if (current) runs.push(current);
  return runs;
}

function analyzeHumanTiming(entries, humans) {
  const validTimes = humans.map((entry) => Date.parse(entry?.at || "")).filter(Number.isFinite).sort((left, right) => left - right);
  const durationHours = validTimes.length >= 2 ? Math.max(1 / 60, (validTimes.at(-1) - validTimes[0]) / 3600000) : 0;
  const activeMinutes = new Map();
  for (const at of validTimes) {
    const key = Math.floor(at / 60000);
    activeMinutes.set(key, (activeMinutes.get(key) || 0) + 1);
  }
  const perMinute = [...activeMinutes.values()].sort((left, right) => left - right);
  const sameSpeakerGaps = [];
  const switchGaps = [];
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (previous?.isAssistant || current?.isAssistant || previous?.senderId === "assistant" || current?.senderId === "assistant") continue;
    const gap = (Date.parse(current?.at || "") - Date.parse(previous?.at || "")) / 1000;
    if (!Number.isFinite(gap) || gap < 0 || gap > 1800) continue;
    (String(previous?.senderId) === String(current?.senderId) ? sameSpeakerGaps : switchGaps).push(gap);
  }
  sameSpeakerGaps.sort((left, right) => left - right);
  switchGaps.sort((left, right) => left - right);
  return {
    messagesPerHour: durationHours ? Number((humans.length / durationHours).toFixed(1)) : 0,
    activeMinuteMedianMessages: quantile(perMinute, 0.5, 0),
    activeMinuteP90Messages: quantile(perMinute, 0.9, 0),
    sameSpeakerGapMedianSeconds: Number(quantile(sameSpeakerGaps, 0.5, 0).toFixed?.(1) || 0),
    speakerSwitchGapMedianSeconds: Number(quantile(switchGaps, 0.5, 0).toFixed?.(1) || 0)
  };
}

function collectEmojiPalette(entries) {
  const counts = new Map();
  for (const entry of entries) {
    for (const character of String(entry?.text || "")) {
      if (!emojiCharacterPattern.test(character)) continue;
      counts.set(character, (counts.get(character) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([emoji]) => emoji);
}

function quantile(sorted, fraction, fallback) {
  if (!sorted.length) return fallback;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(3)) : 0;
}

function characterLength(value) {
  return [...String(value || "")].length;
}

function stableFraction(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
