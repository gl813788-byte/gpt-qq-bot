import {
  analyzeQqBotChatStyle,
  analyzeQqHumanChatStyle,
  getQqHumanVisibleText,
  isQqImageStyleMessage,
  isQqStickerStyleMessage
} from "./qq-human-behavior.js";

const profileVersion = 3;
const bootstrapVersion = 1;
const hourCount = 24;
const weekdayCount = 7;
const activeDayLimit = 45;
const recentGapLimit = 64;
const maxCounter = 1_000_000_000;
const styleReviewIntervalMs = 48 * 60 * 60 * 1000;
const coldProactiveCheckCooldownMs = 3 * 60 * 60 * 1000;
const privateProactiveBaseCheckCooldownMs = 30 * 60 * 1000;
const emojiPattern = /\p{Extended_Pictographic}/u;
const formatterCache = new Map();

export function recordQqAdaptiveHumanMessage(group, member, event = {}, {
  at,
  timeZone = "Asia/Shanghai"
} = {}) {
  if (!group || !member || !event?.senderId) return false;
  const observedAt = resolveObservedAt(event, at);
  const clock = getClockParts(observedAt, timeZone);
  const features = getHumanMessageFeatures(event);
  const groupLearning = ensureQqAdaptiveLearning(group);
  const memberLearning = ensureQqAdaptiveLearning(member);

  if (groupLearning.coldProactiveAwaitingHuman) {
    const coldAt = Date.parse(groupLearning.lastColdProactiveAt || "");
    if (!Number.isFinite(coldAt) || observedAt.getTime() > coldAt) {
      groupLearning.coldProactiveAwaitingHuman = false;
    }
  }
  clearUnansweredBotStreak(groupLearning, observedAt);
  clearUnansweredBotStreak(memberLearning, observedAt);
  notePostBotFollowUp(groupLearning, memberLearning, event.senderId, observedAt);
  applyHumanSample(groupLearning, features, clock, observedAt, String(event.senderId), true);
  applyHumanSample(memberLearning, features, clock, observedAt, String(event.senderId), false);
  return true;
}

export function recordQqAdaptiveBotReply(group, member, event = {}, reply = "", {
  at,
  bubbleCount,
  stickerCount = 0
} = {}) {
  if (!group || !String(reply || "").trim()) return false;
  const observedAt = resolveObservedAt({}, at);
  const groupLearning = ensureQqAdaptiveLearning(group);
  const memberLearning = member ? ensureQqAdaptiveLearning(member) : null;
  const visible = stripBotMarkers(reply);
  const chars = characterLength(visible.replace(/\|\|\|/g, ""));
  const sticker = Number(stickerCount || 0) > 0 || isQqStickerStyleMessage({ text: reply });
  const bubbles = Math.max(1, Number(bubbleCount || 0) || String(reply).split(/\n\s*\|\|\|\s*\n/).filter((item) => item.trim()).length);

  for (const learning of [groupLearning, memberLearning].filter(Boolean)) {
    increment(learning, "botReplyCount");
    if (sticker) increment(learning, "botStickerReplyCount");
    if (bubbles > 1) increment(learning, "botMultiBubbleReplyCount");
    learning.botReplyCharSum = boundedNumber(learning.botReplyCharSum + chars);
    learning.botTrackingStartedAt ||= observedAt.toISOString();
    learning.lastBotReplyAt = observedAt.toISOString();
    learning.unansweredBotStreak = boundedNumber(
      learning.unansweredBotStreak + Math.max(1, Math.min(6, bubbles))
    );
  }
  groupLearning.lastBotTargetId = normalizeId(event.senderId);
  groupLearning.awaitingBotFollowUp = true;
  return true;
}

export function maybeReviewQqAdaptiveLanguageStyle(group, entries = [], {
  now = Date.now(),
  force = false,
  reviewEveryMs = styleReviewIntervalMs
} = {}) {
  if (!group) return false;
  const learning = ensureQqAdaptiveLearning(group);
  const currentAt = resolveObservedAt({}, now);
  if (!learning.styleReviewWindowStartedAt) {
    learning.styleReviewWindowStartedAt = currentAt.toISOString();
    if (!force) return false;
  }
  const reviewedAt = Date.parse(learning.lastStyleReviewAt || learning.styleReviewWindowStartedAt || "");
  const newHumanSamples = Math.max(0, learning.sampleCount - learning.lastStyleReviewSampleCount);
  const newBotSamples = Math.max(0, learning.botReplyCount - learning.lastStyleReviewBotReplyCount);
  const newCombinedSamples = newHumanSamples + newBotSamples;
  const timeDue = newCombinedSamples > 0
    && Number.isFinite(reviewedAt)
    && currentAt.getTime() - reviewedAt >= Math.max(60_000, Number(reviewEveryMs || styleReviewIntervalMs));
  if (!force && !timeDue) return false;

  const human = analyzeQqHumanChatStyle(entries, { windowSize: 240 });
  const botStartedAt = Date.parse(learning.botTrackingStartedAt || "");
  const reviewEntries = (Array.isArray(entries) ? entries : []).filter((entry) => {
    if (!(entry?.isAssistant || entry?.senderId === "assistant")) return true;
    const entryAt = Date.parse(entry?.at || "");
    return Number.isFinite(botStartedAt) && Number.isFinite(entryAt) && entryAt >= botStartedAt;
  });
  const bot = analyzeQqBotChatStyle(reviewEntries, { windowSize: 240 });
  if (human.textSampleSize < 12 || bot.textSampleSize < 4) return false;

  const guidance = deriveStyleGuidance(human, bot);
  learning.styleGuidance = compactGuidance(guidance);
  learning.styleReviewSummary = [
    `真人文字中位 ${human.medianTextChars} 字、90% 不超过 ${human.p90TextChars} 字`,
    `Bot 平均 ${bot.averageTextChars} 字`,
    `真人/Bot 表情率 ${percentage(human.stickerMessageRatio)}/${percentage(bot.stickerMessageRatio)}`,
    `短句句号率 ${percentage(human.terminalPeriodRatio)}/${percentage(bot.terminalPeriodRatio)}`
  ].join("；").slice(0, 260);
  learning.styleHumanSampleSize = human.textSampleSize;
  learning.styleBotSampleSize = bot.textSampleSize;
  learning.lastStyleReviewSampleCount = learning.sampleCount;
  learning.lastStyleReviewBotReplyCount = learning.botReplyCount;
  learning.lastStyleReviewAt = currentAt.toISOString();
  learning.styleReviewWindowStartedAt = currentAt.toISOString();
  return true;
}

