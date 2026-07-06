const HUB = location.protocol.startsWith("http") ? "" : "http://127.0.0.1:3789";
const pollMs = 2200;

const els = {
  languageSelect: document.querySelector("#languageSelect"),
  hubStatus: document.querySelector("#hubStatus"),
  refresh: document.querySelector("#refresh"),
  openHub: document.querySelector("#openHub"),
  qqToggle: document.querySelector("#qqToggle"),
  imessageToggle: document.querySelector("#imessageToggle"),
  refreshMaintenance: document.querySelector("#refreshMaintenance"),
  refreshMemory: document.querySelector("#refreshMemory"),
  healthGrid: document.querySelector("#healthGrid"),
  lastUpdated: document.querySelector("#lastUpdated"),
  groupCount: document.querySelector("#groupCount"),
  groupList: document.querySelector("#groupList"),
  groupInput: document.querySelector("#groupInput"),
  addGroupForm: document.querySelector("#addGroupForm"),
  handleCount: document.querySelector("#handleCount"),
  handleList: document.querySelector("#handleList"),
  handleInput: document.querySelector("#handleInput"),
  addHandleForm: document.querySelector("#addHandleForm"),
  replyHandleInput: document.querySelector("#replyHandleInput"),
  replyHandleForm: document.querySelector("#replyHandleForm"),
  qqEvents: document.querySelector("#qqEvents"),
  imessageEvents: document.querySelector("#imessageEvents"),
  memoryView: document.querySelector("#memoryView"),
  memoryTabs: Array.from(document.querySelectorAll("[data-memory-tab]"))
};

