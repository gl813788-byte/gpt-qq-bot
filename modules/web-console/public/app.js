const els = {
  languageSelect: document.querySelector("#languageSelect"),
  overallStatus: document.querySelector("#overallStatus"),
  qqToggle: document.querySelector("#qqToggle"),
  imessageToggle: document.querySelector("#imessageToggle"),
  maintenanceGrid: document.querySelector("#maintenanceGrid"),
  refreshMaintenance: document.querySelector("#refreshMaintenance"),
  imessageStatus: document.querySelector("#imessageStatus"),
  imessageError: document.querySelector("#imessageError"),
  imessageEvents: document.querySelector("#imessageEvents"),
  trustedHandlesList: document.querySelector("#trustedHandlesList"),
  trustedHandleInput: document.querySelector("#trustedHandleInput"),
  addTrustedHandle: document.querySelector("#addTrustedHandle"),
  trustedHandleCount: document.querySelector("#trustedHandleCount"),
  replyHandleInput: document.querySelector("#replyHandleInput"),
  saveReplyHandle: document.querySelector("#saveReplyHandle"),
  allowedGroupsList: document.querySelector("#allowedGroupsList"),
  allowedGroupInput: document.querySelector("#allowedGroupInput"),
  addGroup: document.querySelector("#addGroup"),
  groupCount: document.querySelector("#groupCount"),
  clearMemory: document.querySelector("#clearMemory"),
  memoryStats: document.querySelector("#memoryStats"),
  groupId: document.querySelector("#groupId"),
  senderName: document.querySelector("#senderName"),
  messageText: document.querySelector("#messageText"),
  sendMention: document.querySelector("#sendMention"),
  sendNormal: document.querySelector("#sendNormal"),
  events: document.querySelector("#events")
};

