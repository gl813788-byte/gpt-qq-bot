import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeQqBotChatStyle,
  analyzeQqHumanChatStyle,
  applyQqHumanReplyGuard,
  buildQqHumanBehaviorPlan,
  formatQqHumanBehaviorContext,
  getQqAdaptiveStickerChance,
  getQqAdaptiveBubbleDelayMs,
  isQqStickerStyleMessage,
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

test("recognizes QQ animated, marketplace and face stickers without counting their URLs as text", () => {
  const entries = [
    { senderId: "1", text: "[CQ:image,summary=[动画表情],file=a.jpg,sub_type=1,url=https://example.test/very-long-url]" },
    { senderId: "2", text: "[CQ:image,summary=[嘻嘻],file=b.gif,emoji_id=abc,emoji_package_id=123]" },
    { senderId: "3", text: "[CQ:face,id=477,raw={\"faceType\":3}]" },
    { senderId: "4", text: "普通图片[CQ:image,file=c.png,sub_type=0,url=https://example.test/image]" },
    { senderId: "5", text: "一句正常文字" },
    { senderId: "6", text: ",file=legacy.jpg,sub_type=1,url=https://example.test/legacy" }
  ];
  const style = analyzeQqHumanChatStyle(entries);
  assert.equal(style.sampleSize, 6);
  assert.equal(style.stickerMessageRatio, 0.667);
  assert.equal(style.imageMessageRatio, 0.167);
  assert.equal(style.textSampleSize, 2);
  assert.ok(style.p90TextChars < 20);
  assert.equal(isQqStickerStyleMessage(entries[0]), true);
});

test("tracks bot sticker frequency separately from anonymous human frequency", () => {
  const bot = analyzeQqBotChatStyle([
    { senderId: "1", text: "真人" },
    { senderId: "assistant", isAssistant: true, text: "收到", stickerCount: 1 },
    { senderId: "assistant", isAssistant: true, text: "普通回复", stickerCount: 0 }
  ]);
  assert.equal(bot.sampleSize, 2);
  assert.equal(bot.stickerMessages, 1);
  assert.equal(bot.stickerMessageRatio, 0.5);
  assert.equal(bot.textSampleSize, 2);
  assert.equal(bot.averageTextChars, 3);
});

test("measures bot language habits for periodic human-versus-bot review", () => {
  const bot = analyzeQqBotChatStyle([
    { senderId: "assistant", isAssistant: true, text: "好的，下面是一段很完整的回答。", bubbleCount: 2 },
    { senderId: "assistant", isAssistant: true, text: "如果需要我可以继续帮你。" },
    { senderId: "1", text: "真人消息不计入" }
  ]);
  assert.equal(bot.sampleSize, 2);
  assert.equal(bot.multiBubbleRatio, 0.5);
  assert.equal(bot.genericOpeningRatio, 0.5);
  assert.equal(bot.serviceEndingRatio, 0.5);
  assert.equal(bot.terminalPeriodRatio, 1);
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

test("cold-group interest keeps normal reply freedom for model-led research and topic opening", () => {
  const style = analyzeQqHumanChatStyle([{ senderId: "1", text: "这个挺好玩" }]);
  const plan = buildQqHumanBehaviorPlan({
    groupId: "g",
    senderId: "0",
    text: "",
    qqColdProactive: true
  }, {}, style, { text: "" });
  assert.equal(plan.mode, "cold_proactive");
  assert.equal(plan.compact, false);
  assert.equal(plan.openEnded, true);
  assert.equal(plan.maxSentences, 3);
  assert.match(plan.goal, /自由检索、探索/);
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

test("boosts casual bot sticker planning above the learned human rate while keeping it bounded", () => {
  const style = { stickerMessageRatio: 0.12, privateChat: false };
  const target = getQqAdaptiveStickerChance(style);
  assert.ok(target > style.stickerMessageRatio);
  assert.ok(target <= 0.34);
  let preferred = 0;
  for (let index = 0; index < 1000; index += 1) {
    const plan = buildQqHumanBehaviorPlan({
      groupId: "g",
      senderId: "u",
      text: "这也太好笑了",
      raw: { message_id: String(index) }
    }, {}, style, { text: "这也太好笑了" });
    if (plan.preferSticker) preferred += 1;
  }
  assert.ok(preferred > 140 && preferred < 260, `unexpected sticker preference count: ${preferred}`);
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
    preferMultiBubble: true,
    preferSticker: true
  }, { proactive: true, bubbleSeparator: "---" });
  assert.match(context, /匿名统计/);
  assert.match(context, /2 条短气泡/);
  assert.match(context, /表情包规划/);
  assert.match(context, /单独一行写 ---/);
  assert.match(context, /兴趣模型已经批准的执行轮/);
  assert.match(context, /不要再次判断是否发言/);
  assert.match(context, /\[\[qq_silent\]\]/);
  assert.equal(isQqSilentReply("[[qq_silent]]\n[[qq_memory:{\"recentTopic\":\"闲聊\"}]]"), true);
});

test("compresses learned human follow-up gaps into a bounded bubble delay", () => {
  assert.equal(getQqAdaptiveBubbleDelayMs({ sameSpeakerGapMedianSeconds: 8.6 }, { configuredMs: 650 }), 1290);
  assert.equal(getQqAdaptiveBubbleDelayMs({ sameSpeakerGapMedianSeconds: 30 }, { configuredMs: 650 }), 1800);
  assert.equal(getQqAdaptiveBubbleDelayMs({}, { configuredMs: 700 }), 700);
});