const i18n = {
  zh: {
    appTitle: "通讯中枢",
    language: "语言",
    connecting: "连接中",
    openHubApi: "打开 Hub API",
    refresh: "刷新",
    hubOnline: "Hub 在线",
    hubOffline: "Hub 离线",
    imessageIntro: "可信联系人控制台，私聊可直接回应，远程执行模式从这里进入。",
    qqIntro: "群聊仅白名单 @assistant / 回复时出现，私聊按开关接收。",
    maintenanceTitle: "维护状态",
    waitingSync: "等待同步",
    lastSync: (time) => `上次同步 ${time}`,
    checkNow: "立即检查",
    memoryTitle: "记忆管理",
    memorySubtitle: "查看 iMessage、远程执行模式和 QQ 轻量记忆。",
    refreshMemory: "刷新记忆",
    memoryType: "记忆类型",
    unifiedMemory: "统一记忆",
    remoteExecution: "远程执行模式",
    qqAllowlistTitle: "QQ群白名单",
    qqAllowlistSubtitle: "列表会保存到 Hub 设置。",
    groupId: "群 ID",
    imessageContactsTitle: "iMessage 联系人",
    imessageContactsSubtitle: "只响应这些号码或邮箱。",
    phoneOrEmail: "手机号或邮箱",
    replyAccountOptional: "默认回复账号，可留空",
    add: "添加",
    save: "保存",
    qqRecentTitle: "QQ 最近事件",
    qqRecentSubtitle: "显示最近是否回复。",
    imessageRecentTitle: "iMessage 最近事件",
    imessageRecentSubtitle: "命令、图片和私聊回应。",
    apiOnline: "API 在线",
    apiOffline: "API 离线",
    account: "账号",
    pathExists: "路径存在",
    pathMissing: "路径缺失",
    ranAt: "运行",
    notRunYet: "还未运行",
    switchOn: "开关开启",
    switchOff: "开关关闭",
    status: "状态",
    trustedCount: (count) => `可信 ${count} 个`,
    enabledNow: "当前开启",
    disabledNow: "当前关闭",
    model: "模型",
    intelligence: "智能",
    unknown: "未知",
    memoryCount: (count) => `记忆 ${count} 条`,
    codexRunning: "Codex 正在运行",
    allowlistCount: (count) => `白名单 ${count} 个`,
    groupMemoryCount: (count) => `记忆 ${count} 个群`,
    eventCount: (count) => `事件 ${count} 条`,
    query: "查询",
    noQuery: "还未查询",
    ok: "正常",
    attention: "注意",
    fiveHours: "5 小时",
    sevenDays: "7 天",
    used: "已使用",
    total: "共",
    recorded: "记录",
    remaining: "剩余",
    reset: "重置",
    remoteMemoryTitle: (count) => `远程执行模式记忆 · ${count} 条`,
    clear: "清空",
    noRemoteMemory: "远程执行模式还没有记忆。",
    noGroupMemory: "这个群还没有可显示的记忆。",
    noQqMemory: "QQ 还没有记忆。",
    noContactMemory: "这个联系人还没有可显示的记忆。",
    noIMessageMemory: "iMessage 还没有记忆。",
    unifiedReadable: (count) => `统一记忆 · ${count} 条可读摘要`,
    updatedAt: (time) => `更新 ${time}`,
    noUpdate: "暂无更新",
    skillRecallWrite: "电脑端 skill 调用后写入",
    imessageRecallWrite: "iMessage 跨端回看后写入",
    handoffWrite: "允许 /交接 手动写入",
    handoff: "交接",
    idea: "点子",
    project: "项目",
    todo: "待办",
    daily: "日常",
    recentState: "近期状态",
    latestHandoff: "最近交接",
    noUnifiedMemory: "统一记忆还没有可显示条目。",
    preference: "偏好",
    message: "消息",
    owner: "owner",
    groupCount: (count) => `${count} 个`,
    noAllowlist: "还没有群白名单。",
    remove: "移除",
    noTrustedContacts: "还没有可信联系人。",
    reply: "回复",
    ignored: "忽略",
    groupMember: "群友",
    trusted: "可信",
    unauthorized: "未授权",
    attachment: "附件",
    noQqEvents: "暂无 QQ 事件。",
    noIMessageEvents: "暂无 iMessage 事件。"
  },
  en: {
    appTitle: "Communication Hub",
    language: "Language",
    connecting: "Connecting",
    openHubApi: "Open Hub API",
    refresh: "Refresh",
    hubOnline: "Hub online",
    hubOffline: "Hub offline",
    imessageIntro: "Trusted-contact console, direct private replies, and remote execution entry.",
    qqIntro: "Groups respond only when @assistant is mentioned or replied to; private chats follow the toggle.",
    maintenanceTitle: "Maintenance",
    waitingSync: "Waiting to sync",
    lastSync: (time) => `Last sync ${time}`,
    checkNow: "Check now",
    memoryTitle: "Memory",
    memorySubtitle: "View iMessage, remote execution, and QQ lightweight memory.",
    refreshMemory: "Refresh memory",
    memoryType: "Memory type",
    unifiedMemory: "Unified memory",
    remoteExecution: "Remote execution",
    qqAllowlistTitle: "QQ Group Allowlist",
    qqAllowlistSubtitle: "Saved into Hub settings.",
    groupId: "Group ID",
    imessageContactsTitle: "iMessage Contacts",
    imessageContactsSubtitle: "Only these numbers or emails are answered.",
    phoneOrEmail: "Phone number or email",
    replyAccountOptional: "Default reply account, optional",
    add: "Add",
    save: "Save",
    qqRecentTitle: "Recent QQ Events",
    qqRecentSubtitle: "Shows recent reply decisions.",
    imessageRecentTitle: "Recent iMessage Events",
    imessageRecentSubtitle: "Commands, images, and private replies.",
    apiOnline: "API online",
    apiOffline: "API offline",
    account: "Account",
    pathExists: "Path exists",
    pathMissing: "Path missing",
    ranAt: "Ran",
    notRunYet: "Not run yet",
    switchOn: "Switch on",
    switchOff: "Switch off",
    status: "Status",
    trustedCount: (count) => `Trusted ${count}`,
    enabledNow: "Enabled",
    disabledNow: "Disabled",
    model: "Model",
    intelligence: "Reasoning",
    unknown: "unknown",
    memoryCount: (count) => `Memory ${count}`,
    codexRunning: "Codex is running",
    allowlistCount: (count) => `Allowlist ${count}`,
    groupMemoryCount: (count) => `Memory ${count} groups`,
    eventCount: (count) => `Events ${count}`,
    query: "Query",
    noQuery: "No query yet",
    ok: "OK",
    attention: "Check",
    fiveHours: "5 hours",
    sevenDays: "7 days",
    used: "Used",
    total: "Total",
    recorded: "Recorded",
    remaining: "Remaining",
    reset: "Reset",
    remoteMemoryTitle: (count) => `Remote execution memory · ${count}`,
    clear: "Clear",
    noRemoteMemory: "Remote execution has no memory yet.",
    noGroupMemory: "This group has no visible memory.",
    noQqMemory: "QQ has no memory yet.",
    noContactMemory: "This contact has no visible memory.",
    noIMessageMemory: "iMessage has no memory yet.",
    unifiedReadable: (count) => `Unified memory · ${count} readable summaries`,
    updatedAt: (time) => `Updated ${time}`,
    noUpdate: "No updates",
    skillRecallWrite: "Write after desktop skill recall",
    imessageRecallWrite: "Write after iMessage cross-device recall",
    handoffWrite: "Allow manual /handoff writes",
    handoff: "Handoff",
    idea: "Ideas",
    project: "Projects",
    todo: "Todos",
    daily: "Daily",
    recentState: "Recent state",
    latestHandoff: "Latest handoff",
    noUnifiedMemory: "Unified memory has no visible entries.",
    preference: "Preference",
    message: "Message",
    owner: "owner",
    groupCount: (count) => `${count}`,
    noAllowlist: "No allowlisted groups yet.",
    remove: "Remove",
    noTrustedContacts: "No trusted contacts yet.",
    reply: "Reply",
    ignored: "Ignored",
    groupMember: "Group member",
    trusted: "Trusted",
    unauthorized: "Unauthorized",
    attachment: "Attachment",
    noQqEvents: "No QQ events yet.",
    noIMessageEvents: "No iMessage events yet."
  }
};

