import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQqAdaptiveLearningSignals,
  ensureQqAdaptiveLearning,
  formatQqAdaptiveLearningContext,
  getQqAdaptiveColdProactivePlan,
  getQqAdaptiveProactiveIntervals,
  markQqAdaptiveColdProactiveCheck,
  maybeReviewQqAdaptiveLanguageStyle,
  personalizeQqHumanStyle,
  recordQqAdaptiveBotReply,
  recordQqAdaptiveHumanMessage,
  summarizeQqAdaptiveGroupLearning
} from "../src/qq-adaptive-learning.js";

function humanEvent(index, overrides = {}) {
  return {
    groupId: "12345",
    senderId: "67890",
    senderName: "群友",
    text: `短句${index}`,
    at: new Date(Date.UTC(2026, 6, 1 + Math.floor(index / 20), 12, index % 60)).toISOString(),
    ...overrides
  };
}

test("learns bounded per-group and per-member timing and expression statistics", () => {
  const group = {};
  const member = {};
  for (let index = 0; index < 24; index += 1) {
    recordQqAdaptiveHumanMessage(group, member, humanEvent(index, {
      text: index % 6 === 0 ? "笑死😂" : `行${index}`
    }));
  }
  const signals = buildQqAdaptiveLearningSignals(group, member, {
    now: Date.UTC(2026, 6, 2, 12, 0),
    timeZone: "Asia/Shanghai"
  });
  assert.equal(signals.group.sampleSize, 24);
  assert.equal(signals.member.sampleSize, 24);
  assert.ok(signals.group.activeHours.includes(20));
  assert.ok(signals.member.emojiMessageRatio > 0);
  assert.ok(ensureQqAdaptiveLearning(group).recentGapSeconds.length <= 64);
});

test("personalizes reply shape and proactive cadence with learned weak signals", () => {
  const group = {};
  const member = {};
  for (let index = 0; index < 40; index += 1) {
    recordQqAdaptiveHumanMessage(group, member, humanEvent(index, {
      text: index % 5 === 0 ? "[CQ:face,id=14]" : "行"
    }));
  }
  const signals = buildQqAdaptiveLearningSignals(group, member, { now: Date.UTC(2026, 6, 3, 12) });
  const style = personalizeQqHumanStyle({
    casualMax: 28,
    reactionMax: 18,
    answerMax: 96,
    stickerMessageRatio: 0,
    emojiMessageRatio: 0,
    multiMessageRunRatio: 0.4,
    privateChat: false
  }, signals);
  assert.equal(style.adaptivePersonalization.applied, true);
  assert.ok(style.casualMax < 28);
  assert.ok(style.stickerMessageRatio > 0);
  const intervals = getQqAdaptiveProactiveIntervals(signals, {
    judgeEveryMessages: 20,
    judgeEveryMinutes: 5
  });
  assert.ok(intervals.judgeEveryMessages >= 14 && intervals.judgeEveryMessages <= 30);
  assert.ok(intervals.judgeEveryMinutes >= 3 && intervals.judgeEveryMinutes <= 8);
});

test("periodically compares human and bot language and replaces old improvements with a compact set", () => {
  const group = {};
  const member = {};
  const entries = [];
  for (let index = 0; index < 36; index += 1) {
    const event = humanEvent(index, { text: index % 2 ? "行" : "笑死" });
    recordQqAdaptiveHumanMessage(group, member, event);
    entries.push({ senderId: event.senderId, text: event.text, at: event.at });
  }
  for (let index = 0; index < 6; index += 1) {
    const text = "好的，下面给你一个非常完整而详细的解释。如果需要我可以继续帮你。";
    entries.push({
      senderId: "assistant",
      isAssistant: true,
      text,
      bubbleCount: 1,
      at: new Date(Date.UTC(2026, 6, 3, 13, index)).toISOString()
    });
    recordQqAdaptiveBotReply(group, member, { senderId: "67890" }, text, {
      at: Date.UTC(2026, 6, 3, 13, index)
    });
  }
  ensureQqAdaptiveLearning(group).styleGuidance = ["这是一条应被替换的旧规则"];
  const reviewClockStartedAt = Date.UTC(2026, 6, 6, 0, 0);
  assert.equal(maybeReviewQqAdaptiveLanguageStyle(group, entries, { now: reviewClockStartedAt }), false);
  assert.equal(maybeReviewQqAdaptiveLanguageStyle(group, entries, { now: reviewClockStartedAt + 23 * 60 * 60 * 1000 }), false);
  assert.equal(maybeReviewQqAdaptiveLanguageStyle(group, entries, { now: reviewClockStartedAt + 24 * 60 * 60 * 1000 }), true);
  const signals = buildQqAdaptiveLearningSignals(group, member);
  assert.ok(signals.group.styleGuidance.length > 0);
  assert.ok(signals.group.styleGuidance.length <= 5);
  assert.equal(signals.group.styleGuidance.includes("这是一条应被替换的旧规则"), false);
  assert.ok(signals.group.styleGuidance.some((item) => item.includes("闲聊先压到")));
  assert.ok(signals.group.styleGuidance.some((item) => item.includes("模板式开头")));
  assert.equal(
    Date.parse(signals.group.nextStyleReviewAt) - Date.parse(signals.group.lastStyleReviewAt),
    24 * 60 * 60 * 1000
  );
  const context = formatQqAdaptiveLearningContext(signals);
  assert.match(context, /最近一次真人\/Bot 差异复盘/);
  assert.doesNotMatch(context, /这是一条应被替换的旧规则/);
});

