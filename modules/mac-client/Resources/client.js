const HUB = location.protocol === "http:" || location.protocol === "https:" ? "" : "http://127.0.0.1:3789";
const STORAGE_PREFIX = "codexRemoteContact.";
const validViews = new Set(["overview", "channels", "memory", "activity", "settings"]);

const translations = {
  zh: {
    mainNavigation: "主导航", mobileNavigation: "移动端导航", brandHome: "Nexus 首页", runtimeSummary: "运行摘要", runtimeBrief: "运行建议", skipToContent: "跳到主要内容", openQuickActions: "打开快速操作", quickActions: "快速操作", searchActions: "搜索页面或操作", commandCenter: "COMMAND CENTER", commandHint: "↑↓ 选择 · Enter 执行", navOverview: "总览", navChannels: "通道", navMemory: "记忆", navActivity: "活动与日志", navActivityShort: "日志", navSettings: "设置",
    connecting: "正在连接", workspace: "工作台", overviewTitle: "运行总览", channelsTitle: "消息通道", memoryTitle: "记忆中心", activityTitle: "活动与日志", settingsTitle: "偏好设置",
    waitingSync: "等待同步", refreshCurrent: "刷新当前页面", toggleTheme: "切换主题", hubUnavailable: "Hub 暂时不可用", offlineHint: "请确认本地服务已启动。", retry: "重试",
    heroTitle: "你的本地智能通讯中枢", heroBody: "在一个安静、清晰的界面里掌握 QQ、iMessage、Codex 和记忆系统。", manageChannels: "管理通道", openApi: "打开 API",
    liveChannels: "LIVE CHANNELS", channelControl: "通道控制", viewAll: "查看全部", usageWindow: "用量窗口", systemPulse: "SYSTEM PULSE", serviceHealth: "服务健康", checkNow: "立即检查", recentFlow: "RECENT FLOW", recentActivity: "最近活动", openLogs: "打开日志",
    connectionRules: "CONNECTION RULES", channelsHeading: "管理每一条消息通道", channelsBody: "控制启停、访问范围和可信联系人，所有改动会立即写入本地 Hub。",
    toggleQq: "启用 QQ 通道", toggleIMessage: "启用 iMessage 通道", qqAllowlist: "QQ群白名单", qqAllowlistHint: "只有列表内群聊会触发助手。", stickerFrequency: "表情包频率", stickerFrequencyHint: "按群查看最近真人与上线后 Bot 的实际使用率。", humanStickerRate: "真人 {rate}% · {count} 条样本", botStickerRate: "Bot {rate}% · {count} 条新回复", plannedStickerRate: "闲聊计划 {rate}%", noStickerFrequency: "还没有可统计的群聊样本。", adaptiveLearning: "自动适应", adaptiveLearningHint: "按群学习活跃时段、成员节奏，并按 24 小时时钟复盘真人与 Bot 的风格差异。", adaptiveSamples: "真人 {count} 条 · {members} 位成员", adaptiveHours: "常见活跃时段：{hours}", adaptiveNextReview: "下次复盘检查：{time}", adaptiveColdWaiting: "冷群兴趣发言已暂停，等待真人接话", adaptiveCollecting: "正在积累上线后的 Bot 回复，样本足够后按天复盘。", noAdaptiveLearning: "还没有可用的自动学习样本。", coldInterest: "冷群兴趣发言", coldInterestHint: "按最后一条消息计时，结合群节奏选择发一句或保持沉默。", coldInterestPolicy: "开放 {hours} · 沉默后重试 {retry} 小时 · 发言后等待真人接话", coldInterestRecent: "最近判断", noColdInterest: "还没有可展示的冷群状态。", noColdInterestDecisions: "还没有实际触发过冷群判断。", viewDetailedLogs: "查看详细日志", learningHuman: "真人学习参数", learningBot: "Bot 实际参数", learningReview: "风格复盘", learningInterest: "兴趣回复参数", detailSample: "样本 {value}", detailConfidence: "置信度 {value}%", detailTextSample: "文字样本 {value}", detailAverageChars: "平均文字 {value} 字", detailShortRatio: "短消息 {value}%", detailLongRatio: "长消息 {value}%", detailStickerRatio: "表情包 {value}%", detailImageRatio: "图片 {value}%", detailEmojiRatio: "Emoji {value}%", detailReplyRatio: "回复引用 {value}%", detailMentionRatio: "@ 消息 {value}%", detailQuestionRatio: "问句 {value}%", detailBotInteraction: "与 Bot 直接互动 {value}%", detailBurstRatio: "两分钟连发 {value}%", detailGap: "消息间隔中位 {value}", detailActiveDays: "活跃 {value} 天", detailDailyMessages: "活跃日均 {value} 条", detailCurrentHour: "当前时段占比 {value}%", detailFirstSeen: "开始学习 {value}", detailLastHuman: "最后真人消息 {value}", detailBotReplies: "新 Bot 回复 {value}", detailBotChars: "Bot 平均 {value} 字", detailBotSticker: "Bot 表情包 {value}%", detailBotBubbles: "Bot 多气泡 {value}%", detailBotFollowup: "真人接话率 {value}%", detailTrackingStart: "Bot 统计起点 {value}", detailLastBot: "最后 Bot 回复 {value}", detailReviewSamples: "复盘样本 真人 {human} / Bot {bot}", detailLastReview: "上次复盘 {value}", detailNextReview: "下次复盘 {value}", detailOrdinaryInterest: "普通兴趣：{messages} 条或 {minutes} 分钟", detailInterestReason: "间隔依据 {value}", detailColdIdle: "已沉默 {idle} / 需 {required} 小时", detailColdReason: "当前状态 {value}", detailColdThreshold: "计时阈值 {value}", detailColdCheck: "上次判断 {value}", detailColdSent: "上次主动发言 {value}", groupLabel: "群 {value}", groupId: "群 ID", groupIdExample: "例如 123456789", add: "添加",
    trustedContacts: "可信联系人", trustedContactsHint: "仅响应这些号码或邮箱。", phoneOrEmail: "手机号或邮箱", defaultReplyAccount: "默认回复账号", optional: "可留空", save: "保存", qqRecent: "QQ 最近事件", imessageRecent: "iMessage 最近事件",
    contextVault: "CONTEXT VAULT", memoryHeading: "可见、可控的本地记忆", memoryBody: "浏览跨端摘要、群聊上下文和远程执行记录，并精确清理不再需要的内容。", refreshMemory: "刷新记忆", memoryType: "记忆类型", unified: "统一记忆", remoteExecution: "远程执行", searchMemory: "搜索记忆",
    observability: "OBSERVABILITY", activityHeading: "把每一次运行看清楚", activityBody: "筛选日志、追踪链路并观察耗时分布，定位问题不再依赖翻文件。", liveRefresh: "实时刷新", level: "级别", allLevels: "全部级别", category: "模块", allCategories: "全部模块", search: "搜索", logSearchHint: "消息、Trace、群或发送者", slowThreshold: "慢请求", noLimit: "不限", applyFilter: "应用筛选", structuredLogs: "结构化日志", waitingLogs: "等待日志", resetFilter: "重置", refresh: "刷新",
    preferences: "PREFERENCES", settingsHeading: "让控制台适合你的节奏", settingsBody: "外观和刷新偏好只保存在当前设备，不会影响机器人运行配置。", appearance: "外观", appearanceHint: "跟随系统，或固定使用明亮 / 深色主题。", theme: "主题", system: "系统", light: "明亮", dark: "深色", language: "界面语言", languageHint: "完整切换控制台文案和时间显示。", autoRefresh: "自动刷新", autoRefreshHint: "页面隐藏时会自动暂停，减少无意义开销。", refreshInterval: "刷新间隔", hubEndpoint: "Hub 地址", hubEndpointHint: "控制台默认仅连接本机回环地址。", copy: "复制", rawState: "原始状态", aboutBody: "QQ / OneBot、iMessage 与 Codex CLI 的本地优先通讯中枢。",
    confirmAction: "确认操作", cancel: "取消", confirm: "确认", logDetail: "日志详情", close: "关闭", copyJson: "复制 JSON", done: "完成",
    hubOnline: "Hub 在线", hubOffline: "Hub 离线", syncedNow: "刚刚同步", syncedAt: "同步于 {time}", online: "在线", offline: "离线", enabled: "已启用", disabled: "已停用", running: "运行中", idle: "空闲", healthy: "正常", attention: "注意", staleData: "健康信息已过期：{value}",
    uptime: "运行时长", serviceOnline: "在线服务", activeTasks: "活动任务", memoryEntries: "记忆条目", active: "活动", pending: "排队", concurrency: "并发上限", groups: "群", contacts: "联系人", systemReady: "系统已就绪", systemReadyBody: "关键服务运行正常，可以随时接收和处理消息。", systemAttention: "有配置项需要留意", systemAttentionBody: "{count} 个服务当前停用或尚未配置，不影响其余通道运行。", systemCritical: "检测到运行异常", systemCriticalBody: "{count} 个服务需要处理，建议先查看服务健康详情。", healthyServices: "{count} 个服务正常", issuesCount: "{count} 项需处理", inspectHealth: "查看健康详情", noMatchingActions: "没有匹配的操作", actionRefresh: "刷新当前视图", actionRefreshHint: "重新同步当前页面的最新数据", actionHealth: "检查服务健康", actionHealthHint: "立即重新探测本地服务与通道", actionTheme: "切换明暗主题", actionThemeHint: "在明亮与深色外观之间切换", actionApi: "查看原始状态", actionApiHint: "打开 Hub 返回的原始 JSON 状态", actionAddGroup: "添加 QQ 群", actionAddGroupHint: "前往通道页并定位群白名单输入框", actionAddContact: "添加可信联系人", actionAddContactHint: "前往通道页并定位联系人输入框", actionOverviewHint: "查看核心指标、额度与服务健康", actionChannelsHint: "管理通道、白名单和可信联系人", actionMemoryHint: "搜索和清理本地上下文记忆", actionLogsHint: "筛选结构化日志并追踪运行问题", actionSettingsHint: "调整主题、语言和自动刷新",
    qqChannelHint: "白名单群与私聊入口", imessageChannelHint: "可信联系人私聊入口", groupsAllowed: "{count} 个白名单群", contactsTrusted: "{count} 位可信联系人", recentEventsCount: "{count} 条最近事件",
    quotaUnavailable: "暂无可用额度快照", fiveHours: "5 小时", sevenDays: "7 天", remaining: "剩余 {value}%", resetsAt: "{time} 重置", recordedAt: "记录于 {time}", noReset: "时间未知",
    oneBot: "OneBot", codexCli: "Codex CLI", webLookup: "联网查询", qqChannel: "QQ 通道", pathReady: "命令路径可用", pathMissing: "命令路径缺失", neverRun: "尚未运行", lastRun: "上次运行 {time}", trustedCount: "{count} 位可信联系人", provider: "提供方 {value}", lastQuery: "查询：{value}", noQuery: "尚无查询", model: "模型 {value}", reasoning: "推理 {value}", queueState: "活动 {active} · 排队 {pending}/{max}", noRecentActivity: "还没有最近活动。",
    noGroups: "尚未添加群白名单。", noContacts: "尚未添加可信联系人。", removeGroupTitle: "移除群白名单", removeGroupMessage: "确定从白名单移除群 {value} 吗？", removeContactTitle: "移除可信联系人", removeContactMessage: "确定移除 {value} 吗？", groupInvalid: "请输入 4–20 位数字群 ID。", handleInvalid: "请输入有效的手机号或邮箱。", saved: "已保存", channelUpdated: "通道状态已更新", added: "已添加", removed: "已移除",
    replied: "已回复", ignored: "已忽略", trusted: "可信", unauthorized: "未授权", noEvents: "还没有事件。", replyLabel: "回复：", attachmentCount: "{count} 个附件",
    autoSkillMemory: "Skill 回看后写入", autoSkillHint: "桌面 Skill 调用记忆后自动沉淀", autoIMessageMemory: "跨端回看后写入", autoIMessageHint: "iMessage 调用统一记忆后自动沉淀", manualHandoff: "允许手动交接", manualHandoffHint: "允许 /交接 指令写入摘要", recentState: "近期状态", latestHandoff: "最近交接", noState: "暂无近期状态", unifiedEntries: "统一摘要", handoffs: "交接", ideas: "点子", projects: "项目", todos: "待办", notes: "记录", updated: "更新于 {time}", noMemory: "没有符合条件的记忆。", entriesCount: "{count} 条", clear: "清空", clearMemoryTitle: "清空记忆", clearMemoryMessage: "此操作会永久清理“{value}”中的记忆，确定继续吗？", allRelatedMemory: "{value} 的全部相关记忆", memoryCleared: "记忆已清空", roleUser: "用户", roleAssistant: "助手", publicMemory: "公共长期记忆", personas: "群友画像", conversationImpressions: "对话印象",
    matchedLogs: "显示 {visible} 条 · 匹配 {matched} 条", totalLogs: "日志总数", traces: "Trace 数", p95Latency: "P95 耗时", maxLatency: "最慢耗时", noLogs: "没有符合筛选条件的日志。", copied: "已复制", filterApplied: "筛选已应用",
    runtimeModel: "当前模型", runtimeReasoning: "推理等级", runtimeStarted: "启动时间", apiTokenPrompt: "此 Hub 已启用 API Token。请输入 Token（只保存在当前标签页）：", authRequired: "需要 API Token 才能连接。", requestFailed: "请求失败", networkError: "无法连接到本地 Hub。", copyFailed: "复制失败，请手动选择内容。", unknown: "未知"
  },
  en: {
    mainNavigation: "Main navigation", mobileNavigation: "Mobile navigation", brandHome: "Nexus home", runtimeSummary: "Runtime summary", runtimeBrief: "Runtime guidance", skipToContent: "Skip to main content", openQuickActions: "Open quick actions", quickActions: "Quick actions", searchActions: "Search pages or actions", commandCenter: "COMMAND CENTER", commandHint: "↑↓ select · Enter run", navOverview: "Overview", navChannels: "Channels", navMemory: "Memory", navActivity: "Activity & Logs", navActivityShort: "Logs", navSettings: "Settings",
    connecting: "Connecting", workspace: "Workspace", overviewTitle: "Runtime Overview", channelsTitle: "Message Channels", memoryTitle: "Memory Center", activityTitle: "Activity & Logs", settingsTitle: "Preferences",
    waitingSync: "Waiting to sync", refreshCurrent: "Refresh current view", toggleTheme: "Toggle theme", hubUnavailable: "Hub is unavailable", offlineHint: "Make sure the local service is running.", retry: "Retry",
    heroTitle: "Your local intelligent communication hub", heroBody: "A calm, clear place to manage QQ, iMessage, Codex, and memory.", manageChannels: "Manage channels", openApi: "Open API",
    liveChannels: "LIVE CHANNELS", channelControl: "Channel control", viewAll: "View all", usageWindow: "Usage windows", systemPulse: "SYSTEM PULSE", serviceHealth: "Service health", checkNow: "Check now", recentFlow: "RECENT FLOW", recentActivity: "Recent activity", openLogs: "Open logs",
    connectionRules: "CONNECTION RULES", channelsHeading: "Manage every message channel", channelsBody: "Control availability, access scope, and trusted contacts. Changes are written to the local Hub immediately.",
    toggleQq: "Enable QQ channel", toggleIMessage: "Enable iMessage channel", qqAllowlist: "QQ group allowlist", qqAllowlistHint: "Only listed groups can trigger the assistant.", stickerFrequency: "Sticker frequency", stickerFrequencyHint: "Compare recent human usage with Bot replies sent after this rollout.", humanStickerRate: "Humans {rate}% · {count} samples", botStickerRate: "Bot {rate}% · {count} new replies", plannedStickerRate: "Casual target {rate}%", noStickerFrequency: "No group samples are available yet.", adaptiveLearning: "Adaptive learning", adaptiveLearningHint: "Learns group timing and member rhythm, then reviews human-versus-Bot style on a 24-hour clock.", adaptiveSamples: "{count} human messages · {members} members", adaptiveHours: "Common active hours: {hours}", adaptiveNextReview: "Next review check: {time}", adaptiveColdWaiting: "Cold-group interest is paused until a human replies", adaptiveCollecting: "Collecting new Bot replies; review runs daily when samples are sufficient.", noAdaptiveLearning: "No adaptive-learning samples yet.", coldInterest: "Cold-group interest", coldInterestHint: "Times from the latest message and uses group rhythm to speak once or stay silent.", coldInterestPolicy: "Open {hours} · retry after silence in {retry}h · wait for a human after sending", coldInterestRecent: "Recent decisions", noColdInterest: "No cold-group status is available yet.", noColdInterestDecisions: "No cold-group candidate has run yet.", viewDetailedLogs: "View detailed logs", learningHuman: "Human learning signals", learningBot: "Bot actual signals", learningReview: "Style review", learningInterest: "Interest reply signals", detailSample: "Samples {value}", detailConfidence: "Confidence {value}%", detailTextSample: "Text samples {value}", detailAverageChars: "Average text {value} chars", detailShortRatio: "Short messages {value}%", detailLongRatio: "Long messages {value}%", detailStickerRatio: "Stickers {value}%", detailImageRatio: "Images {value}%", detailEmojiRatio: "Emoji {value}%", detailReplyRatio: "Replies {value}%", detailMentionRatio: "Mentions {value}%", detailQuestionRatio: "Questions {value}%", detailBotInteraction: "Direct Bot interaction {value}%", detailBurstRatio: "Two-minute bursts {value}%", detailGap: "Median gap {value}", detailActiveDays: "Active {value} days", detailDailyMessages: "{value} per active day", detailCurrentHour: "Current-hour share {value}%", detailFirstSeen: "Learning since {value}", detailLastHuman: "Latest human message {value}", detailBotReplies: "New Bot replies {value}", detailBotChars: "Bot average {value} chars", detailBotSticker: "Bot stickers {value}%", detailBotBubbles: "Bot multi-bubble {value}%", detailBotFollowup: "Human follow-up {value}%", detailTrackingStart: "Bot tracking since {value}", detailLastBot: "Latest Bot reply {value}", detailReviewSamples: "Review samples human {human} / Bot {bot}", detailLastReview: "Last review {value}", detailNextReview: "Next review {value}", detailOrdinaryInterest: "Ordinary interest: {messages} messages or {minutes} minutes", detailInterestReason: "Cadence basis {value}", detailColdIdle: "Idle {idle} / required {required}h", detailColdReason: "Current state {value}", detailColdThreshold: "Time threshold {value}", detailColdCheck: "Last check {value}", detailColdSent: "Last outreach {value}", groupLabel: "Group {value}", groupId: "Group ID", groupIdExample: "e.g. 123456789", add: "Add",
    trustedContacts: "Trusted contacts", trustedContactsHint: "Only respond to these numbers or emails.", phoneOrEmail: "Phone or email", defaultReplyAccount: "Default reply account", optional: "Optional", save: "Save", qqRecent: "Recent QQ events", imessageRecent: "Recent iMessage events",
    contextVault: "CONTEXT VAULT", memoryHeading: "Visible, controllable local memory", memoryBody: "Browse cross-device summaries, chat context, and remote execution records, then remove exactly what you no longer need.", refreshMemory: "Refresh memory", memoryType: "Memory type", unified: "Unified", remoteExecution: "Remote execution", searchMemory: "Search memory",
    observability: "OBSERVABILITY", activityHeading: "See every run clearly", activityBody: "Filter logs, follow traces, and inspect latency without digging through files.", liveRefresh: "Live refresh", level: "Level", allLevels: "All levels", category: "Category", allCategories: "All categories", search: "Search", logSearchHint: "Message, trace, group, or sender", slowThreshold: "Slow requests", noLimit: "No limit", applyFilter: "Apply", structuredLogs: "Structured logs", waitingLogs: "Waiting for logs", resetFilter: "Reset", refresh: "Refresh",
    preferences: "PREFERENCES", settingsHeading: "Make the console fit your rhythm", settingsBody: "Appearance and refresh preferences stay on this device and do not alter bot runtime configuration.", appearance: "Appearance", appearanceHint: "Follow the system or lock light / dark mode.", theme: "Theme", system: "System", light: "Light", dark: "Dark", language: "Language", languageHint: "Switch all console copy and time formatting.", autoRefresh: "Auto refresh", autoRefreshHint: "Automatically pauses while the page is hidden.", refreshInterval: "Refresh interval", hubEndpoint: "Hub endpoint", hubEndpointHint: "The console connects to loopback by default.", copy: "Copy", rawState: "Raw state", aboutBody: "A local-first QQ / OneBot, iMessage, and Codex CLI communication hub.",
    confirmAction: "Confirm action", cancel: "Cancel", confirm: "Confirm", logDetail: "Log detail", close: "Close", copyJson: "Copy JSON", done: "Done",
    hubOnline: "Hub online", hubOffline: "Hub offline", syncedNow: "Synced just now", syncedAt: "Synced at {time}", online: "Online", offline: "Offline", enabled: "Enabled", disabled: "Disabled", running: "Running", idle: "Idle", healthy: "Healthy", attention: "Check", staleData: "Health data is stale: {value}",
    uptime: "Uptime", serviceOnline: "Services online", activeTasks: "Active tasks", memoryEntries: "Memory entries", active: "Active", pending: "Pending", concurrency: "Concurrency", groups: "Groups", contacts: "Contacts", systemReady: "System ready", systemReadyBody: "Critical services are healthy and ready to receive messages.", systemAttention: "A few settings need attention", systemAttentionBody: "{count} services are disabled or not configured; other channels remain available.", systemCritical: "Runtime issue detected", systemCriticalBody: "{count} services need attention. Check service health first.", healthyServices: "{count} services healthy", issuesCount: "{count} to review", inspectHealth: "Inspect health", noMatchingActions: "No matching actions", actionRefresh: "Refresh current view", actionRefreshHint: "Sync the latest data for the current page", actionHealth: "Check service health", actionHealthHint: "Probe local services and channels now", actionTheme: "Toggle color theme", actionThemeHint: "Switch between light and dark appearance", actionApi: "View raw state", actionApiHint: "Open the raw JSON returned by the Hub", actionAddGroup: "Add QQ group", actionAddGroupHint: "Open Channels and focus the group allowlist field", actionAddContact: "Add trusted contact", actionAddContactHint: "Open Channels and focus the contact field", actionOverviewHint: "Review core metrics, usage, and service health", actionChannelsHint: "Manage channels, allowlists, and trusted contacts", actionMemoryHint: "Search and clear local contextual memory", actionLogsHint: "Filter structured logs and trace runtime issues", actionSettingsHint: "Adjust theme, language, and auto refresh",
    qqChannelHint: "Allowlisted groups and private chats", imessageChannelHint: "Trusted-contact private messages", groupsAllowed: "{count} allowlisted groups", contactsTrusted: "{count} trusted contacts", recentEventsCount: "{count} recent events",
    quotaUnavailable: "No usage snapshot available", fiveHours: "5 hours", sevenDays: "7 days", remaining: "{value}% remaining", resetsAt: "Resets {time}", recordedAt: "Recorded {time}", noReset: "Unknown reset",
    oneBot: "OneBot", codexCli: "Codex CLI", webLookup: "Web lookup", qqChannel: "QQ channel", pathReady: "Command path ready", pathMissing: "Command path missing", neverRun: "Not run yet", lastRun: "Last run {time}", trustedCount: "{count} trusted contacts", provider: "Provider {value}", lastQuery: "Query: {value}", noQuery: "No query yet", model: "Model {value}", reasoning: "Reasoning {value}", queueState: "Active {active} · pending {pending}/{max}", noRecentActivity: "No recent activity yet.",
    noGroups: "No allowlisted groups yet.", noContacts: "No trusted contacts yet.", removeGroupTitle: "Remove group", removeGroupMessage: "Remove group {value} from the allowlist?", removeContactTitle: "Remove contact", removeContactMessage: "Remove {value}?", groupInvalid: "Enter a 4–20 digit group ID.", handleInvalid: "Enter a valid phone number or email.", saved: "Saved", channelUpdated: "Channel updated", added: "Added", removed: "Removed",
    replied: "Replied", ignored: "Ignored", trusted: "Trusted", unauthorized: "Unauthorized", noEvents: "No events yet.", replyLabel: "Reply: ", attachmentCount: "{count} attachments",
    autoSkillMemory: "Write after Skill recall", autoSkillHint: "Persist useful context after a desktop Skill recall", autoIMessageMemory: "Write after cross-device recall", autoIMessageHint: "Persist useful context after iMessage memory recall", manualHandoff: "Allow manual handoff", manualHandoffHint: "Allow /handoff to write a summary", recentState: "Recent state", latestHandoff: "Latest handoff", noState: "No recent state", unifiedEntries: "Unified summaries", handoffs: "Handoffs", ideas: "Ideas", projects: "Projects", todos: "Todos", notes: "Notes", updated: "Updated {time}", noMemory: "No matching memory.", entriesCount: "{count} entries", clear: "Clear", clearMemoryTitle: "Clear memory", clearMemoryMessage: "This permanently removes memory from “{value}”. Continue?", allRelatedMemory: "All memory related to {value}", memoryCleared: "Memory cleared", roleUser: "User", roleAssistant: "Assistant", publicMemory: "Public long-term memory", personas: "Personas", conversationImpressions: "Conversation impressions",
    matchedLogs: "Showing {visible} · matched {matched}", totalLogs: "Total logs", traces: "Traces", p95Latency: "P95 latency", maxLatency: "Max latency", noLogs: "No logs match these filters.", copied: "Copied", filterApplied: "Filter applied",
    runtimeModel: "Current model", runtimeReasoning: "Reasoning", runtimeStarted: "Started", apiTokenPrompt: "This Hub requires an API token. Enter it here (stored only in this tab):", authRequired: "An API token is required.", requestFailed: "Request failed", networkError: "Unable to reach the local Hub.", copyFailed: "Copy failed. Select the content manually.", unknown: "Unknown"
  }
};