export function ensureQqAdaptiveLearning(container) {
  if (!container || typeof container !== "object") return createQqAdaptiveLearning();
  container.adaptive = normalizeQqAdaptiveLearning(container.adaptive);
  return container.adaptive;
}

export function getQqAdaptiveColdProactivePlan(signals = {}, {
  now = Date.now(),
  lastActivityAt,
  allowedStartHour = 9,
  allowedEndHour = 23
} = {}) {
  const group = signals?.group || {};
  const currentAt = resolveObservedAt({}, now);
  const currentHour = Number(signals.currentHour);
  const lastHumanAt = Date.parse(group.lastMessageAt || "");
  const lastBotAt = Date.parse(group.lastBotReplyAt || "");
  const latestActivityAt = Date.parse(lastActivityAt || "");
  const lastCheckAt = Date.parse(group.lastColdProactiveCheckAt || "");
  const idleHoursByActivity = { high: 4, typical: 6, low: 10, unknown: 8 };
  const unansweredBotStreak = Math.max(
    boundedNumber(group.unansweredBotStreak),
    group.coldProactiveAwaitingHuman ? 1 : 0
  );
  const unansweredBackoff = Math.min(5, 1 + unansweredBotStreak * 0.75);
  const idleHoursRequired = round((idleHoursByActivity[group.activityLevel] || idleHoursByActivity.unknown) * unansweredBackoff);
  const idleMsRequired = idleHoursRequired * 60 * 60 * 1000;
  const socialHours = normalizeSocialHours(group.socialHours, { allowedStartHour, allowedEndHour });
  const checkCooldownMs = Math.min(
    72 * 60 * 60 * 1000,
    coldProactiveCheckCooldownMs * (2 ** Math.min(5, unansweredBotStreak))
  );
  const resolvedLastActivityAt = Number.isFinite(latestActivityAt)
    ? Math.max(lastHumanAt, latestActivityAt)
    : Math.max(lastHumanAt, Number.isFinite(lastBotAt) ? lastBotAt : lastHumanAt);
  const idleMs = Number.isFinite(resolvedLastActivityAt)
    ? Math.max(0, currentAt.getTime() - resolvedLastActivityAt)
    : null;
  const base = {
    idleHoursRequired,
    idleHours: idleMs == null ? null : round(idleMs / 3_600_000),
    lastActivityAt: Number.isFinite(resolvedLastActivityAt) ? new Date(resolvedLastActivityAt).toISOString() : null,
    thresholdReachedAt: Number.isFinite(resolvedLastActivityAt)
      ? new Date(resolvedLastActivityAt + idleMsRequired).toISOString()
      : null,
    lastCheckAt: Number.isFinite(lastCheckAt) ? new Date(lastCheckAt).toISOString() : null,
    lastProactiveAt: group.lastColdProactiveAt || null,
    awaitingHuman: Boolean(group.coldProactiveAwaitingHuman),
    unansweredBotStreak,
    interestMultiplier: round(Math.max(0.08, 1 / (1 + unansweredBotStreak * 0.85))),
    nextCheckAfterMs: checkCooldownMs,
    socialHours
  };

  if (Number(group.sampleSize || 0) < 20) {
    return { ...base, eligible: false, reason: "learning_sample_low", nextCheckAt: null };
  }
  if (!Number.isFinite(currentHour) || !socialHours.openHours.includes(currentHour)) {
    return { ...base, eligible: false, reason: "outside_social_hours", nextCheckAt: base.thresholdReachedAt };
  }
  if (!Number.isFinite(lastHumanAt)) {
    return { ...base, eligible: false, reason: "no_human_context", nextCheckAt: null };
  }
  if (Number.isFinite(lastCheckAt) && currentAt.getTime() - lastCheckAt < checkCooldownMs) {
    return {
      ...base,
      eligible: false,
      reason: "cold_check_cooldown",
      nextCheckAt: new Date(lastCheckAt + checkCooldownMs).toISOString()
    };
  }
  if (idleMs == null || idleMs < idleMsRequired) {
    return { ...base, eligible: false, reason: "group_not_cold", nextCheckAt: base.thresholdReachedAt };
  }
  const botQuietMsRequired = Math.max(2 * 60 * 60 * 1000, Math.round(idleMsRequired * 0.5));
  if (Number.isFinite(lastBotAt) && currentAt.getTime() - lastBotAt < botQuietMsRequired) {
    return {
      ...base,
      eligible: false,
      reason: "bot_spoke_recently",
      nextCheckAt: new Date(lastBotAt + botQuietMsRequired).toISOString()
    };
  }
  return {
    ...base,
    eligible: true,
    reason: "cold_group_time_due",
    nextCheckAt: currentAt.toISOString()
  };
}

