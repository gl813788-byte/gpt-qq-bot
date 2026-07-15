# 运行、日志与故障排查

简体中文 | [English](OPERATIONS.md)

部署首选让 Codex 按[部署指南](DEPLOY_WITH_CODEX_CN.md)执行并验收。本页用于部署后的日常运行与定位问题。

## 先区分两种 `ncc`

机器上可能存在两个同名但命令不同的控制器：

| 入口 | 用途 | 通用命令 |
| --- | --- | --- |
| `npm run ncc -- <command>` | 公共仓库自带的配置/状态辅助脚本 | `setup`、`status`、`codex-login`、`qq`、`owner`、`groups`、`branding`、`search-config`、`start`、`open`、`logs` |
| 全局 `ncc` | 当前机器可能安装的 NapCat + Hub 生命周期控制器 | 先运行 `ncc help`；本机版本可能有 `all`、`napcat`、`hub`、`connect`、`stop-hub` |

公共文档中的命令优先写成 `npm run ncc -- ...`，防止部署脚本覆盖已有全局控制器。

## 启动前检查

```bash
cd /root/Codex-Remote-Contact
node --version
codex --version
git status --short --branch
npm run verify
npm run ncc -- status
```

通过标准：Node.js 20+、验证退出码 0、配置文件可读。`status` 显示 OneBot 或 Hub 不可连接时仍需继续检查，不能仅凭进程存在判断正常。

## 启动方式

### 让 Codex 启动

直接告诉 Codex：

```text
请按本项目 docs/OPERATIONS_CN.md 检查并启动 Codex QQ Bot。先识别全局 ncc 和仓库 ncc 的区别，保护现有 data/runtime/config，不重置 Git。启动后实际验证 Hub、仪表盘、OneBot get_login_info、QQ channel 和错误日志；需要扫码时只让我完成扫码，之后继续连接和验收。
```

### 仓库通用入口

```bash
npm run ncc -- setup
npm run ncc -- start
```

- Linux：仓库脚本加载 `config/local.env` 后以前台 `npm start` 运行，按 `Ctrl+C` 停止。
- macOS：仓库脚本可以使用项目 launchd 启动器。
- 直接 `npm start`：不自动加载 `config/local.env`，需先在当前 shell 导出配置。

长期运行时，让 Codex复用当前机器已有的 systemd、screen、launchd 或容器方式。新增进程管理器前要说明其配置、工作目录、环境来源、日志位置和重启策略，并验证重启后状态。

### 本机全栈入口

如果 `ncc help` 明确显示本机 NapCat 控制器：

```bash
ncc status
ncc all
ncc connect
```

`ncc all` 启动 NapCat 与 Hub；QQ 扫码完成后由 Codex执行 `ncc connect`。不要把仓库辅助脚本的参数传给这个全局控制器，反之亦然。

## 验收

```bash
curl -fsS --max-time 3 http://127.0.0.1:3789/api/state | jq .
curl -fsS --max-time 3 http://127.0.0.1:3789/api/maintenance | jq .
curl -fsS --max-time 3 -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:3789/
curl -fsS --max-time 3 http://127.0.0.1:3000/get_login_info | jq .
```

| 检查项 | 正常标准 |
| --- | --- |
| Hub | `/api/state` 返回 HTTP 200 JSON |
| 维护状态 | `/api/maintenance` 返回 Codex、OneBot、搜索等有效状态 |
| 仪表盘 | `/` 返回 HTTP 200 HTML |
| OneBot | `/get_login_info` 返回当前 QQ 账号，不只是端口开放 |
| QQ 通道 | `channels.qq` 已启用，owner 与群白名单正确 |
| 日志 | 没有未解释的 fatal/error 启动失败 |

## OneBot 连接

默认地址：

```text
OneBot API:      http://127.0.0.1:3000
反向 HTTP 回调: http://127.0.0.1:3789/api/onebot/event
```

- 在 NapCat/LLBot 中启用 OneBot HTTP API 和反向 HTTP 上报。
- 若设置 access token，Hub 的 `ONEBOT_ACCESS_TOKEN` 或 `CODEX_REMOTE_CONTACT_ONEBOT_TOKEN` 必须使用相同值。
- Hub 没有 token 时只接受真实回环连接；容器跨网络命名空间时应配置 token 和明确地址，不能关闭校验。
- 扫码完成后必须重新检查 `/get_login_info`，再启用/连接 QQ 通道。

## 日志

默认文件：`runtime/logs/hub.jsonl`，自动轮转。

仓库日志查看器：