const i18n = {
  zh: {
    appTitle: "通讯中枢",
    language: "语言",
    online: "在线",
    offline: "离线",
    imessageIntro: "控制台、私聊和远程执行模式入口。",
    qqIntro: "白名单群里被 @ 或被回复时出现。",
    maintenanceTitle: "维护状态",
    maintenanceSubtitle: "本机组件实时状态。",
    refresh: "刷新",
    qqRulesTitle: "QQ 群聊规则",
    qqRulesSubtitle: "白名单、记忆和触发规则。",
    mentionOnly: "仅 @ 出现",
    allowlistCurrent: "当前白名单",
    newGroupId: "新增群 ID",
    groupPlaceholder: "例如 100000001",
    add: "添加",
    lightMemory: "轻量记忆",
    clearMemory: "清空记忆",
    imessageConsoleTitle: "iMessage 控制台",
    imessageConsoleSubtitle: "可信联系人与回复账号。",
    notStarted: "未启动",
    trustedContacts: "可信联系人",
    newIMessageAccount: "新增 iMessage 账号",
    imessagePlaceholder: "手机号或 Apple ID 邮箱",
    replyAccount: "默认回复账号",
    replyAccountPlaceholder: "固定回复到这个手机号或邮箱",
    save: "保存",
    recentCommands: "最近命令",
    qqTestTitle: "模拟 QQ @ 测试",
    qqTestSubtitle: "本地流程测试。",
    groupId: "群 ID",
    senderName: "群友昵称",
    senderDefault: "难绷群友A",
    message: "消息",
    messageDefault: "@assistant 来看一下这个操作",
    sendMention: "发送 @ 事件",
    sendNormal: "发送普通群消息",
    eventLogTitle: "事件记录",
    eventLogSubtitle: "最近 QQ 事件。",
    noEvents: "还没有事件。先打开 QQ 开关，再发一个模拟 @。",
    apiOnline: "在线",
    apiOffline: "离线",
    account: "账号",
    error: "错误",
    path: "路径",
    exists: "存在",
    missing: "缺失",
    lastRun: "上次运行",
    noRun: "还没有运行",
    duration: "耗时",
    switchLabel: "开关",
    enabled: "开启",
    disabled: "关闭",
    status: "状态",
    trusted: "可信联系人",
    remoteExecution: "远程执行模式",
    model: "模型",
    intelligence: "智能",
    memory: "记忆",
    running: "Codex 运行中",
    allowlist: "白名单",
    events: "事件",
    webLookup: "联网查询",
    lastQuery: "上次查询",
    noQuery: "还没有查询",
    normal: "正常",
    attention: "注意",
    fiveHours: "5 小时",
    sevenDays: "7 天",
    used: "已使用",
    total: "共",
    recorded: "记录",
    remaining: "剩余",
    reset: "重置",
    groupCount: (count) => `${count} 个群`,
    itemCount: (count) => `${count} 个`,
    itemCountBare: (count) => `${count} 条`,
    noAllowlist: "还没有白名单群。",
    removeGroup: (id) => `移除群 ${id}`,
    noMemory: "暂无参与记忆",
    noTrustedContacts: "还没有可信联系人。",
    remove: (value) => `移除 ${value}`,
    noIMessageCommands: "还没有 iMessage 命令。",
    reply: "回复",
    sendOk: "发送成功",
    sendFail: "发送失败",
    attachment: "附件",
    notDownloaded: "（未下载）",
    unauthorized: "未授权",
    unknown: "未知",
    ignored: "忽略",
    matched: "matched",
    unknownSender: "未知群友",
    ownerAccount: " · 你的账号",
    replyAssistant: "回复 assistant",
    quote: "引用",
    quoteReadFailed: "引用读取失败"
  },
  en: {
    appTitle: "Communication Hub",
    language: "Language",
    online: "Online",
    offline: "Offline",
    imessageIntro: "Console, private replies, and remote execution entry points.",
    qqIntro: "Appears in allowlisted groups when mentioned or replied to.",
    maintenanceTitle: "Maintenance",
    maintenanceSubtitle: "Live status for local components.",
    refresh: "Refresh",
    qqRulesTitle: "QQ Group Rules",
    qqRulesSubtitle: "Allowlist, memory, and trigger rules.",
    mentionOnly: "Mention only",
    allowlistCurrent: "Current allowlist",
    newGroupId: "New group ID",
    groupPlaceholder: "For example 100000001",
    add: "Add",
    lightMemory: "Lightweight memory",
    clearMemory: "Clear memory",
    imessageConsoleTitle: "iMessage Console",
    imessageConsoleSubtitle: "Trusted contacts and reply account.",
    notStarted: "Not started",
    trustedContacts: "Trusted contacts",
    newIMessageAccount: "New iMessage account",
    imessagePlaceholder: "Phone number or Apple ID email",
    replyAccount: "Default reply account",
    replyAccountPlaceholder: "Always reply from this phone or email",
    save: "Save",
    recentCommands: "Recent commands",
    qqTestTitle: "Simulated QQ @ Test",
    qqTestSubtitle: "Local flow test.",
    groupId: "Group ID",
    senderName: "Sender nickname",
    senderDefault: "Group member A",
    message: "Message",
    messageDefault: "@assistant please check this flow",
    sendMention: "Send @ event",
    sendNormal: "Send normal group message",
    eventLogTitle: "Event Log",
    eventLogSubtitle: "Recent QQ events.",
    noEvents: "No events yet. Turn on QQ, then send a simulated @.",
    apiOnline: "online",
    apiOffline: "offline",
    account: "Account",
    error: "Error",
    path: "Path",
    exists: "exists",
    missing: "missing",
    lastRun: "Last run",
    noRun: "Not run yet",
    duration: "Duration",
    switchLabel: "Switch",
    enabled: "enabled",
    disabled: "disabled",
    status: "Status",
    trusted: "Trusted contacts",
    remoteExecution: "Remote execution",
    model: "Model",
    intelligence: "Reasoning",
    memory: "Memory",
    running: "Codex is running",
    allowlist: "Allowlist",
    events: "Events",
    webLookup: "Web lookup",
    lastQuery: "Last query",
    noQuery: "No query yet",
    normal: "OK",
    attention: "Check",
    fiveHours: "5 hours",
    sevenDays: "7 days",
    used: "Used",
    total: "Total",
    recorded: "Recorded",
    remaining: "Remaining",
    reset: "Reset",
    groupCount: (count) => `${count} groups`,
    itemCount: (count) => `${count}`,
    itemCountBare: (count) => `${count} items`,
    noAllowlist: "No allowlisted groups yet.",
    removeGroup: (id) => `Remove group ${id}`,
    noMemory: "No participation memory",
    noTrustedContacts: "No trusted contacts yet.",
    remove: (value) => `Remove ${value}`,
    noIMessageCommands: "No iMessage commands yet.",
    reply: "Reply",
    sendOk: "sent",
    sendFail: "send failed",
    attachment: "Attachment",
    notDownloaded: "(not downloaded)",
    unauthorized: "Unauthorized",
    unknown: "Unknown",
    ignored: "Ignored",
    matched: "matched",
    unknownSender: "Unknown sender",
    ownerAccount: " · owner account",
    replyAssistant: "reply to assistant",
    quote: "quote",
    quoteReadFailed: "Quote read failed"
  }
};

