const HUB = location.protocol === "http:" || location.protocol === "https:" ? "" : "http://127.0.0.1:3789";
const STORAGE_PREFIX = "codexRemoteContact.";
const validViews = new Set(["overview", "channels", "intelligence", "memory", "activity", "settings"]);

const translations = {
  zh: {
    mainNavigation: "主导航", mobileNavigation: "移动端导航", brandHome: "Nexus 首页", runtimeSummary: "运行摘要", runtimeBrief: "运行建议", skipToContent: "跳到主要内容", openQuickActions: "打开快速操作", quickActions: "快速操作", searchActions: "搜索页面或操作", commandCenter: "COMMAND CENTER", commandHint: "↑↓ 选择 · Enter 执行", navOverview: "总览", navChannels: "通道", navIntelligence: "行为", navIntelligenceShort: "行为", navMemory: "记忆", navActivity: "日志", navActivityShort: "日志", navSettings: "设置",
    connecting: "正在连接", workspace: "工作台", overviewTitle: "运行总览", channelsTitle: "消息通道", intelligenceTitle: "智能行为", memoryTitle: "记忆中心", activityTitle: "实时日志", settingsTitle: "偏好设置",
    waitingSync: "等待同步", refreshCurrent: "刷新当前页面", toggleTheme: "切换主题", hubUnavailable: "Hub 暂时不可用", offlineHint: "请确认本地服务已启动。", retry: "重试",
    heroTitle: "系统运行正常", heroBody: "QQ、OneBot 与 Hub 已连接，Codex 随时可用。", manageChannels: "管理通道", openApi: "查看 API",
    liveChannels: "LIVE CHANNELS", channelControl: "通道控制", viewAll: "查看全部", usageWindow: "Codex 用量", systemPulse: "SYSTEM PULSE", serviceHealth: "系统脉搏", checkNow: "立即检查", recentFlow: "RECENT FLOW", recentActivity: "最近活动", openLogs: "打开日志", todayRuntime: "今日运行", liveNow: "LIVE", last24Hours: "实时采样", stableLatency: "等待首个样本", liveSampleCount: "{count} 个真实样本", liveResponse: "响应 {latencyMs} ms · {online}/{total} 在线", now: "现在", quickEntryKicker: "SHORTCUTS", quickEntry: "快捷入口",
    connectionRules: "CONNECTION RULES", channelsHeading: "管理每一条消息通道", channelsBody: "控制启停、访问范围和可信联系人，所有改动会立即写入本地 Hub。",
    behaviorLab: "BEHAVIOR LAB", intelligenceHeading: "把 Bot 的习惯和主动性分开看", intelligenceBody: "人设、表达习惯、群聊节奏与主动兴趣各自成区，状态更清楚，也不会挤占通道配置。", openLearningLogs: "查看学习日志", identityLayer: "IDENTITY", expressionLayer: "EXPRESSION", learningLayer: "LEARNING", initiativeLayer: "INITIATIVE", relationshipLayer: "RELATIONSHIP", botControlKicker: "BOT CONTROL", botControlHeading: "功能开关与调试参数", botControlBody: "开关会立即持久化；判定频率、模型和超时用于调试主动兴趣，不影响显式 @ Bot 的正常回复。", settingsSynced: "设置已同步", settingsSaving: "正在保存", settingsSaveFailed: "保存失败", qqEnhancerFeature: "QQ 增强能力", qqEnhancerFeatureHint: "图片上下文、自然表达与扩展行为的总开关。", webLookupFeature: "联网查询", webLookupFeatureHint: "允许 Bot 在需要时调用已配置的搜索服务。", proactiveFeature: "主动兴趣", proactiveFeatureHint: "允许普通群消息、冷群和私聊进入主动判断。", interestJudgeFeature: "兴趣模型判定", interestJudgeFeatureHint: "使用 OpenRouter 模型判断是否值得自然接话。", judgeEveryMessages: "消息间隔", judgeEveryMinutes: "分钟间隔", judgeModel: "判定模型", judgeTimeout: "静默超时（ms）", judgeRecentMessages: "最近上下文", saveBotSettings: "保存 Bot 设置", botSettingsSaved: "Bot 设置已保存", waitingBotSettings: "等待 Bot 设置", diagnosticJudgeProvider: "判定服务：{value}", diagnosticJudgeKeyReady: "OpenRouter Key 已配置", diagnosticJudgeKeyMissing: "OpenRouter Key 未配置", diagnosticSearchProvider: "搜索服务：{value}", diagnosticSafeFetchMode: "安全下载：{value}", safeFetchProxy: "代理兼容", safeFetchStrict: "严格", diagnosticActiveGeneration: "生成中：{value}", diagnosticPendingReplies: "待回复：{value}",
    toggleQq: "启用 QQ 通道", qqAllowlist: "QQ群白名单", qqAllowlistHint: "只有列表内群聊会触发助手。", stickerFrequency: "表情包频率", stickerFrequencyHint: "按群查看最近真人与上线后 Bot 的实际使用率。", humanStickerRate: "真人 {rate}% · {count} 条样本", botStickerRate: "Bot {rate}% · {count} 条新回复", plannedStickerRate: "闲聊计划 {rate}%", noStickerFrequency: "还没有可统计的群聊样本。", selfPersona: "Bot 全局人设", selfPersonaHint: "从各群和私聊的匿名摘要生成；QQ 昵称固定作为名字和兴趣关键词。", selfPersonaCollecting: "正在积累会话与 Bot 回复，达到阈值后自动生成人设。", selfPersonaGenerated: "第 {revision} 版 · {time}", selfPersonaProgress: "真人消息 {human} · Bot 回复 {bot} · 已总结 {summaries}/{scopes} 个会话", selfPersonaPolicy: "会话摘要：初次 {initial} 条，之后 {messages} 条或 {botReplies} 次 Bot 回复，至少间隔 {scopeHours} 小时；全局更新至少间隔 {globalHours} 小时", selfPersonaKeywords: "兴趣关键词", selfPersonaTopics: "加权兴趣", adaptiveLearning: "自动适应", adaptiveLearningHint: "按群学习活跃时段、成员节奏，并按 24 小时时钟复盘真人与 Bot 的风格差异。", adaptiveSamples: "真人 {count} 条 · {members} 位成员", adaptiveHours: "常见活跃时段：{hours}", adaptiveNextReview: "下次复盘检查：{time}", adaptiveColdWaiting: "存在未获回复的 Bot 消息，后续兴趣与间隔已自动降低", adaptiveCollecting: "正在积累上线后的 Bot 回复，样本足够后每 24 小时复盘。", noAdaptiveLearning: "还没有可用的自动学习样本。", coldInterest: "冷群兴趣发言", coldInterestHint: "按最后一条消息计时，结合群节奏选择发一句或保持沉默。", coldInterestPolicy: "开放 {hours} · 基础重试 {retry} 小时 · 未获回复时自动降兴趣并延长间隔", learnedHours: "按各群活跃统计", coldInterestRecent: "最近判断", noColdInterest: "还没有可展示的冷群状态。", noColdInterestDecisions: "还没有实际触发过冷群判断。", privateInterest: "私聊主动兴趣", privateInterestHint: "按互动频率和时间采用短期高、中期低、长期回升的概率，并对连续未回复自动退避。", noPrivateInterest: "还没有可展示的私聊学习状态。", noPrivateInterestDecisions: "还没有实际触发过私聊主动判断。", privateContact: "联系人 {value}", privateRecent: "最近判断", privatePhase: "阶段 {value}", privateProbability: "候选概率 {value}%", privateFrequency: "互动频率 {value}", detailLearnedHours: "开放时段 {value}", detailUnanswered: "连续未回复 {value}", detailInterestMultiplier: "兴趣系数 {value}", detailNextCheck: "下次可判断 {value}", viewDetailedLogs: "查看详细日志", learningHuman: "真人学习参数", learningBot: "Bot 实际参数", learningReview: "风格复盘", learningInterest: "兴趣回复参数", detailSample: "样本 {value}", detailConfidence: "置信度 {value}%", detailTextSample: "文字样本 {value}", detailAverageChars: "平均文字 {value} 字", detailShortRatio: "短消息 {value}%", detailLongRatio: "长消息 {value}%", detailStickerRatio: "表情包 {value}%", detailImageRatio: "图片 {value}%", detailEmojiRatio: "Emoji {value}%", detailReplyRatio: "回复引用 {value}%", detailMentionRatio: "@ 消息 {value}%", detailQuestionRatio: "问句 {value}%", detailBotInteraction: "与 Bot 直接互动 {value}%", detailBurstRatio: "两分钟连发 {value}%", detailInterruptionRate: "插话率 {value}% · {samples} 次活跃衔接", detailGap: "消息间隔中位 {value}", detailActiveDays: "活跃 {value} 天", detailDailyMessages: "活跃日均 {value} 条", detailCurrentHour: "当前时段占比 {value}%", detailFirstSeen: "开始学习 {value}", detailLastHuman: "最后真人消息 {value}", detailBotReplies: "新 Bot 回复 {value}", detailBotChars: "Bot 平均 {value} 字", detailBotSticker: "Bot 表情包 {value}%", detailBotBubbles: "Bot 多气泡 {value}%", detailBotFollowup: "真人接话率 {value}%", detailTrackingStart: "Bot 统计起点 {value}", detailLastBot: "最后 Bot 回复 {value}", detailReviewSamples: "复盘样本 真人 {human} / Bot {bot}", detailLastReview: "上次复盘 {value}", detailNextReview: "下次复盘 {value}", detailOrdinaryInterest: "普通兴趣：{messages} 条或 {minutes} 分钟", detailInterestReason: "间隔依据 {value}", detailColdIdle: "已沉默 {idle} / 需 {required} 小时", detailColdReason: "当前状态 {value}", detailColdThreshold: "计时阈值 {value}", detailColdCheck: "上次判断 {value}", detailColdSent: "上次主动发言 {value}", groupLabel: "群 {value}", groupId: "群 ID", groupIdExample: "例如 123456789", add: "添加",
    selfPersonaGlobalPolicy: "全局人设：首次 {initial} 条总消息和至少 2 个会话；之后新增 {messages} 条真人消息、{botReplies} 次 Bot 回复或 {summaries} 份摘要，至少间隔 {hours} 小时；失败后 {retry} 小时再试",
    qqRecent: "QQ 最近事件",
    contextVault: "CONTEXT VAULT", memoryHeading: "可见、可控的本地记忆", memoryBody: "浏览统一摘要与 QQ 群聊/私聊上下文，并精确清理不再需要的内容。", refreshMemory: "刷新记忆", memoryType: "记忆类型", unified: "统一记忆", searchMemory: "搜索记忆",
    observability: "OBSERVABILITY", activityHeading: "把每一次运行看清楚", activityBody: "完整字段实时到达，级别、模块、链路、耗时和错误原因分别着色，定位问题不再依赖翻文件。", liveRefresh: "实时刷新", liveConnected: "实时日志已连接", livePaused: "实时日志已暂停", liveError: "实时日志连接异常", followLatest: "跟随最新", visibleLogCount: "显示条数", liveLogStream: "实时日志", level: "级别", allLevels: "全部级别", category: "模块", allCategories: "全部模块", search: "搜索", logSearchHint: "消息、Trace、群或发送者", slowThreshold: "慢请求", noLimit: "不限", applyFilter: "应用筛选", structuredLogs: "完整实时日志", waitingLogs: "等待日志", resetFilter: "重置", refresh: "刷新",
    preferences: "PREFERENCES", settingsHeading: "让控制台适合你的节奏", settingsBody: "调整外观与刷新偏好，并控制局域网或临时公网访问。", appearance: "外观", appearanceHint: "跟随系统，或固定使用明亮 / 深色主题。", theme: "主题", system: "系统", light: "明亮", dark: "深色", language: "界面语言", languageHint: "完整切换控制台文案和时间显示。", autoRefresh: "自动刷新", autoRefreshHint: "页面隐藏时会自动暂停，减少无意义开销。", refreshInterval: "刷新间隔", hubEndpoint: "Hub 地址", hubEndpointHint: "当前页面连接的 Hub 地址。", lanAccess: "局域网访问", lanAccessHint: "自动忽略代理 / VPN 虚拟网卡，只显示其他设备可达的物理局域网地址；若代理仍拦截，请将该地址设为 DIRECT / 不代理。", lanLocalOnly: "仅本机可访问", lanNoAddress: "已开放，但未找到物理局域网 IPv4 地址，请检查 Wi-Fi / 以太网或代理绕过设置", copyLanToken: "复制访问令牌", lanEnableTitle: "开启局域网访问", lanEnableMessage: "开启后，同一局域网内的设备可以打开控制台。管理 API 仍受访问令牌保护。", lanAccessUpdated: "局域网访问设置已更新", lanTokenCopied: "访问令牌已复制", lanManagedByEnvironment: "监听地址由环境变量管理，无法在网页中修改。", publicTunnel: "内网穿透", publicTunnelHint: "通过 Cloudflare Quick Tunnel 生成临时 HTTPS 地址；远端仍需访问令牌。", publicTunnelRunningHint: "公网地址已就绪。把地址和访问令牌分别安全地发给需要访问的人。", publicTunnelStarting: "正在创建临时公网地址…", publicTunnelOff: "未开启公网访问", publicTunnelUnavailable: "未找到 cloudflared。请先安装并确保它在 Hub 的 PATH 中。", publicTunnelRemoteManaged: "为防止远端扩大访问范围，只能从本机页面开启、关闭和复制令牌。", publicTunnelError: "隧道启动失败：{error}", publicTunnelEnableTitle: "开启内网穿透", publicTunnelEnableMessage: "这会把控制台临时开放到公网。所有远端管理 API 仍需访问令牌，请只把地址和令牌交给可信的人。", publicTunnelUpdated: "内网穿透设置已更新", copyPublicTunnelUrl: "复制公网地址", publicTunnelUrlCopied: "公网地址已复制", copy: "复制", rawState: "原始状态", aboutBody: "QQ / OneBot 与 Codex CLI 的本地优先通讯中枢。",
    confirmAction: "确认操作", cancel: "取消", confirm: "确认", logDetail: "日志详情", close: "关闭", copyJson: "复制 JSON", done: "完成",
    hubOnline: "Hub 在线", hubOffline: "Hub 离线", syncedNow: "刚刚同步", syncedAt: "同步于 {time}", online: "在线", offline: "离线", enabled: "已启用", disabled: "已停用", running: "运行中", idle: "空闲", healthy: "正常", attention: "注意", toHandle: "待处理", staleData: "健康信息已过期：{value}",
    uptime: "运行时长", serviceOnline: "在线服务", activeTasks: "活动任务", memoryEntries: "记忆条目", active: "活动", pending: "排队", concurrency: "并发上限", groups: "群", contacts: "联系人", systemReady: "一切正常", systemReadyBody: "关键服务运行正常，可以随时接收和处理消息。", systemAttention: "有配置项需要留意", systemAttentionBody: "{count} 个服务当前停用或尚未配置，不影响其余通道运行。", systemCritical: "检测到运行异常", systemCriticalBody: "{count} 个服务需要处理，建议先查看服务健康详情。", healthyServices: "{count} 个服务正常", issuesCount: "{count} 项需处理", inspectHealth: "查看健康详情", noMatchingActions: "没有匹配的操作", actionRefresh: "刷新当前视图", actionRefreshHint: "重新同步当前页面的最新数据", actionHealth: "检查服务健康", actionHealthHint: "立即重新探测本地服务与通道", actionTheme: "切换明暗主题", actionThemeHint: "在明亮与深色外观之间切换", actionApi: "查看原始状态", actionApiHint: "打开 Hub 返回的原始 JSON 状态", actionAddGroup: "添加 QQ 群", actionAddGroupHint: "前往通道页并定位群白名单输入框", actionAddContact: "添加可信联系人", actionAddContactHint: "前往通道页并定位联系人输入框", actionOverviewHint: "查看核心指标、额度与服务健康", actionChannelsHint: "管理通道、白名单和可信联系人", actionIntelligenceHint: "查看人设、表达学习与主动兴趣状态", actionMemoryHint: "搜索和清理本地上下文记忆", actionLogsHint: "查看实时完整日志并追踪运行问题", actionSettingsHint: "调整主题、语言和自动刷新",
    qqChannelHint: "白名单群与私聊入口", groupsAllowed: "{count} 个白名单群", recentEventsCount: "{count} 条最近事件",
    quotaUnavailable: "暂无可用额度快照", fiveHours: "5 小时", sevenDays: "7 天", remaining: "剩余 {value}%", resetsAt: "{time} 重置", recordedAt: "记录于 {time}", noReset: "时间未知",
    oneBot: "OneBot", codexCli: "Codex CLI", webLookup: "联网查询", qqChannel: "QQ 通道", pathReady: "命令路径可用", pathMissing: "命令路径缺失", neverRun: "尚未运行", lastRun: "上次运行 {time}", trustedCount: "{count} 位可信联系人", provider: "提供方 {value}", lastQuery: "查询：{value}", noQuery: "尚无查询", model: "模型 {value}", reasoning: "推理 {value}", queueState: "活动 {active} · 排队 {pending}/{max}", noRecentActivity: "还没有最近活动。",
    noGroups: "尚未添加群白名单。", noContacts: "尚未添加可信联系人。", removeGroupTitle: "移除群白名单", removeGroupMessage: "确定从白名单移除群 {value} 吗？", removeContactTitle: "移除可信联系人", removeContactMessage: "确定移除 {value} 吗？", groupInvalid: "请输入 4–20 位数字群 ID。", handleInvalid: "请输入有效的手机号或邮箱。", saved: "已保存", channelUpdated: "通道状态已更新", added: "已添加", removed: "已移除",
    replied: "已回复", ignored: "已忽略", trusted: "可信", unauthorized: "未授权", noEvents: "还没有事件。", replyLabel: "回复：", attachmentCount: "{count} 个附件",
    autoSkillMemory: "Skill 回看后写入", autoSkillHint: "桌面 Skill 调用记忆后自动沉淀", manualHandoff: "允许手动交接", manualHandoffHint: "允许 /交接 指令写入摘要", recentState: "近期状态", latestHandoff: "最近交接", noState: "暂无近期状态", unifiedEntries: "统一摘要", handoffs: "交接", ideas: "点子", projects: "项目", todos: "待办", notes: "记录", updated: "更新于 {time}", noMemory: "没有符合条件的记忆。", entriesCount: "{count} 条", clear: "清空", clearMemoryTitle: "清空记忆", clearMemoryMessage: "此操作会永久清理“{value}”中的记忆，确定继续吗？", allRelatedMemory: "{value} 的全部相关记忆", memoryCleared: "记忆已清空", roleUser: "用户", roleAssistant: "助手", publicMemory: "公共长期记忆", personas: "群友画像", conversationImpressions: "对话印象",
    matchedLogs: "显示 {visible} 条 · 匹配 {matched} 条", totalLogs: "日志总数", traces: "Trace 数", p95Latency: "P95 耗时", maxLatency: "最慢耗时", noLogs: "没有符合筛选条件的日志。", copied: "已复制", filterApplied: "筛选已应用",
    runtimeModel: "当前模型", runtimeReasoning: "推理等级", runtimeStarted: "启动时间", apiTokenPrompt: "此 Hub 已启用 API Token。请输入 Token（只保存在当前标签页）：", authRequired: "需要 API Token 才能连接。", requestFailed: "请求失败", networkError: "无法连接到本地 Hub。", copyFailed: "复制失败，请手动选择内容。", unknown: "未知"
  },
  en: {
    mainNavigation: "Main navigation", mobileNavigation: "Mobile navigation", brandHome: "Nexus home", runtimeSummary: "Runtime summary", runtimeBrief: "Runtime guidance", skipToContent: "Skip to main content", openQuickActions: "Open quick actions", quickActions: "Quick actions", searchActions: "Search pages or actions", commandCenter: "COMMAND CENTER", commandHint: "↑↓ select · Enter run", navOverview: "Overview", navChannels: "Channels", navIntelligence: "Behavior", navIntelligenceShort: "Behavior", navMemory: "Memory", navActivity: "Logs", navActivityShort: "Logs", navSettings: "Settings",
    connecting: "Connecting", workspace: "Workspace", overviewTitle: "Runtime Overview", channelsTitle: "Message Channels", intelligenceTitle: "Intelligence", memoryTitle: "Memory Center", activityTitle: "Live Logs", settingsTitle: "Preferences",
    waitingSync: "Waiting to sync", refreshCurrent: "Refresh current view", toggleTheme: "Toggle theme", hubUnavailable: "Hub is unavailable", offlineHint: "Make sure the local service is running.", retry: "Retry",
    heroTitle: "All systems nominal", heroBody: "QQ, OneBot, and Hub are connected. Codex is ready.", manageChannels: "Manage channels", openApi: "View API",
    liveChannels: "LIVE CHANNELS", channelControl: "Channel control", viewAll: "View all", usageWindow: "Codex usage", systemPulse: "SYSTEM PULSE", serviceHealth: "System pulse", checkNow: "Check now", recentFlow: "RECENT FLOW", recentActivity: "Recent activity", openLogs: "Open logs", todayRuntime: "Today", liveNow: "LIVE", last24Hours: "Live samples", stableLatency: "Waiting for first sample", liveSampleCount: "{count} real samples", liveResponse: "Response {latencyMs} ms · {online}/{total} online", now: "Now", quickEntryKicker: "SHORTCUTS", quickEntry: "Quick access",
    connectionRules: "CONNECTION RULES", channelsHeading: "Manage every message channel", channelsBody: "Control availability, access scope, and trusted contacts. Changes are written to the local Hub immediately.",
    behaviorLab: "BEHAVIOR LAB", intelligenceHeading: "See Bot habits and initiative separately", intelligenceBody: "Persona, expression, group rhythm, and proactive interest each have their own space without crowding channel controls.", openLearningLogs: "Open learning logs", identityLayer: "IDENTITY", expressionLayer: "EXPRESSION", learningLayer: "LEARNING", initiativeLayer: "INITIATIVE", relationshipLayer: "RELATIONSHIP", botControlKicker: "BOT CONTROL", botControlHeading: "Feature switches and debug tuning", botControlBody: "Switches persist immediately. Judge cadence, model, and timeout tune proactive interest without affecting explicit @Bot replies.", settingsSynced: "Settings synced", settingsSaving: "Saving", settingsSaveFailed: "Save failed", qqEnhancerFeature: "QQ enhancement", qqEnhancerFeatureHint: "Master switch for image context, natural expression, and extended behavior.", webLookupFeature: "Web lookup", webLookupFeatureHint: "Allows the Bot to use configured search services when needed.", proactiveFeature: "Proactive interest", proactiveFeatureHint: "Allows ordinary group, cold-group, and private proactive candidates.", interestJudgeFeature: "Interest model judge", interestJudgeFeatureHint: "Uses an OpenRouter model to decide whether joining naturally adds value.", judgeEveryMessages: "Message interval", judgeEveryMinutes: "Minute interval", judgeModel: "Judge model", judgeTimeout: "Idle timeout (ms)", judgeRecentMessages: "Recent context", saveBotSettings: "Save Bot settings", botSettingsSaved: "Bot settings saved", waitingBotSettings: "Waiting for Bot settings", diagnosticJudgeProvider: "Judge: {value}", diagnosticJudgeKeyReady: "OpenRouter key configured", diagnosticJudgeKeyMissing: "OpenRouter key missing", diagnosticSearchProvider: "Search: {value}", diagnosticSafeFetchMode: "Safe downloads: {value}", safeFetchProxy: "proxy-compatible", safeFetchStrict: "strict", diagnosticActiveGeneration: "Generating: {value}", diagnosticPendingReplies: "Pending replies: {value}",
    toggleQq: "Enable QQ channel", qqAllowlist: "QQ group allowlist", qqAllowlistHint: "Only listed groups can trigger the assistant.", stickerFrequency: "Sticker frequency", stickerFrequencyHint: "Compare recent human usage with Bot replies sent after this rollout.", humanStickerRate: "Humans {rate}% · {count} samples", botStickerRate: "Bot {rate}% · {count} new replies", plannedStickerRate: "Casual target {rate}%", noStickerFrequency: "No group samples are available yet.", selfPersona: "Global Bot persona", selfPersonaHint: "Generated from anonymous group and private summaries; the QQ nickname stays fixed as the name and an interest keyword.", selfPersonaCollecting: "Collecting conversations and Bot replies; the persona will be generated after the threshold is reached.", selfPersonaGenerated: "Revision {revision} · {time}", selfPersonaProgress: "{human} human messages · {bot} Bot replies · {summaries}/{scopes} scopes summarized", selfPersonaPolicy: "Scope summary: first at {initial} messages, then every {messages} messages or {botReplies} Bot replies with a {scopeHours}h minimum; global updates have a {globalHours}h minimum", selfPersonaKeywords: "Interest keywords", selfPersonaTopics: "Weighted interests", adaptiveLearning: "Adaptive learning", adaptiveLearningHint: "Learns group timing and member rhythm, then reviews human-versus-Bot style on a 24-hour clock.", adaptiveSamples: "{count} human messages · {members} members", adaptiveHours: "Common active hours: {hours}", adaptiveNextReview: "Next review check: {time}", adaptiveColdWaiting: "Unanswered Bot messages are reducing interest and lengthening the next interval", adaptiveCollecting: "Collecting new Bot replies; review runs every 24 hours when samples are sufficient.", noAdaptiveLearning: "No adaptive-learning samples yet.", coldInterest: "Cold-group interest", coldInterestHint: "Times from the latest message and uses group rhythm to speak once or stay silent.", coldInterestPolicy: "Open {hours} · base retry {retry}h · unanswered outreach lowers interest and lengthens the interval", learnedHours: "learned per group", coldInterestRecent: "Recent decisions", noColdInterest: "No cold-group status is available yet.", noColdInterestDecisions: "No cold-group candidate has run yet.", privateInterest: "Private proactive interest", privateInterestHint: "Uses interaction frequency and a short-high, middle-low, long-rising timing curve, with unanswered-message backoff.", noPrivateInterest: "No private-chat learning status is available yet.", noPrivateInterestDecisions: "No private proactive candidate has run yet.", privateContact: "Contact {value}", privateRecent: "Recent decisions", privatePhase: "Phase {value}", privateProbability: "Candidate probability {value}%", privateFrequency: "Frequency {value}", detailLearnedHours: "Open hours {value}", detailUnanswered: "Unanswered streak {value}", detailInterestMultiplier: "Interest multiplier {value}", detailNextCheck: "Next eligible check {value}", viewDetailedLogs: "View detailed logs", learningHuman: "Human learning signals", learningBot: "Bot actual signals", learningReview: "Style review", learningInterest: "Interest reply signals", detailSample: "Samples {value}", detailConfidence: "Confidence {value}%", detailTextSample: "Text samples {value}", detailAverageChars: "Average text {value} chars", detailShortRatio: "Short messages {value}%", detailLongRatio: "Long messages {value}%", detailStickerRatio: "Stickers {value}%", detailImageRatio: "Images {value}%", detailEmojiRatio: "Emoji {value}%", detailReplyRatio: "Replies {value}%", detailMentionRatio: "Mentions {value}%", detailQuestionRatio: "Questions {value}%", detailBotInteraction: "Direct Bot interaction {value}%", detailBurstRatio: "Two-minute bursts {value}%", detailInterruptionRate: "Interjection rate {value}% · {samples} active transitions", detailGap: "Median gap {value}", detailActiveDays: "Active {value} days", detailDailyMessages: "{value} per active day", detailCurrentHour: "Current-hour share {value}%", detailFirstSeen: "Learning since {value}", detailLastHuman: "Latest human message {value}", detailBotReplies: "New Bot replies {value}", detailBotChars: "Bot average {value} chars", detailBotSticker: "Bot stickers {value}%", detailBotBubbles: "Bot multi-bubble {value}%", detailBotFollowup: "Human follow-up {value}%", detailTrackingStart: "Bot tracking since {value}", detailLastBot: "Latest Bot reply {value}", detailReviewSamples: "Review samples human {human} / Bot {bot}", detailLastReview: "Last review {value}", detailNextReview: "Next review {value}", detailOrdinaryInterest: "Ordinary interest: {messages} messages or {minutes} minutes", detailInterestReason: "Cadence basis {value}", detailColdIdle: "Idle {idle} / required {required}h", detailColdReason: "Current state {value}", detailColdThreshold: "Time threshold {value}", detailColdCheck: "Last check {value}", detailColdSent: "Last outreach {value}", groupLabel: "Group {value}", groupId: "Group ID", groupIdExample: "e.g. 123456789", add: "Add",
    selfPersonaGlobalPolicy: "Global persona: first at {initial} total messages across at least 2 scopes; then after {messages} human messages, {botReplies} Bot replies, or {summaries} summaries with a {hours}h minimum; failures retry after {retry}h",
    qqRecent: "Recent QQ events",
    contextVault: "CONTEXT VAULT", memoryHeading: "Visible, controllable local memory", memoryBody: "Browse unified summaries and QQ group or private-chat context, then remove exactly what you no longer need.", refreshMemory: "Refresh memory", memoryType: "Memory type", unified: "Unified", searchMemory: "Search memory",
    observability: "OBSERVABILITY", activityHeading: "See every run clearly", activityBody: "Complete fields arrive live, with distinct colors for levels, modules, traces, latency, and errors.", liveRefresh: "Live refresh", liveConnected: "Live log connected", livePaused: "Live log paused", liveError: "Live log connection error", followLatest: "Follow latest", visibleLogCount: "Rows", liveLogStream: "Live log stream", level: "Level", allLevels: "All levels", category: "Category", allCategories: "All categories", search: "Search", logSearchHint: "Message, trace, group, or sender", slowThreshold: "Slow requests", noLimit: "No limit", applyFilter: "Apply", structuredLogs: "Complete live logs", waitingLogs: "Waiting for logs", resetFilter: "Reset", refresh: "Refresh",
    preferences: "PREFERENCES", settingsHeading: "Make the console fit your rhythm", settingsBody: "Adjust appearance and refresh preferences, and control LAN or temporary public access.", appearance: "Appearance", appearanceHint: "Follow the system or lock light / dark mode.", theme: "Theme", system: "System", light: "Light", dark: "Dark", language: "Language", languageHint: "Switch all console copy and time formatting.", autoRefresh: "Auto refresh", autoRefreshHint: "Automatically pauses while the page is hidden.", refreshInterval: "Refresh interval", hubEndpoint: "Hub endpoint", hubEndpointHint: "The Hub address used by this page.", lanAccess: "LAN access", lanAccessHint: "Proxy and VPN virtual adapters are ignored so only physical LAN addresses reachable by other devices are shown. If a proxy still intercepts the address, set it to DIRECT / bypass.", lanLocalOnly: "Available on this computer only", lanNoAddress: "LAN access is on, but no physical LAN IPv4 address was found; check Wi-Fi / Ethernet or proxy bypass settings", copyLanToken: "Copy access token", lanEnableTitle: "Enable LAN access", lanEnableMessage: "Devices on the same LAN will be able to open the console. Management APIs remain protected by an access token.", lanAccessUpdated: "LAN access setting updated", lanTokenCopied: "Access token copied", lanManagedByEnvironment: "The listening address is managed by an environment variable and cannot be changed here.", publicTunnel: "Temporary public access", publicTunnelHint: "Creates a temporary HTTPS address with Cloudflare Quick Tunnel; remote access still requires a token.", publicTunnelRunningHint: "The public address is ready. Share the address and access token separately with trusted visitors.", publicTunnelStarting: "Creating a temporary public address…", publicTunnelOff: "Public access is off", publicTunnelUnavailable: "cloudflared was not found. Install it and make sure it is on the Hub PATH.", publicTunnelRemoteManaged: "To prevent remote access from expanding itself, only the local page can start, stop, or copy the token.", publicTunnelError: "Tunnel startup failed: {error}", publicTunnelEnableTitle: "Enable temporary public access", publicTunnelEnableMessage: "This temporarily exposes the console to the public internet. Every remote management API still requires the access token; share both only with people you trust.", publicTunnelUpdated: "Temporary public access updated", copyPublicTunnelUrl: "Copy public address", publicTunnelUrlCopied: "Public address copied", copy: "Copy", rawState: "Raw state", aboutBody: "A local-first QQ / OneBot and Codex CLI communication hub.",
    confirmAction: "Confirm action", cancel: "Cancel", confirm: "Confirm", logDetail: "Log detail", close: "Close", copyJson: "Copy JSON", done: "Done",
    hubOnline: "Hub online", hubOffline: "Hub offline", syncedNow: "Synced just now", syncedAt: "Synced at {time}", online: "Online", offline: "Offline", enabled: "Enabled", disabled: "Disabled", running: "Running", idle: "Idle", healthy: "Healthy", attention: "Check", toHandle: "To review", staleData: "Health data is stale: {value}",
    uptime: "Uptime", serviceOnline: "Services online", activeTasks: "Active tasks", memoryEntries: "Memory entries", active: "Active", pending: "Pending", concurrency: "Concurrency", groups: "Groups", contacts: "Contacts", systemReady: "All systems normal", systemReadyBody: "Critical services are healthy and ready to receive messages.", systemAttention: "A few settings need attention", systemAttentionBody: "{count} services are disabled or not configured; other channels remain available.", systemCritical: "Runtime issue detected", systemCriticalBody: "{count} services need attention. Check service health first.", healthyServices: "{count} services healthy", issuesCount: "{count} to review", inspectHealth: "Inspect health", noMatchingActions: "No matching actions", actionRefresh: "Refresh current view", actionRefreshHint: "Sync the latest data for the current page", actionHealth: "Check service health", actionHealthHint: "Probe local services and channels now", actionTheme: "Toggle color theme", actionThemeHint: "Switch between light and dark appearance", actionApi: "View raw state", actionApiHint: "Open the raw JSON returned by the Hub", actionAddGroup: "Add QQ group", actionAddGroupHint: "Open Channels and focus the group allowlist field", actionAddContact: "Add trusted contact", actionAddContactHint: "Open Channels and focus the contact field", actionOverviewHint: "Review core metrics, usage, and service health", actionChannelsHint: "Manage channels, allowlists, and trusted contacts", actionIntelligenceHint: "Review persona, expression learning, and proactive interest", actionMemoryHint: "Search and clear local contextual memory", actionLogsHint: "Inspect complete live logs and trace runtime issues", actionSettingsHint: "Adjust theme, language, and auto refresh",
    qqChannelHint: "Allowlisted groups and private chats", groupsAllowed: "{count} allowlisted groups", recentEventsCount: "{count} recent events",
    quotaUnavailable: "No usage snapshot available", fiveHours: "5 hours", sevenDays: "7 days", remaining: "{value}% remaining", resetsAt: "Resets {time}", recordedAt: "Recorded {time}", noReset: "Unknown reset",
    oneBot: "OneBot", codexCli: "Codex CLI", webLookup: "Web lookup", qqChannel: "QQ channel", pathReady: "Command path ready", pathMissing: "Command path missing", neverRun: "Not run yet", lastRun: "Last run {time}", trustedCount: "{count} trusted contacts", provider: "Provider {value}", lastQuery: "Query: {value}", noQuery: "No query yet", model: "Model {value}", reasoning: "Reasoning {value}", queueState: "Active {active} · pending {pending}/{max}", noRecentActivity: "No recent activity yet.",
    noGroups: "No allowlisted groups yet.", noContacts: "No trusted contacts yet.", removeGroupTitle: "Remove group", removeGroupMessage: "Remove group {value} from the allowlist?", removeContactTitle: "Remove contact", removeContactMessage: "Remove {value}?", groupInvalid: "Enter a 4–20 digit group ID.", handleInvalid: "Enter a valid phone number or email.", saved: "Saved", channelUpdated: "Channel updated", added: "Added", removed: "Removed",
    replied: "Replied", ignored: "Ignored", trusted: "Trusted", unauthorized: "Unauthorized", noEvents: "No events yet.", replyLabel: "Reply: ", attachmentCount: "{count} attachments",
    autoSkillMemory: "Write after Skill recall", autoSkillHint: "Persist useful context after a desktop Skill recall", manualHandoff: "Allow manual handoff", manualHandoffHint: "Allow /handoff to write a summary", recentState: "Recent state", latestHandoff: "Latest handoff", noState: "No recent state", unifiedEntries: "Unified summaries", handoffs: "Handoffs", ideas: "Ideas", projects: "Projects", todos: "Todos", notes: "Notes", updated: "Updated {time}", noMemory: "No matching memory.", entriesCount: "{count} entries", clear: "Clear", clearMemoryTitle: "Clear memory", clearMemoryMessage: "This permanently removes memory from “{value}”. Continue?", allRelatedMemory: "All memory related to {value}", memoryCleared: "Memory cleared", roleUser: "User", roleAssistant: "Assistant", publicMemory: "Public long-term memory", personas: "Personas", conversationImpressions: "Conversation impressions",
    matchedLogs: "Showing {visible} · matched {matched}", totalLogs: "Total logs", traces: "Traces", p95Latency: "P95 latency", maxLatency: "Max latency", noLogs: "No logs match these filters.", copied: "Copied", filterApplied: "Filter applied",
    runtimeModel: "Current model", runtimeReasoning: "Reasoning", runtimeStarted: "Started", apiTokenPrompt: "This Hub requires an API token. Enter it here (stored only in this tab):", authRequired: "An API token is required.", requestFailed: "Request failed", networkError: "Unable to reach the local Hub.", copyFailed: "Copy failed. Select the content manually.", unknown: "Unknown"
  }
};

