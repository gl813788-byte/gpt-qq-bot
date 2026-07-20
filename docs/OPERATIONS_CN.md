# 运行、日志与故障排查

简体中文 | [English](OPERATIONS.md)

全新安装或更新安装器首选 `npx -y "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"`（或同样精确版本的 `pnpm dlx`），先在线取得 registry 精确版本再执行，避免 `_npx` 复用旧包；也可以让 Codex 按[部署指南](DEPLOY_WITH_CODEX_CN.md)执行并验收。本页用于部署后的日常运行与定位问题。

公共安装器每次刷新默认分支的最新提交，同一提交复用有效缓存；损坏 ZIP 会隔离并重下，解压会从干净临时目录开始。它可使用 curl/wget，并在进入源码前补齐 unzip 与摘要工具；核心脚本完整但中文入口缺失时会自动重建。以前由安装器下载的无 Git 项目会在保留 `data`、`runtime`、本地配置和额外文件后切换到新源码，并在安装缓存 `backups/` 中留下完整旧目录；Git 工作区不会自动覆盖。在没有同名命令冲突时安装器会安装 `ncc` 入口，然后提醒运行 `ncc`。首次运行仓库版 `ncc` 会自动补齐基础工具、隔离的 Node.js 20+、Codex CLI、项目依赖，并在 apt-get/dnf Linux 上通过官方安装器补齐 NapCat/LinuxQQ 运行环境，之后运行验证和配置向导。

```bash
./一键部署.command
```

## 先区分两种 `ncc`

机器上可能存在两个同名但命令不同的控制器：

| 入口 | 用途 | 通用命令 |
| --- | --- | --- |
| `npm run ncc -- <command>` | 公共仓库自带的配置/状态辅助脚本 | `setup`、`status`、`codex-login`、`qq`、`owner`、`groups`、`branding`、`search-config`、`start`、`open`、`logs` |
| 全局 `ncc` | 当前机器可能安装的 NapCat + Hub 生命周期控制器 | 先运行 `ncc help`；本机版本可能有 `all`、`napcat`、`hub`、`connect`、`stop-hub` |

公共文档中的命令优先写成 `npm run ncc -- ...`，防止部署脚本覆盖已有全局控制器。

## 启动前检查

