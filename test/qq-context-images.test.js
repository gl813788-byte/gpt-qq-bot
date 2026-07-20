import assert from "node:assert/strict";
import test from "node:test";
import {
  collectQqContextImages,
  getQqGroupRecentContextLimit,
  snapshotQqContextImages
} from "../src/qq-enhancer/context-images.js";

test("QQ context image snapshots are bounded, deduplicated, and strip unrelated raw fields", () => {
  const images = snapshotQqContextImages([
    {
      file: "same.png",
      url: "https://example.test/same.png",
      fileSize: "123",
      summary: "截图",
      raw: {
        sub_type: 1,
        emoji_id: "emoji-1",
        secretPayload: "must-not-persist"
      }
    },
    { file: "same.png", url: "https://example.test/same.png" },
    { file: "second.gif", raw: { isAnimated: true } }
  ], { limit: 2 });

  assert.equal(images.length, 2);
  assert.deepEqual(images[0], {
    file: "same.png",
    url: "https://example.test/same.png",
    fileSize: 123,
    summary: "截图",
    raw: { emoji_id: "emoji-1", sub_type: 1 }
  });
  assert.equal(images[1].raw.isAnimated, true);
  assert.equal("secretPayload" in images[0].raw, false);
});

test("QQ context image collection prefers the newest messages and keeps source mapping", () => {
  const images = collectQqContextImages([
    { messageId: "1", senderLabel: "甲", text: "旧图", images: [{ file: "old.png" }] },
    { messageId: "2", senderLabel: "乙", text: "新图一", images: [{ file: "new-1.png" }] },
    { messageId: "3", senderLabel: "丙", text: "当前图", images: [{ file: "current.png" }] },
    { messageId: "4", senderLabel: "丁", text: "新图二", images: [{ file: "new-2.png" }] }
  ], { limit: 2, excludeMessageId: "3" });

  assert.deepEqual(images.map((image) => image.file), ["new-1.png", "new-2.png"]);
  assert.deepEqual(images.map((image) => image.context.sender), ["乙", "丁"]);
  assert.equal(images.some((image) => image.file === "current.png"), false);
});

test("QQ context image mapping retains the compressed repeat count", () => {
  const images = collectQqContextImages([{
    messageId: "3",
    senderLabel: "丙",
    text: "同一张图",
    consecutiveRepeatCount: 3,
    images: [{ file: "same.png" }]
  }]);
  assert.equal(images[0].context.text, "同一张图（连续重复 3 条）");
});

test("explicit bot triggers use a larger complete recent-group window", () => {
  assert.equal(getQqGroupRecentContextLimit(), 12);
  assert.equal(getQqGroupRecentContextLimit({ explicitBotTrigger: true }), 18);
  assert.equal(getQqGroupRecentContextLimit({ explicitBotTrigger: true, expandLevel: 1 }), 28);
});