const app = {
  view: validViews.has(location.hash.slice(1)) ? location.hash.slice(1) : "overview",
  language: localStorage.getItem(`${STORAGE_PREFIX}language`) === "en" ? "en" : "zh",
  theme: ["system", "light", "dark"].includes(localStorage.getItem(`${STORAGE_PREFIX}theme`)) ? localStorage.getItem(`${STORAGE_PREFIX}theme`) : "light",
  autoRefresh: localStorage.getItem(`${STORAGE_PREFIX}autoRefresh`) !== "0",
  refreshSeconds: [5, 10, 30, 60].includes(Number(localStorage.getItem(`${STORAGE_PREFIX}refreshSeconds`))) ? Number(localStorage.getItem(`${STORAGE_PREFIX}refreshSeconds`)) : 5,
  liveLogs: true,
  logFollow: true,
  lastLogSignature: "",
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
  lastSyncAt: 0,
  connectionOk: false,
  runtimeSamples: loadRuntimeSamples()
};

function loadRuntimeSamples() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(`${STORAGE_PREFIX}runtimeSamples`) || "[]");
    return Array.isArray(parsed) ? parsed.filter((sample) => Number.isFinite(sample?.at) && Number.isFinite(sample?.latencyMs)).slice(-48) : [];
  } catch {
    return [];
  }
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function t(key, values = {}) {
  const template = translations[app.language]?.[key] ?? translations.zh[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
}

function applyI18n() {
  document.documentElement.lang = app.language === "en" ? "en" : "zh-CN";
  document.title = "Nexus · Codex QQ Bot";
  $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  $$('[data-i18n-title]').forEach((node) => { node.title = t(node.dataset.i18nTitle); });
  $$('[data-i18n-aria-label]').forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel)); });
  $("#languageSelect").value = app.language;
  app.lastLogSignature = "";
  updatePageIdentity();
  renderAll();
  setLiveLogState(app.liveLogs ? "active" : "paused");
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
  const titles = { overview: "overviewTitle", channels: "channelsTitle", intelligence: "intelligenceTitle", memory: "memoryTitle", activity: "activityTitle", settings: "settingsTitle" };
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
  const requestStartedAt = performance.now();
  try {
    const suffix = force ? "?force=1" : "";
    app.maintenance = await api(`/api/maintenance${suffix}`, {}, { key: "maintenance" });
    app.lastFetch.maintenance = Date.now();
    recordRuntimeSample(performance.now() - requestStartedAt);
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
  const params = new URLSearchParams({ limit: $("#logLimit").value || "250", verbose: "1" });
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
    setLiveLogState(app.liveLogs ? "active" : "paused");
    $("#logLastUpdated").textContent = formatClock(app.lastFetch.logs);
    if (!quiet) setSync("ok");
    return app.logs;
  } catch (error) {
    if (error.name !== "AbortError") {
      setLiveLogState("error");
      if (!app.logs?.entries?.length) $("#logStream").innerHTML = emptyState(error.message);
      if (!quiet) showToast(error.message, "error");
    }
    return null;
  }
}