```bash
cd /root/Codex-QQ-Bot
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

## 周期行为的重启补做

周期性 QQ 业务按本地状态中持久化的时间戳判断，不依赖 Node.js 进程连续运行多久。Hub 启动时会立即检查自适应风格复盘和自我人格摘要/生成；QQ 通道启用时会立即检查恢复的普通兴趣周期、冷群兴趣与私聊兴趣，之后的普通轮询只负责唤醒这些墙上时间判断。

机器停机期间如果越过截止时间，恢复后只补做一轮。从磁盘恢复的普通兴趣周期即使候选消息超过正常在线的旧话题时限，也会获准执行这一次补做 judge，避免长时间停机把到期检查静默消费掉；judge 期间的新活动仍可让旧结果失效。冷群到期后由兴趣模型在 `silent/topic/chatter` 中决定，私聊候选也会把频率先验和随机波动值交给兴趣模型作最终开关；普通接话、冷群话题/水群和主动私聊都必须通过统一的“兴趣批准 → 主模型内容”校验，缺少任一阶段就不发送。普通主动温度为 `0.65`，冷群/私聊启动温度为 `0.8`。低频黑话删除是长证据任务：兴趣模型以 `0.15` 做有界初筛，主模型读取完整证据终审，任一阶段失败都保留。聊天总结、印象/人格总结和知识提取始终由主模型完成。成功、静默、拒绝或失败等已经完成的检查，会按对应功能的成功/重试策略写入完成时间，并从完成时刻重新开始下一周期。不会逐个回放停机期间错过的所有周期，因此恢复时不会集中刷消息。`/api/state` 在 `qq.periodic` 暴露安全的调度器状态；普通群兴趣 pending cycle 持久化在 `data/qq-memory.json`。统一记忆读写和手动聊天摘要属于事件触发，没有需要补做的周期截止时间。

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

仪表盘不再把所有功能堆在同一页，而是分成总览、通道、智能行为、记忆、实时日志和设置六个视图。通道页只处理连接、白名单和联系人；智能行为页显示并持久化 Bot 增强、联网、主动兴趣与判定参数，同时提供 OpenRouter、搜索 provider、安全下载模式、活动生成和待回复数量等安全诊断信息。行为状态采用独立双列流，较长的人设卡不会在另一列制造大片空白；窄屏恢复为自然单列顺序。

轮询渲染会区分服务端状态与本地交互状态：旧的轮询结果不会覆盖正在操作的开关、进行中的群/记忆/网络操作、已经修改的 Bot 设置表单，以及记忆分组和自动适应详情的展开/收起状态。刷新恢复只在当前浏览器标签页的会话内生效，覆盖 Bot 设置与群 ID 草稿、记忆浏览上下文、自动适应详情展开状态和日志控件/位置，不会跨标签页同步草稿。Bot 设置保存失败会保留草稿供重试，保存成功则清除草稿。

网页日志视图每秒拉取一次完整结构化条目，按时间正序追加并默认跟随最新位置。级别、分类、trace、错误、结果和耗时分别着色，所有 `details` 字段直接显示；可暂停实时刷新、关闭自动跟随、调整显示条数、筛选并点击条目查看原始 JSON。页面隐藏时实时请求自动暂停。

交互终端同样按级别、分类、trace、结果/错误和耗时使用稳定的独立颜色；`--color` 可在非 TTY 输出中强制启用，`--plain` 关闭颜色，`--json` 保留机器可读原始字段。中文查看器和中文仪表盘统一显示中文事件名，并递归中文化启动自动学习快照等嵌套详情；原始英文事件名仍保留在 JSON 的 `message`，API 同时提供 `messageZh` 与 `detailsZh`。人类可读输出会把多行字段压成单行。Codex 和兴趣模型的具体输出以 `debug` 级别保存，最长 4000 字符并经过日志密钥脱敏；完整输入提示词和删除申请聊天证据不会被再次复制到日志中，Codex 子进程错误也只保留提炼后的诊断行。

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
| QQ 图片提示 `URL_PRIVATE_ADDRESS` 且解析到 `198.18/15` | 代理软件使用 Fake-IP DNS，严格下载模式按保留地址拦截 | 保持私网保护，设置 `CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE=proxy-compatible` 后只重启 Hub；字面私网 IP 和其他保留地址仍会拒绝 |
| 联网失败 | key、provider、网络或超时 | `/api/maintenance` 的 provider attempts，`search` 日志 |
| `ncc` 命令不认识参数 | 调用了另一套同名控制器 | `command -v ncc`、`readlink -f`、`ncc help`；仓库命令改用 `npm run ncc --` |
| dead screen session | 异常退出留下 socket | 确认没有活进程后 `screen -wipe`，再启动 |

## 临时公网访问

设置页提供一个默认关闭的**公网临时访问**开关，底层使用 [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)。它保持 Hub 监听 `127.0.0.1`，只启动一个本地 `cloudflared` 子进程转发到 `http://127.0.0.1:3789`。

开启前，按 Cloudflare 对应平台说明安装 `cloudflared`，并确保 Hub 继承的 PATH 能找到它。仪表盘不会自动安装或下载依赖。命令缺失、启动失败或在超时内没有返回地址时，API 会明确报错，并且不会保留公网地址。

开启后：

1. 若尚无管理 token，Hub 会自动创建并持久化一个。
2. 仪表盘显示当前随机的 `https://*.trycloudflare.com` 地址；重启或重新开启后地址可能变化。
3. 把地址和 token 分开发给可信访问者；访问者在仪表盘提示框中输入 token，token 只保存在该浏览器标签页。
4. 所有非回环管理 API 仍必须携带 token；同源 CORS 只放行当前精确的隧道 Host。
5. 只有从回环地址加载的本机页面才能启停隧道或读取 token；关闭开关会终止子进程。

开关的期望状态会持久化，因此开启状态下重启 Hub 会重新创建隧道。Quick Tunnel 只适合临时开发/测试，不应作为长期生产暴露方案。需要稳定公网服务时，应使用受管的命名隧道，或带独立身份认证、限速与监控的 TLS 反向代理。

## 局域网访问

默认只使用 `127.0.0.1`。只有用户明确要求时才开启：

1. 通过本机仪表盘开启 LAN，或设置明确的 host、`ALLOW_REMOTE=1` 和随机 API token。
2. 限制 CORS，不使用无 token 的 `*`。
3. 防火墙只放行需要的局域网段，代理/VPN 对私网地址使用直连。
4. 从另一设备验证页面与带 token API；确认 token 没有进入 Git、日志或截图。
5. 长期公网访问应使用受管命名隧道，或带 TLS、访问控制和限速的反向代理，不要把 Hub 直接绑定到公网。
