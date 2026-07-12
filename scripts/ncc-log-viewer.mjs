#!/usr/bin/env node
import { open, stat } from "node:fs/promises";

const levelNames = { debug: "调试", info: "信息", success: "成功", warn: "警告", error: "错误" };
const categoryNames = {
  system: "系统",
  qq: "QQ",
  onebot: "OneBot",
  codex: "Codex",
  imessage: "iMessage",
  web: "接口",
  search: "搜索",
  interest: "兴趣",
  memory: "记忆",
  command: "指令"
};
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightCyan: "\x1b[96m",
  brightMagenta: "\x1b[95m"
};

const options = parseArgs(process.argv.slice(2));
if (!options.file) {
  usage();
  process.exit(2);
}

await printExisting(options);
if (options.follow) await followFile(options);

function parseArgs(args) {
  const output = {
    file: "",
    tail: 80,
    follow: false,
    level: "",
    category: "",
    plain: !process.stdout.isTTY,
    all: false,
    verbose: true
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!output.file && !arg.startsWith("-")) {
      output.file = arg;
    } else if (arg === "-n" || arg === "--tail") {
      output.tail = Math.max(1, Math.min(1000, Number(args[++index] || 80) || 80));
    } else if (arg === "-f" || arg === "--follow") {
      output.follow = true;
    } else if (arg === "--level") {
      output.level = String(args[++index] || "").toLowerCase();
    } else if (arg === "--category") {
      output.category = String(args[++index] || "").toLowerCase();
    } else if (arg === "--plain") {
      output.plain = true;
    } else if (arg === "--color" || arg === "--colour") {
      output.plain = false;
    } else if (arg === "--all") {
      output.all = true;
    } else if (arg === "--verbose" || arg === "--detail" || arg === "--details") {
      output.verbose = true;
    } else if (arg === "--compact" || arg === "--no-verbose") {
      output.verbose = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return output;
}

async function printExisting(options) {
  const body = await readTail(options.file, Math.max(256 * 1024, options.tail * 8192)).catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const rendered = body
    .split("\n")
    .filter(Boolean)
    .map((line) => renderLine(line, options))
    .filter(Boolean)
    .slice(-options.tail);
  for (const line of rendered) process.stdout.write(`${line}\n`);
}

async function followFile(options) {
  const initial = await stat(options.file).catch(() => null);
  let offset = initial?.size || 0;
  let fileIdentity = initial ? getFileIdentity(initial) : "";
  let reading = false;
  process.stdout.write(color(`正在跟随日志: ${options.file}\n`, "dim", options));
  setInterval(async () => {
    if (reading) return;
    reading = true;
    try {
      const current = await stat(options.file).catch(() => null);
      if (!current) return;
      const currentIdentity = getFileIdentity(current);
      if (currentIdentity !== fileIdentity || current.size < offset) {
        offset = 0;
        fileIdentity = currentIdentity;
      }
      if (current.size === offset) return;
      const handle = await open(options.file, "r");
      try {
        const opened = await handle.stat();
        const openedIdentity = getFileIdentity(opened);
        if (openedIdentity !== fileIdentity || opened.size < offset) {
          offset = 0;
          fileIdentity = openedIdentity;
        }
        if (opened.size === offset) return;
        const size = opened.size - offset;
        const buffer = Buffer.alloc(size);
        const { bytesRead } = await handle.read(buffer, 0, size, offset);
        offset += bytesRead;
        for (const line of buffer.subarray(0, bytesRead).toString("utf8").split("\n").filter(Boolean)) {
          const rendered = renderLine(line, options);
          if (rendered) process.stdout.write(`${rendered}\n`);
        }
      } finally {
        await handle.close().catch(() => null);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        process.stderr.write(`日志跟随读取失败: ${error.message}\n`);
      }
    } finally {
      reading = false;
    }
  }, 1000);
  await new Promise(() => {});
}

function getFileIdentity(entry) {
  return `${entry.dev ?? ""}:${entry.ino ?? ""}:${entry.birthtimeMs ?? ""}`;
}

async function readTail(file, bytes) {
  const handle = await open(file, "r");
  try {
    const { size } = await handle.stat();
    const readSize = Math.min(size, bytes);
    const buffer = Buffer.alloc(readSize);
    await handle.read(buffer, 0, readSize, Math.max(0, size - readSize));
    return buffer.toString("utf8");
  } finally {
    await handle.close().catch(() => null);
  }
}

function renderLine(line, options) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return null;
  }
  if (options.level && String(entry.level || "").toLowerCase() !== options.level) return null;
  if (options.category && String(entry.category || "").toLowerCase() !== options.category) return null;
  const level = String(entry.level || "info").toLowerCase();
  if (!options.verbose && level === "debug" && options.level !== "debug") return null;
  if (!options.verbose && !options.all && !options.level && !options.category && !isDefaultVisible(entry, level)) return null;
  const category = String(entry.category || "system").toLowerCase();
  const ts = String(entry.ts || "").replace("T", " ").replace(/\.\d+Z$/, "");
  const colorName = colorFor(entry, level, category);
  const header = [
    color(ts.padEnd(19, " "), "dim", options),
    color((levelNames[level] || level).padEnd(2, " "), colorName, options),
    color((categoryNames[category] || category).padEnd(7, " "), colorName, options)
  ].join(" ");
  const message = color(humanMessage(entry.message || ""), colorName, options);
  const details = formatDetails(entry, options);
  return `${header} ${message}${details ? ` ${color(details, "gray", options)}` : ""}`;
}

