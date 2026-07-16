import assert from "node:assert/strict";
import test from "node:test";
import { buildQqSendPlan, sendQqGroupBubbles } from "../src/qq-enhancer/index.js";
import { applyQqHumanReplyGuard } from "../src/qq-human-behavior.js";
import {
  buildQqStickerReply,
  formatQqStickerSendModeInstruction
} from "../src/qq-sticker-delivery.js";

test("documents all three selectable sticker delivery modes", () => {
  const instruction = formatQqStickerSendModeInstruction({ bubbleSeparator: "---" });
  assert.match(instruction, /图文合并/);
  assert.match(instruction, /仅表情包/);
  assert.match(instruction, /分开发送/);
  assert.match(instruction, /单独一行写 ---/);
});

test("builds combined, sticker-only and separate sticker replies", () => {
  assert.equal(
    buildQqStickerReply("笑死", "开心", { mode: "combined" }),
    "笑死\n[[qq_sticker:开心]]"
  );
  assert.equal(
    buildQqStickerReply("这句不会发出", "开心", { mode: "sticker_only" }),
    "[[qq_sticker:开心]]"
  );
  assert.equal(
    buildQqStickerReply("笑死", "开心", { mode: "separate", bubbleSeparator: "---" }),
    "笑死\n---\n[[qq_sticker:开心]]"
  );
});

test("reply guard and send plan preserve each sticker delivery layout", () => {
  const guardOptions = {
    mode: "casual",
    compact: true,
    maxChars: 16,
    preferMultiBubble: false
  };
  const combined = applyQqHumanReplyGuard("笑死\n[[qq_sticker:开心]]", guardOptions);
  const stickerOnly = applyQqHumanReplyGuard("[[qq_sticker:开心]]", guardOptions);
  const separate = applyQqHumanReplyGuard("笑死\n|||\n[[qq_sticker:开心]]", guardOptions);

  assert.deepEqual(buildQqSendPlan({}, combined).bubbles, ["笑死\n[[qq_sticker:开心]]"]);
  assert.deepEqual(buildQqSendPlan({}, stickerOnly).bubbles, ["[[qq_sticker:开心]]"]);
  assert.deepEqual(buildQqSendPlan({}, separate).bubbles, ["笑死", "[[qq_sticker:开心]]"]);
});

test("separate sticker mode performs two ordered group sends", async () => {
  const calls = [];
  const result = await sendQqGroupBubbles({
    event: { type: "group_message" },
    reply: "笑死\n|||\n[[qq_sticker:开心]]",
    delayMs: 0,
    sendGroupMessage: async (bubble, options) => {
      calls.push({ bubble, options });
      return { ok: true };
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    { bubble: "笑死", options: { quoteSource: true } },
    { bubble: "[[qq_sticker:开心]]", options: { quoteSource: false } }
  ]);
});
