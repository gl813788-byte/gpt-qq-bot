import assert from "node:assert/strict";
import test from "node:test";
import {
  judgeQqColdGroupTopicStart,
  judgeQqPrivateProactiveStart,
  runQqInterestModelStructuredTask,
  shouldProactivelyReplyToQq
} from "../src/qq-enhancer/proactive-interest.js";

test("cold-group interest model decides only whether to start before the main model researches", async () => {
  let requestBody = null;
  const result = await judgeQqColdGroupTopicStart({
    apiKey: "test-key",
    baseUrl: "https://openrouter.test/api/v1",
    model: "test/interest-model",
    timeoutMs: 1500,
    selfPersona: { interests: [{ topic: "AI 工具", weight: 90 }] },
    coldInterest: {
      idleHours: 6,
      idleHoursRequired: 4,
      unansweredBotStreak: 0,
      interestMultiplier: 1,
      socialHours: { label: "13:00–03:00" }
    },
    recentMessages: [{ sender: "群友", text: "最近在折腾新工具" }],
    fetch: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        choices: [{
          message: { content: JSON.stringify({ shouldStart: true, mode: "topic", interest: 82, reason: "现在适合启动" }) },
          finish_reason: "stop"
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.shouldStart, true);
  assert.equal(requestBody.temperature, 0.8);
  assert.match(requestBody.messages[0].content, /不能提供具体话题、搜索词、回复草稿或聊天风格/);
  assert.match(requestBody.messages[0].content, /topic（让主模型按自身兴趣选题/);
  assert.deepEqual(requestBody.response_format.json_schema.schema.required, ["shouldStart", "mode", "interest", "reason"]);
});

test("cold-group interest input compresses adjacent duplicate messages from two onward", async () => {
  let requestBody = null;
  await judgeQqColdGroupTopicStart({
    apiKey: "test-key",
    baseUrl: "https://openrouter.test/api/v1",
    model: "test/interest-model",
    timeoutMs: 1500,
    maxRecentMessages: 2,
    recentMessages: [
      { messageId: "1", senderId: "10000", text: "有人吗" },
      { messageId: "2", senderId: "20000", text: "有人吗" },
      { messageId: "3", senderId: "30000", text: "有人吗" }
    ],
    fetch: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        choices: [{
          message: { content: JSON.stringify({ shouldStart: false, mode: "silent", interest: 10, reason: "继续安静" }) },
          finish_reason: "stop"
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  const payload = JSON.parse(requestBody.messages[1].content);
  assert.equal(payload.recentMessages.length, 1);
  assert.equal(payload.recentMessages[0].sender, "QQ 30000");
  assert.equal(payload.recentMessages[0].text, "有人吗（连续重复 3 条）");
});

test("private proactive interest model owns the start decision while the main model owns wording", async () => {
  let requestBody = null;
  const result = await judgeQqPrivateProactiveStart({
    apiKey: "test-key",
    baseUrl: "https://openrouter.test/api/v1",
    model: "test/interest-model",
    timeoutMs: 1500,
    selfPersona: { interests: [{ topic: "语言", weight: 80 }] },
    privateInterest: { phase: "long", frequency: "low", idleHours: 30, unansweredBotStreak: 0 },
    frequencyPrior: { probability: 0.12, roll: 0.09 },
    recentMessages: [{ senderId: "10000", senderName: "联系人", text: "下次再聊语法" }],
    fetch: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        choices: [{
          message: { content: JSON.stringify({ shouldStart: true, interest: 72, reason: "有自然延续点" }) },
          finish_reason: "stop"
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.shouldStart, true);
  assert.equal(requestBody.temperature, 0.8);
  assert.match(requestBody.messages[0].content, /不能写具体私聊内容、开场句或风格建议/);
  const payload = JSON.parse(requestBody.messages[1].content);
  assert.equal(payload.frequencyPrior.probability, 0.12);
  assert.equal(payload.frequencyPrior.roll, 0.09);
});

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

function jsonJudgeResponse({
  shouldReply = true,
  interest = 88
} = {}) {
  return new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          shouldReply,
          interest,
          reason: "测试"
        })
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

test("runs bounded miscellaneous triage through the configured interest model", async () => {
  let requestBody;
  const result = await runQqInterestModelStructuredTask({
    apiKey: "configured-for-test",
    baseUrl: "https://openrouter.test/api/v1",
    model: "test/interest-model",
    taskName: "qq_knowledge_deletion_triage",
    temperature: 0.15,
    systemPrompt: "只对低频黑话删除申请做有界初筛，主模型随后终审。",
    payload: { title: "挖土", retainedOccurrenceCount: 8, occurrenceSample: [{ at: "2025-01-01", text: "继续挖土" }] },
    responseSchema: {
      type: "object",
      properties: {
        recommendDelete: { type: "boolean" },
        reason: { type: "string" }
      },
      required: ["recommendDelete", "reason"],
      additionalProperties: false
    },
    validate: (value) => typeof value?.recommendDelete === "boolean" && typeof value?.reason === "string",
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{
          message: { content: JSON.stringify({ recommendDelete: false, reason: "含义稳定，应交主模型复核" }) },
          finish_reason: "stop"
        }]
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.model, "test/interest-model");
  assert.deepEqual(result.value, { recommendDelete: false, reason: "含义稳定，应交主模型复核" });
  assert.equal(requestBody.model, "test/interest-model");
  assert.equal(requestBody.response_format.json_schema.name, "qq_knowledge_deletion_triage");
  assert.equal(requestBody.response_format.json_schema.strict, true);
  assert.equal(requestBody.temperature, 0.15);
  assert.match(requestBody.messages[0].content, /后台兴趣与杂项判断模型/);
  assert.match(requestBody.messages[0].content, /不和群友聊天/);
  assert.match(requestBody.messages[0].content, /【唯一任务】qq_knowledge_deletion_triage/);
  assert.deepEqual(JSON.parse(requestBody.messages[1].content), {
    title: "挖土",
    retainedOccurrenceCount: 8,
    occurrenceSample: [{ at: "2025-01-01", text: "继续挖土" }]
  });
});

test("proactive judge resets its idle timeout while reasoning and content tokens continue", async () => {
  let requestBody;
  const fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return streamResponse([
      { data: sse({ choices: [{ delta: { reasoning: "分析一" } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { reasoning: "分析二" } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { content: "ANALYSIS: 话题相关，可以自然补充。\nFINAL_JSON: " } }] }) },
      { delayMs: 900, data: sse({ choices: [{ delta: { content: "{\"shouldReply\":true,\"interest\":88,\"reason\":\"相关\"}" }, finish_reason: "stop" }] }) },
      { data: sse("[DONE]") }
    ], options.signal);
  };

  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch,
    recentMessages: [
      {
        senderId: "10000",
        senderName: "测试群友",
        text: "前面在讨论 Node 部署",
        atMentions: [{ userId: "20000", name: "被艾特者" }]
      },
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
      replyMessageRatio: 0.12,
      adaptiveLearning: {
        group: {
          interruptionSampleSize: 48,
          interruptionRate: 0.625,
          interruptionWindowSeconds: 120
        }
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelJudge.interest, 88);
  assert.equal(result.autonomous, true);
  assert.equal(result.proactiveKind, "ordinary_group_reply");
  assert.equal(result.modelPipeline.interestGate.approved, true);
  assert.equal(result.modelPipeline.mainContent.role, "conversation_content");
  assert.equal(result.modelJudge.finishReason, "stop");
  assert.deepEqual(result.replyContext, [
    {
      sender: "测试群友(QQ 10000)",
      text: "前面在讨论 Node 部署",
      replyToBot: false,
      mentions: ["被艾特者(QQ 20000)"]
    },
    { sender: "bot", text: "可以看日志定位", replyToBot: false }
  ]);
  assert.ok(result.modelJudge.durationMs >= 2500);
  assert.equal(requestBody.stream, true);
  assert.equal(requestBody.temperature, 0.65);
  assert.equal(requestBody.max_tokens, 2048);
  assert.deepEqual(requestBody.reasoning, { effort: "none" });
  assert.deepEqual(requestBody.provider, { require_parameters: true });
  assert.equal(requestBody.response_format.type, "json_schema");
  assert.equal(requestBody.response_format.json_schema.strict, true);
  assert.deepEqual(requestBody.response_format.json_schema.schema.required, [
    "shouldReply",
    "interest",
    "reason"
  ]);
  assert.match(requestBody.messages[0].content, /只返回 JSON Schema 指定的对象/);
  assert.match(requestBody.messages[0].content, /结合当前消息、引用和最近上下文/);
  const judgeInput = JSON.parse(requestBody.messages[1].content);
  assert.equal(judgeInput.recentMessages[0].sender, "测试群友(QQ 10000)");
  assert.deepEqual(judgeInput.recentMessages[0].mentions, ["被艾特者(QQ 20000)"]);
  assert.equal(judgeInput.groupHumanRhythm.multiMessageRunRatio, 0.38);
  assert.equal(judgeInput.groupHumanRhythm.learnedInterruptionSampleSize, 48);
  assert.equal(judgeInput.groupHumanRhythm.learnedInterruptionRate, 0.625);
  assert.equal(judgeInput.groupHumanRhythm.learnedInterruptionWindowSeconds, 120);
  assert.match(requestBody.messages[0].content, /群内插话节奏/);
});

test("ordinary interest input shows a repeated current message once with its total count", async () => {
  let requestBody;
  const repeatedEvent = {
    ...event,
    raw: { message_id: "3" },
    text: "复读内容"
  };
  const result = await shouldProactivelyReplyToQq(repeatedEvent, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonJudgeResponse({ shouldReply: true, interest: 90 });
    },
    recentMessages: [
      { messageId: "0", senderId: "400", text: "前一段话" },
      { messageId: "1", senderId: "100", text: "复读内容" },
      { messageId: "2", senderId: "200", text: "复读内容" },
      { messageId: "3", senderId: "300", text: "复读内容" }
    ]
  });

  const judgeInput = JSON.parse(requestBody.messages[1].content);
  assert.equal(judgeInput.currentMessage.text, "复读内容（连续重复 3 条）");
  assert.deepEqual(judgeInput.recentMessages.map((item) => item.text), ["前一段话"]);
  assert.deepEqual(result.replyContext.map((item) => item.text), ["前一段话"]);
});

test("proactive judge retries once when structured output omits a required decision field", async () => {
  let fetchCount = 0;
  const requestBodies = [];
  const result = await shouldProactivelyReplyToQq(event, proactiveState(), {
    openRouterApiKey: "configured-for-test",
    fetch: async (_url, options) => {
      fetchCount += 1;
      requestBodies.push(JSON.parse(options.body));
      if (fetchCount === 1) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                shouldReply: true,
                reason: "测试"
              })
            },
            finish_reason: "stop"
          }]
        }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return jsonJudgeResponse({ shouldReply: true, interest: 76 });
    }
  });

  assert.equal(result.ok, true);
  assert.equal(fetchCount, 2);
  assert.equal(result.modelJudge.attemptCount, 2);
  assert.equal(result.modelJudge.formatRetryCount, 1);
  assert.equal(result.modelJudge.structuredOutput, true);
  assert.equal(result.modelJudge.interest, 76);
  assert.equal(requestBodies[1].response_format.type, "json_schema");
  assert.match(requestBodies[1].messages[0].content, /唯一一次格式重试/);
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

test("ordinary time checks keep stale-topic protection unless restored for wall-clock catch-up", async () => {
  const nowMs = 60 * 60 * 1000;
  const staleEvent = { ...event, proactiveObservedAtMs: 1_000 };
  const regularState = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 2 });
  regularState.proactive.messageCountByGroupId[event.groupId] = 1;
  regularState.proactive.lastJudgeAtByGroupId = { [event.groupId]: 1_000 };
  let fetchCount = 0;
  const helpers = {
    triggerMode: "time",
    countMessage: false,
    now: () => nowMs,
    openRouterApiKey: "configured-for-test",
    fetch: async () => {
      fetchCount += 1;
      return jsonJudgeResponse();
    }
  };

  const regular = await shouldProactivelyReplyToQq(staleEvent, regularState, helpers);
  assert.equal(regular.reason, "latest proactive topic is stale");
  assert.equal(fetchCount, 0);

  const restoredState = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 2 });
  restoredState.proactive.messageCountByGroupId[event.groupId] = 1;
  restoredState.proactive.lastJudgeAtByGroupId = { [event.groupId]: 1_000 };
  const restored = await shouldProactivelyReplyToQq({
    ...staleEvent,
    proactiveRestoredCatchUp: true
  }, restoredState, helpers);
  assert.equal(restored.ok, true);
  assert.equal(fetchCount, 1);
  assert.equal(restoredState.proactive.lastJudgeAtByGroupId[event.groupId], nowMs);
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

test("persona keyword immediately triggers one contextual judge with all interest signals combined", async () => {
  const state = proactiveState(1500, { judgeEveryMessages: 20, judgeEveryMinutes: 5 });
  let requestBody;
  const result = await shouldProactivelyReplyToQq({ ...event, text: "小星看看这个编程问题" }, state, {
    openRouterApiKey: "configured-for-test",
    interestKeywordMatch: { matched: true, keywords: ["小星", "编程"], nameMatched: true },
    relationshipInterest: {
      hasInteraction: true,
      messagesSinceInteraction: 1,
      minutesSinceInteraction: 0.5,
      recency: 0.9,
      interestBoost: 28,
      unansweredBotStreak: 0,
      interestMultiplier: 1
    },
    selfPersona: "Bot 全局人格名称：小星\n兴趣关键词：小星、编程\n完整兴趣描述：喜欢定位技术问题。",
    interestSignals: {
      currentAndQuotedKeywords: ["小星", "编程"],
      recentContextKeywords: ["部署", "Node"],
      cadence: { judgeEveryMessages: 1, judgeEveryMinutes: 1 }
    },
    recentMessages: [
      { senderId: "100", text: "前面在聊 Node 部署" },
      { senderId: "200", text: "小星也许会对这个感兴趣" }
    ],
    fetch: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonJudgeResponse({ shouldReply: true, interest: 80 });
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.triggerReason, "persona_keyword");
  assert.equal(result.consumedMessageCount, 1);
  const input = JSON.parse(requestBody.messages[1].content);
  assert.deepEqual(input.personaKeywordMatch.keywords, ["小星", "编程"]);
  assert.deepEqual(input.combinedInterestSignals.recentContextKeywords, ["部署", "Node"]);
  assert.match(input.botInterestProfile, /喜欢定位技术问题/);
  assert.equal(input.relationshipInterest.interestBoost, 28);
  assert.equal(input.heuristicHints.possibleTopics.includes("AI / Codex / 编程排障"), true);
  assert.equal(input.ruleAssessment, undefined);
  assert.equal(input.recentMessages.length, 2);
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
