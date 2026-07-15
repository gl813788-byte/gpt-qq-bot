# 使用 Codex 部署

[English](DEPLOY_WITH_CODEX.md) | 简体中文

## 为什么把部署交给 Codex

这个项目同时涉及 Node.js、Codex 登录、QQ/OneBot、配置文件、后台进程和端口检查。不同系统的路径和现有安装差异很大，静态“一键脚本”很容易覆盖已有配置或误判成功。让 Codex 作为部署操作员，可以先读机器现状，再选择最小、安全且可验证的动作。

一个可靠的部署提示词应包含四件事：目标、机器/仓库上下文、安全约束、完成标准。这也符合 OpenAI Codex 的[提示最佳实践](https://learn.chatgpt.com/guides/best-practices)。

## 开始前

1. 按 [Codex 快速开始](https://learn.chatgpt.com/docs/quickstart) 安装 Codex CLI、IDE 扩展或桌面端。
2. CLI 用户运行 `codex login`，完成浏览器登录；身份验证方式见 [Codex Authentication](https://learn.chatgpt.com/docs/auth)。
3. 在一个允许 Codex 写入的稳定工作目录启动 Codex。首次部署不要从“下载”目录运行长期服务。
4. 保持默认权限；下载、系统包安装、提权和外部目录写入让 Codex按需申请批准。

## 完整部署提示词

下面这段适合新安装和已有安装修复。可以在仓库尚未克隆时直接使用。

```text
请作为部署操作员，在当前机器部署或修复 Codex QQ Bot：
https://github.com/gl813788-byte/codex-qq-bot.git

目标：
- QQ / OneBot 能把消息交给当前 Codex CLI 登录。
- Hub 和本地仪表盘能稳定启动。
- 已有配置、Git 改动和运行数据不丢失。
- 最终用真实状态与测试结果验收，而不是只确认进程存在。

执行要求：
1. 检查系统/架构、可用磁盘与内存，以及 git、node、npm、zsh、curl、codex、jq、screen/launchctl（如果适用）、OneBot/NapCat 和 ncc。Node.js 必须为 20+。
2. 为部署建立简短计划，然后直接执行。只有扫码、秘密值、系统提权、外部下载授权或会改变既有部署方案的选择才问我。
3. 项目不存在时克隆到稳定目录。Linux root 默认 /root/Codex-Remote-Contact；普通用户默认使用 HOME 下的稳定目录。项目存在时先检查 git status --short --branch、remote 和当前分支。禁止 reset --hard、clean、强制 checkout 或覆盖本地文件。
4. 阅读 README、docs/DEPLOY_WITH_CODEX*、docs/ARCHITECTURE*、根 AGENTS.md 和适用的 skills/claude-to-im/SKILL.md。
5. 安装依赖并执行 npm run verify。测试或语法失败必须解释并修复；不得跳过。
6. data/settings.json 缺失时才从 config/settings.example.json 创建。已有 JSON 只做字段级合并。不要提交 data、runtime、config/local.env 或任何 token。
7. 需要时向我收集主人 QQ 号、群白名单、OneBot 地址和可选搜索 key。输出中对秘密值做掩码。
8. 运行 command -v ncc、readlink 和 ncc help，判断它是否为仓库快捷配置器或机器已有的 NapCat 控制器。不要覆盖同名控制器。仓库入口使用 npm run ncc -- <command> 调用。
9. 复用已安装的 OneBot。若没有，按当前平台选择仍受支持的 OneBot 实现，说明来源并在下载/系统安装前申请授权。不要把“Hub 已启动”当成“QQ 已连接”。
10. 启动 OneBot 和 Hub。QQ 未登录时，把二维码 URL 或 NapCat WebUI 地址给我并暂停；我确认扫码后，你继续完成 OneBot 连接、主人和群白名单配置。
11. 默认保持 127.0.0.1。除非我明确要求局域网访问，不要设置 0.0.0.0、远程管理或通配符 CORS。
12. 最终逐项验收并给出证据：
   - npm run verify
   - Hub GET /api/state
   - Hub GET /api/maintenance
   - 仪表盘 GET /
   - OneBot /get_login_info
   - QQ channel enabled
   - 主人和群白名单已保存
   - 最近错误日志没有未处理的启动失败
13. 只有所有必需项通过才说部署完成；否则明确写出阻塞项、已经完成的部分和下一步。
```

## Codex 会按什么顺序工作

### 1. 盘点，不覆盖

Codex 应先区分三类状态：全新机器、已有干净安装、带本地改动/运行数据的安装。`data/`、`runtime/`、未跟踪数据库以及本地环境文件都不能因为更新代码而被删除。

### 2. 准备代码与依赖

核心验证命令：

```bash
npm install
npm run verify
```

`npm run deploy` 是交互式本机准备脚本，会检查工具、创建缺失的本地文件并尝试安装快捷命令。Codex 可以使用它，但必须先检查现有 `ncc`，以免覆盖另一套同名控制器。

### 3. 配置 Hub

公共仓库的稳定入口不依赖全局快捷命令：

```bash
npm run ncc -- status
npm run ncc -- setup
npm run ncc -- start
```

Linux 上仓库控制器默认以前台方式运行 `npm start`；生产长期运行可由 Codex根据当前机器选择 systemd、screen 或其他已有进程管理方式，但需要单独说明并验证重启行为。

### 4. 连接 OneBot

仓库不包含 QQ 或 NapCat 二进制。Codex 必须验证 OneBot 的 `/get_login_info`，不能只检查端口是否打开。扫码是典型的用户暂停点；扫码完成后的配置和验收仍由 Codex继续。

### 5. 验收

| 检查项 | 通过标准 |
| --- | --- |
| 代码 | `npm run verify` 退出码为 0 |
| Hub | `/api/state` 返回 JSON，状态码 200 |
| 仪表盘 | `/` 返回 HTML，状态码 200 |
| OneBot | `/get_login_info` 返回当前 QQ 账号 |
| QQ 通道 | `channels.qq` 为启用且白名单正确 |
| 安全 | 默认监听回环；秘密值不在 Git 跟踪文件 |
| 运行 | 没有未解释的 fatal/error 启动日志 |

## 升级提示词

```text
请安全升级当前 Codex QQ Bot。先检查 Git 工作区、运行中的 QQ 回复、data/runtime 和本地环境文件；不得覆盖本地改动。仅在工作区允许时使用 fast-forward 更新。更新依赖后运行 npm run verify，再以当前机器已有的进程管理方式只重启 Hub。验证 /api/state、仪表盘、OneBot、QQ channel 和错误日志。任何失败都回滚到“服务可用”状态或明确停止，不要重置用户文件。
```

## 什么时候需要你介入

- 扫描 QQ 登录二维码。
- 输入主人 QQ 号、群白名单或尚未存在的秘密值。
- 批准安装系统包、下载 OneBot、写系统服务或开放局域网。
- 选择会改变现有部署方式的方案。

除此之外，Codex 应继续工作并完成验证，而不是把剩余命令转交给你。

## 手动备用入口

只有在无法使用 Codex 时才采用：

```bash
git clone https://github.com/gl813788-byte/codex-qq-bot.git
cd codex-qq-bot
npm install
npm run verify
npm run deploy
```

然后准备 OneBot，运行 `npm run ncc -- setup` 和 `npm run ncc -- start`。详细运行与排障见 [运维指南](OPERATIONS_CN.md)。