async function refreshView({ quiet = false } = {}) {
  const tasks = [];
  tasks.push(refreshState({ quiet }));
  if (["overview", "channels", "intelligence", "settings"].includes(app.view)) tasks.push(refreshMaintenance({ quiet }));
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

function setLiveLogState(status) {
  const root = $("#liveLogState");
  root.className = `live-log-state ${status}`;
  root.querySelector("span").textContent = t(status === "active" ? "liveConnected" : status === "error" ? "liveError" : "livePaused");
}

function setConnection(ok, reason = "") {
  app.connectionOk = ok;
  $("#offlineBanner").hidden = ok;
  $("#offlineReason").textContent = reason || t("offlineHint");
  $("#sidebarStatus").textContent = ok ? t("hubOnline") : t("hubOffline");
  $("#sidebarStatusDot").className = `status-dot ${ok ? "" : "bad"}`;
  const hero = $("#heroStatus");
  hero.innerHTML = `<span class="status-dot ${ok ? "" : "bad"}"></span><span>${escapeHtml(ok ? t("hubOnline") : t("hubOffline"))}</span>`;
  renderServiceTopology();
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
  renderOverviewStats();
  renderOverviewBrief();
  renderServiceTopology();
  renderQuickChannels();
  renderChannelSettings();
  renderBotControls();
  renderEvents();
  renderRecentTimeline();
  renderSettings();
}

function getRuntimeServiceStates() {
  const h = app.maintenance;
  if (!h) return ["onebot", "codex", "qq", "web"].map((id) => ({ id, state: "pending" }));
  const codexReady = Boolean(h.codex?.pathExists && h.codex?.lastOk !== false);
  const codexBusy = Number(h.codex?.queue?.active || 0) > 0;
  const qqEnabled = Boolean(h.channels?.qq);
  const qqReady = qqEnabled && Boolean(h.oneBot?.ok);
  const qqBusy = Number(h.qq?.activeGenerations || 0) > 0 || Number(h.qq?.pendingReplies || 0) > 0;
  return [
    { id: "onebot", state: h.oneBot?.ok ? "ok" : "bad" },
    { id: "codex", state: !codexReady ? "bad" : codexBusy ? "busy" : "ok" },
    { id: "qq", state: !qqEnabled ? "off" : !qqReady ? "bad" : qqBusy ? "busy" : "ok" },
    { id: "web", state: !h.webLookup?.enabled ? "off" : h.webLookup?.lastOk === false ? "bad" : "ok" }
  ];
}

function runtimeStateLabel(state) {
  if (state === "ok") return t("online");
  if (state === "busy") return t("running");
  if (state === "off") return t("disabled");
  if (state === "bad") return t("attention");
  return t("connecting");
}

function renderServiceTopology() {
  const root = $("#serviceTopology");
  if (!root) return;
  const services = getRuntimeServiceStates();
  const hubState = app.connectionOk ? "ok" : app.state || app.maintenance ? "bad" : "pending";
  const states = [{ id: "hub", state: hubState }, ...services];
  const nodeIds = { hub: "#topologyHub", onebot: "#topologyOneBot", codex: "#topologyCodex", qq: "#topologyQq", web: "#topologyWeb" };
  const serviceNames = { hub: "Hub", onebot: "OneBot", codex: "Codex", qq: "QQ", web: "Web" };
  states.forEach(({ id, state }) => {
    const node = $(nodeIds[id]);
    if (!node) return;
    node.classList.remove("pending", "ok", "busy", "off", "bad");
    node.classList.add(state);
    node.querySelector("small").textContent = runtimeStateLabel(state).toUpperCase();
  });
  const live = states.some(({ state }) => state === "ok" || state === "busy");
  const busy = states.some(({ state }) => state === "busy");
  root.className = `service-topology ${live ? "live" : "offline"}${busy ? " busy" : ""}`;
  root.setAttribute("aria-label", states.map(({ id, state }) => `${serviceNames[id]} ${runtimeStateLabel(state)}`).join("，"));
}

function recordRuntimeSample(latencyMs) {
  if (!app.maintenance || !Number.isFinite(latencyMs)) return;
  const services = getRuntimeServiceStates();
  const online = services.filter((service) => ["ok", "busy"].includes(service.state)).length;
  app.runtimeSamples.push({
    at: Date.now(),
    latencyMs: Math.max(0, Math.round(latencyMs)),
    online,
    total: services.length
  });
  app.runtimeSamples = app.runtimeSamples.slice(-48);
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}runtimeSamples`, JSON.stringify(app.runtimeSamples));
  } catch {
    // A storage quota or privacy mode must not interrupt live rendering.
  }
}

function renderRuntimePulse() {
  const samples = app.runtimeSamples;
  const line = $("#pulseLine");
  const point = $("#pulsePoint");
  if (!line || !point) return;
  $("#pulseSampleLabel").textContent = samples.length ? t("liveSampleCount", { count: samples.length }) : t("last24Hours");
  if (!samples.length) {
    line.setAttribute("d", "");
    point.hidden = true;
    $("#pulseLiveStatus").textContent = t("stableLatency");
    $("#pulseAxisStart").textContent = "—";
    $("#pulseAxisMiddle").textContent = "—";
    $("#pulseAxisEnd").textContent = t("now");
    return;
  }

  const width = 560;
  const top = 24;
  const bottom = 122;
  const values = samples.map((sample) => sample.latencyMs);
  const maximum = Math.max(25, ...values);
  const minimum = Math.min(...values);
  const range = Math.max(10, maximum - minimum);
  const points = samples.map((sample, index) => {
    const x = samples.length === 1 ? width / 2 : (index / (samples.length - 1)) * width;
    const normalized = (sample.latencyMs - minimum) / range;
    const y = bottom - normalized * (bottom - top);
    return { x, y };
  });
  line.setAttribute("d", points.map(({ x, y }, index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "));
  const latestPoint = points.at(-1);
  const latest = samples.at(-1);
  point.hidden = false;
  point.setAttribute("cx", latestPoint.x.toFixed(1));
  point.setAttribute("cy", latestPoint.y.toFixed(1));
  $("#pulseLiveStatus").textContent = t("liveResponse", latest);
  const midpointAt = samples.length > 1 ? Math.round((samples[0].at + latest.at) / 2) : latest.at;
  $("#pulseAxisStart").textContent = formatClock(samples[0].at);
  $("#pulseAxisMiddle").textContent = formatClock(midpointAt);
  $("#pulseAxisEnd").textContent = formatClock(latest.at);
  $("#pulseChart").setAttribute("aria-label", `${t("liveSampleCount", { count: samples.length })}，${t("liveResponse", latest)}`);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && samples.length > 1) {
    line.style.animation = "none";
    line.getBoundingClientRect();
    line.style.animation = "";
  }
}

function renderOverviewStats() {
  const state = app.state || {};
  const maintenance = app.maintenance || {};
  const trackedServices = getRuntimeServiceStates();
  const onlineServices = trackedServices.filter((service) => ["ok", "busy"].includes(service.state)).length;
  const codexActive = Number(maintenance.codex?.queue?.active || 0);
  const qqActive = Number(maintenance.qq?.activeGenerations || 0);
  const activeTasks = Math.max(codexActive, qqActive);
  const pendingTasks = Number(maintenance.codex?.queue?.pending || 0) + Number(maintenance.qq?.pendingReplies || 0);
  const uptime = formatDuration(Date.now() - Date.parse(maintenance.startedAt || ""));
  const stats = [
    { value: uptime || "—", label: t("uptime"), kind: "", icon: icons.clock },
    { value: `${onlineServices}/${trackedServices.length}`, label: t("serviceOnline"), kind: "sky", icon: icons.pulse },
    { value: formatNumber(activeTasks), label: t("activeTasks"), kind: "violet", icon: icons.activity },
    { value: formatNumber(pendingTasks), label: t("toHandle"), kind: "warn", icon: icons.logs }
  ];
  const root = $("#overviewStats");
  const markup = stats.map((item) => statCard(item)).join("");
  if (root.innerHTML !== markup) root.innerHTML = markup;
}

function statCard({ value, label, kind = "", icon = "" }) {
  return `<article class="stat-card ${kind}"><div class="stat-head"><span class="stat-icon">${icon}</span></div><strong>${escapeHtml(value)}</strong><p>${escapeHtml(label)}</p></article>`;
}

function renderOverviewBrief() {
  if (!app.maintenance) return;
  const services = getRuntimeServiceStates();
  const critical = services.filter((service) => service.state === "bad").length;
  const attention = services.filter((service) => service.state === "off").length;
  const mode = critical ? "critical" : attention ? "attention" : "ready";
  const title = mode === "critical" ? t("systemCritical") : mode === "attention" ? t("systemAttention") : t("systemReady");
  const body = mode === "critical" ? t("systemCriticalBody", { count: critical }) : mode === "attention" ? t("systemAttentionBody", { count: attention }) : t("systemReadyBody");
  $("#heroTitle").textContent = title;
  $("#heroBody").textContent = body;
  const root = $("#overviewBrief");
  root.className = `overview-brief ${mode === "ready" ? "" : mode}`;
  root.innerHTML = `
    <div class="brief-main">
      <span class="brief-icon">${mode === "ready" ? icons.shieldCheck : icons.warning}</span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>
    </div>
    ${mode === "ready" ? "" : `<button class="button compact ghost" type="button" data-scroll-health>${escapeHtml(t("inspectHealth"))}</button>`}`;
}

function renderQuickChannels() {
  const state = app.state || {};
  const entries = [
    { view: "channels", name: t("navChannels"), icon: icons.channels, hint: t("groupsAllowed", { count: state.qq?.allowedGroups?.length || 0 }), enabled: state.channels?.qq },
    { view: "intelligence", name: t("navIntelligence"), icon: icons.activity, hint: t("actionIntelligenceHint") },
    { view: "memory", name: t("navMemory"), icon: icons.memory, hint: t("actionMemoryHint") },
    { view: "activity", name: t("navActivity"), icon: icons.logs, hint: t("actionLogsHint") }
  ];
  $("#quickChannels").innerHTML = entries.map((entry) => `
    <button class="quick-channel" type="button" data-go-view="${entry.view}">
      <span class="channel-avatar ${entry.view}">${entry.icon}</span>
      <span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.hint)}</small></span>
      <span class="quick-arrow" aria-hidden="true">›</span>
    </button>`).join("");
}

function renderMaintenance() {
  if (!app.maintenance) return;
  renderOverviewStats();
  renderOverviewBrief();
  renderServiceTopology();
  renderRuntimePulse();
  renderHealthCards();
  renderQuota();
  renderChannelSettings();
  renderBotControls();
  renderSettings();
}

function renderHealthCards() {
  const h = app.maintenance || {};
  const queue = h.codex?.queue || {};
  const cards = [
    { name: t("oneBot"), icon: icons.oneBot, state: h.oneBot?.ok ? "ok" : "bad", lines: [h.oneBot?.nickname || null, h.oneBot?.selfId ? `QQ ${h.oneBot.selfId}` : null, h.oneBot?.lastError] },
    { name: t("codexCli"), icon: icons.codex, state: h.codex?.pathExists && h.codex?.lastOk !== false ? "ok" : "bad", lines: [h.codex?.pathExists ? t("pathReady") : t("pathMissing"), h.codex?.lastRunAt ? t("lastRun", { time: formatTime(h.codex.lastRunAt) }) : t("neverRun"), t("queueState", { active: queue.active || 0, pending: queue.pending || 0, max: queue.maxPending ?? "∞" }), h.codex?.lastError] },
    { name: t("qqChannel"), icon: icons.qq, state: h.channels?.qq ? "ok" : "off", lines: [h.channels?.qq ? t("enabled") : t("disabled"), t("groupsAllowed", { count: h.qq?.allowedGroups || 0 }), t("recentEventsCount", { count: h.qq?.recentEvents || 0 })] },
    { name: t("webLookup"), icon: icons.globe, state: !h.webLookup?.enabled ? "off" : h.webLookup?.lastOk === false ? "bad" : "ok", lines: [h.webLookup?.enabled ? t("enabled") : t("disabled"), t("provider", { value: h.webLookup?.effectiveProvider || t("unknown") }), h.webLookup?.lastQuery ? t("lastQuery", { value: h.webLookup.lastQuery }) : t("noQuery"), h.webLookup?.lastError] }
  ];
  $("#healthGrid").classList.remove("stale");
  $("#healthGrid").innerHTML = cards.map((card) => {
    const lines = card.lines.filter(Boolean);
    return `<article class="health-card ${card.state}" title="${escapeHtml(lines.join(" · "))}">
      <span class="health-service-icon">${card.icon}</span>
      <span class="health-copy"><strong>${escapeHtml(card.name)}</strong><small>${escapeHtml(lines.slice(0, 2).join(" · "))}</small></span>
      <span class="health-badge">${escapeHtml(card.state === "ok" ? t("healthy") : card.state === "bad" ? t("attention") : card.state === "busy" ? t("running") : t("disabled"))}</span>
    </article>`;
  }).join("");
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
  const account = state.qq?.selfPersona?.account || {};
  const queueActive = Number(h.qq?.activeGenerations || 0);
  const queuePending = Number(h.qq?.pendingReplies || 0);
  const connectionRows = [
    ["QQ ACCOUNT", h.oneBot?.nickname || account.nickname || "QQ", h.oneBot?.selfId || account.userId || "—", h.oneBot?.ok ? "ok" : "bad"],
    ["ONEBOT BRIDGE", h.oneBot?.ok ? t("healthy") : t("attention"), h.oneBot?.lastCheckedAt ? formatTime(h.oneBot.lastCheckedAt) : "—", h.oneBot?.ok ? "ok" : "bad"],
    ["MESSAGE QUEUE", `${t("active")} ${queueActive}`, `${t("pending")} ${queuePending}`, queueActive || queuePending ? "busy" : "ok"]
  ];
  $("#qqChannelMeta").innerHTML = connectionRows.map(([label, value, detail, kind]) => `<div class="connection-row ${kind}"><span class="connection-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><code>${escapeHtml(detail)}</code><i aria-hidden="true"></i></div>`).join("");
  renderQqStickerFrequency(state.qq?.humanBehavior?.stickerFrequency || {});
  renderQqSelfPersona(state.qq?.selfPersona || {});
  renderQqAdaptiveLearning(state.qq?.humanBehavior?.adaptiveLearning || {});
  renderQqColdInterest(
    state.qq?.proactive?.coldGroupInterest || {},
    state.qq?.humanBehavior?.adaptiveLearning || {},
    state.qq?.events || []
  );
  renderQqPrivateInterest(
    state.qq?.humanBehavior?.privateAdaptiveLearning || {},
    state.qq?.events || []
  );
  renderGroups(state.qq?.allowedGroups || []);
}