```bash
npm run ncc -- logs --tail 80
npm run ncc -- logs --errors --since 30m --summary
npm run ncc -- logs --category interest --group 群号 --tail 100
npm run ncc -- logs --category search --verbose --tail 100
npm run ncc -- logs --trace TRACE_ID --all
npm run ncc -- logs -f
```

全局本机控制器支持哪些过滤参数以 `ncc help` 为准。也可读取 API：

```bash
curl -fsS 'http://127.0.0.1:3789/api/logs?limit=100&level=error,warn' | jq .
curl -fsS 'http://127.0.0.1:3789/api/logs?category=interest&group=群号' | jq .
```

常用分类：`system`、`web`、`onebot`、`qq`、`codex`、`search`、`interest`、`learning`、`memory` 和 `lifecycle`。优先按 trace 追踪一条完整回复，再看各阶段耗时和上游错误。

## 安全重启 Hub

1. 查看 `/api/state`、仪表盘和最近 `lifecycle` 日志，确认没有需要保留的生成任务。
2. 只停止 Hub，不要为了前端或代码改动顺带结束 QQ/NapCat。
3. 使用当前机器原有的进程管理方式启动 Hub。
4. 重复执行 Hub、仪表盘、OneBot、QQ 通道与错误日志验收。

本机全局控制器支持时：

```bash
ncc stop-hub
ncc hub
ncc status
```

公共仓库 Linux 前台运行则按 `Ctrl+C`，再执行 `npm run ncc -- start`。

## 安全升级

让 Codex执行：

```text
请安全升级当前 Codex QQ Bot。先检查 Git 工作区、运行中的回复、data/runtime、数据库和本地环境文件；禁止 reset、clean 或覆盖本地改动。工作区允许时只做 fast-forward 更新。安装依赖并运行 npm run verify，使用现有进程管理方式只重启 Hub，然后验收 /api/state、仪表盘、OneBot、QQ channel 和错误日志。失败时保留用户数据并明确恢复或阻塞状态。
```

人工检查顺序：

```bash
git status --short --branch
git remote -v
git pull --ff-only
npm install
npm run verify
```

有本地改动时不要直接 `git pull`，先让 Codex评估冲突和更新方式。

## 常见故障

| 现象 | 常见原因 | 检查与处理 |
| --- | --- | --- |
| `3789` 不监听 | Hub 未启动、语法/配置错误、端口冲突 | `npm run verify`，看 `system` 日志和 `ss -ltnp | rg ':3789'` |
| 仪表盘 API 正常但页面 404/旧内容 | 资源未注册或运行进程仍缓存旧资源 | 检查 `src/dashboard-assets.js` 与 `modules/mac-client/Resources`，只重启 Hub |
| NapCat WebUI 可用但 `3000` 不通 | QQ 未登录或 OneBot HTTP 配置未加载 | 查看 WebUI/QQ 扫码状态和 NapCat 日志，登录后 `ncc connect` |
| `get_login_info` 401/403 | token 不一致 | 对齐 OneBot 与 Hub token，避免打印真实值 |
| QQ 通道 false | OneBot 未连接、通道未启用或设置未保存 | 检查 `/api/state`、`data/settings.json` 和 `ncc connect` |
| 白名单群不回复 | 群号不在 allowlist、未 @/回复 Bot、用户被 ban | 检查 state、`qq`/`onebot` 日志和权限 |
| Codex 回复失败 | 未登录、CLI 路径/模型不可用、队列满 | `codex --version`、登录状态、maintenance、`codex` 日志 |
| 主动兴趣不回复 | 周期为空、judge 关闭/失败、兴趣不足、结果过时 | `interest` 日志、OpenRouter key、judge 参数和群活跃状态 |
| 联网失败 | key、provider、网络或超时 | `/api/maintenance` 的 provider attempts，`search` 日志 |
| `ncc` 命令不认识参数 | 调用了另一套同名控制器 | `command -v ncc`、`readlink -f`、`ncc help`；仓库命令改用 `npm run ncc --` |
| dead screen session | 异常退出留下 socket | 确认没有活进程后 `screen -wipe`，再启动 |

## 局域网访问

默认只使用 `127.0.0.1`。只有用户明确要求时才开启：

1. 通过本机仪表盘开启 LAN，或设置明确的 host、`ALLOW_REMOTE=1` 和随机 API token。
2. 限制 CORS，不使用无 token 的 `*`。
3. 防火墙只放行需要的局域网段，代理/VPN 对私网地址使用直连。
4. 从另一设备验证页面与带 token API；确认 token 没有进入 Git、日志或截图。
5. 公网访问应通过带 TLS、访问控制和限速的反向代理，不直接暴露 Hub。
