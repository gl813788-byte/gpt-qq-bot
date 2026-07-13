#!/usr/bin/env node
import { open, readdir, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

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
  command: "指令",
  lifecycle: "流程"
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
    verbose: true,
    traceId: "",
    query: "",
    groupId: "",
    senderId: "",
    sinceMs: null,
    untilMs: null,
    minDurationMs: 0,
    summary: false,
    json: false
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
    } else if (arg === "--trace") {
      output.traceId = String(args[++index] || "").toLowerCase();
    } else if (arg === "--search" || arg === "--query" || arg === "-q") {
      output.query = String(args[++index] || "").toLowerCase();
    } else if (arg === "--group") {
      output.groupId = String(args[++index] || "");
    } else if (arg === "--sender") {
      output.senderId = String(args[++index] || "");
    } else if (arg === "--since") {
      output.sinceMs = parseTimeFilter(args[++index], { relativeFromNow: true });
    } else if (arg === "--until") {
      output.untilMs = parseTimeFilter(args[++index]);
    } else if (arg === "--slow") {
      const next = args[index + 1];
      output.minDurationMs = next && !next.startsWith("-")
        ? Math.max(1, Number(args[++index]) || 1000)
        : 1000;
    } else if (arg === "--errors") {
      output.level = "warn,error";
    } else if (arg === "--summary") {
      output.summary = true;
    } else if (arg === "--json") {
      output.json = true;
      output.plain = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return output;
}

async function printExisting(options) {
  const hasDiagnosticFilter = Boolean(options.traceId || options.query || options.groupId || options.senderId
    || options.sinceMs != null || options.untilMs != null || options.minDurationMs > 0);
  const body = await readLogHistory(options.file, Math.max(hasDiagnosticFilter ? 1024 * 1024 : 256 * 1024, options.tail * 8192)).catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const entries = body
    .split("\n")
    .filter(Boolean)
    .map(parseLine)
    .filter((entry) => entry && matchesViewerFilters(entry, options))
    .slice(-options.tail);
  if (options.json) {
    for (const entry of entries) process.stdout.write(`${JSON.stringify(entry)}\n`);
  } else {
    for (const entry of entries) process.stdout.write(`${renderEntry(entry, options)}\n`);
  }
  if (options.summary) process.stdout.write(`${renderSummary(entries, options)}\n`);
}

async function readLogHistory(file, bytesPerFile) {
  const directory = dirname(file);
  const base = basename(file);
  const names = await readdir(directory).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = names
    .filter((name) => name === base || new RegExp(`^${escapeRegExp(base)}\\.\\d+$`).test(name))
    .sort((left, right) => rotationIndex(right, base) - rotationIndex(left, base))
    .map((name) => join(directory, name));
  const chunks = [];
  for (const current of files) chunks.push(await readTail(current, bytesPerFile));
  return chunks.join("\n");
}

function rotationIndex(name, base) {
  if (name === base) return 0;
  const value = Number(name.slice(base.length + 1));
  return Number.isFinite(value) ? value : 999;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const entry = parseLine(line);
  if (!entry || !matchesViewerFilters(entry, options)) return null;
  return options.json ? JSON.stringify(entry) : renderEntry(entry, options);
}

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function matchesViewerFilters(entry, options) {
  if (options.level && !splitFilter(options.level).has(String(entry.level || "").toLowerCase())) return false;
  if (options.category && !splitFilter(options.category).has(String(entry.category || "").toLowerCase())) return false;
  if (options.traceId && !String(entry.traceId || "").toLowerCase().startsWith(options.traceId)) return false;
  if (options.groupId && String(entry.details?.groupId ?? "") !== options.groupId) return false;
  if (options.senderId && String(entry.details?.senderId ?? "") !== options.senderId) return false;
  const timestamp = Date.parse(String(entry.ts || ""));
  if (options.sinceMs != null && (!Number.isFinite(timestamp) || timestamp < options.sinceMs)) return false;
  if (options.untilMs != null && (!Number.isFinite(timestamp) || timestamp > options.untilMs)) return false;
  if (options.minDurationMs > 0 && getEntryDurationMs(entry) < options.minDurationMs) return false;
  if (options.query) {
    const searchable = JSON.stringify(entry).toLowerCase();
    if (!searchable.includes(options.query)) return false;
  }
  const level = String(entry.level || "info").toLowerCase();
  const hasExplicitFilter = Boolean(options.level || options.category || options.traceId || options.query || options.groupId
    || options.senderId || options.sinceMs != null || options.untilMs != null || options.minDurationMs > 0);
  if (!options.verbose && level === "debug" && !hasExplicitFilter) return false;
  if (!options.verbose && !options.all && !hasExplicitFilter && !isDefaultVisible(entry, level)) return false;
  return true;
}