function renderBotControls() {
  const form = $("#botSettingsForm");
  const settings = app.state?.qq?.botSettings;
  const hasSettings = Boolean(settings);
  $$('input, button', form).forEach((control) => { control.disabled = !hasSettings; });
  if (!settings) {
    $("#botDiagnostics").innerHTML = `<span class="diagnostic-chip warn">${escapeHtml(t("waitingBotSettings"))}</span>`;
    return;
  }

  if (!form.contains(document.activeElement)) {
    $("#botEnhancerToggle").checked = settings.enhancerEnabled;
    $("#botWebLookupToggle").checked = settings.webLookupEnabled;
    $("#botProactiveToggle").checked = settings.proactiveEnabled;
    $("#botJudgeToggle").checked = settings.judgeEnabled;
    $("#botJudgeMessages").value = settings.judgeEveryMessages;
    $("#botJudgeMinutes").value = settings.judgeEveryMinutes;
    $("#botJudgeModel").value = settings.judgeModel || "";
    $("#botJudgeTimeout").value = settings.judgeTimeoutMs;
    $("#botJudgeRecent").value = settings.judgeMaxRecentMessages;
  }

  const activeGenerations = sumValues(app.state?.qq?.activeGenerationCounts);
  const pendingReplies = sumValues(app.state?.qq?.pendingReplyCounts);
  const provider = app.maintenance?.webLookup?.effectiveProvider || t("unknown");
  const safeFetchMode = app.state?.network?.safeFetchMode === "proxy-compatible" ? t("safeFetchProxy") : t("safeFetchStrict");
  $("#botDiagnostics").innerHTML = [
    [t("diagnosticJudgeProvider", { value: settings.judgeProvider || "openrouter" }), ""],
    [settings.judgeApiKeyConfigured ? t("diagnosticJudgeKeyReady") : t("diagnosticJudgeKeyMissing"), settings.judgeApiKeyConfigured ? "" : "bad"],
    [t("diagnosticSearchProvider", { value: provider }), settings.webLookupEnabled ? "" : "warn"],
    [t("diagnosticSafeFetchMode", { value: safeFetchMode }), ""],
    [t("diagnosticActiveGeneration", { value: activeGenerations }), activeGenerations ? "warn" : ""],
    [t("diagnosticPendingReplies", { value: pendingReplies }), pendingReplies ? "warn" : ""]
  ].map(([label, kind]) => `<span class="diagnostic-chip ${kind}">${escapeHtml(label)}</span>`).join("");
}

