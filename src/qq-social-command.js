const activeAddCommandPattern = /^(主动加好友|主动加群)\s+([1-9][0-9]{4,12})(?:\s+([\s\S]+))?$/i;

const optionKeyAliases = new Map([
  ["验证", "message"],
  ["验证信息", "message"],
  ["申请说明", "message"],
  ["留言", "message"],
  ["message", "message"],
  ["verify", "message"],
  ["答案", "answer"],
  ["回答", "answer"],
  ["answer", "answer"],
  ["备注", "remark"],
  ["好友备注", "remark"],
  ["remark", "remark"],
  ["分组", "categoryId"],
  ["好友分组", "categoryId"],
  ["category", "categoryId"],
  ["验证方式", "setting"],
  ["方式", "setting"],
  ["setting", "setting"]
]);

const namedOptionPattern = /(?:^|[\s|｜;；])(?<key>验证信息|申请说明|好友备注|好友分组|验证方式|验证|留言|答案|回答|备注|分组|方式|message|verify|answer|remark|category|setting)\s*[:=：]\s*/gi;

export function parseQqActiveAddCommand(command) {
  const match = String(command || "").trim().match(activeAddCommandPattern);
  if (!match) return null;
  const kind = match[1] === "主动加好友" ? "friend" : "group";
  const rawOptions = String(match[3] || "").trim();
  const { prefix, values, hasNamedOptions } = parseNamedOptions(rawOptions);
  if (kind === "friend") {
    const fallbackMessage = hasNamedOptions ? prefix : rawOptions;
    return {
      kind,
      targetId: match[2],
      message: bounded(values.message || fallbackMessage, 120),
      answer: bounded(values.answer, 120),
      remark: bounded(values.remark, 60),
      categoryId: normalizeOptionalInteger(values.categoryId, 0, 999),
      setting: normalizeOptionalInteger(values.setting, 0, 99)
    };
  }
  const fallbackAnswer = hasNamedOptions ? prefix : rawOptions;
  return {
    kind,
    targetId: match[2],
    message: bounded(values.message, 300),
    answer: bounded(values.answer || values.message || fallbackAnswer, 300)
  };
}

export function buildQqActiveAddPayload(parsed) {
  if (!parsed) return null;
  if (parsed.kind === "friend") {
    return compactObject({
      target_id: parsed.targetId,
      message: parsed.message,
      answer: parsed.answer,
      remark: parsed.remark,
      category_id: parsed.categoryId,
      add_friend_setting: parsed.setting
    });
  }
  return compactObject({
    target_id: parsed.targetId,
    message: parsed.message || parsed.answer,
    answer: parsed.answer
  });
}

export function formatQqActiveAddFailure(kind, targetId, result, httpStatus) {
  const error = String(result?.error || "").trim();
  const question = String(result?.question || result?.questions?.filter(Boolean)?.join(" / ") || "").trim();
  if (error === "verification_required" || error === "answer_required") {
    const label = kind === "friend" ? "好友验证问题" : "加群问题";
    const retry = kind === "friend"
      ? `/主动加好友 ${targetId} 答案=正确答案${result?.requires_message ? " | 验证=验证信息" : ""}`
      : `/主动加群 ${targetId} 答案=正确答案`;
    return `${label}${question ? `：${question}` : "需要作答"}。请提供答案后重试：${retry}`;
  }
  if (error === "verification_message_required") {
    return `对方要求填写好友验证信息。请重试：/主动加好友 ${targetId} 验证=验证信息`;
  }
  if (error === "friend_requests_disabled") return "对方已拒绝所有好友申请，当前无法添加。";
  if (error === "group_join_disabled") return "该群当前禁止任何人申请加入。";
  if (error === "group_full") return "该群人数已满，当前无法加入。";
  if (error === "group_not_found") return `没有找到群 ${targetId}，请确认群号及该群是否允许被搜索。`;
  if (error === "risk_control_required") return "QQ 风控要求在客户端完成安全验证；Bot 没有绕过风控，也没有伪报申请成功。";
  return `发起申请失败：${error || result?.message || `HTTP ${httpStatus || "未知"}`}`;
}

function parseNamedOptions(raw) {
  const matches = [...String(raw || "").matchAll(namedOptionPattern)];
  if (!matches.length) return { prefix: "", values: {}, hasNamedOptions: false };
  const values = {};
  const prefix = cleanOptionValue(String(raw).slice(0, matches[0].index));
  for (const [index, match] of matches.entries()) {
    const key = optionKeyAliases.get(String(match.groups?.key || "").toLowerCase());
    if (!key) continue;
    const start = Number(match.index) + match[0].length;
    const end = matches[index + 1]?.index ?? String(raw).length;
    const value = cleanOptionValue(String(raw).slice(start, end));
    if (value) values[key] = value;
  }
  return { prefix, values, hasNamedOptions: true };
}

function cleanOptionValue(value) {
  return String(value || "").trim().replace(/^[|｜;；]+|[|｜;；]+$/g, "").trim();
}

function normalizeOptionalInteger(value, min, max) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return undefined;
  return number;
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
}

function bounded(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}