export function getQqAdaptivePrivateProactivePlan(signals = {}, {
  now = Date.now(),
  lastActivityAt
} = {}) {
  const contact = signals?.group || {};
  const currentAt = resolveObservedAt({}, now);
  const currentHour = Number(signals.currentHour);
  const lastHumanAt = Date.parse(contact.lastMessageAt || "");
  const lastBotAt = Date.parse(contact.lastBotReplyAt || "");
  const latestAt = Date.parse(lastActivityAt || "");
  const lastCheckAt = Date.parse(contact.lastPrivateProactiveCheckAt || "");
  const lastProactiveAt = Date.parse(contact.lastPrivateProactiveAt || "");
  const resolvedLastActivityAt = Number.isFinite(latestAt)
    ? latestAt
    : Math.max(lastHumanAt, Number.isFinite(lastBotAt) ? lastBotAt : lastHumanAt);
  const idleMs = Number.isFinite(resolvedLastActivityAt)
    ? Math.max(0, currentAt.getTime() - resolvedLastActivityAt)
    : null;
  const gapSeconds = Number(contact.medianGapSeconds || 0);
  const dailyMessages = Number(contact.messagesPerActiveDay || 0);
  const frequency = gapSeconds > 0 && gapSeconds <= 20 * 60 || dailyMessages >= 20
    ? "high"
    : gapSeconds > 0 && gapSeconds <= 4 * 60 * 60 || dailyMessages >= 5 ? "typical" : "low";
  const shortDelayMinutes = { high: 3, typical: 8, low: 20 }[frequency];
  const shortWindowHours = { high: 1.5, typical: 3, low: 6 }[frequency];
  const longWindowHours = { high: 12, typical: 36, low: 72 }[frequency];
  const unansweredBotStreak = boundedNumber(contact.unansweredBotStreak);
  const backoff = 2 ** Math.min(6, unansweredBotStreak);
  const socialHours = normalizeSocialHours(contact.socialHours, { allowedStartHour: 9, allowedEndHour: 23 });
  const idleMinutes = idleMs == null ? null : idleMs / 60_000;
  const idleHours = idleMs == null ? null : idleMs / 3_600_000;
  const effectiveShortDelayMinutes = shortDelayMinutes * Math.min(16, backoff);
  let phase = "middle";
  let probability = 0.008;
  let checkCooldownMs = 6 * 60 * 60 * 1000;
  if (idleMinutes != null && idleMinutes <= shortWindowHours * 60) {
    phase = "short";
    const progress = clamp((idleMinutes - effectiveShortDelayMinutes) / Math.max(1, shortWindowHours * 60 - effectiveShortDelayMinutes), 0, 1);
    probability = 0.34 - progress * 0.24;
    checkCooldownMs = privateProactiveBaseCheckCooldownMs * (frequency === "high" ? 0.5 : frequency === "typical" ? 1 : 2);
  } else if (idleHours != null && idleHours >= longWindowHours * Math.min(8, Math.max(1, backoff / 2))) {
    phase = "long";
    const progress = clamp((idleHours - longWindowHours) / Math.max(1, longWindowHours * 3), 0, 1);
    probability = 0.08 + progress * 0.24;
    checkCooldownMs = (frequency === "high" ? 4 : frequency === "typical" ? 8 : 12) * 60 * 60 * 1000;
  }
  const unansweredMultiplier = phase === "long"
    ? Math.max(0.2, 1 / (1 + unansweredBotStreak * 0.9))
    : Math.max(0.03, 1 / (1 + unansweredBotStreak * 1.4));
  probability = round(clamp(probability * unansweredMultiplier * clamp(Number(contact.confidence || 0) + 0.35, 0.35, 1), 0.001, 0.45));
  checkCooldownMs = Math.min(7 * 24 * 60 * 60 * 1000, checkCooldownMs * Math.min(16, backoff));
  const base = {
    phase,
    frequency,
    probability,
    idleHours: idleHours == null ? null : round(idleHours),
    lastActivityAt: Number.isFinite(resolvedLastActivityAt) ? new Date(resolvedLastActivityAt).toISOString() : null,
    lastHumanAt: Number.isFinite(lastHumanAt) ? new Date(lastHumanAt).toISOString() : null,
    lastBotAt: Number.isFinite(lastBotAt) ? new Date(lastBotAt).toISOString() : null,
    lastCheckAt: Number.isFinite(lastCheckAt) ? new Date(lastCheckAt).toISOString() : null,
    lastProactiveAt: Number.isFinite(lastProactiveAt) ? new Date(lastProactiveAt).toISOString() : null,
    shortDelayMinutes: round(effectiveShortDelayMinutes),
    shortWindowHours,
    longWindowHours: round(longWindowHours * Math.min(8, Math.max(1, backoff / 2))),
    unansweredBotStreak,
    interestMultiplier: round(unansweredMultiplier),
    socialHours,
    nextCheckAfterMs: Math.round(checkCooldownMs)
  };
  if (Number(contact.sampleSize || 0) < 4) return { ...base, eligible: false, reason: "learning_sample_low", nextCheckAt: null };
  if (!Number.isFinite(lastHumanAt)) return { ...base, eligible: false, reason: "no_human_context", nextCheckAt: null };
  if (!Number.isFinite(currentHour) || !socialHours.openHours.includes(currentHour)) {
    return { ...base, eligible: false, reason: "outside_social_hours", nextCheckAt: null };
  }
  if (idleMinutes == null || idleMinutes < effectiveShortDelayMinutes) {
    return {
      ...base,
      eligible: false,
      reason: "private_too_soon",
      nextCheckAt: Number.isFinite(resolvedLastActivityAt)
        ? new Date(resolvedLastActivityAt + effectiveShortDelayMinutes * 60_000).toISOString()
        : null
    };
  }
  if (Number.isFinite(lastCheckAt) && currentAt.getTime() - lastCheckAt < checkCooldownMs) {
    return { ...base, eligible: false, reason: "private_check_cooldown", nextCheckAt: new Date(lastCheckAt + checkCooldownMs).toISOString() };
  }
  return { ...base, eligible: true, reason: `private_${phase}_candidate`, nextCheckAt: currentAt.toISOString() };
}