function renderEntry(entry, options) {
  const level = String(entry.level || "info").toLowerCase();
  const category = String(entry.category || "system").toLowerCase();
  const ts = String(entry.ts || "").replace("T", " ").replace(/\.\d+Z$/, "");
  const colorName = colorFor(entry, level, category);
  const header = [
    color(ts.padEnd(19, " "), "dim", options),
    color((levelNames[level] || level).padEnd(2, " "), colorName, options),
    color((categoryNames[category] || category).padEnd(7, " "), colorName, options)
  ].join(" ");
  const message = color(humanMessage(entry.message || ""), colorName, options);
  const trace = entry.traceId ? color(`[${shortTraceId(entry.traceId)}]`, "dim", options) : "";
  const details = formatDetails(entry, options);
  return `${header}${trace ? ` ${trace}` : ""} ${message}${details ? ` ${color(details, "gray", options)}` : ""}`;
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
  if (category === "lifecycle") return "white";
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
    "QQ reply lifecycle started": "QQ 回复流程开始",
    "QQ reply lifecycle completed": "QQ 回复流程完成",
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
  if (entry.category === "lifecycle") return formatLifecycleDetails(details, options);
  return formatGenericDetails(details, options);
}

function formatLifecycleDetails(details, options) {
  const parts = [];
  pushPart(parts, "结果", humanOutcome(details.outcome || details.status));
  pushPart(parts, "场景", humanDetailValue("messageType", details.messageType));
  pushPart(parts, "群", details.groupId);
  if (options.verbose) pushPart(parts, "发送者", details.senderId);
  pushPart(parts, "触发", humanTriggerMode(details.triggerMode) || details.decisionReason);
  pushPart(parts, "总用时", formatMs(details.totalDurationMs || details.durationMs));
  if (options.verbose) {
    pushPart(parts, "记忆", formatMs(details.rememberDurationMs));
    pushPart(parts, "路由", formatMs(details.decisionDurationMs));
    pushPart(parts, "生成", formatMs(details.generationDurationMs));
    pushPart(parts, "发送", formatMs(details.sendDurationMs));
    pushPart(parts, "落盘", formatMs(details.memoryDurationMs));
    pushPart(parts, "回复字符", details.replyChars);
    pushPart(parts, "气泡", details.bubbleCount);
    pushPart(parts, "排队", details.queuedCount);
    pushPart(parts, "发送状态", details.sendStatus);
    pushPart(parts, "错误", humanError(details.error));
  }
  return parts.join(" · ");
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
  pushPart(parts, "触发方式", humanTriggerMode(details.triggerMode));
  if (details.messageCount != null) {
    pushPart(parts, "待检查消息", `${details.messageCount}${details.judgeEveryMessages ? ` / ${details.judgeEveryMessages}` : ""}`);
  }
  if (options.verbose && details.judgeEveryMinutes != null) pushPart(parts, "分钟间隔", `${details.judgeEveryMinutes} 分钟`);
  if (options.verbose && details.messageCountRemaining != null) pushPart(parts, "下轮剩余", details.messageCountRemaining);
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
  const compactKeys = new Set(["durationMs", "totalDurationMs", "resultCount", "status", "outcome", "code", "error", "reason", "url"]);
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
    totalDurationMs: "总用时",
    rememberDurationMs: "记忆用时",
    decisionDurationMs: "路由用时",
    generationDurationMs: "生成用时",
    sendDurationMs: "发送用时",
    memoryDurationMs: "落盘用时",
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
    triggerMode: "触发方式",
    messageCount: "待检查消息",
    judgeEveryMessages: "消息间隔",
    judgeEveryMinutes: "分钟间隔",
    messageCountRemaining: "下轮剩余",
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

function humanOutcome(outcome) {
  return {
    sent: "已发送",
    queued: "已排队",
    ignored: "已忽略",
    silent: "主动沉默",
    command: "命令已处理",
    skipped: "已跳过发送",
    failed: "失败"
  }[String(outcome || "")] || String(outcome || "");
}

function humanTriggerMode(mode) {
  return {
    message: "消息数",
    time: "分钟",
    explicit: "@或回复",
    message_count: "消息数",
    minute_interval: "分钟"
  }[String(mode || "")] || String(mode || "");
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
  if (!Number.isFinite(number)) return String(value);
  if (number >= 60_000) return `${(number / 60_000).toFixed(number >= 600_000 ? 1 : 2)}m`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10_000 ? 1 : 2)}s`;
  return `${number}ms`;
}

function shortTraceId(value) {
  const text = String(value || "");
  return text.length <= 12 ? text : text.slice(0, 8);
}

function splitFilter(value) {
  return new Set(String(value || "").toLowerCase().split(/[,|\s]+/).map((item) => item.trim()).filter(Boolean));
}

function getEntryDurationMs(entry) {
  const details = entry?.details || {};
  const durations = [details.totalDurationMs, details.durationMs, details.modelDurationMs, details.sendDurationMs, details.generationDurationMs]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return durations.length > 0 ? Math.max(...durations) : 0;
}

function parseTimeFilter(value, { relativeFromNow = false } = {}) {
  const text = String(value || "").trim();
  const relative = text.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
  if (relative && relativeFromNow) {
    const unitMs = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2].toLowerCase()];
    return Date.now() - Number(relative[1]) * unitMs;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid time filter: ${text}`);
  return parsed;
}