test("counts a timely human follow-up as weak feedback after a bot reply", () => {
  const group = {};
  const member = {};
  const botAt = Date.UTC(2026, 6, 4, 12, 0);
  recordQqAdaptiveBotReply(group, member, { senderId: "67890" }, "可以", { at: botAt });
  recordQqAdaptiveHumanMessage(group, member, humanEvent(1, {
    at: new Date(botAt + 60_000).toISOString(),
    text: "懂了"
  }));
  const signals = buildQqAdaptiveLearningSignals(group, member, { now: botAt + 60_000 });
  assert.equal(signals.group.botReplyFollowUpRatio, 1);
  assert.equal(signals.member.botReplyFollowUpRatio, 1);
});

test("style review ignores Bot messages older than the new-reply tracking start", () => {
  const group = {};
  const member = {};
  const entries = [];
  for (let index = 0; index < 32; index += 1) {
    const event = humanEvent(index, { text: "行" });
    recordQqAdaptiveHumanMessage(group, member, event);
    entries.push({ senderId: event.senderId, text: event.text, at: event.at });
  }
  for (let index = 0; index < 4; index += 1) {
    entries.push({
      senderId: "assistant",
      isAssistant: true,
      text: "旧回复不该计入",
      at: new Date(Date.UTC(2026, 5, 30, 12, index)).toISOString()
    });
  }
  for (let index = 0; index < 4; index += 1) {
    const at = Date.UTC(2026, 6, 5, 12, index);
    const text = "新的 Bot 回复。";
    entries.push({ senderId: "assistant", isAssistant: true, text, at: new Date(at).toISOString() });
    recordQqAdaptiveBotReply(group, member, { senderId: "67890" }, text, { at });
  }
  assert.equal(maybeReviewQqAdaptiveLanguageStyle(group, entries, { force: true }), true);
  const signals = buildQqAdaptiveLearningSignals(group, member);
  assert.equal(signals.group.styleBotSampleSize, 4);
  assert.equal(signals.group.botReplyCount, 4);
});

test("cold-group interest uses elapsed time and blocks repeated Bot-only outreach", () => {
  const now = Date.UTC(2026, 6, 10, 4, 0);
  const signals = {
    currentHour: 12,
    group: {
      sampleSize: 80,
      activityLevel: "typical",
      lastMessageAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      lastBotReplyAt: new Date(now - 9 * 60 * 60 * 1000).toISOString(),
      lastColdProactiveCheckAt: null,
      coldProactiveAwaitingHuman: false
    }
  };
  const eligible = getQqAdaptiveColdProactivePlan(signals, {
    now,
    lastActivityAt: new Date(now - 7 * 60 * 60 * 1000).toISOString()
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.reason, "cold_group_time_due");
  assert.equal(eligible.idleHours, 7);
  assert.equal(eligible.idleHoursRequired, 6);
  assert.equal(eligible.lastActivityAt, new Date(now - 7 * 60 * 60 * 1000).toISOString());
  assert.equal(eligible.thresholdReachedAt, new Date(now - 60 * 60 * 1000).toISOString());
  assert.equal(getQqAdaptiveColdProactivePlan(signals, {
    now,
    lastActivityAt: new Date(now - 60 * 60 * 1000).toISOString()
  }).reason, "group_not_cold");
  assert.equal(getQqAdaptiveColdProactivePlan({ ...signals, currentHour: 2 }, {
    now,
    lastActivityAt: new Date(now - 8 * 60 * 60 * 1000).toISOString()
  }).reason, "outside_social_hours");

  const group = {};
  const member = {};
  const learning = ensureQqAdaptiveLearning(group);
  learning.sampleCount = 80;
  learning.lastMessageAt = signals.group.lastMessageAt;
  markQqAdaptiveColdProactiveCheck(group, { at: now, sent: true });
  const blockedSignals = buildQqAdaptiveLearningSignals(group, null, { now });
  assert.equal(getQqAdaptiveColdProactivePlan(blockedSignals, { now }).reason, "awaiting_human_after_cold_proactive");

  recordQqAdaptiveHumanMessage(group, member, humanEvent(1, {
    at: new Date(now + 60 * 60 * 1000).toISOString(),
    text: "有人接话了"
  }));
  assert.equal(ensureQqAdaptiveLearning(group).coldProactiveAwaitingHuman, false);
});

test("exposes detailed safe group-level learning parameters for the dashboard", () => {
  const group = {};
  const member = {};
  for (let index = 0; index < 24; index += 1) {
    recordQqAdaptiveHumanMessage(group, member, humanEvent(index, {
      text: index % 4 === 0 ? "看这个😂" : `消息${index}`,
      hasReplySegment: index % 5 === 0
    }));
  }
  recordQqAdaptiveBotReply(group, member, { senderId: "67890" }, "好笑", {
    at: Date.UTC(2026, 6, 4, 12),
    bubbleCount: 2,
    stickerCount: 1
  });
  const summary = summarizeQqAdaptiveGroupLearning(group, { 67890: member }, {
    now: Date.UTC(2026, 6, 4, 13),
    timeZone: "Asia/Shanghai"
  });
  assert.equal(summary.sampleSize, 24);
  assert.equal(summary.learnedMembers, 1);
  assert.equal(summary.timeZone, "Asia/Shanghai");
  assert.equal(summary.botReplyCount, 1);
  assert.equal(summary.botStickerReplyRatio, 1);
  assert.equal(summary.botMultiBubbleReplyRatio, 1);
  assert.ok(summary.textSampleSize > 0);
  assert.ok(summary.emojiMessageRatio > 0);
  assert.ok(Array.isArray(summary.activeHours));
  assert.ok(Object.hasOwn(summary, "medianGapSeconds"));
  assert.ok(Object.hasOwn(summary, "styleHumanSampleSize"));
});