export function markQqAdaptivePrivateProactiveCheck(container, {
  at = Date.now(),
  sent = false
} = {}) {
  if (!container) return false;
  const learning = ensureQqAdaptiveLearning(container);
  const observedAt = resolveObservedAt({}, at).toISOString();
  learning.lastPrivateProactiveCheckAt = observedAt;
  if (sent) learning.lastPrivateProactiveAt = observedAt;
  return true;
}

export function deriveQqLearnedSocialHours(hourCounts = [], sampleSize = 0, {
  fallbackStartHour = 9,
  fallbackEndHour = 23
} = {}) {
  const fallback = buildSocialHoursRange(fallbackStartHour, fallbackEndHour, "fallback");
  const counts = normalizeCounterArray(hourCounts, hourCount);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (Number(sampleSize || total) < 20 || total <= 0) return fallback;

  const peakHour = counts.indexOf(Math.max(...counts));
  let best = null;
  for (let length = 6; length <= 18; length += 1) {
    let bestForLength = null;
    for (let start = 0; start < hourCount; start += 1) {
      const openHours = Array.from({ length }, (_, offset) => (start + offset) % hourCount);
      const covered = openHours.reduce((sum, hour) => sum + counts[hour], 0);
      const peakOffset = openHours.indexOf(peakHour);
      const centerPenalty = peakOffset < 0 ? 100 : Math.abs(peakOffset - (length - 1) / 2);
      const candidate = { start, length, openHours, covered, centerPenalty };
      if (!bestForLength
        || candidate.covered > bestForLength.covered
        || candidate.covered === bestForLength.covered && candidate.centerPenalty < bestForLength.centerPenalty) {
        bestForLength = candidate;
      }
    }
    if (bestForLength?.covered / total >= 0.85) {
      best = bestForLength;
      break;
    }
  }
  best ||= { start: fallback.startHour, length: fallback.openHours.length, openHours: fallback.openHours };
  const endHour = (best.start + best.length) % hourCount;
  return {
    source: "learned",
    startHour: best.start,
    endHour,
    wrapsMidnight: endHour <= best.start,
    openHours: best.openHours,
    label: formatSocialHoursLabel(best.start, endHour)
  };
}

export function markQqAdaptiveColdProactiveCheck(group, {
  at = Date.now(),
  sent = false
} = {}) {
  if (!group) return false;
  const learning = ensureQqAdaptiveLearning(group);
  const observedAt = resolveObservedAt({}, at).toISOString();
  learning.lastColdProactiveCheckAt = observedAt;
  if (sent) {
    learning.lastColdProactiveAt = observedAt;
    learning.coldProactiveAwaitingHuman = true;
  }
  return true;
}

export function buildQqAdaptiveLearningSignals(group, member, {
  now = Date.now(),
  timeZone = "Asia/Shanghai"
} = {}) {
  const current = getClockParts(resolveObservedAt({}, now), timeZone);
  const groupLearning = normalizeQqAdaptiveLearning(group?.adaptive);
  const memberLearning = normalizeQqAdaptiveLearning(member?.adaptive);
  return {
    version: profileVersion,
    timeZone: current.timeZone,
    currentHour: current.hour,
    group: summarizeLearning(groupLearning, current.hour, { confidenceAt: 80 }),
    member: summarizeLearning(memberLearning, current.hour, { confidenceAt: 36 })
  };
}

export function personalizeQqHumanStyle(style = {}, signals = {}) {
  const output = { ...style, adaptiveLearning: signals };
  const member = signals?.member || {};
  const group = signals?.group || {};
  const privateChat = Boolean(style.privateChat);
  const weight = clamp(Number(member.confidence || 0) * 0.65, 0, 0.65);

  if (Number(member.textSampleSize || 0) >= 6 && weight > 0) {
    const average = Number(member.averageTextChars || 0);
    const casualTarget = clamp(Math.round(average * 1.8), privateChat ? 16 : 9, privateChat ? 64 : 36);
    const reactionTarget = clamp(Math.round(average * 1.25), 7, privateChat ? 32 : 20);
    const answerTarget = clamp(Math.round(Math.max(average * 5, casualTarget * 3)), privateChat ? 54 : 32, privateChat ? 190 : 108);
    output.casualMax = blendNumber(style.casualMax, casualTarget, weight);
    output.reactionMax = blendNumber(style.reactionMax, reactionTarget, weight * 0.8);
    output.answerMax = blendNumber(style.answerMax, answerTarget, weight * 0.45);
  }
  if (Number(member.sampleSize || 0) >= 8 && weight > 0) {
    output.stickerMessageRatio = blendRatio(style.stickerMessageRatio, member.stickerMessageRatio, weight);
    output.emojiMessageRatio = blendRatio(style.emojiMessageRatio, member.emojiMessageRatio, weight * 0.8);
    output.multiMessageRunRatio = blendRatio(style.multiMessageRunRatio, member.burstContinuationRatio, weight * 0.75);
  }
  if (Number(member.gapSampleSize || 0) >= 3) {
    output.sameSpeakerGapMedianSeconds = blendNumber(
      style.sameSpeakerGapMedianSeconds,
      member.medianGapSeconds,
      weight * 0.7
    );
  }
  if (group.activityLevel === "high" && Number(group.sampleSize || 0) >= 30) {
    output.casualMax = Math.max(8, Math.round(Number(output.casualMax || 24) * 0.9));
    output.reactionMax = Math.max(7, Math.round(Number(output.reactionMax || 16) * 0.9));
    output.multiMessageRunRatio = clamp(Number(output.multiMessageRunRatio || 0) * 0.92, 0, 1);
  }
  output.adaptivePersonalization = {
    applied: weight >= 0.08,
    memberWeight: round(weight),
    activityLevel: group.activityLevel || "unknown"
  };
  return output;
}