const app = {
  view: validViews.has(location.hash.slice(1)) ? location.hash.slice(1) : "overview",
  language: localStorage.getItem(`${STORAGE_PREFIX}language`) === "en" ? "en" : "zh",
  theme: ["system", "light", "dark"].includes(localStorage.getItem(`${STORAGE_PREFIX}theme`)) ? localStorage.getItem(`${STORAGE_PREFIX}theme`) : "system",
  autoRefresh: localStorage.getItem(`${STORAGE_PREFIX}autoRefresh`) !== "0",
  refreshSeconds: [5, 10, 30, 60].includes(Number(localStorage.getItem(`${STORAGE_PREFIX}refreshSeconds`))) ? Number(localStorage.getItem(`${STORAGE_PREFIX}refreshSeconds`)) : 10,
  liveLogs: true,
  state: null,
  maintenance: null,
  memory: null,
  logs: null,
  activeMemoryTab: "unified",
  memoryQuery: "",
  openMemoryGroups: new Set(),
  controllers: new Map(),
  busyKeys: new Set(),
  apiToken: sessionStorage.getItem(`${STORAGE_PREFIX}apiToken`) || "",
  authPromptPromise: null,
  lastFetch: { state: 0, maintenance: 0, memory: 0, logs: 0 },
  logCategories: new Set(),
  selectedLog: null,
  commandIndex: 0,
  lastSyncAt: 0
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function t(key, values = {}) {
  const template = translations[app.language]?.[key] ?? translations.zh[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
}

function applyI18n() {
  document.documentElement.lang = app.language === "en" ? "en" : "zh-CN";
  document.title = app.language === "en" ? "Nexus · Codex Remote Contact" : "Nexus · 通讯中枢";
  $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  $$('[data-i18n-title]').forEach((node) => { node.title = t(node.dataset.i18nTitle); });
  $$('[data-i18n-aria-label]').forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel)); });
  $("#languageSelect").value = app.language;
  updatePageIdentity();
  renderAll();
  if ($("#commandDialog").open) renderCommands();
}