const introI18n = {
  zh: {
    introTitle: "项目简介",
    introBody: "Codex QQ Bot 是一个把 Codex 风格助手接入 QQ 群聊和私聊的本地项目。它通过 QQ/OneBot 连接 Codex CLI，在本机保存轻量上下文，并通过 ncc 与 Hub API 管理运行状态。"
  },
  en: {
    introTitle: "Project Introduction",
    introBody: "Codex QQ Bot is a local project for running a Codex-style assistant in QQ groups and private chats. It connects QQ/OneBot to Codex CLI, keeps lightweight context on the machine, and uses ncc plus the Hub API for runtime control."
  }
};

let introLanguage = localStorage.getItem("gptQqBotIntroLanguage") || "zh";

function t(key, ...args) {
  const value = i18n.zh[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function applyLanguage() {
  document.documentElement.lang = "zh-CN";
  document.title = "Codex QQ Bot";
  if (els.languageSelect) els.languageSelect.value = introLanguage;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-intro-i18n]").forEach((node) => {
    node.textContent = introI18n[introLanguage]?.[node.dataset.introI18n] || introI18n.zh[node.dataset.introI18n] || "";
  });
}

let lastState = null;
let lastMemory = null;
let activeMemoryTab = "unified";
const openMemoryGroups = new Set();
let busy = false;