export function getQqAdaptiveProactiveIntervals(signals = {}, {
  judgeEveryMessages = 20,
  judgeEveryMinutes = 5
} = {}) {
  const group = signals?.group || {};
  const baseMessages = clamp(Math.round(Number(judgeEveryMessages || 20)), 1, 1000);
  const baseMinutes = clamp(Math.round(Number(judgeEveryMinutes || 0)), 0, 1440);
  if (Number(group.sampleSize || 0) < 20) {
    return { judgeEveryMessages: baseMessages, judgeEveryMinutes: baseMinutes, reason: "learning_sample_low" };
  }

  let messageFactor = group.activityLevel === "high" ? 1.18 : group.activityLevel === "low" ? 0.88 : 1;
  let minuteFactor = group.activityLevel === "high" ? 0.82 : group.activityLevel === "low" ? 1.2 : 1;
  const directRatio = Number(group.directBotInteractionRatio || 0);
  const followUpRatio = Number(group.botReplyFollowUpRatio || 0);
  if (directRatio >= 0.12) {
    messageFactor -= 0.08;
    minuteFactor -= 0.08;
  } else if (directRatio < 0.03) {
    messageFactor += 0.08;
    minuteFactor += 0.08;
  }
  if (Number(group.botReplyCount || 0) >= 8) {
    if (followUpRatio >= 0.35) messageFactor -= 0.05;
    if (followUpRatio < 0.12) messageFactor += 0.08;
  }
  return {
    judgeEveryMessages: clamp(Math.round(baseMessages * clamp(messageFactor, 0.75, 1.45)), Math.max(1, Math.round(baseMessages * 0.7)), Math.max(2, Math.round(baseMessages * 1.5))),
    judgeEveryMinutes: baseMinutes === 0
      ? 0
      : clamp(Math.round(baseMinutes * clamp(minuteFactor, 0.7, 1.5)), Math.max(1, Math.round(baseMinutes * 0.6)), Math.max(2, Math.round(baseMinutes * 1.6))),
    reason: `activity_${group.activityLevel || "unknown"}`
  };
}

export function formatQqAdaptiveLearningContext(signals = {}) {
  const group = signals?.group || {};
  const member = signals?.member || {};
  if (Number(group.sampleSize || 0) === 0) return "";
  const groupHours = formatActiveHours(group.activeHours);
  const memberHours = formatActiveHours(member.activeHours);
  const memberLine = Number(member.sampleSize || 0) >= 4
    ? `当前群友已学习 ${member.sampleSize} 条：平均纯文字 ${member.averageTextChars || 0} 字，表情 ${percentage(member.stickerMessageRatio)}，emoji ${percentage(member.emojiMessageRatio)}，两分钟内连续发言 ${percentage(member.burstContinuationRatio)}，常见时段 ${memberHours || "尚不稳定"}。`
    : "当前群友的个人样本还少，只采用群级节奏，不做强个性化。";
  const guidance = Array.isArray(group.styleGuidance) ? group.styleGuidance.slice(0, 5) : [];
  return [
    "自动适应信号（只含行为统计，不含个人原话）：",
    `- 本群已学习 ${group.sampleSize} 条，活跃日均约 ${group.messagesPerActiveDay || 0} 条，常见时段 ${groupHours || "尚不稳定"}；当前时段活跃度为 ${activityLabel(group.activityLevel)}。`,
    `- ${memberLine}`,
    group.styleReviewSummary ? `- 最近一次真人/Bot 差异复盘：${group.styleReviewSummary}。` : null,
    ...guidance.map((item) => `- 已压缩的改进规则：${item}`),
    "- 这些是弱信号：用于调整回复长度、表情、连发和插话节奏；不要复述统计、给群友贴标签，也不要模仿某个人的具体措辞。"
  ].filter(Boolean).join("\n");
}

export function summarizeQqAdaptiveGroupLearning(group, members = {}, options = {}) {
  const signals = buildQqAdaptiveLearningSignals(group, null, options);
  const learnedMembers = Object.values(members || {}).filter((member) => Number(member?.adaptive?.sampleCount || 0) > 0).length;
  return {
    ...signals.group,
    learnedMembers,
    timeZone: signals.timeZone,
    currentHour: signals.currentHour
  };
}

function createQqAdaptiveLearning() {
  return {
    version: profileVersion,
    bootstrapVersion: 0,
    sampleCount: 0,
    textSampleCount: 0,
    textCharSum: 0,
    shortTextCount: 0,
    longTextCount: 0,
    stickerCount: 0,
    imageCount: 0,
    emojiCount: 0,
    replyCount: 0,
    mentionCount: 0,
    questionCount: 0,
    directBotInteractionCount: 0,
    burstContinuationCount: 0,
    botReplyCount: 0,
    botStickerReplyCount: 0,
    botMultiBubbleReplyCount: 0,
    botReplyCharSum: 0,
    botReplyFollowUpCount: 0,
    hourCounts: Array(hourCount).fill(0),
    weekdayCounts: Array(weekdayCount).fill(0),
    activeDays: [],
    recentGapSeconds: [],
    firstSeenAt: null,
    lastMessageAt: null,
    lastSenderId: "",
    lastBotReplyAt: null,
    botTrackingStartedAt: null,
    lastBotTargetId: "",
    awaitingBotFollowUp: false,
    lastStyleReviewAt: null,
    styleReviewWindowStartedAt: null,
    lastStyleReviewSampleCount: 0,
    lastStyleReviewBotReplyCount: 0,
    styleReviewSummary: "",
    styleGuidance: [],
    styleHumanSampleSize: 0,
    styleBotSampleSize: 0,
    lastColdProactiveCheckAt: null,
    lastColdProactiveAt: null,
    coldProactiveAwaitingHuman: false,
    unansweredBotStreak: 0,
    lastPrivateProactiveCheckAt: null,
    lastPrivateProactiveAt: null
  };
}