function collectBotSettings() {
  return {
    enhancerEnabled: $("#botEnhancerToggle").checked,
    webLookupEnabled: $("#botWebLookupToggle").checked,
    proactiveEnabled: $("#botProactiveToggle").checked,
    judgeEnabled: $("#botJudgeToggle").checked,
    judgeEveryMessages: Number($("#botJudgeMessages").value),
    judgeEveryMinutes: Number($("#botJudgeMinutes").value),
    judgeModel: $("#botJudgeModel").value.trim(),
    judgeTimeoutMs: Number($("#botJudgeTimeout").value),
    judgeMaxRecentMessages: Number($("#botJudgeRecent").value)
  };
}

function setBotControlStatus(status, messageKey) {
  const node = $("#botControlStatus");
  node.className = `save-state ${status === "ok" ? "" : status}`;
  node.textContent = t(messageKey);
}

async function saveBotSettings(control) {
  const form = $("#botSettingsForm");
  if (!form.reportValidity()) return false;
  const controls = $$('input, button', form);
  controls.forEach((item) => { item.disabled = true; });
  setBotControlStatus("saving", "settingsSaving");
  try {
    app.state = await api("/api/qq/bot-settings", {
      method: "POST",
      body: JSON.stringify(collectBotSettings())
    }, { key: "bot-settings" });
    app.lastFetch.state = Date.now();
    setBotControlStatus("ok", "settingsSynced");
    renderState();
    showToast(t("botSettingsSaved"), "success");
    return true;
  } catch (error) {
    setBotControlStatus("error", "settingsSaveFailed");
    document.activeElement?.blur?.();
    renderBotControls();
    showToast(error.message, "error");
    if (control) control.focus();
    return false;
  } finally {
    controls.forEach((item) => { item.disabled = false; });
  }
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

function renderQqSelfPersona(summary) {
  const persona = summary?.persona || {};
  const generation = summary?.generation || {};
  const totals = summary?.totals || {};
  const policy = summary?.updatePolicy || {};
  const name = summary?.account?.nickname || persona.name || "Bot";
  const keywords = Array.isArray(persona.interestKeywords) ? persona.interestKeywords : [];
  const interests = Array.isArray(persona.interests) ? persona.interests : [];
  const generated = Number(generation.revision || 0) > 0;
  const revision = generated
    ? t("selfPersonaGenerated", { revision: generation.revision, time: formatTime(generation.generatedAt) })
    : t("selfPersonaCollecting");
  const progress = t("selfPersonaProgress", {
    human: totals.humanMessages || 0,
    bot: totals.botReplies || 0,
    summaries: summary.summarizedScopes || 0,
    scopes: summary.scopeCount || 0
  });
  const policyText = policy.scopeInitialMessages
    ? t("selfPersonaPolicy", {
      initial: policy.scopeInitialMessages,
      messages: policy.scopeMessages,
      botReplies: policy.scopeBotReplies,
      scopeHours: policy.scopeCooldownHours,
      globalHours: policy.generationCooldownHours
    })
    : "";
  const globalPolicyText = policy.generationInitialMessages
    ? t("selfPersonaGlobalPolicy", {
      initial: policy.generationInitialMessages,
      messages: policy.generationMessages,
      botReplies: policy.generationBotReplies,
      summaries: policy.generationScopeSummaries,
      hours: policy.generationCooldownHours,
      retry: policy.failureRetryHours
    })
    : "";
  const keywordChips = keywords.length
    ? keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")
    : `<span>${escapeHtml(t("selfPersonaCollecting"))}</span>`;
  const interestChips = interests.length
    ? interests.slice(0, 12).map((interest) => `<span>${escapeHtml(`${interest.topic || "—"} · ${Math.round(Number(interest.weight || 0))}%`)}</span>`).join("")
    : `<span>—</span>`;
  const description = persona.interestParagraph || persona.selfDescription || "";
  $("#qqSelfPersona").innerHTML = `<article class="behavior-frequency-item persona-summary-card"><div class="persona-summary-head"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(revision)}</small></div><p>${escapeHtml(progress)}</p>${policyText ? `<p>${escapeHtml(policyText)}</p>` : ""}${globalPolicyText ? `<p>${escapeHtml(globalPolicyText)}</p>` : ""}${description ? `<p class="persona-summary-copy">${escapeHtml(description)}</p>` : ""}<section><h4>${escapeHtml(t("selfPersonaKeywords"))}</h4><div>${keywordChips}</div></section><section><h4>${escapeHtml(t("selfPersonaTopics"))}</h4><div>${interestChips}</div></section></article>`;
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
        t("detailInterruptionRate", { value: formatRate(item.interruptionRate), samples: item.interruptionSampleSize || 0 }),
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
        t("detailLearnedHours", { value: cold.socialHours?.label || item.socialHours?.label || "—" }),
        t("detailUnanswered", { value: cold.unansweredBotStreak ?? item.unansweredBotStreak ?? 0 }),
        t("detailInterestMultiplier", { value: cold.interestMultiplier ?? 1 }),
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
  const policyHours = policy.allowedHours === "learned-per-group" ? t("learnedHours") : (policy.allowedHours || policy.fallbackAllowedHours || "09:00-23:00");
  const policyText = t("coldInterestPolicy", { hours: policyHours, retry: policy.retryCooldownHours ?? 3 });
  const groupCards = entries.map(([groupId, item]) => {
    const cold = item.coldInterest || {};
    const statusClass = cold.eligible ? "ready" : cold.awaitingHuman ? "waiting" : "idle";
    return `<article class="cold-interest-item ${statusClass}"><div class="cold-interest-head"><strong>${escapeHtml(t("groupLabel", { value: groupId }))}</strong><span>${escapeHtml(formatAdaptiveReason(cold.reason))}</span></div><div class="cold-interest-metrics"><span>${escapeHtml(t("detailLearnedHours", { value: cold.socialHours?.label || item.socialHours?.label || "—" }))}</span><span>${escapeHtml(t("detailColdIdle", { idle: cold.idleHours ?? "—", required: cold.idleHoursRequired ?? "—" }))}</span><span>${escapeHtml(t("detailUnanswered", { value: cold.unansweredBotStreak ?? item.unansweredBotStreak ?? 0 }))}</span><span>${escapeHtml(t("detailInterestMultiplier", { value: cold.interestMultiplier ?? 1 }))}</span><span>${escapeHtml(t("detailLastHuman", { value: formatTime(cold.lastActivityAt || item.lastMessageAt) }))}</span><span>${escapeHtml(t("detailColdThreshold", { value: formatTime(cold.thresholdReachedAt) }))}</span><span>${escapeHtml(t("detailColdCheck", { value: formatTime(cold.lastCheckAt || item.lastColdProactiveCheckAt) }))}</span></div></article>`;
  }).join("");
  const decisions = (events || []).filter((record) => record.event?.coldProactive).slice(0, 5);
  const recent = decisions.length
    ? `<div class="cold-decision-list">${decisions.map((record) => `<article><span>${escapeHtml(t("groupLabel", { value: record.event?.groupId || "—" }))} · ${escapeHtml(formatColdDecisionOutcome(record))}</span><time>${escapeHtml(formatRelative(record.receivedAt))}</time>${record.reply ? `<p>${escapeHtml(record.reply)}</p>` : `<p>${escapeHtml(record.decision?.reason || formatAdaptiveReason(record.decision?.coldInterest?.reason))}</p>`}</article>`).join("")}</div>`
    : `<p class="token-empty">${escapeHtml(t("noColdInterestDecisions"))}</p>`;
  $("#qqColdInterest").innerHTML = `<p class="cold-interest-policy">${escapeHtml(policyText)}</p>${groupCards || `<p class="token-empty">${escapeHtml(t("noColdInterest"))}</p>`}<div class="cold-recent-head"><strong>${escapeHtml(t("coldInterestRecent"))}</strong></div>${recent}`;
}

function renderQqPrivateInterest(contacts, events) {
  const entries = Object.entries(contacts || {}).filter(([, item]) => Number(item.sampleSize || 0) > 0).sort(([left], [right]) => left.localeCompare(right));
  const cards = entries.map(([userId, item]) => {
    const plan = item.privateInterest || {};
    const statusClass = plan.eligible ? "ready" : Number(plan.unansweredBotStreak || 0) > 0 ? "waiting" : "idle";
    return `<article class="cold-interest-item ${statusClass}"><div class="cold-interest-head"><strong>${escapeHtml(t("privateContact", { value: userId }))}</strong><span>${escapeHtml(formatAdaptiveReason(plan.reason))}</span></div><div class="cold-interest-metrics"><span>${escapeHtml(t("privatePhase", { value: formatPrivatePhase(plan.phase) }))}</span><span>${escapeHtml(t("privateFrequency", { value: formatPrivateFrequency(plan.frequency) }))}</span><span>${escapeHtml(t("privateProbability", { value: formatRate(plan.probability) }))}</span><span>${escapeHtml(t("detailLearnedHours", { value: plan.socialHours?.label || item.socialHours?.label || "—" }))}</span><span>${escapeHtml(t("detailColdIdle", { idle: plan.idleHours ?? "—", required: plan.shortWindowHours ?? "—" }))}</span><span>${escapeHtml(t("detailUnanswered", { value: plan.unansweredBotStreak ?? item.unansweredBotStreak ?? 0 }))}</span><span>${escapeHtml(t("detailInterestMultiplier", { value: plan.interestMultiplier ?? 1 }))}</span><span>${escapeHtml(t("detailNextCheck", { value: formatTime(plan.nextCheckAt) }))}</span></div></article>`;
  }).join("");
  const decisions = (events || []).filter((record) => record.event?.privateProactive).slice(0, 5);
  const recent = decisions.length
    ? `<div class="cold-decision-list">${decisions.map((record) => `<article><span>${escapeHtml(t("privateContact", { value: record.event?.senderId || "—" }))} · ${escapeHtml(formatColdDecisionOutcome(record))}</span><time>${escapeHtml(formatRelative(record.receivedAt))}</time><p>${escapeHtml(record.decision?.reason || formatAdaptiveReason(record.decision?.privateInterest?.phase))}</p></article>`).join("")}</div>`
    : `<p class="token-empty">${escapeHtml(t("noPrivateInterestDecisions"))}</p>`;
  $("#qqPrivateInterest").innerHTML = `${cards || `<p class="token-empty">${escapeHtml(t("noPrivateInterest"))}</p>`}<div class="cold-recent-head"><strong>${escapeHtml(t("privateRecent"))}</strong></div>${recent}`;
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
    activity_typical: "群当前一般活跃", activity_low: "群当前低活跃", activity_unknown: "活跃度仍在学习",
    private_too_soon: "距离上次互动太近", private_check_cooldown: "私聊判断冷却中", private_short_candidate: "短期兴趣候选",
    private_middle_candidate: "中期低概率候选", private_long_candidate: "长期兴趣回升候选"
  };
  const en = {
    learning_sample_low: "learning sample is low", outside_social_hours: "outside allowed hours", no_human_context: "no human context",
    awaiting_human_after_cold_proactive: "waiting for a human", cold_check_cooldown: "decision cooldown", group_not_cold: "quiet threshold not reached",
    bot_spoke_recently: "Bot spoke recently", cold_group_time_due: "ready for a decision", ordinary_interest_pending: "ordinary interest is pending",
    reply_queue_pending: "reply queue is pending", reply_generation_active: "reply generation is active", activity_high: "currently high activity",
    activity_typical: "currently typical activity", activity_low: "currently low activity", activity_unknown: "activity still learning",
    private_too_soon: "too soon since the last interaction", private_check_cooldown: "private decision cooldown", private_short_candidate: "short-term interest candidate",
    private_middle_candidate: "middle low-probability candidate", private_long_candidate: "long-term rising-interest candidate"
  };
  return (app.language === "en" ? en : zh)[value] || value || "—";
}

