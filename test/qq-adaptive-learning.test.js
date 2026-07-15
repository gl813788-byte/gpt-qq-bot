import assert from "node:assert/strict";
import test from "node:test";
import {
  backfillQqAdaptiveInterruptionLearning,
  buildQqAdaptiveLearningSignals,
  deriveQqLearnedSocialHours,
  ensureQqAdaptiveLearning,
  formatQqAdaptiveLearningContext,
  getQqAdaptiveColdProactivePlan,
  getQqAdaptivePrivateProactivePlan,
  getQqAdaptiveProactiveIntervals,
  markQqAdaptiveColdProactiveCheck,
  markQqAdaptivePrivateProactiveCheck,
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

test("learns and backfills the group speaker-switch interjection rate from two-minute transitions", () => {
  const group = {};
  const members = {};
  const start = Date.UTC(2026, 6, 1, 12, 0);
  const samples = [
    { senderId: "10001", offsetSeconds: 0 },
    { senderId: "10001", offsetSeconds: 30 },
    { senderId: "20002", offsetSeconds: 90 },
    { senderId: "30003", offsetSeconds: 400 },
    { senderId: "40004", offsetSeconds: 460 }
  ];
  for (const [index, sample] of samples.entries()) {
    members[sample.senderId] ||= {};
    recordQqAdaptiveHumanMessage(group, members[sample.senderId], humanEvent(index, {
      senderId: sample.senderId,
      at: new Date(start + sample.offsetSeconds * 1000).toISOString()
    }));
  }
  const signals = buildQqAdaptiveLearningSignals(group, null, { now: start + 500_000 });
  assert.equal(signals.version, 4);
  assert.equal(signals.group.interruptionWindowSeconds, 120);
  assert.equal(signals.group.interruptionSampleSize, 3);
  assert.equal(signals.group.interruptionCount, 2);
  assert.equal(signals.group.interruptionRate, 0.667);
  assert.match(formatQqAdaptiveLearningContext(signals), /换人插话率 67%/);

  const migrated = { adaptive: { bootstrapVersion: 1 } };
  const recentEntries = samples.slice(0, 3).map((sample, index) => ({
    senderId: sample.senderId,
    text: `消息${index}`,
    at: new Date(start + sample.offsetSeconds * 1000).toISOString()
  }));
  assert.equal(backfillQqAdaptiveInterruptionLearning(migrated, recentEntries), true);
  assert.equal(backfillQqAdaptiveInterruptionLearning(migrated, recentEntries), false);
  const migratedSignals = buildQqAdaptiveLearningSignals(migrated, null, { now: start + 500_000 });
  assert.equal(migratedSignals.group.interruptionSampleSize, 2);
  assert.equal(migratedSignals.group.interruptionCount, 1);
  assert.equal(migratedSignals.group.interruptionRate, 0.5);
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

test("cold-group interest uses learned hours and exponentially backs off unanswered Bot outreach", () => {
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
  const backedOff = getQqAdaptiveColdProactivePlan(blockedSignals, { now });
  assert.equal(backedOff.reason, "cold_check_cooldown");
  assert.equal(backedOff.awaitingHuman, true);
  assert.ok(backedOff.nextCheckAfterMs > 3 * 60 * 60 * 1000);

  recordQqAdaptiveHumanMessage(group, member, humanEvent(1, {
    at: new Date(now + 60 * 60 * 1000).toISOString(),
    text: "有人接话了"
  }));
  assert.equal(ensureQqAdaptiveLearning(group).coldProactiveAwaitingHuman, false);
});

test("derives wraparound social hours from learned activity instead of a fixed daytime window", () => {
  const counts = Array(24).fill(0);
  for (const hour of [22, 23, 0, 1]) counts[hour] = 25;
  const hours = deriveQqLearnedSocialHours(counts, 100);
  assert.equal(hours.source, "learned");
  assert.equal(hours.wrapsMidnight, true);
  assert.ok(hours.openHours.includes(23));
  assert.ok(hours.openHours.includes(0));
  assert.equal(hours.openHours.includes(12), false);
});

test("private proactive interest is U-shaped and unanswered messages lower probability and lengthen cooldown", () => {
  const now = Date.UTC(2026, 6, 10, 12, 0);
  const baseSignals = {
    currentHour: 20,
    group: {
      sampleSize: 40,
      confidence: 0.8,
      messagesPerActiveDay: 12,
      medianGapSeconds: 600,
      lastMessageAt: new Date(now - 30 * 60 * 1000).toISOString(),
      lastBotReplyAt: new Date(now - 30 * 60 * 1000).toISOString(),
      lastPrivateProactiveCheckAt: null,
      unansweredBotStreak: 0,
      socialHours: { source: "learned", startHour: 18, endHour: 2, wrapsMidnight: true, openHours: [18, 19, 20, 21, 22, 23, 0, 1], label: "18:00–02:00" }
    }
  };
  const short = getQqAdaptivePrivateProactivePlan(baseSignals, { now });
  const middle = getQqAdaptivePrivateProactivePlan({
    ...baseSignals,
    group: { ...baseSignals.group, lastMessageAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), lastBotReplyAt: new Date(now - 5 * 60 * 60 * 1000).toISOString() }
  }, { now });
  const long = getQqAdaptivePrivateProactivePlan({
    ...baseSignals,
    group: { ...baseSignals.group, lastMessageAt: new Date(now - 36 * 60 * 60 * 1000).toISOString(), lastBotReplyAt: new Date(now - 36 * 60 * 60 * 1000).toISOString() }
  }, { now });
  assert.equal(short.phase, "short");
  assert.equal(middle.phase, "middle");
  assert.equal(long.phase, "long");
  assert.ok(short.probability > middle.probability);
  assert.ok(long.probability > middle.probability);

  const contact = {};
  ensureQqAdaptiveLearning(contact).sampleCount = 40;
  markQqAdaptivePrivateProactiveCheck(contact, { at: now, sent: true });
  assert.equal(ensureQqAdaptiveLearning(contact).lastPrivateProactiveAt, new Date(now).toISOString());
  const suppressed = getQqAdaptivePrivateProactivePlan({
    ...baseSignals,
    group: { ...baseSignals.group, unansweredBotStreak: 3 }
  }, { now });
  assert.ok(suppressed.probability < short.probability);
  assert.ok(suppressed.nextCheckAfterMs > short.nextCheckAfterMs);
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
  assert.ok(Object.hasOwn(summary, "interruptionSampleSize"));
  assert.ok(Object.hasOwn(summary, "interruptionRate"));
  assert.ok(Object.hasOwn(summary, "styleHumanSampleSize"));
});