async function api(path, options = {}) {
  const response = await fetch(`${HUB}${path}`, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function refreshAll() {
  if (busy) return;
  busy = true;
  try {
    const [state, maintenance, memory] = await Promise.all([
      api("/api/state"),
      api("/api/maintenance"),
      api("/api/memory")
    ]);
    setHubStatus(true);
    lastState = state;
    lastMemory = memory;
    try {
      renderState(state);
      renderMaintenance(maintenance);
      renderMemory(memory);
    } catch (renderError) {
      console.error(renderError);
    }
  } catch (error) {
    setHubStatus(false, error.message);
  } finally {
    busy = false;
  }
}

function setHubStatus(ok, message = "") {
  els.hubStatus.textContent = ok ? t("hubOnline") : t("hubOffline");
  els.hubStatus.title = message;
  els.hubStatus.classList.toggle("warn", !ok);
  els.hubStatus.classList.toggle("bad", !ok);
}

function renderState(state) {
  els.qqToggle.checked = Boolean(state.channels?.qq);
  els.imessageToggle.checked = Boolean(state.channels?.imessage);
  renderGroups(state.qq?.allowedGroups || []);
  renderHandles(state.imessage?.trustedHandles || []);
  els.replyHandleInput.value = state.imessage?.replyHandle || "";
  renderQqEvents(state.qq?.events || []);
  renderIMessageEvents(state.imessage?.events || []);
}

function renderMaintenance(health) {
  setHubStatus(true);
  els.lastUpdated.textContent = t("lastSync", new Date().toLocaleTimeString());
  const cards = [
    {
      title: "LLBot / OneBot",
      ok: health.oneBot?.ok,
      lines: [
        health.oneBot?.ok ? t("apiOnline") : t("apiOffline"),
        health.oneBot?.nickname ? `${t("account")} ${health.oneBot.nickname}` : null,
        health.oneBot?.selfId ? `QQ ${health.oneBot.selfId}` : null,
        health.oneBot?.lastError
      ]
    },
    {
      title: "Codex CLI",
      ok: health.codex?.pathExists && health.codex?.lastOk !== false,
      lines: [
        health.codex?.pathExists ? t("pathExists") : t("pathMissing"),
        health.codex?.lastRunAt ? `${t("ranAt")} ${formatTime(health.codex.lastRunAt)}` : t("notRunYet"),
        health.codex?.lastDurationMs != null ? `${health.codex.lastDurationMs} ms` : null,
        health.codex?.lastError
      ],
      detailHtml: renderCodexQuotaBlock(health.codex?.quota)
    },
    {
      title: "iMessage",
      ok: health.channels?.imessage && health.imessage?.status !== "error",
      lines: [
        health.channels?.imessage ? t("switchOn") : t("switchOff"),
        `${t("status")} ${health.imessage?.status || "idle"}`,
        t("trustedCount", health.imessage?.trustedHandles ?? 0),
        health.imessage?.lastError
      ]
    },
    {
      title: t("remoteExecution"),
      ok: Boolean(health.remoteExecution?.enabled),
      lines: [
        health.remoteExecution?.enabled ? t("enabledNow") : t("disabledNow"),
        `${t("model")} ${health.remoteExecution?.model || t("unknown")}`,
        `${t("intelligence")} ${health.remoteExecution?.reasoningEffort || t("unknown")}`,
        t("memoryCount", health.remoteExecution?.memoryCount ?? 0),
        health.remoteExecution?.busy ? t("codexRunning") : null
      ]
    },
    {
      title: "QQ",
      ok: health.channels?.qq,
      lines: [
        health.channels?.qq ? t("switchOn") : t("switchOff"),
        t("allowlistCount", health.qq?.allowedGroups ?? 0),
        t("groupMemoryCount", health.qq?.memoryGroups ?? 0),
        t("eventCount", health.qq?.recentEvents ?? 0)
      ]
    },
    {
      title: "联网查询",
      ok: health.webLookup?.enabled && health.webLookup?.lastOk !== false,
      lines: [
        health.webLookup?.enabled ? t("switchOn") : t("switchOff"),
        health.webLookup?.lastQuery ? `${t("query")} ${health.webLookup.lastQuery}` : t("noQuery"),
        health.webLookup?.lastDurationMs != null ? `${health.webLookup.lastDurationMs} ms` : null,
        health.webLookup?.lastError
      ]
    }
  ];

  els.healthGrid.innerHTML = cards.map((card) => `
    <article class="health-card ${card.ok ? "ok" : "bad"}">
      <div class="title">
        <strong>${escapeHtml(card.title)}</strong>
        <span>${card.ok ? t("ok") : t("attention")}</span>
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

function renderMemory(memory) {
  if (!els.memoryView) return;
  rememberOpenMemoryGroups();
  els.memoryTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.memoryTab === activeMemoryTab);
  });

  if (activeMemoryTab === "unified") {
    els.memoryView.innerHTML = renderUnifiedMemory(memory?.unified || {});
    return;
  }

  if (activeMemoryTab === "remoteExecution") {
    const entries = memory?.remoteExecution?.entries || [];
    els.memoryView.innerHTML = `
      <div class="memory-toolbar">
        <strong>${escapeHtml(t("remoteMemoryTitle", entries.length))}</strong>
        <button class="button danger" data-clear-memory="remoteExecution">${escapeHtml(t("clear"))}</button>
      </div>
      ${renderMemoryEntries(entries, t("noRemoteMemory"))}
    `;
    return;
  }

  if (activeMemoryTab === "qq") {
    const lightweight = memory?.qq?.lightweight || [];
    const recent = memory?.qq?.recent || [];
    const groups = [...lightweight, ...recent];
    els.memoryView.innerHTML = groups.length
      ? groups.map((group) => `
        <details class="memory-group" data-memory-key="qq:${escapeHtml(group.id)}" ${openMemoryGroups.has(`qq:${group.id}`) ? "open" : ""}>
          <summary>
            <span>${escapeHtml(group.title)}</span>
            <em>${group.count} 条</em>
            <button class="small-danger" data-clear-memory="qq" data-memory-id="${escapeHtml(group.id)}" type="button">${escapeHtml(t("clear"))}</button>
          </summary>
          ${renderMemoryEntries(group.entries, t("noGroupMemory"))}
        </details>
      `).join("")
      : `<p class="empty">${escapeHtml(t("noQqMemory"))}</p>`;
    return;
  }

  const handles = memory?.imessage || [];
  els.memoryView.innerHTML = handles.length
    ? handles.map((handle) => `
      <details class="memory-group" data-memory-key="imessage:${escapeHtml(handle.id)}" ${openMemoryGroups.has(`imessage:${handle.id}`) ? "open" : ""}>
        <summary>
          <span>${escapeHtml(handle.title)}</span>
          <em>${handle.count} 条</em>
          <button class="small-danger" data-clear-memory="imessage" data-memory-id="${escapeHtml(handle.id)}" type="button">${escapeHtml(t("clear"))}</button>
        </summary>
        ${renderMemoryEntries(handle.entries, t("noContactMemory"))}
      </details>
    `).join("")
    : `<p class="empty">${escapeHtml(t("noIMessageMemory"))}</p>`;
}

function renderUnifiedMemory(unified) {
  const settings = unified.settings || {};
  const counts = unified.counts || {};
  const entries = unified.entries || [];
  const stateParts = [
    unified.currentState?.timeContext,
    unified.currentState?.sleepState,
    unified.currentState?.recentMeal,
    unified.currentState?.bodyState,
    unified.currentState?.mood
  ].filter(Boolean);
  return `
    <div class="memory-toolbar">
      <strong>${escapeHtml(t("unifiedReadable", entries.length))}</strong>
      <span class="muted-text">${escapeHtml(unified.updatedAt ? t("updatedAt", formatTime(unified.updatedAt)) : t("noUpdate"))}</span>
    </div>
    <div class="unified-switches">
      ${renderUnifiedSwitch("autoWriteOnSkillRecall", t("skillRecallWrite"), settings.autoWriteOnSkillRecall)}
      ${renderUnifiedSwitch("autoWriteOnIMessageRecall", t("imessageRecallWrite"), settings.autoWriteOnIMessageRecall)}
      ${renderUnifiedSwitch("manualHandoffCommand", t("handoffWrite"), settings.manualHandoffCommand !== false)}
    </div>
    <div class="memory-summary-grid">
      <span>${escapeHtml(t("handoff"))} ${escapeHtml(counts.handoffHistory || 0)}</span>
      <span>${escapeHtml(t("idea"))} ${escapeHtml(counts.ideas || 0)}</span>
      <span>${escapeHtml(t("project"))} ${escapeHtml(counts.projectNotes || 0)}</span>
      <span>${escapeHtml(t("todo"))} ${escapeHtml(counts.openLoops || 0)}</span>
      <span>${escapeHtml(t("daily"))} ${escapeHtml(counts.dailyTimeline || 0)}</span>
    </div>
    ${stateParts.length ? `<p class="memory-state">${escapeHtml(t("recentState"))}: ${escapeHtml(stateParts.join("；"))}</p>` : ""}
    ${unified.latestHandoff?.summary ? `
      <article class="memory-entry">
        <div class="meta">${escapeHtml(t("latestHandoff"))}</div>
        <p>${escapeHtml(unified.latestHandoff.summary)}</p>
      </article>
    ` : ""}
    ${entries.length ? `<div class="memory-entries">${entries.map(renderUnifiedEntry).join("")}</div>` : `<p class="empty">${escapeHtml(t("noUnifiedMemory"))}</p>`}
  `;
}

function renderUnifiedSwitch(key, label, checked) {
  return `
    <label class="switch-row">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" data-unified-setting="${escapeHtml(key)}" ${checked ? "checked" : ""} />
    </label>
  `;
}

function renderUnifiedEntry(entry) {
  const title = [formatUnifiedType(entry.type), entry.topic].filter(Boolean).join(" · ");
  const meta = [title, entry.updatedAt ? formatTime(entry.updatedAt) : null].filter(Boolean).join(" · ");
  return `
    <article class="memory-entry">
      <div class="meta">${escapeHtml(meta || "统一记忆")}</div>
      <p>${escapeHtml(entry.summary || "")}</p>
    </article>
  `;
}

function formatUnifiedType(type) {
  return {
    handoff: t("handoff"),
    idea: t("idea"),
    projectNote: t("project"),
    preference: t("preference"),
    openLoop: t("todo"),
    dailyState: t("daily")
  }[type] || type || "";
}

function rememberOpenMemoryGroups() {
  els.memoryView?.querySelectorAll?.(".memory-group[data-memory-key]").forEach((group) => {
    const key = group.dataset.memoryKey;
    if (!key) return;
    if (group.open) openMemoryGroups.add(key);
    else openMemoryGroups.delete(key);
  });
}

function renderMemoryEntries(entries, emptyText) {
  return entries?.length
    ? `<div class="memory-entries">${entries.slice().reverse().map((entry) => `
      <article class="memory-entry">
        <div class="meta">${escapeHtml(formatMemoryRole(entry.role))}${entry.at ? ` · ${escapeHtml(formatTime(entry.at))}` : ""}</div>
        <p>${escapeHtml(entry.text)}</p>
      </article>
    `).join("")}</div>`
    : `<p class="empty">${escapeHtml(emptyText)}</p>`;
}

function formatMemoryRole(role) {
  const value = String(role || "");
  if (value === "assistant") return "assistant";
  if (value === "user") return t("owner");
  return value || t("message");
}

function renderGroups(groups) {
  els.groupCount.textContent = t("groupCount", groups.length);
  els.groupList.innerHTML = groups.length
    ? groups.map((groupId) => `
      <div class="list-item">
        <code>${escapeHtml(groupId)}</code>
        <button class="remove" data-remove-group="${escapeHtml(groupId)}" title="${escapeHtml(t("remove"))}">×</button>
      </div>
    `).join("")
    : `<p class="empty">${escapeHtml(t("noAllowlist"))}</p>`;
}

function renderHandles(handles) {
  els.handleCount.textContent = t("groupCount", handles.length);
  els.handleList.innerHTML = handles.length
    ? handles.map((handle) => `
      <div class="list-item">
        <code>${escapeHtml(handle)}</code>
        <button class="remove" data-remove-handle="${escapeHtml(handle)}" title="${escapeHtml(t("remove"))}">×</button>
      </div>
    `).join("")
    : `<p class="empty">${escapeHtml(t("noTrustedContacts"))}</p>`;
}

function renderQqEvents(events) {
  els.qqEvents.innerHTML = events.length
    ? events.slice(0, 8).map((record) => {
      const ok = Boolean(record.decision?.ok);
      const sender = record.event?.senderLabel || record.event?.senderName || t("groupMember");
      const reply = record.reply ? `<p>${escapeHtml(t("reply"))}: ${escapeHtml(record.reply)}</p>` : "";
      return `
        <article class="event ${ok ? "ok" : "skip"}">
          <div class="meta">${formatTime(record.receivedAt)} · ${ok ? t("reply") : t("ignored")} · ${escapeHtml(record.decision?.reason || "")}</div>
          <p>${escapeHtml(sender)}：${escapeHtml(record.event?.text || "")}</p>
          ${reply}
        </article>
      `;
    }).join("")
    : `<p class="empty">${escapeHtml(t("noQqEvents"))}</p>`;
}

function renderIMessageEvents(events) {
  els.imessageEvents.innerHTML = events.length
    ? events.slice(0, 8).map((record) => {
      const ok = record.result?.ok || record.send?.ok;
      const attachments = record.event?.attachments?.length
        ? `<p>${escapeHtml(t("attachment"))}: ${record.event.attachments.map((item) => escapeHtml(item.transferName || item.filename || t("attachment"))).join("、")}</p>`
        : "";
      const reply = record.reply ? `<p>${escapeHtml(t("reply"))}: ${escapeHtml(record.reply)}</p>` : "";
      return `
        <article class="event ${ok ? "ok" : "skip"}">
          <div class="meta">${formatTime(record.receivedAt)} · ${record.trusted ? t("trusted") : t("unauthorized")} · ${escapeHtml(record.result?.summary || "")}</div>
          <p>${escapeHtml(record.event?.handle || t("unknown"))}：${escapeHtml(record.event?.text || "")}</p>
          ${attachments}
          ${reply}
        </article>
      `;
    }).join("")
    : `<p class="empty">${escapeHtml(t("noIMessageEvents"))}</p>`;
}

async function setChannel(channel, enabled) {
  await api("/api/channel", {
    method: "POST",
    body: JSON.stringify({ channel, enabled })
  });
  await refreshAll();
}

async function saveGroups(groups) {
  await api("/api/qq/groups", {
    method: "POST",
    body: JSON.stringify({ allowedGroups: groups })
  });
  await refreshAll();
}

async function saveHandles(handles) {
  await api("/api/imessage/trusted-handles", {
    method: "POST",
    body: JSON.stringify({ trustedHandles: handles })
  });
  await refreshAll();
}

async function clearMemory(scope, id = "") {
  await api("/api/memory/clear", {
    method: "POST",
    body: JSON.stringify({ scope, id })
  });
  await refreshAll();
}

async function saveUnifiedMemorySettings(nextSettings) {
  await api("/api/unified-memory/settings", {
    method: "POST",
    body: JSON.stringify(nextSettings)
  });
  await refreshAll();
}

function formatTime(value) {
  if (!value) return "";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.refresh.addEventListener("click", refreshAll);
els.refreshMaintenance.addEventListener("click", refreshAll);
els.refreshMemory.addEventListener("click", refreshAll);
els.openHub.addEventListener("click", () => {
  window.webkit?.messageHandlers?.codexRemoteContactNative?.postMessage({ action: "openHub" });
});

els.qqToggle.addEventListener("change", () => setChannel("qq", els.qqToggle.checked).catch(refreshAll));
els.imessageToggle.addEventListener("change", () => setChannel("imessage", els.imessageToggle.checked).catch(refreshAll));

els.addGroupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = els.groupInput.value.trim();
  if (!value || !lastState) return;
  const groups = Array.from(new Set([...(lastState.qq?.allowedGroups || []), value]));
  els.groupInput.value = "";
  await saveGroups(groups);
});

els.groupList.addEventListener("click", async (event) => {
  const groupId = event.target?.dataset?.removeGroup;
  if (!groupId || !lastState) return;
  await saveGroups((lastState.qq?.allowedGroups || []).filter((item) => item !== groupId));
});

els.addHandleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = els.handleInput.value.trim();
  if (!value || !lastState) return;
  const handles = Array.from(new Set([...(lastState.imessage?.trustedHandles || []), value]));
  els.handleInput.value = "";
  await saveHandles(handles);
});

els.handleList.addEventListener("click", async (event) => {
  const handle = event.target?.dataset?.removeHandle;
  if (!handle || !lastState) return;
  await saveHandles((lastState.imessage?.trustedHandles || []).filter((item) => item !== handle));
});

els.replyHandleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await api("/api/imessage/reply-handle", {
    method: "POST",
    body: JSON.stringify({ replyHandle: els.replyHandleInput.value.trim() })
  });
  await refreshAll();
});

els.memoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeMemoryTab = tab.dataset.memoryTab;
    renderMemory(lastMemory);
  });
});

els.memoryView.addEventListener("click", async (event) => {
  const button = event.target?.closest?.("[data-clear-memory]");
  if (!button) return;
  event.preventDefault();
  const scope = button.dataset.clearMemory;
  const id = button.dataset.memoryId || "";
  await clearMemory(scope, id);
});

els.memoryView.addEventListener("change", async (event) => {
  const input = event.target?.closest?.("[data-unified-setting]");
  if (!input || !lastMemory?.unified) return;
  const key = input.dataset.unifiedSetting;
  const settings = {
    autoWriteOnSkillRecall: Boolean(lastMemory.unified.settings?.autoWriteOnSkillRecall),
    autoWriteOnIMessageRecall: lastMemory.unified.settings?.autoWriteOnIMessageRecall !== false,
    manualHandoffCommand: lastMemory.unified.settings?.manualHandoffCommand !== false
  };
  settings[key] = input.checked;
  await saveUnifiedMemorySettings(settings);
});

els.languageSelect?.addEventListener("change", () => {
  introLanguage = els.languageSelect.value === "en" ? "en" : "zh";
  localStorage.setItem("gptQqBotIntroLanguage", introLanguage);
  applyLanguage();
  refreshAll();
});

applyLanguage();
refreshAll();
setInterval(refreshAll, pollMs);
