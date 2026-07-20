import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLogDetailText,
  formatLogError,
  formatLogMessage,
  getLogDetailLabel,
  localizeLogDetails
} from "../src/log-presentation.js";

test("log presentation uses consistent Chinese event names and concise error chains", () => {
  assert.equal(formatLogMessage("OneBot health check failed"), "OneBot 健康检查失败");
  assert.equal(formatLogMessage("Unable to prepare QQ image for vision"), "准备 QQ 视觉图片失败");
  assert.equal(formatLogMessage("Codex model output captured"), "Codex 模型输出已记录");
  assert.equal(formatLogMessage("QQ knowledge deletion review completed"), "QQ 黑话删除审核完成");
  assert.equal(formatLogMessage("QQ knowledge deletion main review started"), "QQ 黑话删除主模型终审已开始");
  assert.equal(formatLogMessage("QQ cold-group topic-start judge completed"), "QQ 冷群新话题启动判定完成");
  assert.equal(formatLogMessage("QQ private proactive start judge completed"), "QQ 私聊主动联系启动判定完成");
  assert.equal(formatLogMessage("QQ autonomous proactive two-model contract verified"), "QQ 主动聊天双模型链路校验通过");
  assert.equal(formatLogDetailText("Mention-only mode ignored this message"), "群消息未 @ 或回复机器人，已按仅提及模式忽略");
  assert.equal(formatLogDetailText("model judge failed: OpenRouter judge did not return valid FINAL_JSON"), "判定模型失败：OpenRouter 判定模型未返回有效结构化结果");
  assert.equal(formatLogError({
    name: "TypeError",
    message: "fetch failed",
    code: null,
    cause: { message: "connect ECONNREFUSED 127.0.0.1:3000", code: "ECONNREFUSED", address: "127.0.0.1", port: 3000 }
  }), "网络请求失败；连接 127.0.0.1:3000 被拒绝；ECONNREFUSED");
});

test("two-model proactive and complex review details are fully localized", () => {
  assert.deepEqual(localizeLogDetails({
    proactiveKind: "cold_group_chatter",
    interestGateRequired: true,
    interestGateApproved: true,
    mainContentRequired: true,
    reviewPipeline: "interest_triage_then_main_review",
    reviewStage: "completed",
    interestRecommendation: "delete",
    interestComplexity: "complex",
    mainModelDecision: "keep"
  }), {
    主动聊天类型: "冷群轻量水群",
    需要兴趣模型闸门: true,
    兴趣模型是否批准: true,
    需要主模型产出: true,
    审核模型链路: "兴趣模型初筛 → 主模型终审",
    审核阶段: "双模型审核完成",
    兴趣模型初筛建议: "建议删除",
    兴趣模型复杂度判断: "复杂",
    主模型最终决定: "保留"
  });
});

test("startup learning snapshots and knowledge details share recursive Chinese labels", () => {
  assert.equal(getLogDetailLabel("averageTextChars"), "平均文字长度");
  assert.equal(getLogDetailLabel("modelTemperature"), "模型温度");
  assert.deepEqual(localizeLogDetails({
    groupId: "10001",
    learning: {
      sampleSize: 42,
      activityLevel: "typical",
      socialHours: { source: "learned", wrapsMidnight: true }
    },
    proactiveIntervals: { judgeEveryMessages: 20, reason: "activity_typical" }
  }), {
    群: "10001",
    自动学习数据: {
      总样本数: 42,
      当前活跃度: "一般",
      常用社交时段: { 来源: "learned", 是否跨午夜: true }
    },
    主动兴趣间隔: { 消息间隔: 20, 原因: "当前活跃度一般" }
  });
});

test("cold-group research outcome details use Chinese labels and values", () => {
  assert.deepEqual(localizeLogDetails({
    contentMode: "interest_research",
    researchEnabled: true,
    researchRounds: 3,
    researchToolCalls: 4,
    researchToolKinds: ["web-search", "knowledge"],
    researchQueries: ["AI 新工具"],
    failedToolCalls: 0,
    topicStartShouldStart: true,
    topicStartMode: "topic",
    topicStartInterest: 82
  }), {
    冷群内容方式: "兴趣联网探索后开话题",
    允许兴趣探索: true,
    探索轮数: 3,
    探索工具调用数: 4,
    探索工具类型: ["联网搜索", "长期知识库"],
    联网探索查询: ["AI 新工具"],
    失败工具调用数: 0,
    是否启动新话题: true,
    冷群批准模式: "自主开话题",
    启动兴趣分: 82
  });
});

test("private proactive gate details expose the model decision and human-like variation", () => {
  assert.deepEqual(localizeLogDetails({
    privateStartShouldStart: true,
    privateStartInterest: 71,
    privateStartReason: "有自然延续点",
    spontaneityRoll: 0.08
  }), {
    是否启动私聊联系: true,
    私聊启动兴趣分: 71,
    私聊启动判定理由: "有自然延续点",
    拟人波动值: 0.08
  });
});