function setTheme(theme) {
  app.theme = ["system", "light", "dark"].includes(theme) ? theme : "system";
  document.documentElement.dataset.theme = app.theme;
  localStorage.setItem(`${STORAGE_PREFIX}theme`, app.theme);
  $$('[data-theme-choice]').forEach((button) => {
    const selected = button.dataset.themeChoice === app.theme;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-checked", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}

function updatePageIdentity() {
  const titles = { overview: "overviewTitle", channels: "channelsTitle", memory: "memoryTitle", activity: "activityTitle", settings: "settingsTitle" };
  $("#pageTitle").textContent = t(titles[app.view]);
}

function setView(view, { updateHash = true, quiet = true, focus = false } = {}) {
  if (!validViews.has(view)) view = "overview";
  app.view = view;
  $$('[data-view-panel]').forEach((panel) => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  $$('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (updateHash && location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
  updatePageIdentity();
  if (focus) {
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    requestAnimationFrame(() => $("#pageTitle").focus({ preventScroll: true }));
  }
  void refreshView({ quiet });
}

async function api(path, options = {}, { key = "", retryAuth = true } = {}) {
  let controller = null;
  if (key) {
    app.controllers.get(key)?.abort();
    controller = new AbortController();
    app.controllers.set(key, controller);
  }
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (app.apiToken) headers.set("authorization", `Bearer ${app.apiToken}`);
  try {
    const response = await fetch(`${HUB}${path}`, {
      ...options,
      headers,
      signal: controller?.signal || options.signal,
      credentials: "same-origin"
    });
    if (response.status === 401 && retryAuth) {
      app.apiToken = "";
      sessionStorage.removeItem(`${STORAGE_PREFIX}apiToken`);
      const token = await requestApiToken();
      if (token) return api(path, options, { key, retryAuth: false });
    }
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const error = new Error(payload?.error || payload || `${t("requestFailed")} (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error instanceof TypeError) error.message = t("networkError");
    throw error;
  } finally {
    if (key && app.controllers.get(key) === controller) app.controllers.delete(key);
  }
}

async function requestApiToken() {
  if (app.authPromptPromise) return app.authPromptPromise;
  const promptPromise = Promise.resolve().then(() => {
    const token = window.prompt(t("apiTokenPrompt"))?.trim() || "";
    if (token) {
      app.apiToken = token;
      sessionStorage.setItem(`${STORAGE_PREFIX}apiToken`, token);
    }
    return token;
  });
  app.authPromptPromise = promptPromise.finally(() => {
    app.authPromptPromise = null;
  });
  return app.authPromptPromise;
}

async function refreshState({ quiet = false } = {}) {
  if (!quiet) setSync("loading");
  try {
    app.state = await api("/api/state", {}, { key: "state" });
    app.lastFetch.state = Date.now();
    setConnection(true);
    renderState();
    if (!quiet) setSync("ok");
    return app.state;
  } catch (error) {
    if (error.name === "AbortError") return null;
    setConnection(false, error.message);
    if (!quiet) setSync("error", error.message);
    throw error;
  }
}

async function refreshMaintenance({ quiet = false, force = false } = {}) {
  try {
    const suffix = force ? "?force=1" : "";
    app.maintenance = await api(`/api/maintenance${suffix}`, {}, { key: "maintenance" });
    app.lastFetch.maintenance = Date.now();
    renderMaintenance();
    if (!quiet) setSync("ok");
    return app.maintenance;
  } catch (error) {
    if (error.name !== "AbortError") {
      if (!quiet) showToast(error.message, "error");
      renderHealthError(error.message);
    }
    return null;
  }
}

async function refreshMemory({ quiet = false } = {}) {
  try {
    app.memory = await api("/api/memory", {}, { key: "memory" });
    app.lastFetch.memory = Date.now();
    renderMemory();
    if (!quiet) setSync("ok");
    return app.memory;
  } catch (error) {
    if (error.name !== "AbortError") {
      $("#memoryView").innerHTML = emptyState(error.message);
      if (!quiet) showToast(error.message, "error");
    }
    return null;
  }
}

function buildLogQuery() {
  const params = new URLSearchParams({ limit: "150", verbose: "1" });
  const values = {
    level: $("#logLevel").value,
    category: $("#logCategory").value,
    q: $("#logQuery").value.trim(),
    slow: $("#logSlow").value
  };
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params.toString();
}

async function refreshLogs({ quiet = false } = {}) {
  try {
    app.logs = await api(`/api/logs?${buildLogQuery()}`, {}, { key: "logs" });
    app.lastFetch.logs = Date.now();
    renderLogs({ preserveFocus: quiet });
    if (!quiet) setSync("ok");
    return app.logs;
  } catch (error) {
    if (error.name !== "AbortError") {
      $("#logStream").innerHTML = emptyState(error.message);
      if (!quiet) showToast(error.message, "error");
    }
    return null;
  }
}

async function refreshView({ quiet = false } = {}) {
  const tasks = [];
  if (app.view !== "settings" || !app.state) tasks.push(refreshState({ quiet }));
  if (app.view === "overview" || app.view === "channels") tasks.push(refreshMaintenance({ quiet }));
  if (app.view === "memory") tasks.push(refreshMemory({ quiet }));
  if (app.view === "activity") tasks.push(refreshLogs({ quiet }));
  await Promise.allSettled(tasks);
}

function setSync(status, detail = "") {
  const root = $("#syncState");
  root.className = `sync-state ${status}`;
  const text = status === "loading" ? t("connecting") : status === "error" ? t("hubOffline") : t("syncedNow");
  $("#syncText").textContent = text;
  root.title = detail;
  $("#refreshButton").classList.toggle("loading", status === "loading");
  $("#refreshButton").setAttribute("aria-busy", String(status === "loading"));
  if (status === "ok") app.lastSyncAt = Date.now();
}

function setConnection(ok, reason = "") {
  $("#offlineBanner").hidden = ok;
  $("#offlineReason").textContent = reason || t("offlineHint");
  $("#sidebarStatus").textContent = ok ? t("hubOnline") : t("hubOffline");
  $("#sidebarStatusDot").className = `status-dot ${ok ? "" : "bad"}`;
  const hero = $("#heroStatus");
  hero.innerHTML = `<span class="status-dot ${ok ? "" : "bad"}"></span><span>${escapeHtml(ok ? t("hubOnline") : t("hubOffline"))}</span>`;
}

function renderAll() {
  renderState();
  renderMaintenance();
  renderMemory();
  renderLogs();
  renderSettings();
}

function renderState() {
  if (!app.state) return;
  const state = app.state;
  $("#qqToggle").checked = Boolean(state.channels?.qq);
  $("#imessageToggle").checked = Boolean(state.channels?.imessage);
  renderOverviewStats();
  renderOverviewBrief();
  renderQuickChannels();
  renderChannelSettings();
  renderEvents();
  renderRecentTimeline();
  renderSettings();
}

function renderOverviewStats() {
  const state = app.state || {};
  const maintenance = app.maintenance || {};
  const trackedServices = [
    maintenance.oneBot?.ok,
    maintenance.codex?.pathExists && maintenance.codex?.lastOk !== false,
    maintenance.channels?.qq && maintenance.oneBot?.ok,
    maintenance.channels?.imessage && maintenance.imessage?.status !== "error",
    maintenance.remoteExecution?.enabled && !maintenance.remoteExecution?.lastError,
    maintenance.webLookup?.enabled && maintenance.webLookup?.lastOk !== false
  ];
  const onlineServices = trackedServices.filter(Boolean).length;
  const codexActive = Number(maintenance.codex?.queue?.active || 0);
  const qqActive = Number(maintenance.qq?.activeGenerations || 0);
  const activeTasks = Math.max(codexActive, qqActive, maintenance.remoteExecution?.busy ? 1 : 0);
  const conversation = state.qq?.conversationMemory || {};
  const memoryTotal = sumValues(state.qq?.memory?.groupCounts)
    + Number(state.qq?.publicMemory?.count || 0)
    + sumValues(state.qq?.personas?.groupMemberCounts)
    + Number(conversation.groups || 0)
    + Number(conversation.privateChats || 0)
    + sumValues(state.imessage?.memory?.handleCounts)
    + Number(state.remoteExecution?.memoryCount || 0)
    + Number(app.memory?.unified?.entries?.length || 0);
  const uptime = formatDuration(Date.now() - Date.parse(maintenance.startedAt || ""));
  const stats = [
    { value: uptime || "—", label: t("uptime"), kind: "", icon: icons.clock },
    { value: `${onlineServices}/${trackedServices.length}`, label: t("serviceOnline"), kind: "sky", icon: icons.pulse },
    { value: formatNumber(activeTasks), label: t("activeTasks"), kind: "violet", icon: icons.activity },
    { value: formatNumber(memoryTotal), label: t("memoryEntries"), kind: "warn", icon: icons.memory }
  ];
  $("#overviewStats").innerHTML = stats.map((item) => statCard(item)).join("");
  const queue = maintenance.codex?.queue || {};
  $("#heroMetrics").innerHTML = [
    [queue.active ?? 0, t("active")], [queue.pending ?? 0, t("pending")], [queue.maxConcurrent ?? "—", t("concurrency")], [(state.qq?.allowedGroups || []).length, t("groups")]
  ].map(([value, label]) => `<div class="hero-metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function statCard({ value, label, kind = "", icon = "" }) {
  return `<article class="stat-card ${kind}"><div class="stat-head"><span class="stat-icon">${icon}</span></div><strong>${escapeHtml(value)}</strong><p>${escapeHtml(label)}</p></article>`;
}

function renderOverviewBrief() {
  if (!app.maintenance) return;
  const h = app.maintenance;
  const services = [
    { state: h.oneBot?.ok ? "ok" : "bad" },
    { state: h.codex?.pathExists && h.codex?.lastOk !== false ? "ok" : "bad" },
    { state: !h.channels?.imessage ? "off" : h.imessage?.status === "error" ? "bad" : "ok" },
    { state: !h.remoteExecution?.enabled ? "off" : h.remoteExecution?.busy ? "ok" : "ok" },
    { state: h.channels?.qq ? "ok" : "off" },
    { state: !h.webLookup?.enabled ? "off" : h.webLookup?.lastOk === false ? "bad" : "ok" }
  ];
  const critical = services.filter((service) => service.state === "bad").length;
  const attention = services.filter((service) => service.state === "off").length;
  const healthy = services.filter((service) => service.state === "ok").length;
  const mode = critical ? "critical" : attention ? "attention" : "ready";
  const title = mode === "critical" ? t("systemCritical") : mode === "attention" ? t("systemAttention") : t("systemReady");
  const body = mode === "critical" ? t("systemCriticalBody", { count: critical }) : mode === "attention" ? t("systemAttentionBody", { count: attention }) : t("systemReadyBody");
  const issueCount = critical + attention;
  const root = $("#overviewBrief");
  root.className = `overview-brief ${mode === "ready" ? "" : mode}`;
  root.innerHTML = `
    <div class="brief-main">
      <span class="brief-icon">${mode === "ready" ? icons.shieldCheck : icons.warning}</span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>
    </div>
    <div class="brief-signals">
      <span class="brief-signal">${escapeHtml(t("healthyServices", { count: healthy }))}</span>
      ${issueCount ? `<span class="brief-signal ${critical ? "bad" : "warn"}">${escapeHtml(t("issuesCount", { count: issueCount }))}</span>` : ""}
      <button class="button compact ghost" type="button" data-scroll-health>${escapeHtml(t("inspectHealth"))}</button>
    </div>`;
}

function renderQuickChannels() {
  const state = app.state || {};
  const channels = [
    { id: "qq", name: "QQ", enabled: state.channels?.qq, hint: t("qqChannelHint"), detail: t("groupsAllowed", { count: state.qq?.allowedGroups?.length || 0 }) },
    { id: "imessage", name: "iMessage", enabled: state.channels?.imessage, hint: t("imessageChannelHint"), detail: t("contactsTrusted", { count: state.imessage?.trustedHandles?.length || 0 }) }
  ];
  $("#quickChannels").innerHTML = channels.map((channel) => `
    <article class="quick-channel">
      <span class="channel-avatar ${channel.id}">${channel.id === "qq" ? icons.qq : icons.imessage}</span>
      <div><h3>${channel.name}</h3><p>${escapeHtml(channel.hint)} · ${escapeHtml(channel.detail)}</p></div>
      <span class="channel-state"><span class="status-dot ${channel.enabled ? "" : "pending"}"></span>${escapeHtml(channel.enabled ? t("enabled") : t("disabled"))}</span>
    </article>`).join("");
}

function renderMaintenance() {
  if (!app.maintenance) return;
  renderOverviewStats();
  renderOverviewBrief();
  renderHealthCards();
  renderQuota();
  renderChannelSettings();
  renderSettings();
}

function renderHealthCards() {
  const h = app.maintenance || {};
  const queue = h.codex?.queue || {};
  const cards = [
    { name: t("oneBot"), icon: icons.oneBot, state: h.oneBot?.ok ? "ok" : "bad", lines: [h.oneBot?.nickname || null, h.oneBot?.selfId ? `QQ ${h.oneBot.selfId}` : null, h.oneBot?.lastError] },
    { name: t("codexCli"), icon: icons.codex, state: h.codex?.pathExists && h.codex?.lastOk !== false ? "ok" : "bad", lines: [h.codex?.pathExists ? t("pathReady") : t("pathMissing"), h.codex?.lastRunAt ? t("lastRun", { time: formatTime(h.codex.lastRunAt) }) : t("neverRun"), t("queueState", { active: queue.active || 0, pending: queue.pending || 0, max: queue.maxPending ?? "∞" }), h.codex?.lastError] },
    { name: "iMessage", icon: icons.imessage, state: !h.channels?.imessage ? "off" : h.imessage?.status === "error" ? "bad" : "ok", lines: [h.channels?.imessage ? t("enabled") : t("disabled"), t("trustedCount", { count: h.imessage?.trustedHandles || 0 }), h.imessage?.lastError] },
    { name: t("remoteExecution"), icon: icons.remote, state: !h.remoteExecution?.enabled ? "off" : h.remoteExecution?.busy ? "busy" : "ok", lines: [h.remoteExecution?.enabled ? t("enabled") : t("disabled"), t("model", { value: h.remoteExecution?.model || t("unknown") }), t("reasoning", { value: h.remoteExecution?.reasoningEffort || t("unknown") })] },
    { name: t("qqChannel"), icon: icons.qq, state: h.channels?.qq ? "ok" : "off", lines: [h.channels?.qq ? t("enabled") : t("disabled"), t("groupsAllowed", { count: h.qq?.allowedGroups || 0 }), t("recentEventsCount", { count: h.qq?.recentEvents || 0 })] },
    { name: t("webLookup"), icon: icons.globe, state: !h.webLookup?.enabled ? "off" : h.webLookup?.lastOk === false ? "bad" : "ok", lines: [h.webLookup?.enabled ? t("enabled") : t("disabled"), t("provider", { value: h.webLookup?.effectiveProvider || t("unknown") }), h.webLookup?.lastQuery ? t("lastQuery", { value: h.webLookup.lastQuery }) : t("noQuery"), h.webLookup?.lastError] }
  ];
  $("#healthGrid").classList.remove("stale");
  $("#healthGrid").innerHTML = cards.map((card) => `
    <article class="health-card ${card.state}">
      <div class="health-title"><div><span class="health-service-icon">${card.icon}</span><h3>${escapeHtml(card.name)}</h3></div><span class="health-badge">${escapeHtml(card.state === "ok" ? t("healthy") : card.state === "bad" ? t("attention") : card.state === "busy" ? t("running") : t("disabled"))}</span></div>
      <div class="health-lines">${card.lines.filter(Boolean).slice(0, 4).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
    </article>`).join("");
}

function renderHealthError(message) {
  $("#healthGrid").classList.add("stale");
  $("#healthGrid").innerHTML = emptyState(t("staleData", { value: message }));
}

function renderQuota() {
  const quota = app.maintenance?.codex?.quota;
  $("#quotaUpdated").textContent = quota?.updatedAt ? t("recordedAt", { time: formatTime(quota.updatedAt) }) : "—";
  if (!quota?.available) {
    $("#quotaOverview").innerHTML = `<div class="quota-empty">${escapeHtml(t("quotaUnavailable"))}</div>`;
    return;
  }
  const windows = [[t("fiveHours"), quota.primary], [t("sevenDays"), quota.secondary]].filter(([, value]) => value);
  $("#quotaOverview").innerHTML = windows.map(([label, value]) => {
    const remaining = clampPercent(value.remainingPercent);
    return `<article class="quota-card"><div class="quota-top"><h3>${escapeHtml(label)}</h3><strong>${escapeHtml(t("remaining", { value: remaining }))}</strong></div><progress max="100" value="${remaining}" aria-label="${escapeHtml(label)}"></progress><p>${escapeHtml(value.resetsAt ? t("resetsAt", { time: formatReset(value.resetsAt) }) : t("noReset"))}</p></article>`;
  }).join("") || `<div class="quota-empty">${escapeHtml(t("quotaUnavailable"))}</div>`;
}

function renderChannelSettings() {
  if (!app.state) return;
  const state = app.state;
  const h = app.maintenance || {};
  $("#qqStatusText").textContent = state.channels?.qq ? t("enabled") : t("disabled");
  $("#imessageStatusText").textContent = state.channels?.imessage ? `${t("enabled")} · ${state.imessage?.status || t("idle")}` : t("disabled");
  $("#qqChannelMeta").innerHTML = [t("groupsAllowed", { count: state.qq?.allowedGroups?.length || 0 }), t("recentEventsCount", { count: state.qq?.events?.length || 0 }), `${t("active")} ${h.qq?.activeGenerations || 0}`].map(metaChip).join("");
  $("#imessageChannelMeta").innerHTML = [t("contactsTrusted", { count: state.imessage?.trustedHandles?.length || 0 }), t("recentEventsCount", { count: state.imessage?.events?.length || 0 }), state.remoteExecution?.enabled ? t("remoteExecution") : t("idle")].map(metaChip).join("");
  renderQqStickerFrequency(state.qq?.humanBehavior?.stickerFrequency || {});
  renderQqAdaptiveLearning(state.qq?.humanBehavior?.adaptiveLearning || {});
  renderQqColdInterest(
    state.qq?.proactive?.coldGroupInterest || {},
    state.qq?.humanBehavior?.adaptiveLearning || {},
    state.qq?.events || []
  );
  renderGroups(state.qq?.allowedGroups || []);
  renderHandles(state.imessage?.trustedHandles || []);
  const replyInput = $("#replyHandleInput");
  if (document.activeElement !== replyInput) replyInput.value = state.imessage?.replyHandle || "";
}

function metaChip(text) { return `<span class="meta-chip">${escapeHtml(text)}</span>`; }

function renderQqStickerFrequency(frequency) {
  const entries = Object.entries(frequency || {}).sort(([left], [right]) => left.localeCompare(right));
  $("#qqStickerFrequency").innerHTML = entries.length ? entries.map(([groupId, item]) => {
    const humanRate = formatRate(item.humanStickerMessageRatio);
    const botRate = formatRate(item.botStickerMessageRatio);
    const plannedRate = formatRate(item.plannedCasualStickerRatio);
    return `<article class="behavior-frequency-item"><strong>${escapeHtml(t("groupLabel", { value: groupId }))}</strong><div><span>${escapeHtml(t("humanStickerRate", { rate: humanRate, count: item.humanSampleSize || 0 }))}</span><span>${escapeHtml(t("botStickerRate", { rate: botRate, count: item.botSampleSize || 0 }))}</span><span>${escapeHtml(t("plannedStickerRate", { rate: plannedRate }))}</span></div></article>`;
  }).join("") : `<p class="token-empty">${escapeHtml(t("noStickerFrequency"))}</p>`;
}

function renderQqAdaptiveLearning(groups) {
  const entries = Object.entries(groups || {}).filter(([, item]) => Number(item.sampleSize || 0) > 0).sort(([left], [right]) => left.localeCompare(right));
  $("#qqAdaptiveLearning").innerHTML = entries.length ? entries.map(([groupId, item]) => {
    const hours = (item.activeHours || []).map((hour) => `${hour}:00`).join(" · ") || "—";
    const guidance = (item.styleGuidance || []).slice(0, 5);
    const review = item.styleReviewSummary || t("adaptiveCollecting");
    const intervals = item.proactiveIntervals || {};
    const cold = item.coldInterest || {};
    const sections = [
      adaptiveDetailSection(t("learningHuman"), [
        t("detailSample", { value: item.sampleSize || 0 }),
        t("detailConfidence", { value: formatRate(item.confidence) }),
        t("detailTextSample", { value: item.textSampleSize || 0 }),
        t("detailAverageChars", { value: item.averageTextChars || 0 }),
        t("detailShortRatio", { value: formatRate(item.shortTextRatio) }),
        t("detailLongRatio", { value: formatRate(item.longTextRatio) }),
        t("detailStickerRatio", { value: formatRate(item.stickerMessageRatio) }),
        t("detailImageRatio", { value: formatRate(item.imageMessageRatio) }),
        t("detailEmojiRatio", { value: formatRate(item.emojiMessageRatio) }),
        t("detailReplyRatio", { value: formatRate(item.replyMessageRatio) }),
        t("detailMentionRatio", { value: formatRate(item.mentionMessageRatio) }),
        t("detailQuestionRatio", { value: formatRate(item.questionMessageRatio) }),
        t("detailBotInteraction", { value: formatRate(item.directBotInteractionRatio) }),
        t("detailBurstRatio", { value: formatRate(item.burstContinuationRatio) }),
        t("detailGap", { value: formatAdaptiveGap(item.medianGapSeconds) }),
        t("detailActiveDays", { value: item.activeDays || 0 }),
        t("detailDailyMessages", { value: item.messagesPerActiveDay || 0 }),
        t("detailCurrentHour", { value: formatRate(item.currentHourShare) }),
        t("detailFirstSeen", { value: formatTime(item.firstSeenAt) }),
        t("detailLastHuman", { value: formatTime(item.lastMessageAt) })
      ]),
      adaptiveDetailSection(t("learningBot"), [
        t("detailBotReplies", { value: item.botReplyCount || 0 }),
        t("detailBotChars", { value: item.averageBotReplyChars || 0 }),
        t("detailBotSticker", { value: formatRate(item.botStickerReplyRatio) }),
        t("detailBotBubbles", { value: formatRate(item.botMultiBubbleReplyRatio) }),
        t("detailBotFollowup", { value: formatRate(item.botReplyFollowUpRatio) }),
        t("detailTrackingStart", { value: formatTime(item.botTrackingStartedAt) }),
        t("detailLastBot", { value: formatTime(item.lastBotReplyAt) })
      ]),
      adaptiveDetailSection(t("learningReview"), [
        t("detailReviewSamples", { human: item.styleHumanSampleSize || 0, bot: item.styleBotSampleSize || 0 }),
        t("detailLastReview", { value: formatTime(item.lastStyleReviewAt) }),
        t("detailNextReview", { value: formatTime(item.nextStyleReviewAt) }),
        review,
        ...guidance.map((rule) => `↳ ${rule}`)
      ]),
      adaptiveDetailSection(t("learningInterest"), [
        t("detailOrdinaryInterest", { messages: intervals.judgeEveryMessages ?? "—", minutes: intervals.judgeEveryMinutes ?? "—" }),
        t("detailInterestReason", { value: formatAdaptiveReason(intervals.reason) }),
        t("detailColdIdle", { idle: cold.idleHours ?? "—", required: cold.idleHoursRequired ?? "—" }),
        t("detailColdReason", { value: formatAdaptiveReason(cold.reason) }),
        t("detailColdThreshold", { value: formatTime(cold.thresholdReachedAt) }),
        t("detailColdCheck", { value: formatTime(cold.lastCheckAt || item.lastColdProactiveCheckAt) }),
        t("detailColdSent", { value: formatTime(cold.lastProactiveAt || item.lastColdProactiveAt) })
      ])
    ].join("");
    return `<details class="behavior-frequency-item adaptive-learning-item"><summary><span><strong>${escapeHtml(t("groupLabel", { value: groupId }))}</strong><small>${escapeHtml(formatActivityLevel(item.activityLevel))}</small></span><span class="adaptive-summary-meta">${escapeHtml(t("adaptiveSamples", { count: item.sampleSize || 0, members: item.learnedMembers || 0 }))}</span></summary><div class="adaptive-summary-chips"><span>${escapeHtml(t("adaptiveHours", { hours }))}</span>${item.coldProactiveAwaitingHuman ? `<span class="status-warn">${escapeHtml(t("adaptiveColdWaiting"))}</span>` : ""}</div><div class="adaptive-detail-grid">${sections}</div></details>`;
  }).join("") : `<p class="token-empty">${escapeHtml(t("noAdaptiveLearning"))}</p>`;
}

function adaptiveDetailSection(title, values) {
  return `<section class="adaptive-detail-section"><h4>${escapeHtml(title)}</h4><div>${values.filter(Boolean).map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</div></section>`;
}

function renderQqColdInterest(policy, groups, events) {
  const entries = Object.entries(groups || {}).filter(([, item]) => Number(item.sampleSize || 0) > 0).sort(([left], [right]) => left.localeCompare(right));
  const policyText = t("coldInterestPolicy", { hours: policy.allowedHours || "09:00-23:00", retry: policy.retryCooldownHours ?? 3 });
  const groupCards = entries.map(([groupId, item]) => {
    const cold = item.coldInterest || {};
    const statusClass = cold.eligible ? "ready" : cold.awaitingHuman ? "waiting" : "idle";
    return `<article class="cold-interest-item ${statusClass}"><div class="cold-interest-head"><strong>${escapeHtml(t("groupLabel", { value: groupId }))}</strong><span>${escapeHtml(formatAdaptiveReason(cold.reason))}</span></div><div class="cold-interest-metrics"><span>${escapeHtml(t("detailColdIdle", { idle: cold.idleHours ?? "—", required: cold.idleHoursRequired ?? "—" }))}</span><span>${escapeHtml(t("detailLastHuman", { value: formatTime(cold.lastActivityAt || item.lastMessageAt) }))}</span><span>${escapeHtml(t("detailColdThreshold", { value: formatTime(cold.thresholdReachedAt) }))}</span><span>${escapeHtml(t("detailColdCheck", { value: formatTime(cold.lastCheckAt || item.lastColdProactiveCheckAt) }))}</span></div></article>`;
  }).join("");
  const decisions = (events || []).filter((record) => record.event?.coldProactive).slice(0, 5);
  const recent = decisions.length
    ? `<div class="cold-decision-list">${decisions.map((record) => `<article><span>${escapeHtml(t("groupLabel", { value: record.event?.groupId || "—" }))} · ${escapeHtml(formatColdDecisionOutcome(record))}</span><time>${escapeHtml(formatRelative(record.receivedAt))}</time>${record.reply ? `<p>${escapeHtml(record.reply)}</p>` : `<p>${escapeHtml(record.decision?.reason || formatAdaptiveReason(record.decision?.coldInterest?.reason))}</p>`}</article>`).join("")}</div>`
    : `<p class="token-empty">${escapeHtml(t("noColdInterestDecisions"))}</p>`;
  $("#qqColdInterest").innerHTML = `<p class="cold-interest-policy">${escapeHtml(policyText)}</p>${groupCards || `<p class="token-empty">${escapeHtml(t("noColdInterest"))}</p>`}<div class="cold-recent-head"><strong>${escapeHtml(t("coldInterestRecent"))}</strong></div>${recent}`;
}

function formatActivityLevel(value) {
  const labels = app.language === "en"
    ? { high: "high activity", typical: "typical activity", low: "low activity", unknown: "learning" }
    : { high: "高活跃", typical: "一般活跃", low: "低活跃", unknown: "学习中" };
  return labels[value] || labels.unknown;
}

function formatAdaptiveReason(value) {
  const zh = {
    learning_sample_low: "学习样本不足", outside_social_hours: "不在开放时段", no_human_context: "缺少真人上下文",
    awaiting_human_after_cold_proactive: "等待真人接话", cold_check_cooldown: "判断冷却中", group_not_cold: "尚未达到沉默时长",
    bot_spoke_recently: "Bot 最近说过话", cold_group_time_due: "已到判断时间", ordinary_interest_pending: "普通兴趣消息待判断",
    reply_queue_pending: "回复队列处理中", reply_generation_active: "当前正在生成回复", activity_high: "群当前高活跃",
    activity_typical: "群当前一般活跃", activity_low: "群当前低活跃", activity_unknown: "活跃度仍在学习"
  };
  const en = {
    learning_sample_low: "learning sample is low", outside_social_hours: "outside allowed hours", no_human_context: "no human context",
    awaiting_human_after_cold_proactive: "waiting for a human", cold_check_cooldown: "decision cooldown", group_not_cold: "quiet threshold not reached",
    bot_spoke_recently: "Bot spoke recently", cold_group_time_due: "ready for a decision", ordinary_interest_pending: "ordinary interest is pending",
    reply_queue_pending: "reply queue is pending", reply_generation_active: "reply generation is active", activity_high: "currently high activity",
    activity_typical: "currently typical activity", activity_low: "currently low activity", activity_unknown: "activity still learning"
  };
  return (app.language === "en" ? en : zh)[value] || value || "—";
}

function formatColdDecisionOutcome(record) {
  if (record.error || record.send?.ok === false) return app.language === "en" ? "failed" : "失败";
  if (record.decision?.superseded) return app.language === "en" ? "cancelled by new activity" : "因新消息取消";
  if (record.reply) return app.language === "en" ? "sent" : "已发送";
  return app.language === "en" ? "stayed silent" : "保持沉默";
}

function formatAdaptiveGap(seconds) {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? formatDuration(value * 1000) : "—";
}

function formatRate(value) {
  const rate = Number(value || 0) * 100;
  return rate >= 10 ? rate.toFixed(0) : rate.toFixed(1);
}

function renderGroups(groups) {
  $("#groupCount").textContent = String(groups.length);
  $("#groupList").innerHTML = groups.length ? groups.map((id) => `<span class="token-item"><code>${escapeHtml(id)}</code><button type="button" data-remove-group="${escapeHtml(id)}" aria-label="${escapeHtml(t("removeGroupTitle"))}">×</button></span>`).join("") : `<p class="token-empty">${escapeHtml(t("noGroups"))}</p>`;
}

function renderHandles(handles) {
  $("#handleCount").textContent = String(handles.length);
  $("#handleList").innerHTML = handles.length ? handles.map((handle) => `<span class="token-item"><code>${escapeHtml(handle)}</code><button type="button" data-remove-handle="${escapeHtml(handle)}" aria-label="${escapeHtml(t("removeContactTitle"))}">×</button></span>`).join("") : `<p class="token-empty">${escapeHtml(t("noContacts"))}</p>`;
}

function renderEvents() {
  if (!app.state) return;
  const qqEvents = app.state.qq?.events || [];
  const imessageEvents = app.state.imessage?.events || [];
  $("#qqEventCount").textContent = String(qqEvents.length);
  $("#imessageEventCount").textContent = String(imessageEvents.length);
  $("#qqEvents").innerHTML = qqEvents.length ? qqEvents.slice(0, 12).map(renderQqEvent).join("") : emptyState(t("noEvents"));
  $("#imessageEvents").innerHTML = imessageEvents.length ? imessageEvents.slice(0, 12).map(renderIMessageEvent).join("") : emptyState(t("noEvents"));
}

function renderQqEvent(record) {
  const event = record.event || {};
  const ok = Boolean(record.decision?.ok);
  return `<article class="event-card"><div class="event-card-head"><strong>${escapeHtml(event.senderLabel || event.senderName || "QQ")} · ${escapeHtml(ok ? t("replied") : t("ignored"))}</strong><span>${escapeHtml(formatRelative(record.receivedAt))}</span></div><p>${escapeHtml(event.text || "—")}</p>${record.reply ? `<p class="event-reply">${escapeHtml(t("replyLabel"))}${escapeHtml(record.reply)}</p>` : ""}</article>`;
}

function renderIMessageEvent(record) {
  const event = record.event || {};
  const attachments = event.attachments?.length ? ` · ${t("attachmentCount", { count: event.attachments.length })}` : "";
  return `<article class="event-card"><div class="event-card-head"><strong>${escapeHtml(event.handle || "iMessage")} · ${escapeHtml(record.trusted ? t("trusted") : t("unauthorized"))}</strong><span>${escapeHtml(formatRelative(record.receivedAt))}</span></div><p>${escapeHtml(event.text || "—")}${escapeHtml(attachments)}</p>${record.reply ? `<p class="event-reply">${escapeHtml(t("replyLabel"))}${escapeHtml(record.reply)}</p>` : ""}</article>`;
}

function renderRecentTimeline() {
  if (!app.state) return;
  const qq = (app.state.qq?.events || []).map((record) => ({ kind: "qq", at: record.receivedAt, title: record.event?.senderLabel || record.event?.senderName || "QQ", text: record.reply || record.event?.text || "" }));
  const imessage = (app.state.imessage?.events || []).map((record) => ({ kind: "imessage", at: record.receivedAt, title: record.event?.handle || "iMessage", text: record.reply || record.event?.text || "" }));
  const rows = [...qq, ...imessage].sort((a, b) => Date.parse(b.at || "") - Date.parse(a.at || "")).slice(0, 7);
  $("#recentTimeline").innerHTML = rows.length ? rows.map((row) => `<article class="timeline-item"><span class="timeline-avatar ${row.kind}">${row.kind === "qq" ? icons.qq : icons.imessage}</span><div class="timeline-copy"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.text || "—")}</p></div><time class="timeline-time">${escapeHtml(formatRelative(row.at))}</time></article>`).join("") : emptyState(t("noRecentActivity"));
}

function renderMemory() {
  if (!app.memory) return;
  rememberOpenMemoryGroups();
  $$('[data-memory-tab]').forEach((button) => {
    const active = button.dataset.memoryTab === app.activeMemoryTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active) $("#memoryView").setAttribute("aria-labelledby", button.id);
  });
  let html = "";
  if (app.activeMemoryTab === "unified") html = renderUnifiedMemory(app.memory.unified || {});
  else if (app.activeMemoryTab === "qq") html = renderQqMemory(app.memory.qq || {});
  else if (app.activeMemoryTab === "imessage") html = renderGroupedMemory(app.memory.imessage || [], "imessage");
  else html = renderRemoteMemory(app.memory.remoteExecution || {});
  $("#memoryView").innerHTML = html || emptyState(t("noMemory"));
}

function renderUnifiedMemory(memory) {
  const entries = filterMemoryEntries(memory.entries || []);
  const counts = countUnifiedEntries(memory.entries || []);
  const settings = memory.settings || {};
  const stateText = Object.values(memory.currentState || {}).filter(Boolean).join(" · ");
  return `<div class="memory-overview">
    <div class="memory-setting-grid">
      ${memorySetting("autoWriteOnSkillRecall", t("autoSkillMemory"), t("autoSkillHint"), Boolean(settings.autoWriteOnSkillRecall))}
      ${memorySetting("autoWriteOnIMessageRecall", t("autoIMessageMemory"), t("autoIMessageHint"), settings.autoWriteOnIMessageRecall !== false)}
      ${memorySetting("manualHandoffCommand", t("manualHandoff"), t("manualHandoffHint"), settings.manualHandoffCommand !== false)}
    </div>
    <div class="memory-count-grid">
      ${memoryCount(memory.entries?.length || 0, t("unifiedEntries"))}${memoryCount(counts.handoff, t("handoffs"))}${memoryCount(counts.idea, t("ideas"))}${memoryCount(counts.projectNote, t("projects"))}${memoryCount(counts.openLoop, t("todos"))}${memoryCount(counts.note + counts.dailyState, t("notes"))}
    </div>
    <article class="memory-state-card"><h3>${escapeHtml(t("recentState"))}</h3><p>${escapeHtml(stateText || t("noState"))}</p></article>
    ${memory.latestHandoff?.summary ? `<article class="memory-state-card"><h3>${escapeHtml(t("latestHandoff"))}</h3><p>${escapeHtml(memory.latestHandoff.summary)}</p></article>` : ""}
    <div class="memory-section-head"><h3>${escapeHtml(t("unifiedEntries"))}</h3><p>${escapeHtml(memory.updatedAt ? t("updated", { time: formatTime(memory.updatedAt) }) : "")}</p></div>
    <div class="memory-entries">${entries.length ? entries.map((entry) => renderMemoryEntry({ role: `${formatUnifiedType(entry.type)} · ${entry.topic || ""}`, text: entry.summary, at: entry.updatedAt })).join("") : emptyState(t("noMemory"))}</div>
  </div>`;
}

function memorySetting(key, title, hint, checked) {
  return `<label class="memory-setting"><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(hint)}</p></div><input type="checkbox" data-unified-setting="${key}" ${checked ? "checked" : ""} /></label>`;
}
function memoryCount(value, label) { return `<div class="memory-count"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }

function renderQqMemory(qq) {
  const grouped = new Map();
  const addEntries = (group, section) => {
    const id = String(group.id || "");
    if (!id) return;
    const existing = grouped.get(id) || {
      id,
      title: group.title || id,
      count: 0,
      entries: [],
      scope: "qq"
    };
    const entries = (group.entries || []).map((entry) => ({
      ...entry,
      role: entry.role ? `${section} · ${entry.role}` : section
    }));
    existing.entries.push(...entries);
    existing.count = existing.entries.length;
    existing.clearTitle = t("allRelatedMemory", { value: existing.title });
    grouped.set(id, existing);
  };
  for (const group of qq.lightweight || []) addEntries(group, t("memoryTitle"));
  for (const group of qq.recent || []) addEntries(group, t("recentActivity"));
  for (const group of qq.personas || []) addEntries(group, t("personas"));
  for (const group of qq.conversationMemory?.groups || []) {
    const entries = [group.impression, group.botThought, ...(group.recentTopics || []).map((topic) => topic.summary || topic.label)].filter(Boolean).map((text) => ({ text }));
    if (entries.length) addEntries({ id: group.id, title: group.title, entries }, t("conversationImpressions"));
  }
  for (const chat of qq.conversationMemory?.privateChats || []) {
    const entries = [
      chat.impression,
      chat.botThought,
      ...(chat.recentTopics || []).map((topic) => topic.summary || topic.label || topic.text),
      ...(chat.recentConversations || []).map((item) => item.summary || item.text)
    ].filter(Boolean).map((text) => ({ text }));
    if (entries.length) addEntries({ id: `private:${chat.id}`, title: chat.title, entries }, t("conversationImpressions"));
  }
  const groups = [...grouped.values()];
  if (qq.publicMemory?.entries?.length) groups.unshift({ id: "", title: t("publicMemory"), count: qq.publicMemory.entries.length, entries: qq.publicMemory.entries, scope: "qqPublicMemory" });
  return renderGroupedMemory(groups, "qq");
}

function renderGroupedMemory(groups, fallbackScope) {
  const query = app.memoryQuery.trim().toLowerCase();
  const visible = groups.map((group) => {
    const entries = filterMemoryEntries(group.entries || []);
    const groupMatches = !query || `${group.title || ""} ${group.id || ""}`.toLowerCase().includes(query);
    return { ...group, entries: groupMatches ? group.entries || [] : entries };
  }).filter((group) => group.entries.length > 0 || (!query && Number(group.count || 0) === 0));
  if (!visible.length) return emptyState(t("noMemory"));
  return `<div class="memory-groups">${visible.map((group) => {
    const key = `${group.scope || fallbackScope}:${group.id}`;
    return `<details class="memory-group" data-memory-key="${escapeHtml(key)}" ${app.openMemoryGroups.has(key) ? "open" : ""}><summary><strong>${escapeHtml(group.title || group.id)}</strong><span>${escapeHtml(t("entriesCount", { count: group.entries.length }))}</span><button class="mini-danger" type="button" data-clear-memory="${escapeHtml(group.scope || fallbackScope)}" data-memory-id="${escapeHtml(group.id || "")}" data-memory-title="${escapeHtml(group.clearTitle || group.title || group.id)}">${escapeHtml(t("clear"))}</button></summary><div class="memory-entries">${group.entries.length ? group.entries.slice().reverse().map(renderMemoryEntry).join("") : emptyState(t("noMemory"))}</div></details>`;
  }).join("")}</div>`;
}

function renderRemoteMemory(remote) {
  const entries = filterMemoryEntries(remote.entries || []);
  return `<div class="memory-section-head"><h3>${escapeHtml(t("remoteExecution"))}</h3><button class="mini-danger" type="button" data-clear-memory="remoteExecution" data-memory-title="${escapeHtml(t("remoteExecution"))}">${escapeHtml(t("clear"))}</button></div><div class="memory-entries">${entries.length ? entries.slice().reverse().map(renderMemoryEntry).join("") : emptyState(t("noMemory"))}</div>`;
}

function renderMemoryEntry(entry) {
  const role = entry.role === "assistant" ? t("roleAssistant") : entry.role === "user" ? t("roleUser") : entry.role || "";
  return `<article class="memory-entry"><div class="meta">${escapeHtml(role)}${entry.at ? ` · ${escapeHtml(formatTime(entry.at))}` : ""}</div><p>${escapeHtml(entry.text || entry.summary || "")}</p></article>`;
}

function filterMemoryEntries(entries) {
  const query = app.memoryQuery.trim().toLowerCase();
  if (!query) return entries;
  return entries.filter((entry) => `${entry.role || ""} ${entry.text || ""} ${entry.summary || ""} ${entry.topic || ""}`.toLowerCase().includes(query));
}

function rememberOpenMemoryGroups() {
  $$('.memory-group[data-memory-key]', $("#memoryView")).forEach((group) => {
    if (group.open) app.openMemoryGroups.add(group.dataset.memoryKey); else app.openMemoryGroups.delete(group.dataset.memoryKey);
  });
}

function countUnifiedEntries(entries) {
  const counts = { handoff: 0, idea: 0, projectNote: 0, openLoop: 0, dailyState: 0, note: 0 };
  entries.forEach((entry) => { counts[entry.type] = (counts[entry.type] || 0) + 1; });
  return counts;
}

function formatUnifiedType(type) {
  return { handoff: t("handoffs"), idea: t("ideas"), projectNote: t("projects"), openLoop: t("todos"), dailyState: t("recentState"), note: t("notes") }[type] || type || t("notes");
}

function renderLogs({ preserveFocus = false } = {}) {
  if (!app.logs) return;
  const summary = app.logs.summary || {};
  $("#logSummary").innerHTML = [
    { value: summary.total || 0, label: t("totalLogs"), icon: icons.logs },
    { value: summary.traceCount || 0, label: t("traces"), kind: "violet", icon: icons.trace },
    { value: formatMs(summary.duration?.p95Ms), label: t("p95Latency"), kind: "sky", icon: icons.clock },
    { value: formatMs(summary.duration?.maxMs), label: t("maxLatency"), kind: "warn", icon: icons.activity }
  ].map(statCard).join("");
  $("#logMatchText").textContent = t("matchedLogs", { visible: app.logs.entries?.length || 0, matched: app.logs.matched || 0 });
  updateLogCategories(summary.byCategory || {});
  const entries = app.logs.entries || [];
  if (!(preserveFocus && document.activeElement?.closest?.("#logStream"))) {
    $("#logStream").innerHTML = entries.length ? entries.slice().reverse().map((entry, index) => renderLogEntry(entry, index)).join("") : emptyState(t("noLogs"));
  }
}

function renderLogEntry(entry, index) {
  const duration = getLogDuration(entry);
  return `<button class="log-entry" type="button" data-log-index="${index}"><time class="log-time">${escapeHtml(formatClock(entry.ts))}</time><span class="level-badge ${escapeHtml(entry.level)}">${escapeHtml(entry.level)}</span><span class="log-category">${escapeHtml(entry.category || "system")}</span><span class="log-message">${escapeHtml(entry.message || "")}</span><span class="log-duration">${escapeHtml(duration == null ? "" : formatMs(duration))}</span></button>`;
}

function updateLogCategories(categories) {
  const select = $("#logCategory");
  const current = select.value;
  for (const name of Object.keys(categories)) app.logCategories.add(name);
  if (current) app.logCategories.add(current);
  const names = [...app.logCategories].sort();
  select.innerHTML = `<option value="">${escapeHtml(t("allCategories"))}</option>${names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}${categories[name] == null ? "" : ` (${escapeHtml(categories[name])})`}</option>`).join("")}`;
  if (names.includes(current)) select.value = current;
}

function getLogDuration(entry) {
  const details = entry.details || {};
  const values = [details.totalDurationMs, details.durationMs, details.generationDurationMs, details.sendDurationMs].map(Number).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function renderSettings() {
  setTheme(app.theme);
  $("#autoRefreshToggle").checked = app.autoRefresh;
  $("#refreshInterval").value = String(app.refreshSeconds);
  const endpoint = HUB || location.origin;
  $("#hubEndpointValue").textContent = endpoint;
  $("#sidebarEndpoint").textContent = endpoint.replace(/^https?:\/\//, "");
  const state = app.state || {};
  const maintenance = app.maintenance || {};
  $("#runtimeFacts").innerHTML = [
    [state.ai?.model || t("unknown"), t("runtimeModel")], [state.ai?.reasoningEffort || t("unknown"), t("runtimeReasoning")], [maintenance.startedAt ? formatTime(maintenance.startedAt) : "—", t("runtimeStarted")]
  ].map(([value, label]) => `<div class="runtime-fact"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

async function mutate(action, { control, success = t("saved") } = {}) {
  if (control) control.disabled = true;
  try {
    const result = await action();
    showToast(success, "success");
    return result;
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  } finally {
    if (control) control.disabled = false;
  }
}

async function setChannel(channel, enabled, control) {
  const previous = !enabled;
  try {
    await mutate(() => api("/api/channel", { method: "POST", body: JSON.stringify({ channel, enabled }) }), { control, success: t("channelUpdated") });
    await refreshState({ quiet: true });
  } catch {
    control.checked = previous;
  }
}

async function saveGroups(groups, control) {
  await mutate(() => api("/api/qq/groups", { method: "POST", body: JSON.stringify({ allowedGroups: groups }) }), { control });
  await refreshState({ quiet: true });
}

async function saveHandles(handles, control) {
  await mutate(() => api("/api/imessage/trusted-handles", { method: "POST", body: JSON.stringify({ trustedHandles: handles }) }), { control });
  await refreshState({ quiet: true });
}

function confirmAction(title, message) {
  const dialog = $("#confirmDialog");
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true }));
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("#toastRegion").append(toast);
  setTimeout(() => toast.remove(), 3_500);
}

function emptyState(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }

function formatTime(value) {
  if (value == null || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(app.language === "en" ? "en" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
function formatClock(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function formatRelative(value) {
  const ms = Date.now() - Date.parse(value || "");
  if (!Number.isFinite(ms)) return "—";
  if (ms < 60_000) return app.language === "en" ? "now" : "刚刚";
  if (ms < 3_600_000) return app.language === "en" ? `${Math.floor(ms / 60_000)}m` : `${Math.floor(ms / 60_000)} 分钟前`;
  if (ms < 86_400_000) return app.language === "en" ? `${Math.floor(ms / 3_600_000)}h` : `${Math.floor(ms / 3_600_000)} 小时前`;
  return formatTime(value);
}
function formatReset(seconds) { const date = new Date(Number(seconds) * 1000); return Number.isNaN(date.getTime()) ? "—" : formatTime(date); }
function formatDuration(ms) { if (!Number.isFinite(ms) || ms < 0) return ""; const hours = Math.floor(ms / 3_600_000); const days = Math.floor(hours / 24); return days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h` : `${Math.max(1, Math.floor(ms / 60_000))}m`; }
function formatMs(value) { const number = Number(value); if (!Number.isFinite(number)) return "—"; return number >= 1000 ? `${(number / 1000).toFixed(number >= 10_000 ? 0 : 1)}s` : `${Math.round(number)}ms`; }
function formatNumber(value) { return Number(value || 0).toLocaleString(app.language === "en" ? "en-US" : "zh-CN"); }
function sumValues(value) { return Object.values(value || {}).reduce((sum, item) => sum + (Number(item) || 0), 0); }
function clampPercent(value) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

const icons = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h4l2-6 4 11 2-6h6"/></svg>',
  activity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V9m5 9V5m5 13v-7m5 7V3"/></svg>',
  memory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7c0-2 3-3 7-3s7 1 7 3-3 3-7 3-7-1-7-3Zm0 0v5c0 2 3 3 7 3s7-1 7-3V7m-14 5v5c0 2 3 3 7 3s7-1 7-3v-5"/></svg>',
  logs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14M5 10h14M5 15h9M5 20h6"/></svg>',
  trace: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a3 3 0 0 1 3 3v6m-6 3h7"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 4.8-3.1 8.3-8 10-4.9-1.7-8-5.2-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
  warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.4 2.7 18a1.5 1.5 0 0 0 1.3 2.2h16a1.5 1.5 0 0 0 1.3-2.2L13.7 4.4a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3.2v.1"/></svg>',
  qq: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10.5 22.5c-2.6-1.8-3.2-5.4-1.3-7.7-.2-5.1 2.4-8.8 6.8-8.8s7 3.7 6.8 8.8c1.9 2.3 1.3 5.9-1.3 7.7M11 18c.7 5.6 9.3 5.6 10 0M12.5 26l1.8-3m5.2 3-1.8-3"/></svg>',
  imessage: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 15.5C7 10.8 11 7 16 7s9 3.8 9 8.5S21 24 16 24c-1.5 0-3-.4-4.2-1l-4.3 2 1.2-4.1A8.2 8.2 0 0 1 7 15.5Z"/><path d="M12 15.5h.1m3.9 0h.1m3.9 0h.1"/></svg>',
  oneBot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M9 7V5m6 2V5M8 12h.1m7.9 0h.1M9 16h6"/></svg>',
  codex: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5-6 7 6 7m6-14 6 7-6 7m1-16-8 18"/></svg>',
  remote: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-5-10 3-3m0 0v3m0-3H7"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/></svg>',
  overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/></svg>',
  channels: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8m-8 3h5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2-.7Z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 1 0 .1 7M20 3v5h-5"/></svg>',
  theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/></svg>',
  raw: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5-5 7 5 7m8-14 5 7-5 7m-2-16-4 18"/></svg>',
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/></svg>'
};

function getCommands() {
  return [
    { id: "view-overview", label: t("navOverview"), hint: t("actionOverviewHint"), icon: icons.overview, keywords: "dashboard home status 总览 首页 状态" },
    { id: "view-channels", label: t("navChannels"), hint: t("actionChannelsHint"), icon: icons.channels, keywords: "qq imessage group contact 通道 群 联系人" },
    { id: "view-memory", label: t("navMemory"), hint: t("actionMemoryHint"), icon: icons.memory, keywords: "context recall search 记忆 上下文 搜索" },
    { id: "view-activity", label: t("navActivity"), hint: t("actionLogsHint"), icon: icons.logs, keywords: "logs trace debug 日志 追踪 调试" },
    { id: "view-settings", label: t("navSettings"), hint: t("actionSettingsHint"), icon: icons.settings, keywords: "preferences language refresh 设置 主题 语言" },
    { id: "refresh", label: t("actionRefresh"), hint: t("actionRefreshHint"), icon: icons.refresh, keywords: "reload sync 刷新 同步" },
    { id: "health", label: t("actionHealth"), hint: t("actionHealthHint"), icon: icons.pulse, keywords: "diagnose service status 检查 健康 服务" },
    { id: "theme", label: t("actionTheme"), hint: t("actionThemeHint"), icon: icons.theme, keywords: "dark light appearance 深色 明亮 外观" },
    { id: "raw", label: t("actionApi"), hint: t("actionApiHint"), icon: icons.raw, keywords: "api json state raw 原始 状态" },
    { id: "add-group", label: t("actionAddGroup"), hint: t("actionAddGroupHint"), icon: icons.add, keywords: "qq allowlist whitelist 群 白名单 添加" },
    { id: "add-contact", label: t("actionAddContact"), hint: t("actionAddContactHint"), icon: icons.add, keywords: "imessage trusted phone email 联系人 手机 邮箱" }
  ];
}

function filteredCommands() {
  const query = $("#commandSearch").value.trim().toLowerCase();
  if (!query) return getCommands();
  return getCommands().filter((command) => `${command.label} ${command.hint} ${command.keywords}`.toLowerCase().includes(query));
}

function renderCommands() {
  const commands = filteredCommands();
  app.commandIndex = Math.max(0, Math.min(app.commandIndex, Math.max(0, commands.length - 1)));
  const results = $("#commandResults");
  results.innerHTML = commands.length ? commands.map((command, index) => `
    <button id="command-${escapeHtml(command.id)}" class="command-item ${index === app.commandIndex ? "active" : ""}" type="button" role="option" aria-selected="${index === app.commandIndex}" data-command-id="${escapeHtml(command.id)}">
      <span class="command-icon">${command.icon}</span>
      <span class="command-copy"><strong>${escapeHtml(command.label)}</strong><span>${escapeHtml(command.hint)}</span></span>
      <span class="command-key" aria-hidden="true">›</span>
    </button>`).join("") : `<div class="command-empty">${escapeHtml(t("noMatchingActions"))}</div>`;
  const active = commands[app.commandIndex];
  if (active) $("#commandSearch").setAttribute("aria-activedescendant", `command-${active.id}`); else $("#commandSearch").removeAttribute("aria-activedescendant");
}

function openCommands() {
  const dialog = $("#commandDialog");
  if (dialog.open) return;
  $("#commandSearch").value = "";
  app.commandIndex = 0;
  renderCommands();
  dialog.showModal();
  requestAnimationFrame(() => $("#commandSearch").focus());
}

function moveCommandSelection(direction) {
  const commands = filteredCommands();
  if (!commands.length) return;
  app.commandIndex = (app.commandIndex + direction + commands.length) % commands.length;
  renderCommands();
  $("#commandResults").querySelector(".command-item.active")?.scrollIntoView({ block: "nearest" });
}

async function runCommand(id) {
  $("#commandDialog").close();
  if (id.startsWith("view-")) {
    setView(id.slice(5), { focus: true });
    return;
  }
  if (id === "refresh") { await refreshView().catch(() => undefined); return; }
  if (id === "health") {
    setView("overview", { focus: false });
    await refreshMaintenance({ force: true }).catch(() => undefined);
    $("#healthGrid").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    return;
  }
  if (id === "theme") {
    const dark = app.theme === "dark" || (app.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(dark ? "light" : "dark");
    return;
  }
  if (id === "raw") { await openApi(); return; }
  if (id === "add-group" || id === "add-contact") {
    setView("channels", { focus: false });
    requestAnimationFrame(() => $(id === "add-group" ? "#groupInput" : "#handleInput").focus());
  }
}

function renderInitialShell() {
  if (app.state || app.maintenance) return;
  $("#overviewStats").innerHTML = Array.from({ length: 4 }, () => `<article class="stat-card loading"><span class="stat-icon skeleton"></span><strong class="skeleton"></strong><p class="skeleton"></p></article>`).join("");
  $("#overviewBrief").className = "overview-brief loading";
  $("#overviewBrief").innerHTML = `<div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>`;
  $("#quickChannels").innerHTML = Array.from({ length: 2 }, () => `<article class="quick-channel"><span class="channel-avatar skeleton"></span><div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line"></div></div></article>`).join("");
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) { setView(nav.dataset.view, { focus: true }); return; }
  const go = event.target.closest("[data-go-view]");
  if (go) { setView(go.dataset.goView, { focus: true }); return; }
  const featureLogs = event.target.closest("[data-open-feature-logs]");
  if (featureLogs) {
    const category = featureLogs.dataset.openFeatureLogs || "";
    setView("activity", { focus: false });
    if (category) {
      app.logCategories.add(category);
      updateLogCategories({});
      $("#logCategory").value = category;
    }
    $("#logLevel").value = "";
    $("#logSlow").value = "";
    $("#logQuery").value = featureLogs.dataset.logQuery || "";
    await refreshLogs().catch(() => undefined);
    return;
  }
  const scrollHealth = event.target.closest("[data-scroll-health]");
  if (scrollHealth) { $("#healthGrid").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); return; }
  const removeGroup = event.target.closest("[data-remove-group]");
  if (removeGroup && app.state) {
    const id = removeGroup.dataset.removeGroup;
    if (await confirmAction(t("removeGroupTitle"), t("removeGroupMessage", { value: id }))) {
      await saveGroups((app.state.qq?.allowedGroups || []).filter((item) => item !== id), removeGroup).catch(() => undefined);
    }
    return;
  }
  const removeHandle = event.target.closest("[data-remove-handle]");
  if (removeHandle && app.state) {
    const handle = removeHandle.dataset.removeHandle;
    if (await confirmAction(t("removeContactTitle"), t("removeContactMessage", { value: handle }))) {
      await saveHandles((app.state.imessage?.trustedHandles || []).filter((item) => item !== handle), removeHandle).catch(() => undefined);
    }
    return;
  }
  const clear = event.target.closest("[data-clear-memory]");
  if (clear) {
    event.preventDefault();
    const title = clear.dataset.memoryTitle || clear.dataset.memoryId || clear.dataset.clearMemory;
    if (await confirmAction(t("clearMemoryTitle"), t("clearMemoryMessage", { value: title }))) {
      await mutate(() => api("/api/memory/clear", { method: "POST", body: JSON.stringify({ scope: clear.dataset.clearMemory, id: clear.dataset.memoryId || "" }) }), { control: clear, success: t("memoryCleared") }).catch(() => undefined);
      await refreshMemory({ quiet: true });
    }
    return;
  }
  const logButton = event.target.closest("[data-log-index]");
  if (logButton && app.logs) {
    const entries = [...(app.logs.entries || [])].reverse();
    app.selectedLog = entries[Number(logButton.dataset.logIndex)] || null;
    $("#logDetailTitle").textContent = t("logDetail");
    $("#logDetailContent").textContent = JSON.stringify(app.selectedLog, null, 2);
    $("#logDetailDialog").showModal();
  }
});

$("#commandTrigger").addEventListener("click", openCommands);
$("#commandClose").addEventListener("click", () => $("#commandDialog").close());
$("#commandDialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
$("#commandSearch").addEventListener("input", () => { app.commandIndex = 0; renderCommands(); });
$("#commandSearch").addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveCommandSelection(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Enter") {
    const command = filteredCommands()[app.commandIndex];
    if (command) { event.preventDefault(); void runCommand(command.id); }
  }
});
$("#commandResults").addEventListener("click", (event) => {
  const command = event.target.closest("[data-command-id]");
  if (command) void runCommand(command.dataset.commandId);
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if ($("#commandDialog").open) $("#commandDialog").close(); else openCommands();
  }
});

$("#refreshButton").addEventListener("click", () => refreshView().catch(() => undefined));
$("#offlineRetry").addEventListener("click", () => refreshView().catch(() => undefined));
$("#refreshHealth").addEventListener("click", () => refreshMaintenance({ force: true }).catch(() => undefined));
$("#refreshMemory").addEventListener("click", () => refreshMemory().catch(() => undefined));
$("#refreshLogs").addEventListener("click", () => refreshLogs().catch(() => undefined));
$("#qqToggle").addEventListener("change", (event) => setChannel("qq", event.target.checked, event.target));
$("#imessageToggle").addEventListener("change", (event) => setChannel("imessage", event.target.checked, event.target));
for (const selector of ["#groupInput", "#handleInput"]) $(selector).addEventListener("input", (event) => event.target.removeAttribute("aria-invalid"));

$("#addGroupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#groupInput");
  const value = input.value.trim();
  if (!/^\d{4,20}$/.test(value)) { input.setAttribute("aria-invalid", "true"); showToast(t("groupInvalid"), "error"); input.focus(); return; }
  input.removeAttribute("aria-invalid");
  const groups = [...new Set([...(app.state?.qq?.allowedGroups || []), value])];
  await saveGroups(groups, event.submitter).then(() => { input.value = ""; }).catch(() => undefined);
});

$("#addHandleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#handleInput");
  const value = input.value.trim();
  if (!value || value.length > 160 || !/^[+\w@.() -]{3,160}$/.test(value)) { input.setAttribute("aria-invalid", "true"); showToast(t("handleInvalid"), "error"); input.focus(); return; }
  input.removeAttribute("aria-invalid");
  const handles = [...new Set([...(app.state?.imessage?.trustedHandles || []), value])];
  await saveHandles(handles, event.submitter).then(() => { input.value = ""; }).catch(() => undefined);
});