function formatPrivatePhase(value) {
  const labels = app.language === "en"
    ? { short: "short", middle: "middle", long: "long" }
    : { short: "短期", middle: "中期低谷", long: "长期回升" };
  return labels[value] || value || "—";
}

function formatPrivateFrequency(value) {
  const labels = app.language === "en"
    ? { high: "high", typical: "typical", low: "low" }
    : { high: "高频", typical: "一般", low: "低频" };
  return labels[value] || value || "—";
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

function renderEvents() {
  if (!app.state) return;
  const qqEvents = app.state.qq?.events || [];
  $("#qqEventCount").textContent = String(qqEvents.length);
  $("#qqEvents").innerHTML = qqEvents.length ? qqEvents.slice(0, 12).map(renderQqEvent).join("") : emptyState(t("noEvents"));
}

function renderQqEvent(record) {
  const event = record.event || {};
  const ok = Boolean(record.decision?.ok);
  return `<article class="event-row">
    <time>${escapeHtml(formatTime(record.receivedAt))}</time>
    <span class="event-scope">${escapeHtml(event.groupId ? t("groupLabel", { value: event.groupId }) : "PRIVATE")}</span>
    <strong>${escapeHtml(event.senderLabel || event.senderName || "QQ")}</strong>
    <span class="event-outcome ${ok ? "ok" : "muted"}">${escapeHtml(ok ? t("replied") : t("ignored"))}</span>
    <p>${escapeHtml(event.text || "—")}${record.reply ? `<small>${escapeHtml(t("replyLabel"))}${escapeHtml(record.reply)}</small>` : ""}</p>
  </article>`;
}

function renderRecentTimeline() {
  if (!app.state) return;
  const rows = (app.state.qq?.events || []).map((record) => ({ kind: "qq", at: record.receivedAt, title: record.event?.senderLabel || record.event?.senderName || "QQ", text: record.reply || record.event?.text || "" })).sort((a, b) => Date.parse(b.at || "") - Date.parse(a.at || "")).slice(0, 7);
  $("#recentTimeline").innerHTML = rows.length ? rows.map((row) => `<article class="timeline-item"><span class="timeline-avatar ${row.kind}">${icons.qq}</span><div class="timeline-copy"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.text || "—")}</p></div><time class="timeline-time">${escapeHtml(formatRelative(row.at))}</time></article>`).join("") : emptyState(t("noRecentActivity"));
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
  else html = renderQqMemory(app.memory.qq || {});
  $("#memoryView").innerHTML = html || emptyState(t("noMemory"));
}

function renderUnifiedMemory(memory) {
  const entries = filterMemoryEntries(memory.entries || []);
  const counts = countUnifiedEntries(memory.entries || []);
  const settings = memory.settings || {};
  const stateText = Object.values(memory.currentState || {}).filter(Boolean).join(" · ");
  const categories = [
    [t("unifiedEntries"), memory.entries?.length || 0], [t("handoffs"), counts.handoff], [t("ideas"), counts.idea],
    [t("projects"), counts.projectNote], [t("todos"), counts.openLoop], [t("notes"), counts.note + counts.dailyState]
  ];
  return `<div class="memory-overview memory-browser">
    <aside class="memory-index-pane">
      <div class="memory-pane-heading"><span class="section-kicker">INDEX</span><h3>${escapeHtml(t("memoryType"))}</h3></div>
      <nav class="memory-category-list" aria-label="${escapeHtml(t("memoryType"))}">${categories.map(([label, value], index) => `<span class="memory-category ${index === 0 ? "active" : ""}"><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`).join("")}</nav>
      <div class="memory-setting-grid">
        ${memorySetting("autoWriteOnSkillRecall", t("autoSkillMemory"), t("autoSkillHint"), Boolean(settings.autoWriteOnSkillRecall))}
        ${memorySetting("manualHandoffCommand", t("manualHandoff"), t("manualHandoffHint"), settings.manualHandoffCommand !== false)}
      </div>
    </aside>
    <section class="memory-list-pane">
      <div class="memory-section-head"><div><span class="section-kicker">UNIFIED</span><h3>${escapeHtml(t("unifiedEntries"))}</h3></div><p>${escapeHtml(memory.updatedAt ? t("updated", { time: formatTime(memory.updatedAt) }) : "")}</p></div>
      <div class="memory-entries">${entries.length ? entries.map((entry) => renderMemoryEntry({ role: `${formatUnifiedType(entry.type)} · ${entry.topic || ""}`, text: entry.summary, at: entry.updatedAt })).join("") : emptyState(t("noMemory"))}</div>
    </section>
    <aside class="memory-inspector-pane">
      <article class="memory-state-card"><span class="section-kicker">CURRENT STATE</span><h3>${escapeHtml(t("recentState"))}</h3><p>${escapeHtml(stateText || t("noState"))}</p></article>
      ${memory.latestHandoff?.summary ? `<article class="memory-state-card"><span class="section-kicker">HANDOFF</span><h3>${escapeHtml(t("latestHandoff"))}</h3><p>${escapeHtml(memory.latestHandoff.summary)}</p></article>` : ""}
      <div class="memory-count-grid">${categories.slice(0, 4).map(([label, value]) => memoryCount(value, label)).join("")}</div>
    </aside>
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
  const signature = entries.map((entry) => entry.id || `${entry.ts}:${entry.traceId || ""}:${entry.message || ""}`).join("|");
  if (signature === app.lastLogSignature && $("#logStream").childElementCount > 0) return;
  app.lastLogSignature = signature;
  const stream = $("#logStream");
  const previousScrollTop = stream.scrollTop;
  stream.innerHTML = entries.length ? entries.map((entry, index) => renderLogEntry(entry, index)).join("") : emptyState(t("noLogs"));
  if (app.logFollow) stream.scrollTop = stream.scrollHeight;
  else stream.scrollTop = previousScrollTop;
}

function renderLogEntry(entry, index) {
  const duration = getLogDuration(entry);
  const level = logClassToken(entry.level, "info");
  const category = logClassToken(entry.category, "system");
  const message = app.language === "en" ? entry.message : (entry.messageZh || entry.message);
  const error = app.language === "en" ? formatLogFieldValue(entry.details?.error || entry.details?.modelError || entry.details?.diagnostic || "") : String(entry.errorZh || "");
  const trace = entry.traceId ? String(entry.traceId).slice(0, 8) : "";
  const durationClass = duration >= 10_000 ? "bad" : duration >= 2_000 ? "slow" : "";
  const details = renderLogDetails(entry);
  return `<button class="log-entry level-${level} category-${category}" type="button" data-log-index="${index}"><span class="log-entry-head"><time class="log-time">${escapeHtml(formatClock(entry.ts))}</time><span class="level-badge ${level}">${escapeHtml(formatLogLevel(level))}</span><span class="log-category">${escapeHtml(formatLogCategory(category))}</span><span class="log-copy"><span class="log-message-line"><span class="log-message">${escapeHtml(message || "")}</span>${trace ? `<span class="log-trace">${escapeHtml(trace)}</span>` : ""}</span>${error ? `<small class="log-error">${escapeHtml(error)}</small>` : ""}</span><span class="log-duration ${durationClass}">${escapeHtml(duration == null ? "" : formatMs(duration))}</span></span>${details}</button>`;
}

function renderLogDetails(entry) {
  const excluded = new Set(["ts", "level", "category", "message", "messageZh", "errorZh", "details", "traceId"]);
  const fields = [];
  if (entry.traceId) fields.push(["traceId", entry.traceId]);
  for (const [key, value] of Object.entries(entry)) {
    if (!excluded.has(key) && value != null && value !== "") fields.push([key, value]);
  }
  for (const [key, value] of Object.entries(entry.details || {})) {
    if (value != null && value !== "") fields.push([key, value]);
  }
  if (!fields.length) return "";
  return `<span class="log-detail-grid">${fields.map(([key, value]) => `<span class="log-detail ${logDetailClass(key)}"><b>${escapeHtml(formatLogFieldLabel(key))}</b><span>${escapeHtml(formatLogFieldValue(value))}</span></span>`).join("")}</span>`;
}

function logDetailClass(key) {
  const text = String(key || "").toLowerCase();
  if (text.includes("error") || text.includes("diagnostic") || text === "code") return "is-error";
  if (text.includes("duration") || text.endsWith("ms") || text.includes("timeout")) return "is-time";
  if (text.includes("id") || text.includes("trace") || text.includes("span")) return "is-id";
  if (text.includes("status") || text.includes("outcome") || text.includes("result") || text.includes("reason")) return "is-result";
  return "";
}

function formatLogFieldLabel(key) {
  if (app.language === "en") return key;
  return {
    id: "日志 ID", schemaVersion: "结构版本", traceId: "链路", spanId: "片段", parentSpanId: "父片段",
    groupId: "群", senderId: "发送者", messageId: "消息", messageType: "消息类型", outcome: "结果", status: "状态",
    reason: "原因", decisionReason: "判断原因", durationMs: "耗时", totalDurationMs: "总耗时", generationDurationMs: "生成耗时",
    sendDurationMs: "发送耗时", memoryDurationMs: "记忆耗时", error: "错误", modelError: "模型错误", diagnostic: "诊断",
    diagnosticLines: "诊断明细", code: "错误码", model: "模型", provider: "服务", triggerMode: "触发方式", proactive: "主动触发"
  }[key] || key;
}

function formatLogFieldValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return app.language === "en" ? String(value) : (value ? "是" : "否");
  if (typeof value === "number") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatLogLevel(level) {
  if (app.language === "en") return String(level || "info").toUpperCase();
  return { debug: "调试", info: "信息", success: "成功", warn: "警告", error: "错误" }[level] || level;
}

function formatLogCategory(category) {
  if (app.language === "en") return category;
  return { system: "系统", qq: "QQ", onebot: "OneBot", codex: "Codex", web: "接口", search: "搜索", interest: "兴趣", learning: "学习", memory: "记忆", command: "指令", lifecycle: "流程" }[category] || category;
}

function logClassToken(value, fallback) {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 40) || fallback;
}

function compactUiText(value, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function updateLogCategories(categories) {
  const select = $("#logCategory");
  const current = select.value;
  for (const name of Object.keys(categories)) app.logCategories.add(name);
  if (current) app.logCategories.add(current);
  const names = [...app.logCategories].sort();
  select.innerHTML = `<option value="">${escapeHtml(t("allCategories"))}</option>${names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(formatLogCategory(name))}${categories[name] == null ? "" : ` (${escapeHtml(categories[name])})`}</option>`).join("")}`;
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
  const network = state.network || {};
  const lanEnabled = Boolean(network.allowLanAccess);
  $("#lanAccessToggle").checked = lanEnabled;
  $("#lanAccessToggle").disabled = !app.state || network.editable === false;
  $("#lanAccessHint").textContent = network.editable === false ? t("lanManagedByEnvironment") : t("lanAccessHint");
  const lanUrls = Array.isArray(network.lanUrls) ? network.lanUrls : [];
  $("#lanAccessUrls").textContent = lanEnabled
    ? (lanUrls.join("\n") || t("lanNoAddress"))
    : t("lanLocalOnly");
  $("#copyLanToken").disabled = !lanEnabled || !network.apiTokenConfigured || !isLoopbackBrowser();
  const publicTunnel = network.publicTunnel || {};
  const localBrowser = isLoopbackBrowser();
  const tunnelEnabled = Boolean(publicTunnel.enabled);
  const tunnelRunning = Boolean(publicTunnel.running && publicTunnel.publicUrl);
  $("#publicTunnelToggle").checked = tunnelEnabled;
  $("#publicTunnelToggle").disabled = !app.state || !localBrowser || Boolean(publicTunnel.starting);
  $("#publicTunnelHint").textContent = !localBrowser
    ? t("publicTunnelRemoteManaged")
    : publicTunnel.lastError
      ? t("publicTunnelError", { error: publicTunnel.lastError })
      : publicTunnel.available === false
        ? t("publicTunnelUnavailable")
        : tunnelRunning
          ? t("publicTunnelRunningHint")
          : t("publicTunnelHint");
  $("#publicTunnelUrl").textContent = tunnelRunning
    ? publicTunnel.publicUrl
    : publicTunnel.starting
      ? t("publicTunnelStarting")
      : t("publicTunnelOff");
  $("#copyPublicTunnelUrl").disabled = !tunnelRunning;
  $("#copyPublicTunnelToken").disabled = !tunnelRunning || !network.apiTokenConfigured || !localBrowser;
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

async function setLanAccess(enabled, control) {
  const previous = !enabled;
  if (enabled && !await confirmAction(t("lanEnableTitle"), t("lanEnableMessage"))) {
    control.checked = previous;
    return;
  }
  try {
    const nextState = await mutate(() => api("/api/network/lan-access", {
      method: "POST",
      body: JSON.stringify({ enabled })
    }), { control, success: t("lanAccessUpdated") });
    app.state = nextState;
    app.lastFetch.state = Date.now();
    renderState();
  } catch {
    control.checked = previous;
  }
}

async function setPublicTunnel(enabled, control) {
  const previous = !enabled;
  if (enabled && !await confirmAction(t("publicTunnelEnableTitle"), t("publicTunnelEnableMessage"))) {
    control.checked = previous;
    return;
  }
  try {
    const nextState = await mutate(() => api("/api/network/public-tunnel", {
      method: "POST",
      body: JSON.stringify({ enabled })
    }), { control, success: t("publicTunnelUpdated") });
    app.state = nextState;
    app.lastFetch.state = Date.now();
    renderState();
  } catch {
    control.checked = previous;
    await refreshState({ quiet: true }).catch(() => undefined);
  }
}

async function saveGroups(groups, control) {
  await mutate(() => api("/api/qq/groups", { method: "POST", body: JSON.stringify({ allowedGroups: groups }) }), { control });
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
function isLoopbackBrowser() { return location.protocol === "file:" || ["localhost", "127.0.0.1", "::1"].includes(location.hostname); }
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
  oneBot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M9 7V5m6 2V5M8 12h.1m7.9 0h.1M9 16h6"/></svg>',
  codex: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5-6 7 6 7m6-14 6 7-6 7m1-16-8 18"/></svg>',
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
    { id: "view-channels", label: t("navChannels"), hint: t("actionChannelsHint"), icon: icons.channels, keywords: "qq onebot group 通道 群 白名单" },
    { id: "view-intelligence", label: t("navIntelligence"), hint: t("actionIntelligenceHint"), icon: icons.activity, keywords: "bot behavior proactive learning enhancer 行为 主动 学习 增强" },
    { id: "view-memory", label: t("navMemory"), hint: t("actionMemoryHint"), icon: icons.memory, keywords: "context recall search 记忆 上下文 搜索" },
    { id: "view-activity", label: t("navActivity"), hint: t("actionLogsHint"), icon: icons.logs, keywords: "logs trace debug 日志 追踪 调试" },
    { id: "view-settings", label: t("navSettings"), hint: t("actionSettingsHint"), icon: icons.settings, keywords: "preferences language refresh 设置 主题 语言" },
    { id: "refresh", label: t("actionRefresh"), hint: t("actionRefreshHint"), icon: icons.refresh, keywords: "reload sync 刷新 同步" },
    { id: "health", label: t("actionHealth"), hint: t("actionHealthHint"), icon: icons.pulse, keywords: "diagnose service status 检查 健康 服务" },
    { id: "theme", label: t("actionTheme"), hint: t("actionThemeHint"), icon: icons.theme, keywords: "dark light appearance 深色 明亮 外观" },
    { id: "raw", label: t("actionApi"), hint: t("actionApiHint"), icon: icons.raw, keywords: "api json state raw 原始 状态" },
    { id: "add-group", label: t("actionAddGroup"), hint: t("actionAddGroupHint"), icon: icons.add, keywords: "qq allowlist whitelist 群 白名单 添加" }
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
  if (id === "add-group") {
    setView("channels", { focus: false });
    requestAnimationFrame(() => $("#groupInput").focus());
  }
}

function renderInitialShell() {
  if (app.state || app.maintenance) return;
  $("#overviewStats").innerHTML = Array.from({ length: 4 }, () => `<article class="stat-card loading"><span class="stat-icon skeleton"></span><strong class="skeleton"></strong><p class="skeleton"></p></article>`).join("");
  $("#overviewBrief").className = "overview-brief loading";
  $("#overviewBrief").innerHTML = `<div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>`;
  $("#quickChannels").innerHTML = `<article class="quick-channel"><span class="channel-avatar skeleton"></span><div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line"></div></div></article>`;
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
    const entries = app.logs.entries || [];
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
$("#lanAccessToggle").addEventListener("change", (event) => { void setLanAccess(event.target.checked, event.target); });
$("#publicTunnelToggle").addEventListener("change", (event) => { void setPublicTunnel(event.target.checked, event.target); });
$("#groupInput").addEventListener("input", (event) => event.target.removeAttribute("aria-invalid"));

$("#addGroupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#groupInput");
  const value = input.value.trim();
  if (!/^\d{4,20}$/.test(value)) { input.setAttribute("aria-invalid", "true"); showToast(t("groupInvalid"), "error"); input.focus(); return; }
  input.removeAttribute("aria-invalid");
  const groups = [...new Set([...(app.state?.qq?.allowedGroups || []), value])];
  await saveGroups(groups, event.submitter).then(() => { input.value = ""; }).catch(() => undefined);
});

$("#botSettingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveBotSettings(event.submitter);
});
for (const selector of ["#botEnhancerToggle", "#botWebLookupToggle", "#botProactiveToggle", "#botJudgeToggle"]) {
  $(selector).addEventListener("change", async (event) => {
    if (event.target === $("#botEnhancerToggle") && !event.target.checked) $("#botProactiveToggle").checked = false;
    if (event.target === $("#botProactiveToggle") && event.target.checked) $("#botEnhancerToggle").checked = true;
    await saveBotSettings(event.target);
  });
}

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
$("#liveLogsToggle").addEventListener("change", (event) => {
  app.liveLogs = event.target.checked;
  setLiveLogState(app.liveLogs ? "active" : "paused");
  if (app.liveLogs) void refreshLogs({ quiet: true });
});
$("#logFollowToggle").addEventListener("change", (event) => {
  app.logFollow = event.target.checked;
  if (app.logFollow) $("#logStream").scrollTop = $("#logStream").scrollHeight;
});
$("#logLimit").addEventListener("change", () => { app.lastLogSignature = ""; void refreshLogs({ quiet: true }); });
$("#logStream").addEventListener("scroll", (event) => {
  if (!app.logFollow) return;
  const stream = event.currentTarget;
  if (stream.scrollHeight - stream.scrollTop - stream.clientHeight > 120) {
    app.logFollow = false;
    $("#logFollowToggle").checked = false;
  }
});

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
async function copyNetworkAccessToken(button) {
  button.disabled = true;
  try {
    const payload = await api("/api/network/access-token");
    await copyText(payload.token, t("lanTokenCopied"));
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    renderSettings();
  }
}
$("#copyLanToken").addEventListener("click", (event) => { void copyNetworkAccessToken(event.currentTarget); });
$("#copyPublicTunnelToken").addEventListener("click", (event) => { void copyNetworkAccessToken(event.currentTarget); });
$("#copyPublicTunnelUrl").addEventListener("click", () => {
  void copyText($("#publicTunnelUrl").textContent, t("publicTunnelUrlCopied"));
});
$("#copyLogDetail").addEventListener("click", () => { void copyText($("#logDetailContent").textContent); });

