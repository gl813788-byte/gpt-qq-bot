# QQ / OneBot Transport / QQ 与 OneBot 传输

The Hub accepts any compatible OneBot 11 HTTP bridge. NapCat is the recommended deployment, while LLBot remains an alternative. This repository includes neither QQ nor bridge binaries.

Hub 接受兼容 OneBot 11 HTTP 的实现；推荐部署 NapCat，也可使用 LLBot。仓库不包含 QQ 或桥接器二进制。

## Connection / 连接

```text
OneBot API:          http://127.0.0.1:3000
Reverse HTTP target: http://127.0.0.1:3789/api/onebot/event
```

```bash
export ONEBOT_API_BASE=http://127.0.0.1:3000
export ONEBOT_ACCESS_TOKEN=use-the-same-token-on-both-sides
```

If the launcher should open a manually installed LLBot app, place it at `modules/qq-llbot/LLBot.app`. That path is optional and ignored by normal Linux/NapCat deployments.

如果启动器需要打开手动安装的 LLBot App，可放在 `modules/qq-llbot/LLBot.app`；Linux/NapCat 核心部署不依赖该路径。

## Logic boundary / 逻辑边界

- `src/channels/qq/onebot-event.js`: untrusted event normalization and deduplication / 不可信事件归一化与去重。
- `src/server.js`: authenticated webhook wiring and legacy routing / 认证 Webhook 接线与待拆分路由。
- `src/qq-command-router.js`: slash commands and permissions / 斜杠指令与权限。
- `src/qq-enhancer/`: media and proactive-interest enhancements / 媒体与主动兴趣增强。

Group messages are allowlist-gated. Ordinary chat is mention/reply-driven; recognized commands and separately judged proactive-interest paths are the controlled exceptions. Owner trust is derived only after transport authentication.

群消息受白名单限制；普通对话由 @/回复触发，已识别指令和独立判定的主动兴趣是受控例外。主人身份只能在传输认证后确定。

## Verification / 验证

```bash
curl -fsS http://127.0.0.1:3000/get_login_info | jq .
curl -fsS http://127.0.0.1:3789/api/state | jq '.channels.qq, .qq.allowedGroups'
npm run verify
```

An open port is not enough: `/get_login_info` must return the logged-in account, and Hub state must show the intended owner and allowlist.

端口开放不代表连接完成；必须确认登录账号，以及 Hub 中的主人和群白名单。
