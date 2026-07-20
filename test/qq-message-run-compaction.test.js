import assert from "node:assert/strict";
import test from "node:test";
import {
  appendQqConsecutiveRepeatSuffix,
  compactConsecutiveQqMessages,
  getQqMessageConsecutiveRepeatCount
} from "../src/qq-message-run-compaction.js";

test("collapses every adjacent two-or-more duplicate run and keeps the latest sender", () => {
  const compacted = compactConsecutiveQqMessages([
    { messageId: "1", senderId: "100", senderName: "甲", text: "复读" },
    { messageId: "2", senderId: "200", senderName: "乙", text: "复读" },
    { messageId: "3", senderId: "300", senderName: "丙", text: "复读" },
    { messageId: "4", senderId: "100", senderName: "甲", text: "换话题" },
    { messageId: "5", senderId: "200", senderName: "乙", text: "收到" },
    { messageId: "6", senderId: "300", senderName: "丙", text: "收到" }
  ]);

  assert.equal(compacted.length, 3);
  assert.deepEqual(compacted.map((item) => item.messageId), ["3", "4", "6"]);
  assert.equal(compacted[0].senderName, "丙");
  assert.equal(compacted[0].consecutiveRepeatCount, 3);
  assert.equal(compacted[2].consecutiveRepeatCount, 2);
  assert.equal(appendQqConsecutiveRepeatSuffix(compacted[0].text, compacted[0]), "复读（连续重复 3 条）");
});

test("does not merge identical messages when another message separates them", () => {
  const compacted = compactConsecutiveQqMessages([
    { messageId: "1", text: "同一句" },
    { messageId: "2", text: "中间消息" },
    { messageId: "3", text: "同一句" }
  ]);
  assert.equal(compacted.length, 3);
  assert.equal(compacted.some((item) => item.consecutiveRepeatCount), false);
});

test("keeps messages separate when role, mention, quote, or image meaning differs", () => {
  const compacted = compactConsecutiveQqMessages([
    { senderId: "100", text: "看看" },
    { senderId: "assistant", isAssistant: true, text: "看看" },
    { senderId: "100", text: "看看", atTargets: ["200"] },
    { senderId: "100", text: "看看", atTargets: ["300"] },
    { senderId: "100", text: "看看", replyContext: { senderId: "200", text: "A" } },
    { senderId: "100", text: "看看", replyContext: { senderId: "200", text: "B" } },
    { senderId: "100", text: "看看", images: [{ file: "a.png" }] },
    { senderId: "100", text: "看看", images: [{ file: "b.png" }] }
  ]);
  assert.equal(compacted.length, 8);
});

test("respects source sequence barriers and adds existing compacted counts", () => {
  const separated = compactConsecutiveQqMessages([
    { text: "相同", line: 1 },
    { text: "相同", line: 3 }
  ], {
    isConsecutive: (previous, current) => current.line === previous.line + 1
  });
  assert.equal(separated.length, 2);

  const merged = compactConsecutiveQqMessages([
    { messageId: "2", text: "相同", consecutiveRepeatCount: 2 },
    { messageId: "5", text: "相同", consecutiveRepeatCount: 3 }
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].consecutiveRepeatCount, 5);
  assert.equal(getQqMessageConsecutiveRepeatCount(merged, "5"), 5);
});