function normalizeQqAdaptiveLearning(value) {
  const base = createQqAdaptiveLearning();
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  for (const key of [
    "sampleCount", "textSampleCount", "textCharSum", "shortTextCount", "longTextCount",
    "stickerCount", "imageCount", "emojiCount", "replyCount", "mentionCount", "questionCount",
    "directBotInteractionCount", "burstContinuationCount", "botReplyCount", "botStickerReplyCount",
    "botMultiBubbleReplyCount", "botReplyCharSum", "botReplyFollowUpCount",
    "lastStyleReviewSampleCount", "lastStyleReviewBotReplyCount", "styleHumanSampleSize", "styleBotSampleSize",
    "unansweredBotStreak"
  ]) base[key] = boundedNumber(source[key]);
  base.version = profileVersion;
  base.bootstrapVersion = clamp(Math.floor(Number(source.bootstrapVersion || 0)), 0, bootstrapVersion);
  base.hourCounts = normalizeCounterArray(source.hourCounts, hourCount);
  base.weekdayCounts = normalizeCounterArray(source.weekdayCounts, weekdayCount);
  base.activeDays = [...new Set((Array.isArray(source.activeDays) ? source.activeDays : [])
    .map(String)
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)))]
    .slice(-activeDayLimit);
  base.recentGapSeconds = (Array.isArray(source.recentGapSeconds) ? source.recentGapSeconds : [])
    .map(Number)
    .filter((seconds) => Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400)
    .slice(-recentGapLimit);
  for (const key of ["firstSeenAt", "lastMessageAt", "lastBotReplyAt", "botTrackingStartedAt", "lastStyleReviewAt", "styleReviewWindowStartedAt", "lastColdProactiveCheckAt", "lastColdProactiveAt", "lastPrivateProactiveCheckAt", "lastPrivateProactiveAt"]) {
    base[key] = validIsoDate(source[key]);
  }
  base.lastSenderId = normalizeId(source.lastSenderId);
  base.lastBotTargetId = normalizeId(source.lastBotTargetId);
  base.awaitingBotFollowUp = Boolean(source.awaitingBotFollowUp);
  base.coldProactiveAwaitingHuman = Boolean(source.coldProactiveAwaitingHuman);
  base.styleReviewSummary = String(source.styleReviewSummary || "").replace(/\s+/g, " ").trim().slice(0, 260);
  base.styleGuidance = compactGuidance(source.styleGuidance);
  return base;
}

function applyHumanSample(learning, features, clock, observedAt, senderId, groupLevel) {
  increment(learning, "sampleCount");
  if (features.textLength > 0) {
    increment(learning, "textSampleCount");
    learning.textCharSum = boundedNumber(learning.textCharSum + features.textLength);
    if (features.textLength <= 12) increment(learning, "shortTextCount");
    if (features.textLength >= 60) increment(learning, "longTextCount");
  }
  if (features.sticker) increment(learning, "stickerCount");
  if (features.image) increment(learning, "imageCount");
  if (features.emoji) increment(learning, "emojiCount");
  if (features.reply) increment(learning, "replyCount");
  if (features.mention) increment(learning, "mentionCount");
  if (features.question) increment(learning, "questionCount");
  if (features.directBotInteraction) increment(learning, "directBotInteractionCount");

  const previousAt = Date.parse(learning.lastMessageAt || "");
  const gapSeconds = Number.isFinite(previousAt) ? Math.max(0, Math.round((observedAt.getTime() - previousAt) / 1000)) : null;
  if (gapSeconds != null && gapSeconds <= 86400) {
    learning.recentGapSeconds = [...learning.recentGapSeconds, gapSeconds].slice(-recentGapLimit);
    const sameSpeaker = !groupLevel || learning.lastSenderId === senderId;
    if (sameSpeaker && gapSeconds <= 120) increment(learning, "burstContinuationCount");
  }
  learning.firstSeenAt ||= observedAt.toISOString();
  learning.lastMessageAt = observedAt.toISOString();
  learning.lastSenderId = senderId;
  touchTimeBucket(learning, clock);
}

function notePostBotFollowUp(groupLearning, memberLearning, senderId, observedAt) {
  if (!groupLearning.awaitingBotFollowUp || !groupLearning.lastBotReplyAt) return;
  const gapSeconds = (observedAt.getTime() - Date.parse(groupLearning.lastBotReplyAt)) / 1000;
  if (!Number.isFinite(gapSeconds) || gapSeconds < 0 || gapSeconds > 10 * 60) {
    groupLearning.awaitingBotFollowUp = false;
    return;
  }
  increment(groupLearning, "botReplyFollowUpCount");
  if (groupLearning.lastBotTargetId === String(senderId)) increment(memberLearning, "botReplyFollowUpCount");
  groupLearning.awaitingBotFollowUp = false;
}

function clearUnansweredBotStreak(learning, observedAt) {
  const lastBotAt = Date.parse(learning.lastBotReplyAt || "");
  if (!Number.isFinite(lastBotAt) || observedAt.getTime() >= lastBotAt) {
    learning.unansweredBotStreak = 0;
  }
}

function touchTimeBucket(learning, clock) {
  learning.hourCounts[clock.hour] = boundedNumber(learning.hourCounts[clock.hour] + 1);
  learning.weekdayCounts[clock.weekday] = boundedNumber(learning.weekdayCounts[clock.weekday] + 1);
  if (!learning.activeDays.includes(clock.dayKey)) {
    learning.activeDays = [...learning.activeDays, clock.dayKey].slice(-activeDayLimit);
  }
}

