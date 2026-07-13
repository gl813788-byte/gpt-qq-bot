import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeQqHumanChatStyle,
  applyQqHumanReplyGuard,
  buildQqHumanBehaviorPlan,
  formatQqHumanBehaviorContext,
  getQqAdaptiveBubbleDelayMs,
  isQqSilentReply
} from "../src/qq-human-behavior.js";
import { buildQqSendPlan } from "../src/qq-enhancer/index.js";

test("learns short group rhythm from humans while excluding assistant messages", () => {
  const entries = [
    { senderId: "1", text: "好", at: "2026-07-13T10:00:00.000Z" },
    { senderId: "2", text: "什么游戏", at: "2026-07-13T10:00:10.000Z" },
    { senderId: "2", text: "我也想玩", at: "2026-07-13T10:00:18.000Z" },
    { senderId: "3", text: "[图片]", at: "2026-07-13T10:00:30.000Z" },
    { senderId: "assistant", isAssistant: true, text: "这是一个非常完整而详细的机器人回答。", at: "2026-07-13T10:00:40.000Z" }
  ];
  const style = analyzeQqHumanChatStyle(entries);
  assert.equal(style.sampleSize, 4);
  assert.equal(style.textSampleSize, 3);
  assert.ok(style.medianTextChars <= 5);
  assert.ok(style.mediaMessageRatio > 0);
  assert.ok(style.sameSpeakerContinuationRatio > 0);
  assert.ok(style.multiMessageRunRatio > 0);
  assert.ok(Array.isArray(style.emojiPalette));
});

test("plans reactions, short answers and tasks with different behavior budgets", () => {
  const style = analyzeQqHumanChatStyle([
    { senderId: "1", text: "好" },
    { senderId: "2", text: "有点困" },
    { senderId: "3", text: "啥意思" }
  ]);
  const imagePlan = buildQqHumanBehaviorPlan({ groupId: "g", senderId: "u", text: "[图片]" }, { hasImages: true }, style, { text: "[图片]" });
  const answerPlan = buildQqHumanBehaviorPlan({ groupId: "g", senderId: "u", text: "这是啥" }, { isQuestion: true }, style, { text: "这是啥" });
  const taskPlan = buildQqHumanBehaviorPlan({ groupId: "g", senderId: "u", text: "帮我查一下" }, { asksAction: true }, style, { text: "帮我查一下" });
  assert.equal(imagePlan.mode, "visual_reaction");
  assert.equal(answerPlan.mode, "casual_answer");
  assert.equal(taskPlan.mode, "task");
  assert.ok(imagePlan.maxChars < answerPlan.maxChars);
  assert.ok(answerPlan.maxChars < taskPlan.maxChars);
});

test("treats playful social requests as compact chat instead of a formal task report", () => {
  const style = analyzeQqHumanChatStyle([{ senderId: "1", text: "行", at: "2026-07-13T10:00:00.000Z" }]);
  const plan = buildQqHumanBehaviorPlan({ groupId: "g", senderId: "u", text: "给我点十个赞" }, { asksAction: true }, style, { text: "给我点十个赞" });
  assert.equal(plan.mode, "social_request");
  assert.equal(plan.compact, true);
  assert.ok(plan.maxChars < 50);
});

test("learned burst rate raises multi-bubble frequency without making every turn multi-bubble", () => {
  const style = {
    privateChat: false,
    casualMax: 18,
    answerMax: 64,
    multiMessageRunRatio: 0.38,
    runP90: 2,
    emojiMessageRatio: 0.06,
    emojiPalette: ["🤔"]
  };
  let multi = 0;
  for (let index = 0; index < 500; index += 1) {
    const plan = buildQqHumanBehaviorPlan({
      groupId: "g",
      senderId: "u",
      text: "这个有点意思",
      raw: { message_id: String(index) }
    }, {}, style, { text: "这个有点意思" });
    if (plan.preferMultiBubble) multi += 1;
  }
  assert.ok(multi > 180 && multi < 280, `unexpected multi-bubble count: ${multi}`);
});

test("compacts casual replies and preserves invisible memory markers", () => {
  const reply = "收到，确实有点离谱。这个展开说其实还有不少背景。\n[[qq_memory:{\"recentTopic\":\"群聊节奏\"}]]";
  const guarded = applyQqHumanReplyGuard(reply, {
    mode: "casual",
    compact: true,
    maxChars: 12,
    preferMultiBubble: false
  });
  assert.match(guarded, /^确实有点离谱/);
  assert.doesNotMatch(guarded, /不少背景/);
  assert.match(guarded, /\[\[qq_memory:/);
});

test("turns two natural beats into two bubbles when the round prefers it", () => {
  const guarded = applyQqHumanReplyGuard("这个确实挺好笑，后劲还挺大。", {
    mode: "casual",
    compact: true,
    maxChars: 16,
    preferMultiBubble: true
  });
  assert.match(guarded, /\n\|\|\|\n/);
  assert.equal(buildQqSendPlan({}, guarded).bubbles.length, 2);
});

test("formats anonymous evidence and recognizes proactive silence", () => {
  const context = formatQqHumanBehaviorContext({
    textSampleSize: 80,
    medianTextChars: 6,
    p90TextChars: 12,
    shortMessageRatio: 0.82
  }, {
    mode: "casual",
    goal: "自然接话",
    maxChars: 18,
    maxSentences: 1,
    preferMultiBubble: true
  }, { proactive: true });
  assert.match(context, /匿名统计/);
  assert.match(context, /2 条短气泡/);
  assert.match(context, /\[\[qq_silent\]\]/);
  assert.equal(isQqSilentReply("[[qq_silent]]\n[[qq_memory:{\"recentTopic\":\"闲聊\"}]]"), true);
});

test("compresses learned human follow-up gaps into a bounded bubble delay", () => {
  assert.equal(getQqAdaptiveBubbleDelayMs({ sameSpeakerGapMedianSeconds: 8.6 }, { configuredMs: 650 }), 1290);
  assert.equal(getQqAdaptiveBubbleDelayMs({ sameSpeakerGapMedianSeconds: 30 }, { configuredMs: 650 }), 1800);
  assert.equal(getQqAdaptiveBubbleDelayMs({}, { configuredMs: 700 }), 700);
});
