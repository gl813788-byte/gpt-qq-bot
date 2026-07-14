import assert from "node:assert/strict";
import test from "node:test";
import { shouldProactivelyReplyToQq } from "../src/qq-enhancer/proactive-interest.js";

function sse(data) {
  return `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
}

function waitForChunk(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function streamResponse(chunks, signal) {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(new ReadableStream({
    async pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      const chunk = chunks[index++];
      await waitForChunk(chunk.delayMs || 0, signal);
      controller.enqueue(encoder.encode(chunk.data));
    }
  }), {
    status: 200,
    headers: { "content-type": "text/event-stream" }
  });
}

function proactiveState(timeoutMs = 1500, overrides = {}) {
  return {
    ownerUserIds: [],
    proactive: {
      enabled: true,
      judgeEveryMessages: overrides.judgeEveryMessages ?? 1,
      judgeEveryMinutes: overrides.judgeEveryMinutes ?? 5,
      messageCountByGroupId: {},
      judge: {
        enabled: true,
        model: "test/streaming-model",
        baseUrl: "https://openrouter.test/api/v1",
        timeoutMs,
        minInterest: 20,
        maxRecentMessages: 8
      }
    }
  };
}

function jsonJudgeResponse({ shouldReply = true, interest = 88 } = {}) {
  return new Response(JSON.stringify({
    choices: [{
      message: {
        content: `FINAL_JSON: {"shouldReply":${shouldReply},"interest":${interest},"reason":"测试","replyStyle":"简短"}`
      },
      finish_reason: "stop"
    }]
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

const event = {
  type: "group_message",
  groupId: "12345",
  text: "这个编程工具挺有意思"
};

test("proactive judge resets its idle timeout while reasoning and content tokens continue", async () => {
  let requestBody;
  const fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return streamResponse([
      { data: sse({ choices: [{ delta: { reasoning: "分析一" } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { reasoning: "分析二" } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { content: "ANALYSIS: 话题相关，可以自然补充。\nFINAL_JSON: " } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { content: "{\"shouldReply\":true,\"interest\":88,\"reason\":\"相关\",\"replyStyle\":\"简短\"}" }, finish_reason: "stop" }] }) },
      { data: sse("[DONE]") }
    ], options.signal);
  };

  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch,
    recentMessages: [
      { senderId: "100", text: "前面在讨论 Node 部署" },
      { senderId: "assistant", isAssistant: true, text: "可以看日志定位" }
    ],
    humanStyle: {
      sampleSize: 120,
      messagesPerHour: 42,
      multiMessageRunRatio: 0.38,
      messagesInMultiRunsRatio: 0.6,
      medianTextChars: 6,
      p90TextChars: 12,
      imageMessageRatio: 0.18,
      emojiMessageRatio: 0.06,
      replyMessageRatio: 0.12
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelJudge.interest, 88);
  assert.equal(result.modelJudge.finishReason, "stop");
  assert.deepEqual(result.replyContext, [
    { sender: "member1", text: "前面在讨论 Node 部署", replyToBot: false },
    { sender: "bot", text: "可以看日志定位", replyToBot: false }
  ]);
  assert.ok(result.modelJudge.durationMs >= 2500);
  assert.equal(requestBody.stream, true);
  assert.equal(requestBody.max_tokens, 2048);
  assert.deepEqual(requestBody.reasoning, { effort: "none" });
  assert.match(requestBody.messages[0].content, /先在普通回复正文中输出一行简短的 ANALYSIS:/);
  assert.match(requestBody.messages[0].content, /最后必须单独输出一行 FINAL_JSON:/);
  const judgeInput = JSON.parse(requestBody.messages[1].content);
  assert.equal(judgeInput.groupHumanRhythm.multiMessageRunRatio, 0.38);
});

test("proactive judge aborts only after the token stream stays idle", async () => {
  const fetch = async (_url, options) => streamResponse([
    { data: sse({ choices: [{ delta: { reasoning: "开始分析" } }] }) },
    { delayMs: 2500, data: sse({ choices: [{ delta: { content: "too late" } }] }) }
  ], options.signal);

  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /produced no new token for 1500ms/);
  assert.ok(result.modelJudge.durationMs >= 1400);
  assert.ok(result.modelJudge.durationMs < 2400);
});

test("minute trigger does nothing when no new ordinary group message exists", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 2 });
  let fetchCount = 0;
  const result = await shouldProactivelyReplyToQq(event, state, {
    triggerMode: "time",
    countMessage: false,
    now: () => 10 * 60 * 1000,
    openRouterApiKey: "configured-for-test",
    fetch: async () => {
      fetchCount += 1;
      return jsonJudgeResponse();
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "no new proactive messages to inspect");
  assert.equal(fetchCount, 0);
  assert.equal(state.proactive.messageCountByGroupId[event.groupId] || 0, 0);
});

test("explicit mentions and replies to the bot never enter a proactive cycle", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 1, judgeEveryMinutes: 1 });
  let fetchCount = 0;
  const result = await shouldProactivelyReplyToQq({ ...event, isReplyToSelf: true }, state, {
    openRouterApiKey: "configured-for-test",
    fetch: async () => {
      fetchCount += 1;
      return jsonJudgeResponse();
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "explicit mention is handled by mention-only route");
  assert.equal(fetchCount, 0);
  assert.equal(state.proactive.messageCountByGroupId[event.groupId] || 0, 0);
});

test("affirmative proactive decisions retain context images only for the formal reply", async () => {
  let requestBody;
  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonJudgeResponse({ shouldReply: true, interest: 90 });
    },
    recentMessages: [
      {
        senderId: "100",
        text: "看前面这张截图",
        images: [{ file: "context.png", url: "https://example.test/context.png", raw: { secret: "drop" } }]
      },
      {
        senderId: "200",
        text: "",
        images: [{ file: "image-only.jpg", url: "https://example.test/image-only.jpg" }]
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.replyContext.map((item) => item.imageCount), [1, 1]);
  assert.deepEqual(result.replyContext.flatMap((item) => item.images).map((image) => image.file), [
    "context.png",
    "image-only.jpg"
  ]);
  const judgeInput = JSON.parse(requestBody.messages[1].content);
  assert.deepEqual(judgeInput.recentMessages.map((item) => item.imageCount), [1, 1]);
  assert.equal(judgeInput.recentMessages.some((item) => "images" in item), false);
  assert.doesNotMatch(requestBody.messages[1].content, /example\.test|context\.png|image-only\.jpg/);
});

test("declined proactive decisions do not expose context images to a formal reply", async () => {
  let requestBody;
  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonJudgeResponse({ shouldReply: false, interest: 95 });
    },
    recentMessages: [{ senderId: "100", text: "截图", images: [{ file: "private-context.png" }] }]
  });

  assert.equal(result.ok, false);
  assert.equal("replyContext" in result, false);
  assert.doesNotMatch(requestBody.messages[1].content, /private-context\.png/);
});

test("minute trigger consumes pending messages and resets both cycles", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 2 });
  let nowMs = 1_000_000;
  let fetchCount = 0;
  const helpers = {
    now: () => nowMs,
    openRouterApiKey: "configured-for-test",
    fetch: async () => {
      fetchCount += 1;
      return jsonJudgeResponse();
    }
  };

  const first = await shouldProactivelyReplyToQq(event, state, helpers);
  assert.equal(first.reason, "waiting for proactive judge message interval");
  assert.equal(state.proactive.messageCountByGroupId[event.groupId], 1);

  nowMs += 2 * 60 * 1000 - 1;
  const early = await shouldProactivelyReplyToQq(event, state, {
    ...helpers,
    triggerMode: "time",
    countMessage: false
  });
  assert.equal(early.reason, "waiting for proactive judge minute interval");
  assert.equal(fetchCount, 0);

  nowMs += 1;
  const due = await shouldProactivelyReplyToQq({ ...event, proactiveObservedAtMs: nowMs }, state, {
    ...helpers,
    triggerMode: "time",
    countMessage: false
  });
  assert.equal(due.ok, true);
  assert.equal(due.triggerReason, "minute_interval");
  assert.equal(due.consumedMessageCount, 1);
  assert.equal(due.messageCountRemaining, 0);
  assert.equal(state.proactive.messageCountByGroupId[event.groupId], 0);
  assert.equal(state.proactive.lastJudgeAtByGroupId[event.groupId], nowMs);
  assert.equal(fetchCount, 1);

  nowMs += 5 * 60 * 1000;
  const emptyCycle = await shouldProactivelyReplyToQq(event, state, {
    ...helpers,
    triggerMode: "time",
    countMessage: false
  });
  assert.equal(emptyCycle.reason, "no new proactive messages to inspect");
  assert.equal(fetchCount, 1);
});

test("message-count trigger also restarts the minute cycle", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 2, judgeEveryMinutes: 5 });
  let nowMs = 2_000_000;
  let fetchCount = 0;
  const helpers = {
    now: () => nowMs,
    openRouterApiKey: "configured-for-test",
    fetch: async () => {
      fetchCount += 1;
      return jsonJudgeResponse();
    }
  };

  const first = await shouldProactivelyReplyToQq(event, state, helpers);
  assert.equal(first.ok, false);
  nowMs += 1000;
  const second = await shouldProactivelyReplyToQq(event, state, helpers);
  assert.equal(second.ok, true);
  assert.equal(second.triggerReason, "message_count");
  assert.equal(second.messageCountRemaining, 0);
  assert.equal(state.proactive.lastJudgeAtByGroupId[event.groupId], nowMs);

  nowMs += 6 * 60 * 1000;
  const timer = await shouldProactivelyReplyToQq(event, state, {
    ...helpers,
    triggerMode: "time",
    countMessage: false
  });
  assert.equal(timer.reason, "no new proactive messages to inspect");
  assert.equal(fetchCount, 1);
});

test("uses per-group learned proactive intervals supplied by the runtime", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 5 });
  const helpers = {
    judgeEveryMessages: 2,
    judgeEveryMinutes: 1,
    openRouterApiKey: "configured-for-test",
    fetch: async () => jsonJudgeResponse()
  };
  const first = await shouldProactivelyReplyToQq(event, state, helpers);
  const second = await shouldProactivelyReplyToQq(event, state, helpers);
  assert.equal(first.reason, "waiting for proactive judge message interval");
  assert.equal(first.judgeEveryMessages, 2);
  assert.equal(second.ok, true);
  assert.equal(second.judgeEveryMinutes, 1);
});

test("messages arriving during a judge stay in the next cycle", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 1, judgeEveryMinutes: 5 });
  let releaseJudge;
  const fetch = async () => {
    await new Promise((resolve) => { releaseJudge = resolve; });
    return jsonJudgeResponse();
  };
  const firstPromise = shouldProactivelyReplyToQq(event, state, {
    openRouterApiKey: "configured-for-test",
    fetch
  });
  await new Promise((resolve) => setImmediate(resolve));
  const during = await shouldProactivelyReplyToQq({ ...event, text: "第二条新消息" }, state, {
    openRouterApiKey: "configured-for-test",
    fetch
  });
  assert.equal(during.reason, "proactive judge already in flight");
  releaseJudge();
  const first = await firstPromise;
  assert.equal(first.ok, true);
  assert.equal(first.messageCountRemaining, 1);
  assert.equal(state.proactive.messageCountByGroupId[event.groupId], 1);
});