function isDefaultVisible(entry, level) {
  return ["success", "warn", "error"].includes(level)
    || ["Codex QQ Bot hub started", "QQ web lookup started"].includes(String(entry.message || ""));
}

function colorFor(entry, level, category) {
  if (level === "error") return "red";
  if (level === "warn") return "yellow";
  if (level === "success") return "green";
  if (isAtBotEntry(entry)) return "brightYellow";
  if (category === "search") return "brightCyan";
  if (category === "interest") return "yellow";
  if (category === "qq") return "brightBlue";
  if (category === "onebot") return "cyan";
  if (category === "codex") return "brightMagenta";
  if (category === "imessage") return "magenta";
  if (category === "web") return "blue";
  if (category === "memory") return "green";
  if (category === "command") return "yellow";
  if (level === "debug") return "gray";
  return "gray";
}

function isAtBotEntry(entry) {
  const details = entry?.details || {};
  const messageType = String(details.messageType || details.type || "").toLowerCase();
  return messageType === "group_at"
    || details.isAt === true
    || details.hasSelfAtSegment === true;
}

function humanMessage(message) {
  const value = String(message || "");
  return {
    "QQ web lookup started": "QQ 联网搜索开始",
    "QQ web lookup succeeded": "QQ 联网搜索成功",
    "QQ web lookup failed": "QQ 联网搜索失败",
    "QQ web lookup provider failed": "某个搜索厂商尝试失败",
    "QQ web lookup provider attempt": "搜索厂商尝试完成",
    "QQ web lookup trigger matched": "QQ 消息触发联网搜索",
    "QQ web lookup results selected": "已选择联网搜索结果",
    "QQ proactive interest decision": "QQ 主动兴趣判定",
    "QQ message details received": "收到 QQ 消息详情",
    "OneBot message received": "收到 OneBot 消息",
    "OneBot health check succeeded": "OneBot 健康检查成功",
    "OneBot event ignored": "已忽略 OneBot 事件",
    "Duplicate OneBot message ignored": "已忽略重复 OneBot 消息",
    "Codex QQ Bot hub started": "Codex QQ Bot 后端已启动",
    "unified-memory not installed; continuing with built-in fallback.": "统一记忆模块未安装，已使用内置降级模式。",
    "qq-enhancer not installed; continuing with built-in fallback.": "QQ 增强模块未安装，已使用内置降级模式。",
    "unified-memory recent context not installed; continuing with built-in fallback.": "最近上下文模块未安装，已使用内置降级模式。"
  }[value] || value;
}

function formatDetails(entry, options) {
  const details = entry.details || {};
  if (!details || Object.keys(details).length === 0) return "";
  if (entry.category === "search") return formatSearchDetails(details, options);
  if (entry.category === "interest") return formatInterestDetails(details, options);
  return formatGenericDetails(details, options);
}