function getHumanMessageFeatures(event) {
  const entry = { text: event.text || "", images: event.images || [] };
  const visible = getQqHumanVisibleText(entry);
  return {
    textLength: characterLength(visible),
    sticker: isQqStickerStyleMessage(entry),
    image: isQqImageStyleMessage(entry),
    emoji: emojiPattern.test(String(event.text || "")),
    reply: Boolean(event.replyContext || event.replyMessageId),
    mention: Boolean(event.hasAtSegment || (Array.isArray(event.atTargets) && event.atTargets.length > 0)),
    question: /[?？]/.test(visible),
    directBotInteraction: Boolean(event.type === "group_at" || event.hasSelfAtSegment || event.isReplyToSelf || event.replyContext?.isSelf)
  };
}

function summarizeLearning(learning, currentHour, { confidenceAt }) {
  const samples = Number(learning.sampleCount || 0);
  const styleReviewAnchorAt = learning.lastStyleReviewAt || learning.styleReviewWindowStartedAt;
  const styleReviewAnchorMs = Date.parse(styleReviewAnchorAt || "");
  const activeHours = topIndexes(learning.hourCounts, 4);
  const nonZeroHours = learning.hourCounts.filter((count) => count > 0);
  const averageActiveHour = nonZeroHours.length > 0 ? samples / nonZeroHours.length : 0;
  const currentCount = Number(learning.hourCounts[currentHour] || 0);
  let activityLevel = "unknown";
  if (samples >= 20 && averageActiveHour > 0) {
    activityLevel = currentCount >= averageActiveHour * 1.35
      ? "high"
      : currentCount <= averageActiveHour * 0.55 ? "low" : "typical";
  }
  return {
    sampleSize: samples,
    confidence: round(clamp(samples / confidenceAt, 0, 1)),
    textSampleSize: learning.textSampleCount,
    averageTextChars: learning.textSampleCount > 0 ? round(learning.textCharSum / learning.textSampleCount) : 0,
    shortTextRatio: ratio(learning.shortTextCount, learning.textSampleCount),
    longTextRatio: ratio(learning.longTextCount, learning.textSampleCount),
    stickerMessageRatio: ratio(learning.stickerCount, samples),
    imageMessageRatio: ratio(learning.imageCount, samples),
    emojiMessageRatio: ratio(learning.emojiCount, samples),
    replyMessageRatio: ratio(learning.replyCount, samples),
    mentionMessageRatio: ratio(learning.mentionCount, samples),
    questionMessageRatio: ratio(learning.questionCount, samples),
    directBotInteractionRatio: ratio(learning.directBotInteractionCount, samples),
    burstContinuationRatio: ratio(learning.burstContinuationCount, samples),
    gapSampleSize: learning.recentGapSeconds.length,
    medianGapSeconds: quantile(learning.recentGapSeconds, 0.5),
    activeHours,
    socialHours: deriveQqLearnedSocialHours(learning.hourCounts, samples),
    activeDays: learning.activeDays.length,
    messagesPerActiveDay: learning.activeDays.length > 0 ? round(samples / learning.activeDays.length) : 0,
    activityLevel,
    currentHourShare: ratio(currentCount, samples),
    firstSeenAt: learning.firstSeenAt,
    lastMessageAt: learning.lastMessageAt,
    botReplyCount: learning.botReplyCount,
    botStickerReplyRatio: ratio(learning.botStickerReplyCount, learning.botReplyCount),
    botMultiBubbleReplyRatio: ratio(learning.botMultiBubbleReplyCount, learning.botReplyCount),
    averageBotReplyChars: learning.botReplyCount > 0 ? round(learning.botReplyCharSum / learning.botReplyCount) : 0,
    botReplyFollowUpRatio: ratio(learning.botReplyFollowUpCount, learning.botReplyCount),
    botTrackingStartedAt: learning.botTrackingStartedAt,
    lastStyleReviewAt: learning.lastStyleReviewAt,
    styleReviewWindowStartedAt: learning.styleReviewWindowStartedAt,
    nextStyleReviewAt: Number.isFinite(styleReviewAnchorMs)
      ? new Date(styleReviewAnchorMs + styleReviewIntervalMs).toISOString()
      : null,
    styleReviewSummary: learning.styleReviewSummary,
    styleGuidance: learning.styleGuidance.slice(0, 5),
    styleHumanSampleSize: learning.styleHumanSampleSize,
    styleBotSampleSize: learning.styleBotSampleSize,
    lastBotReplyAt: learning.lastBotReplyAt,
    lastColdProactiveCheckAt: learning.lastColdProactiveCheckAt,
    lastColdProactiveAt: learning.lastColdProactiveAt,
    coldProactiveAwaitingHuman: learning.coldProactiveAwaitingHuman,
    unansweredBotStreak: learning.unansweredBotStreak,
    lastPrivateProactiveCheckAt: learning.lastPrivateProactiveCheckAt,
    lastPrivateProactiveAt: learning.lastPrivateProactiveAt
  };
}

function deriveStyleGuidance(human, bot) {
  const guidance = [];
  if (bot.averageTextChars > Math.max(human.p90TextChars * 1.25, human.medianTextChars * 2.4)) {
    guidance.push(`闲聊先压到约 ${Math.max(8, human.p90TextChars)} 字，先说结论，只留一个必要补充`);
  }
  if (bot.terminalPeriodRatio > human.terminalPeriodRatio + 0.2) {
    guidance.push("18 字内短回复少用句号，保留自然口语停顿");
  }
  const targetSticker = clamp(human.stickerMessageRatio * 1.35 + 0.035, 0.1, 0.34);
  if (bot.stickerMessageRatio + 0.035 < targetSticker) {
    guidance.push(`合适的闲聊把表情包频率向约 ${percentage(targetSticker)} 靠近，但不硬配无关图`);
  } else if (bot.stickerMessageRatio > Math.max(0.4, targetSticker + 0.12)) {
    guidance.push("表情包已经偏多，优先保证语境匹配，避免连续刷图");
  }
  if (bot.genericOpeningRatio >= 0.18) guidance.push("删掉“好的、收到、明白”等模板式开头，直接接当前话题");
  if (bot.serviceEndingRatio >= 0.08) guidance.push("删掉“如果需要我可以继续”等客服式结尾");
  if (bot.questionRatio > human.questionRatio + 0.22) guidance.push("不要每次用反问续聊，能接住就直接接住");
  if (bot.emojiMessageRatio > human.emojiMessageRatio + 0.15) guidance.push("文字 emoji 比群友明显多，降低到偶尔使用");
  if (bot.multiBubbleRatio > Math.max(0.6, human.multiMessageRunRatio + 0.2)) guidance.push("减少机械拆气泡，只有自然的第二层意思才连发");
  if (guidance.length === 0) guidance.push("当前结构风格已接近群聊基线，保持短、具体、不客服化");
  return guidance;
}

