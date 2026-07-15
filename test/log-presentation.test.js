import assert from "node:assert/strict";
import test from "node:test";
import { formatLogDetailText, formatLogError, formatLogMessage } from "../src/log-presentation.js";

test("log presentation uses consistent Chinese event names and concise error chains", () => {
  assert.equal(formatLogMessage("OneBot health check failed"), "OneBot 健康检查失败");
  assert.equal(formatLogMessage("Unable to prepare QQ image for vision"), "准备 QQ 视觉图片失败");
  assert.equal(formatLogDetailText("Mention-only mode ignored this message"), "群消息未 @ 或回复机器人，已按仅提及模式忽略");
  assert.equal(formatLogDetailText("model judge failed: OpenRouter judge did not return valid FINAL_JSON"), "判定模型失败：OpenRouter 判定模型未返回有效结构化结果");
  assert.equal(formatLogError({
    name: "TypeError",
    message: "fetch failed",
    code: null,
    cause: { message: "connect ECONNREFUSED 127.0.0.1:3000", code: "ECONNREFUSED", address: "127.0.0.1", port: 3000 }
  }), "网络请求失败；连接 127.0.0.1:3000 被拒绝；ECONNREFUSED");
});
