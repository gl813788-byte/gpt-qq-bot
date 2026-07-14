import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQqActiveAddPayload,
  formatQqActiveAddFailure,
  parseQqActiveAddCommand
} from "../src/qq-social-command.js";

test("parses legacy and structured friend add commands", () => {
  assert.deepEqual(parseQqActiveAddCommand("主动加好友 123456 群里认识的"), {
    kind: "friend",
    targetId: "123456",
    message: "群里认识的",
    answer: "",
    remark: "",
    categoryId: undefined,
    setting: undefined
  });

  const parsed = parseQqActiveAddCommand("主动加好友 123456 验证=群里认识的 | 答案=42 | 备注=小王 | 分组=3 | 方式=2");
  assert.deepEqual(buildQqActiveAddPayload(parsed), {
    target_id: "123456",
    message: "群里认识的",
    answer: "42",
    remark: "小王",
    category_id: 3,
    add_friend_setting: 2
  });
});

test("parses group answers with spaces and keeps legacy syntax", () => {
  assert.deepEqual(buildQqActiveAddPayload(parseQqActiveAddCommand("主动加群 987654 正确 答案 2026")), {
    target_id: "987654",
    message: "正确 答案 2026",
    answer: "正确 答案 2026"
  });
  assert.deepEqual(buildQqActiveAddPayload(parseQqActiveAddCommand("主动加群 987654 答案=Open AI 2026")), {
    target_id: "987654",
    message: "Open AI 2026",
    answer: "Open AI 2026"
  });
});

test("formats actionable verification failures", () => {
  assert.match(formatQqActiveAddFailure("friend", "123456", {
    error: "verification_required",
    questions: ["2+2 等于几？"]
  }, 409), /2\+2 等于几/);
  assert.match(formatQqActiveAddFailure("group", "987654", {
    error: "answer_required",
    question: "项目口令"
  }, 409), /主动加群 987654 答案=正确答案/);
});