const introI18n = {
  zh: {
    introTitle: "项目简介",
    introBody: "GPT QQ Bot 是一个把 GPT 风格助手接入 QQ 群聊和私聊的本地项目。它通过 QQ/OneBot 连接 Codex CLI，在本机保存轻量上下文，并提供 WebUI 管理通道开关、群白名单、维护状态和本地测试。"
  },
  en: {
    introTitle: "Project Introduction",
    introBody: "GPT QQ Bot is a local project for running a GPT-style assistant in QQ groups and private chats. It connects QQ/OneBot to Codex CLI, keeps lightweight context on the machine, and provides a WebUI for channel switches, group allowlists, maintenance status, and local testing."
  }
};

let introLanguage = localStorage.getItem("gptQqBotIntroLanguage") || "zh";
const defaultInputValues = {
  senderName: { zh: i18n.zh.senderDefault, en: i18n.en.senderDefault },
  messageText: { zh: i18n.zh.messageDefault, en: i18n.en.messageDefault }
};

function t(key, ...args) {
  const value = i18n.zh[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function applyLanguage() {
  document.documentElement.lang = "zh-CN";
  document.title = "GPT QQ Bot Hub";
  if (els.languageSelect) els.languageSelect.value = introLanguage;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  for (const [id, values] of Object.entries(defaultInputValues)) {
    const node = document.querySelector(`#${id}`);
    if (!node) continue;
    if (!node.value) {
      node.value = values.zh;
    }
  }
  document.querySelectorAll("[data-intro-i18n]").forEach((node) => {
    node.textContent = introI18n[introLanguage]?.[node.dataset.introI18n] || introI18n.zh[node.dataset.introI18n] || "";
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function render(state) {
  els.qqToggle.checked = state.channels.qq;
  els.imessageToggle.checked = state.channels.imessage;
  renderAllowedGroups(state.qq.allowedGroups);
  renderMemoryStats(state.qq.memory);
  renderIMessage(state.imessage);

  const online = state.channels.qq || state.channels.imessage;
  els.overallStatus.textContent = online ? t("online") : t("offline");
  els.overallStatus.classList.toggle("online", online);

  els.events.innerHTML = state.qq.events.length
    ? state.qq.events.map(renderEvent).join("")
    : `<p class="empty">${escapeHtml(t("noEvents"))}</p>`;
}

function renderMaintenance(health) {
  if (!health) return;
  const cards = [
    {
      title: "LLBot / OneBot",
      ok: health.oneBot?.ok,
      lines: [
        `API: ${health.oneBot?.ok ? t("apiOnline") : t("apiOffline")}`,
        health.oneBot?.nickname ? `${t("account")}: ${health.oneBot.nickname}` : null,
        health.oneBot?.selfId ? `QQ: ${health.oneBot.selfId}` : null,
        health.oneBot?.lastError ? `${t("error")}: ${health.oneBot.lastError}` : null
      ]
    },
    {
      title: "Codex CLI",
      ok: health.codex?.pathExists && health.codex?.lastOk !== false,
      lines: [
        `${t("path")}: ${health.codex?.pathExists ? t("exists") : t("missing")}`,
        health.codex?.lastRunAt ? `${t("lastRun")}: ${formatTime(health.codex.lastRunAt)}` : t("noRun"),
        health.codex?.lastDurationMs != null ? `${t("duration")}: ${health.codex.lastDurationMs} ms` : null,
        health.codex?.lastError ? `${t("error")}: ${health.codex.lastError}` : null
      ],
      detailHtml: renderCodexQuotaBlock(health.codex?.quota)
    },
    {
      title: "iMessage",
      ok: health.channels?.imessage && health.imessage?.status !== "error",
      lines: [
        `${t("switchLabel")}: ${health.channels?.imessage ? t("enabled") : t("disabled")}`,
        `${t("status")}: ${health.imessage?.status || "idle"}`,
        `${t("trusted")}: ${t("itemCount", health.imessage?.trustedHandles ?? 0)}`,
        health.imessage?.lastError ? `${t("error")}: ${health.imessage.lastError}` : null
      ]
    },
    {
      title: t("remoteExecution"),
      ok: Boolean(health.remoteExecution?.enabled),
      lines: [
        `${t("status")}: ${health.remoteExecution?.enabled ? t("enabled") : t("disabled")}`,
        `${t("model")}: ${health.remoteExecution?.model || t("unknown")}`,
        `${t("intelligence")}: ${health.remoteExecution?.reasoningEffort || t("unknown")}`,
        `${t("memory")}: ${t("itemCountBare", health.remoteExecution?.memoryCount ?? 0)}`,
        health.remoteExecution?.busy ? t("running") : null
      ]
    },
    {
      title: "QQ",
      ok: health.channels?.qq,
      lines: [
        `${t("switchLabel")}: ${health.channels?.qq ? t("enabled") : t("disabled")}`,
        `${t("allowlist")}: ${t("groupCount", health.qq?.allowedGroups ?? 0)}`,
        `${t("memory")}: ${t("groupCount", health.qq?.memoryGroups ?? 0)}`,
        `${t("events")}: ${t("itemCountBare", health.qq?.recentEvents ?? 0)}`
      ]
    },
    {
      title: t("webLookup"),
      ok: health.webLookup?.enabled && health.webLookup?.lastOk !== false,
      lines: [
        `${t("switchLabel")}: ${health.webLookup?.enabled ? t("enabled") : t("disabled")}`,
        health.webLookup?.lastQuery ? `${t("lastQuery")}: ${health.webLookup.lastQuery}` : t("noQuery"),
        health.webLookup?.lastDurationMs != null ? `${t("duration")}: ${health.webLookup.lastDurationMs} ms` : null,
        health.webLookup?.lastError ? `${t("error")}: ${health.webLookup.lastError}` : null
      ]
    }
  ];

  els.maintenanceGrid.innerHTML = cards.map((card) => `
    <article class="health-card ${card.ok ? "ok" : "warn"}">
      <div class="health-title">
        <strong>${escapeHtml(card.title)}</strong>
        <span>${card.ok ? t("normal") : t("attention")}</span>
      </div>
      ${card.lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      ${card.detailHtml || ""}
    </article>
  `).join("");
}

function renderCodexQuotaBlock(quota) {
  if (!quota?.available) return "";
  const rows = [
    renderQuotaRow(t("fiveHours"), quota.primary),
    renderQuotaRow(t("sevenDays"), quota.secondary)
  ].filter(Boolean).join("");
  const summary = quota.totalTokens != null && quota.modelContextWindow != null
    ? `<p class="quota-summary">${escapeHtml(t("used"))} ${escapeHtml(formatTokenNumber(quota.totalTokens))} / ${escapeHtml(t("total"))} ${escapeHtml(formatContextWindow(quota.modelContextWindow))}</p>`
    : "";
  const updated = quota.updatedAt
    ? `<p class="quota-updated">${escapeHtml(t("recorded"))} ${escapeHtml(formatTime(quota.updatedAt))}</p>`
    : "";
  return rows || summary ? `<div class="quota-block">${summary}${rows}${updated}</div>` : "";
}

function renderQuotaRow(label, window) {
  if (!window) return "";
  return `
    <div class="quota-row">
      <div class="quota-meta">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(t("remaining"))} ${escapeHtml(formatPercent(window.remainingPercent))} · ${escapeHtml(t("reset"))} ${escapeHtml(formatResetTime(window.resetsAt))}</span>
      </div>
      <div class="quota-track" aria-hidden="true">
        <span class="quota-fill" style="width: ${escapeHtml(formatPercent(window.remainingPercent))}"></span>
      </div>
    </div>
  `;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

function formatResetTime(epochSeconds) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  const now = new Date();
  const sameDate = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return sameDate
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
}

function formatTokenNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return Math.round(numeric).toLocaleString("en-US");
}

function formatContextWindow(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}K`;
  return `${Math.round(numeric)}`;
}

function renderAllowedGroups(groups) {
  els.groupCount.textContent = t("groupCount", groups.length);
  els.allowedGroupsList.innerHTML = groups.length
    ? groups.map((groupId) => `
      <div class="group-item">
        <code>${escapeHtml(groupId)}</code>
        <button class="icon-button" data-remove-group="${escapeHtml(groupId)}" title="${escapeHtml(t("removeGroup", groupId))}" aria-label="${escapeHtml(t("removeGroup", groupId))}">&times;</button>
      </div>
    `).join("")
    : `<p class="empty inline">${escapeHtml(t("noAllowlist"))}</p>`;
}

function renderMemoryStats(memory) {
  const counts = memory?.groupCounts || {};
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  els.memoryStats.innerHTML = entries.length
    ? entries.map(([groupId, count]) => `
      <span class="memory-chip">
        <code>${escapeHtml(groupId)}</code>
        ${escapeHtml(count)} / ${escapeHtml(memory.perGroupLimit || 10)}
      </span>
    `).join("")
    : `<span class="memory-chip muted">${escapeHtml(t("noMemory"))}</span>`;
}

function renderIMessage(imessage) {
  const trustedHandles = imessage?.trustedHandles || [];
  els.imessageStatus.textContent = imessage?.status || "idle";
  els.imessageError.textContent = imessage?.lastError || "";
  els.replyHandleInput.value = imessage?.replyHandle || "";
  els.trustedHandleCount.textContent = t("itemCount", trustedHandles.length);
  els.trustedHandlesList.innerHTML = trustedHandles.length
    ? trustedHandles.map((handle) => `
      <div class="group-item">
        <code>${escapeHtml(handle)}</code>
        <button class="icon-button" data-remove-handle="${escapeHtml(handle)}" title="${escapeHtml(t("remove", handle))}" aria-label="${escapeHtml(t("remove", handle))}">&times;</button>
      </div>
    `).join("")
    : `<p class="empty inline">${escapeHtml(t("noTrustedContacts"))}</p>`;
  els.imessageEvents.innerHTML = imessage?.events?.length
    ? imessage.events.map(renderIMessageEvent).join("")
    : `<p class="empty">${escapeHtml(t("noIMessageCommands"))}</p>`;
}

function renderIMessageEvent(record) {
  const className = record.result?.ok ? "ok" : "skip";
  const trustedBadge = record.trusted ? t("trusted") : t("unauthorized");
  const reply = record.reply ? `<p><strong>${escapeHtml(t("reply"))}：</strong>${escapeHtml(record.reply)}</p>` : "";
  const send = record.send ? ` · ${record.send.ok ? t("sendOk") : t("sendFail")}` : "";
  const attachments = record.event?.attachments?.length
    ? `<p><strong>${escapeHtml(t("attachment"))}：</strong>${record.event.attachments.map((item) => `${escapeHtml(item.transferName || item.filename || t("attachment"))} ${item.exists ? "" : t("notDownloaded")}`).join("、")}</p>`
    : "";
  return `
    <article class="event ${className}">
      <div class="meta">${new Date(record.receivedAt).toLocaleString()} · ${trustedBadge}${send} · ${escapeHtml(record.result?.summary || "")}</div>
      <p><strong>${escapeHtml(record.event?.handle || t("unknown"))}：</strong>${escapeHtml(record.event?.text || "")}</p>
      ${attachments}
      ${reply}
    </article>
  `;
}

function renderEvent(record) {
  const status = record.decision.ok ? t("reply") : t("ignored");
  const className = record.decision.ok ? "ok" : "skip";
  const reply = record.reply ? `<p><strong>${escapeHtml(t("reply"))}：</strong>${escapeHtml(record.reply)}</p>` : "";
  const sender = record.event.senderLabel || record.event.senderName || t("unknownSender");
  const ownerBadge = record.event.isOwner ? t("ownerAccount") : "";
  const quoted = renderQuotedContext(record.event);
  return `
    <article class="event ${className}">
      <div class="meta">${new Date(record.receivedAt).toLocaleString()} · ${status} · ${escapeHtml(record.decision.reason || t("matched"))}</div>
      <p><strong>${escapeHtml(sender)}：</strong>${escapeHtml(record.event.text || "")}<span class="owner-badge">${ownerBadge}</span></p>
      ${quoted}
      ${reply}
    </article>
  `;
}

function renderQuotedContext(event) {
  if (event.replyContext) {
    const context = event.replyContext;
    const label = context.isSelf ? t("replyAssistant") : `${t("quote")} ${context.senderName || context.senderId || t("unknownSender")}`;
    return `<p class="quoted"><strong>${escapeHtml(label)}：</strong>${escapeHtml(context.text || "")}</p>`;
  }
  if (event.replyContextError) {
    return `<p class="quoted warning"><strong>${escapeHtml(t("quoteReadFailed"))}：</strong>${escapeHtml(event.replyContextError)}</p>`;
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refresh() {
  render(await api("/api/state"));
  await refreshMaintenance();
}

async function refreshMaintenance() {
  try {
    renderMaintenance(await api("/api/maintenance"));
  } catch (error) {
    els.maintenanceGrid.innerHTML = `
      <article class="health-card warn">
        <div class="health-title"><strong>维护状态</strong><span>注意</span></div>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}

async function setChannel(channel, enabled) {
  render(await api("/api/channel", {
    method: "POST",
    body: JSON.stringify({ channel, enabled })
  }));
}

async function saveAllowedGroups(allowedGroups) {
  const normalized = [...new Set(allowedGroups.map((item) => String(item).trim()).filter(Boolean))];
  render(await api("/api/qq/groups", {
    method: "POST",
    body: JSON.stringify({ allowedGroups: normalized })
  }));
}

async function saveTrustedHandles(trustedHandles) {
  const normalized = [...new Set(trustedHandles.map((item) => String(item).trim()).filter(Boolean))];
  render(await api("/api/imessage/trusted-handles", {
    method: "POST",
    body: JSON.stringify({ trustedHandles: normalized })
  }));
}

async function saveReplyHandle() {
  render(await api("/api/imessage/reply-handle", {
    method: "POST",
    body: JSON.stringify({ replyHandle: els.replyHandleInput.value.trim() })
  }));
}

async function addAllowedGroup() {
  const groupId = els.allowedGroupInput.value.trim();
  if (!groupId) return;
  const state = await api("/api/state");
  await saveAllowedGroups([...state.qq.allowedGroups, groupId]);
  els.allowedGroupInput.value = "";
}

async function addTrustedHandle() {
  const handle = els.trustedHandleInput.value.trim();
  if (!handle) return;
  const state = await api("/api/state");
  await saveTrustedHandles([...(state.imessage?.trustedHandles || []), handle]);
  els.trustedHandleInput.value = "";
}

async function sendQqEvent(type) {
  const record = await api("/api/qq/event", {
    method: "POST",
    body: JSON.stringify({
      type,
      groupId: els.groupId.value.trim(),
      senderName: els.senderName.value.trim(),
      text: els.messageText.value.trim()
    })
  });
  const state = await api("/api/state");
  render(state);
  return record;
}

els.qqToggle.addEventListener("change", () => setChannel("qq", els.qqToggle.checked));
els.imessageToggle.addEventListener("change", () => setChannel("imessage", els.imessageToggle.checked));
els.refreshMaintenance.addEventListener("click", refreshMaintenance);
els.languageSelect?.addEventListener("change", () => {
  introLanguage = els.languageSelect.value === "en" ? "en" : "zh";
  localStorage.setItem("gptQqBotIntroLanguage", introLanguage);
  applyLanguage();
  refresh();
});

els.addGroup.addEventListener("click", addAllowedGroup);
els.allowedGroupInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addAllowedGroup();
});

els.allowedGroupsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-group]");
  if (!button) return;
  const groupId = button.dataset.removeGroup;
  const state = await api("/api/state");
  await saveAllowedGroups(state.qq.allowedGroups.filter((item) => item !== groupId));
});

els.addTrustedHandle.addEventListener("click", addTrustedHandle);
els.trustedHandleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTrustedHandle();
});

els.saveReplyHandle.addEventListener("click", saveReplyHandle);
els.replyHandleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveReplyHandle();
});

els.trustedHandlesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-handle]");
  if (!button) return;
  const handle = button.dataset.removeHandle;
  const state = await api("/api/state");
  await saveTrustedHandles((state.imessage?.trustedHandles || []).filter((item) => item !== handle));
});

els.clearMemory.addEventListener("click", async () => {
  render(await api("/api/qq/memory/clear", {
    method: "POST",
    body: JSON.stringify({})
  }));
});

els.sendMention.addEventListener("click", () => sendQqEvent("group_at"));
els.sendNormal.addEventListener("click", () => sendQqEvent("group_message"));

applyLanguage();
refresh();