$("#replyHandleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await mutate(() => api("/api/imessage/reply-handle", { method: "POST", body: JSON.stringify({ replyHandle: $("#replyHandleInput").value.trim() }) }), { control: event.submitter }).catch(() => undefined);
  await refreshState({ quiet: true }).catch(() => undefined);
});

$("#memoryTabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-memory-tab]");
  if (!tab) return;
  app.activeMemoryTab = tab.dataset.memoryTab;
  renderMemory();
});
$("#memoryTabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = $$('[data-memory-tab]', event.currentTarget);
  const index = tabs.indexOf(document.activeElement);
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  const next = tabs[nextIndex];
  next.focus(); next.click();
});
let memorySearchTimer = null;
$("#memorySearch").addEventListener("input", (event) => {
  app.memoryQuery = event.target.value;
  clearTimeout(memorySearchTimer);
  memorySearchTimer = setTimeout(renderMemory, 100);
});
$("#memoryView").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-unified-setting]");
  if (!input || !app.memory?.unified) return;
  const settings = { ...app.memory.unified.settings, [input.dataset.unifiedSetting]: input.checked };
  await mutate(() => api("/api/unified-memory/settings", { method: "POST", body: JSON.stringify(settings) }), { control: input }).catch(() => { input.checked = !input.checked; });
  await refreshMemory({ quiet: true });
});