function renderSummary(entries, options) {
  const byLevel = {};
  const byCategory = {};
  const durations = [];
  const traces = new Set();
  for (const entry of entries) {
    byLevel[entry.level] = Number(byLevel[entry.level] || 0) + 1;
    byCategory[entry.category] = Number(byCategory[entry.category] || 0) + 1;
    if (entry.traceId) traces.add(entry.traceId);
    const duration = getEntryDurationMs(entry);
    if (duration > 0) durations.push(duration);
  }
  durations.sort((left, right) => left - right);
  const p95 = durations.length ? durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] : 0;
  const levels = Object.entries(byLevel).map(([key, count]) => `${levelNames[key] || key} ${count}`).join(" / ") || "无";
  const categories = Object.entries(byCategory).map(([key, count]) => `${categoryNames[key] || key} ${count}`).join(" / ") || "无";
  const durationText = durations.length ? `；耗时样本 ${durations.length}，P95 ${formatMs(p95)}，最慢 ${formatMs(durations.at(-1))}` : "";
  const summary = `日志摘要：${entries.length} 条，${traces.size} 条链路；级别 ${levels}；分类 ${categories}${durationText}`;
  return options.json ? JSON.stringify({ summary, total: entries.length, traces: traces.size, byLevel, byCategory, p95Ms: p95 || null }) : color(summary, "brightCyan", options);
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
  process.stderr.write("用法: ncc-log-viewer.mjs LOG_FILE [--tail N] [-f] [--level LEVELS|--errors] [--category CATEGORIES] [--trace ID] [--group ID] [--sender ID] [--search TEXT] [--since 30m|ISO] [--until ISO] [--slow [MS]] [--summary] [--json] [--all] [--plain|--color] [--verbose|--compact]\n");
}