function compactGuidance(value) {
  const items = Array.isArray(value) ? value : [];
  const seen = new Set();
  return items
    .map((item) => String(item || "").replace(/^[-•\s]+/, "").replace(/\s+/g, " ").trim().slice(0, 96))
    .filter((item) => {
      const key = item.toLowerCase().replace(/[，。！？!?\s]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function normalizeSocialHours(value, { allowedStartHour, allowedEndHour }) {
  const openHours = (Array.isArray(value?.openHours) ? value.openHours : [])
    .map(Number)
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour < 24);
  if (openHours.length > 0) {
    const startHour = Number.isInteger(Number(value.startHour)) ? Number(value.startHour) : openHours[0];
    const endHour = Number.isInteger(Number(value.endHour)) ? Number(value.endHour) : (openHours.at(-1) + 1) % 24;
    return {
      source: value.source === "learned" ? "learned" : "fallback",
      startHour,
      endHour,
      wrapsMidnight: Boolean(value.wrapsMidnight ?? endHour <= startHour),
      openHours: [...new Set(openHours)],
      label: String(value.label || formatSocialHoursLabel(startHour, endHour))
    };
  }
  return buildSocialHoursRange(allowedStartHour, allowedEndHour, "fallback");
}

function buildSocialHoursRange(startValue, endValue, source) {
  const startHour = clamp(Math.floor(Number(startValue)), 0, 23);
  const endHour = clamp(Math.floor(Number(endValue)), 0, 24) % 24;
  const openHours = [];
  let hour = startHour;
  do {
    openHours.push(hour);
    hour = (hour + 1) % 24;
  } while (hour !== endHour && openHours.length < 24);
  return {
    source,
    startHour,
    endHour,
    wrapsMidnight: endHour <= startHour,
    openHours,
    label: formatSocialHoursLabel(startHour, endHour)
  };
}

function formatSocialHoursLabel(startHour, endHour) {
  return `${String(startHour).padStart(2, "0")}:00–${String(endHour).padStart(2, "0")}:00`;
}

function getClockParts(date, requestedTimeZone) {
  const timeZone = normalizeTimeZone(requestedTimeZone);
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23"
    });
    formatterCache.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    timeZone,
    hour: clamp(Number(parts.hour) % 24, 0, 23),
    weekday: weekdays[parts.weekday] ?? 0,
    dayKey: `${parts.year}-${parts.month}-${parts.day}`
  };
}

function normalizeTimeZone(value) {
  const candidate = String(value || "Asia/Shanghai").trim() || "Asia/Shanghai";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "Asia/Shanghai";
  }
}

function resolveObservedAt(event = {}, value) {
  const raw = value ?? event.at ?? event.raw?.time;
  let ms;
  if (raw instanceof Date) ms = raw.getTime();
  else if (typeof raw === "number" || /^\d+(?:\.\d+)?$/.test(String(raw || ""))) {
    const number = Number(raw);
    ms = number < 10_000_000_000 ? number * 1000 : number;
  } else ms = Date.parse(String(raw || ""));
  return new Date(Number.isFinite(ms) ? ms : Date.now());
}

function normalizeCounterArray(value, length) {
  return Array.from({ length }, (_, index) => boundedNumber(Array.isArray(value) ? value[index] : 0));
}

function topIndexes(counts, limit) {
  return counts
    .map((count, index) => ({ index, count: Number(count || 0) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.index - right.index)
    .slice(0, limit)
    .map((item) => item.index);
}

function quantile(values, q) {
  const sorted = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1))]);
}

function increment(target, key) {
  target[key] = boundedNumber(Number(target[key] || 0) + 1);
}

function boundedNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(Math.round(number), 0, maxCounter) : 0;
}

function blendNumber(baseValue, targetValue, weight) {
  const base = Number(baseValue || 0);
  const target = Number(targetValue || 0);
  if (!Number.isFinite(base) || base <= 0) return Math.round(target);
  return Math.round(base * (1 - weight) + target * weight);
}

function blendRatio(baseValue, targetValue, weight) {
  return round(clamp(Number(baseValue || 0) * (1 - weight) + Number(targetValue || 0) * weight, 0, 1));
}

function ratio(numerator, denominator) {
  const total = Number(denominator || 0);
  return total > 0 ? round(Number(numerator || 0) / total) : 0;
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function characterLength(value) {
  return [...String(value || "")].length;
}

function validIsoDate(value) {
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeId(value) {
  const id = String(value || "").trim();
  return /^\d{4,20}$/.test(id) ? id : "";
}

function stripBotMarkers(reply) {
  return String(reply || "")
    .replace(/\[\[qq_(?:memory|image|file|sticker|command):[^\n]*?\]\]/g, "")
    .replace(/\[\[qq_done\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatActiveHours(hours) {
  return (Array.isArray(hours) ? hours : []).map((hour) => `${hour}点`).join("、");
}

function percentage(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function activityLabel(value) {
  return { high: "偏活跃", typical: "正常", low: "偏安静", unknown: "样本不足" }[value] || "样本不足";
}
