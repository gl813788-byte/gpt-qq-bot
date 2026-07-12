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

function proactiveState(timeoutMs = 1500) {
  return {
    ownerUserIds: [],
    proactive: {
      enabled: true,
      judgeEveryMessages: 1,
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
      { delayMs: 900, data: sse({ choices: [{ delta: { content: "FINAL_JSON: " } }] }) },
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
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelJudge.interest, 88);
  assert.equal(result.modelJudge.finishReason, "stop");
  assert.deepEqual(result.replyContext, [
    { sender: "member", text: "前面在讨论 Node 部署", replyToBot: false },
    { sender: "bot", text: "可以看日志定位", replyToBot: false }
  ]);
  assert.ok(result.modelJudge.durationMs >= 2500);
  assert.equal(requestBody.stream, true);
  assert.equal(requestBody.max_tokens, 2048);
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