function formatSearchDetails(details, options) {
  const parts = [];
  pushPart(parts, "查询", options.verbose ? details.query : compactText(details.query, 80));
  pushPart(parts, "触发原因", details.reason);
  pushPart(parts, "厂商", details.provider);
  if (options.verbose && details.rawProvider) pushPart(parts, "厂商代码", details.rawProvider);
  if ((options.verbose || !details.provider) && Array.isArray(details.providers) && details.providers.length > 0) {
    pushPart(parts, "搜索顺序", details.providers.join(" -> "));
  }
  if (options.verbose) pushPart(parts, "预设", details.preset);
  if (options.verbose && details.status) pushPart(parts, "状态", humanStatus(details.status));
  pushPart(parts, "用时", formatMs(details.durationMs));
  if (options.verbose) {
    pushPart(parts, "总超时", formatMs(details.timeoutMs));
    pushPart(parts, "单次超时", formatMs(details.attemptTimeoutMs));
  }
  if (details.resultCount != null) pushPart(parts, "结果", `${details.resultCount} 条`);
  if (options.verbose && Array.isArray(details.results) && details.results.length > 0) {
    pushPart(parts, "结果详情", details.results.map(formatSearchResult).join("；"));
  }
  pushPart(parts, "错误", humanError(details.error));
  if (options.verbose && Array.isArray(details.providerErrors) && details.providerErrors.length > 0) {
    pushPart(parts, "厂商错误", details.providerErrors.map(humanError).join("；"));
  }
  return parts.join(" · ");
}

function formatInterestDetails(details, options) {
  const parts = [];
  pushPart(parts, "是否回复", formatDetailValue(details.shouldReply));
  pushPart(parts, "触发原因", details.reason);
  pushPart(parts, "规则分", details.ruleScore);
  if (options.verbose) {
    pushPart(parts, "直呼", details.directness);
    pushPart(parts, "偏好", details.likedTopicScore);
    pushPart(parts, "上下文", details.contextScore);
    pushPart(parts, "惩罚", details.penalty);
  }
  if (Array.isArray(details.labels) && details.labels.length > 0) pushPart(parts, "命中", details.labels.join(", "));
  if (Array.isArray(details.blockers) && details.blockers.length > 0) pushPart(parts, "阻断", details.blockers.join(", "));
  if (options.verbose) {
    pushPart(parts, "消息", details.text);
    pushPart(parts, "模型", details.judgeModel);
    pushPart(parts, "模型可用", formatDetailValue(details.judgeApiKeyConfigured));
    pushPart(parts, "模型判断", details.modelShouldReply == null ? "" : formatDetailValue(details.modelShouldReply));
    pushPart(parts, "模型兴趣", details.modelInterest);
    pushPart(parts, "模型理由", details.modelReason);
    pushPart(parts, "回复风格", details.modelReplyStyle);
    pushPart(parts, "模型用时", formatMs(details.modelDurationMs));
    pushPart(parts, "结束原因", details.modelFinishReason);
    pushPart(parts, "流式片段", details.modelStreamedTokenChunks);
    pushPart(parts, "推理字符", details.modelReasoningLength);
    pushPart(parts, "模型错误", humanError(details.modelError));
  }
  return parts.join(" · ");
}

function formatGenericDetails(details, options) {
  const compactKeys = new Set(["durationMs", "resultCount", "status", "code", "error", "reason", "url"]);
  const parts = [];
  for (const [key, value] of Object.entries(details)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (!options.verbose && !compactKeys.has(key)) continue;
    parts.push(`${detailLabel(key)}: ${formatDetailValue(value, key)}`);
  }
  return parts.join(" · ");
}

