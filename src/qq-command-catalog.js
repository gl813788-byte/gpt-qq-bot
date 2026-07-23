export const qqCommandCatalog = [
  {
    key: "menu",
    defaultPublic: true,
    configurable: true,
    menuLine: "/菜单",
    aliases: ["菜单", "管理菜单", "menu", "help", "帮助", "指令"]
  },
  {
    key: "newDialog",
    defaultPublic: true,
    configurable: true,
    menuLine: "/新对话",
    aliases: ["新对话", "开启新对话", "开始新对话", "清空上下文", "清除上下文", "清理上下文", "重置上下文", "忘记上下文"]
  },
  {
    key: "stop",
    defaultPublic: true,
    configurable: true,
    menuLine: "/stop",
    aliases: ["stop", "停止", "停", "打住", "停一下", "别回了", "别生成了", "中止", "终止"]
  },
  {
    key: "summary",
    defaultPublic: true,
    configurable: true,
    menuLine: "/总结聊天记录",
    aliases: ["总结上下文", "总结前文", "总结聊天记录", "总结群聊", "总结私聊", "总结最近", "概括上下文", "概括聊天记录", "概括群聊", "概括私聊", "summary"]
  },
  { key: "status", defaultPublic: false, configurable: true, menuLine: "/状态", aliases: ["状态", "status", "查看状态"] },
  { key: "config", defaultPublic: false, configurable: true, menuLine: "/详细配置", aliases: ["详细配置", "配置", "config", "settings", "详细状态"] },
  {
    key: "session",
    defaultPublic: false,
    configurable: true,
    menuLine: "/会话模式",
    menuLines: ["/会话模式", "/会话模式 自动|长期|临时"],
    aliases: ["会话模式", "长期会话", "临时会话", "自动会话", "session", "session-mode"]
  },
  {
    key: "interest",
    defaultPublic: false,
    configurable: true,
    menuLine: "/兴趣配置",
    menuLines: ["/兴趣配置", "/兴趣间隔 20", "/兴趣厂商 openrouter", "/兴趣模型 openrouter/free"],
    aliases: ["兴趣", "兴趣配置", "主动配置", "兴趣间隔", "兴趣模型", "interest", "proactive"]
  },
  { key: "model", defaultPublic: false, configurable: true, menuLine: "/模型（动态读取可用模型）", aliases: ["模型", "qq模型", "切模型", "切换模型"] },
  { key: "reasoning", defaultPublic: false, configurable: true, menuLine: "/思考强度（按当前模型读取）", aliases: ["智能等级", "智能", "思考强度", "qq智能等级"] },
  {
    key: "allowlist",
    defaultPublic: false,
    configurable: true,
    menuLine: "/白名单",
    menuLines: ["/白名单", "/加群 群号", "/删群 群号"],
    aliases: ["白名单", "群白名单", "白名单列表", "加群", "添加白名单群", "删群", "移除白名单群"]
  },
  {
    key: "groupAdmin",
    defaultPublic: false,
    configurable: true,
    menuLine: "/群管理",
    menuLines: ["/群管理", "/禁言 @用户 10m", "/解禁言 @用户", "/踢人 @用户", "/全员禁言 开启|关闭", "/群禁言列表"],
    aliases: ["群管理", "禁言", "解禁言", "解除禁言", "踢人", "全员禁言", "群禁言列表"]
  },
  { key: "ban", defaultPublic: false, configurable: true, menuLine: "/ban @用户", aliases: ["ban", "封禁", "拉黑", "unban", "解禁", "banlist"] },
  { key: "permissions", defaultPublic: false, configurable: false, menuLine: "/菜单权限", aliases: ["菜单权限", "权限菜单", "公开指令", "允许指令", "禁用指令"] }
];

export const defaultQqPublicCommands = Object.fromEntries(
  qqCommandCatalog.filter((command) => command.defaultPublic).map((command) => [command.key, true])
);