async function copyText(value, success = t("copied")) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(String(value || ""));
    showToast(success, "success");
  } catch {
    const input = document.createElement("textarea");
    input.className = "copy-buffer";
    input.value = String(value || "");
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    showToast(copied ? success : t("copyFailed"), copied ? "success" : "error");
  }
}

window.addEventListener("hashchange", () => setView(location.hash.slice(1), { updateHash: false }));
document.addEventListener("visibilitychange", () => { if (!document.hidden && app.autoRefresh) void refreshView({ quiet: true }); });

setInterval(() => {
  if (document.hidden) return;
  const now = Date.now();
  const base = app.refreshSeconds * 1_000;
  if (app.view === "activity" && app.liveLogs && !app.controllers.has("logs") && now - app.lastFetch.logs >= 1_000) void refreshLogs({ quiet: true }).catch(() => undefined);
  if (!app.autoRefresh) return;
  if (!app.controllers.has("state") && now - app.lastFetch.state >= base) void refreshState({ quiet: true }).catch(() => undefined);
  if (["overview", "channels", "intelligence", "settings"].includes(app.view) && !app.controllers.has("maintenance") && now - app.lastFetch.maintenance >= base) void refreshMaintenance({ quiet: true }).catch(() => undefined);
  if (app.view === "memory" && !app.controllers.has("memory") && now - app.lastFetch.memory >= base) void refreshMemory({ quiet: true }).catch(() => undefined);
}, 1_000);

setTheme(app.theme);
applyI18n();
renderInitialShell();
setView(app.view, { updateHash: true, quiet: false });