function compactText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function detailLabel(key) {
  return {
    query: "查询",
    provider: "厂商",
    providers: "厂商顺序",
    preset: "预设",
    durationMs: "用时",
    timeoutMs: "总超时",
    attemptTimeoutMs: "单次超时",
    resultCount: "结果数",
    shouldReply: "是否回复",
    ruleScore: "规则分",
    directness: "直呼",
    likedTopicScore: "偏好分",
    contextScore: "上下文分",
    penalty: "惩罚分",
    labels: "命中标签",
    blockers: "阻断原因",
    judgeEnabled: "模型判定",
    judgeProvider: "判定厂商",
    judgeModel: "判定模型",
    judgeApiKeyConfigured: "模型 Key",
    modelShouldReply: "模型是否回复",
    modelInterest: "模型兴趣",
    modelReason: "模型理由",
    modelReplyStyle: "回复风格",
    modelDurationMs: "模型用时",
    modelStatus: "模型状态",
    modelFinishReason: "模型结束原因",
    modelStreamedTokenChunks: "模型流式片段",
    modelReasoningLength: "模型推理字符",
    modelError: "模型错误",
    results: "结果详情",
    title: "标题",
    url: "链接",
    snippet: "摘要",
    reason: "触发原因",
    status: "状态",
    rawProvider: "厂商代码",
    text: "消息内容",
    textLength: "消息长度",
    messageType: "消息类型",
    source: "来源",
    senderName: "发送者昵称",
    imageCount: "图片数",
    hasReply: "是否引用",
    isAt: "是否@机器人",
    atTargets: "@目标",
    error: "错误",
    providerErrors: "厂商错误",
    groupId: "群",
    senderId: "发送者",
    messageId: "消息",
    channel: "通道",
    enabled: "是否开启",
    selfId: "机器人 QQ",
    nickname: "机器人昵称",
    postType: "事件类型",
    noticeType: "通知类型",
    logFile: "日志文件",
    url: "地址",
    dedupeKey: "去重标识"
  }[key] || key;
}

function formatSearchResult(result, index) {
  if (!result || typeof result !== "object") return formatDetailValue(result);
  const parts = [];
  const prefix = index == null ? "" : `${index + 1}. `;
  if (result.title) parts.push(`${prefix}标题: ${result.title}`);
  if (result.url) parts.push(`链接: ${result.url}`);
  if (result.snippet) parts.push(`摘要: ${String(result.snippet).slice(0, 180)}`);
  if (result.source || result.provider) parts.push(`来源: ${result.source || result.provider}`);
  return parts.join("，");
}

function humanStatus(status) {
  return {
    found_results: "找到了结果",
    no_results: "没有解析到结果",
    skipped: "已跳过",
    failed: "失败"
  }[String(status || "")] || humanError(String(status || ""));
}

function formatDetailValue(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => formatDetailValue(item, key)).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([itemKey, item]) => `${detailLabel(itemKey)}: ${formatDetailValue(item, itemKey)}`)
      .join("，");
  }
  if (typeof value === "string") return humanDetailValue(key, value);
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function humanDetailValue(key, value) {
  const text = humanError(value);
  if (key === "messageType") {
    return {
      group: "群消息",
      private: "私聊",
      group_message: "群消息",
      private_message: "私聊",
      group_at: "群里 @ 机器人"
    }[text] || text;
  }
  if (key === "postType") {
    return {
      message: "消息",
      notice: "通知",
      request: "请求",
      meta_event: "元事件"
    }[text] || text;
  }
  if (key === "noticeType") {
    return {
      notify: "提醒通知",
      group_recall: "群消息撤回",
      friend_recall: "好友消息撤回",
      group_increase: "群成员增加",
      group_decrease: "群成员减少"
    }[text] || text;
  }
  if (key === "source" && text.toLowerCase() === "onebot") return "OneBot";
  return text;
}

function humanError(error) {
  const value = String(error || "");
  return value
    .replace(/attempt timed out after (\d+)ms/g, "单次请求超过 $1ms")
    .replace(/search timed out/g, "整次搜索超时")
    .replace(/returned HTTP (\d+)/g, "返回 HTTP $1")
    .replace(/returned verification page/g, "返回验证页")
    .replace(/Tavily API key is not configured/g, "没有配置 Tavily API key")
    .replace(/no results/g, "没有解析到结果")
    .replace(/all search providers failed/g, "所有搜索厂商都失败")
    .replace(/all search providers returned no results/g, "所有搜索厂商都没有结果");
}

function formatMs(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? `${number}ms` : String(value);
}

function pushPart(parts, label, value) {
  if (value == null || value === "") return;
  parts.push(`${label}: ${value}`);
}

function color(text, colorName, options) {
  if (options.plain) return text;
  return `${colors[colorName] || ""}${text}${colors.reset}`;
}

function usage() {
  process.stderr.write("用法: ncc-log-viewer.mjs LOG_FILE [--tail N] [-f] [--level LEVEL] [--category CATEGORY] [--all] [--plain|--color] [--verbose|--compact]\n");
}