$("#logFilterForm").addEventListener("submit", async (event) => { event.preventDefault(); if (await refreshLogs()) showToast(t("filterApplied"), "success"); });
$("#clearLogFilters").addEventListener("click", () => { $("#logFilterForm").reset(); refreshLogs().catch(() => undefined); });
$("#liveLogsToggle").addEventListener("change", (event) => { app.liveLogs = event.target.checked; });

$("#languageSelect").addEventListener("change", (event) => { app.language = event.target.value === "en" ? "en" : "zh"; localStorage.setItem(`${STORAGE_PREFIX}language`, app.language); applyI18n(); });
$("#themeOptions").addEventListener("click", (event) => { const button = event.target.closest("[data-theme-choice]"); if (button) setTheme(button.dataset.themeChoice); });
$("#themeOptions").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const choices = $$('[data-theme-choice]', event.currentTarget);
  const index = choices.indexOf(document.activeElement);
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + choices.length) % choices.length;
  choices[nextIndex].focus();
  choices[nextIndex].click();
});
$("#quickTheme").addEventListener("click", () => {
  const dark = app.theme === "dark" || (app.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  setTheme(dark ? "light" : "dark");
});
$("#autoRefreshToggle").addEventListener("change", (event) => { app.autoRefresh = event.target.checked; localStorage.setItem(`${STORAGE_PREFIX}autoRefresh`, app.autoRefresh ? "1" : "0"); });
$("#refreshInterval").addEventListener("change", (event) => { app.refreshSeconds = Number(event.target.value) || 10; localStorage.setItem(`${STORAGE_PREFIX}refreshSeconds`, String(app.refreshSeconds)); });

async function openApi(path = "/api/state") {
  if (app.apiToken) {
    try {
      const payload = await api(path);
      app.selectedLog = payload;
      $("#logDetailTitle").textContent = t("rawState");
      $("#logDetailContent").textContent = JSON.stringify(payload, null, 2);
      $("#logDetailDialog").showModal();
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }
  if (window.webkit?.messageHandlers?.codexRemoteContactNative) window.webkit.messageHandlers.codexRemoteContactNative.postMessage({ action: "openHub" });
  else window.open(`${HUB}${path}`, "_blank", "noopener");
}
$("#openHubApi").addEventListener("click", () => { void openApi(); });
$("#openRawState").addEventListener("click", () => { void openApi(); });
$("#copyEndpoint").addEventListener("click", () => { void copyText($("#hubEndpointValue").textContent); });
$("#copyLogDetail").addEventListener("click", () => { void copyText($("#logDetailContent").textContent); });

async function copyText(value) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(String(value || ""));
    showToast(t("copied"), "success");
  } catch {
    const input = document.createElement("textarea");
    input.className = "copy-buffer";
    input.value = String(value || "");
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    showToast(copied ? t("copied") : t("copyFailed"), copied ? "success" : "error");
  }
}

window.addEventListener("hashchange", () => setView(location.hash.slice(1), { updateHash: false }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && app.autoRefresh) void refreshView({ quiet: true }); });

setInterval(() => {
  if (document.hidden || !app.autoRefresh) return;
  const now = Date.now();
  const base = app.refreshSeconds * 1_000;
  if (app.view !== "settings" && now - app.lastFetch.state >= base) void refreshState({ quiet: true }).catch(() => undefined);
  if (["overview", "channels"].includes(app.view) && now - app.lastFetch.maintenance >= Math.max(15_000, base * 2)) void refreshMaintenance({ quiet: true }).catch(() => undefined);
  if (app.view === "activity" && app.liveLogs && now - app.lastFetch.logs >= Math.max(5_000, base)) void refreshLogs({ quiet: true }).catch(() => undefined);
}, 1_000);

setTheme(app.theme);
applyI18n();
renderInitialShell();
setView(app.view, { updateHash: true, quiet: false });
