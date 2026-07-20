import assert from "node:assert/strict";
import test from "node:test";
import { formatQqColdProactivePrompt } from "../src/qq-cold-proactive-prompt.js";

test("approved cold topic prompt makes the main model execute instead of judging again", () => {
  const prompt = formatQqColdProactivePrompt({
    mode: "topic"
  });
  assert.match(prompt, /已批准的冷群主动发言/);
  assert.match(prompt, /兴趣模型已批准启动主模型/);
  assert.match(prompt, /不需要你再次判断发不发/);
  assert.match(prompt, /自己的全局兴趣、长期记忆和最近群聊/);
  assert.match(prompt, /可自由调用现有工具、多轮换查询角度/);
  assert.doesNotMatch(prompt, /静默时长|兴趣抑制系数|未回复次数/);
  assert.doesNotMatch(prompt, /只允许|最多 4 轮|全部禁止/);
});

test("approved cold chatter prompt stays lightweight without forbidding tools", () => {
  const prompt = formatQqColdProactivePrompt({ mode: "chatter" });
  assert.match(prompt, /模式为 chatter/);
  assert.match(prompt, /少见的轻量水群/);
  assert.match(prompt, /通常无需搜索；除非这句话天然依赖新资料/);
  assert.doesNotMatch(prompt, /禁止搜索|只能闲聊/);
});
