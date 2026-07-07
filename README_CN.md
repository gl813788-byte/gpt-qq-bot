<div align="center">

# Codex QQ Bot

### QQ 群聊里的本地 Codex 助手

**一个保存到 `gl813788-byte/codex-qq-bot` 仓库里的 QQ/OneBot + Codex CLI 本地助手中枢。**

简体中文 | [English](README.md)

![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![Linux](https://img.shields.io/badge/Linux-supported-blue)
![macOS](https://img.shields.io/badge/macOS-supported-blue)
![Windows](https://img.shields.io/badge/Windows-supported-blue)
![Memory](https://img.shields.io/badge/free%20memory-3GB%2B-orange)
![Optional Packages](https://img.shields.io/badge/optional%20packages-supported-purple)

</div>

---

## 介绍

Codex QQ Bot 运行在本机，把 QQ/OneBot、Codex CLI、本机自动化脚本、代理节点控制和由 `ncc` 控制的 HTTP API 接到同一个服务里。

主程序可以独立启动，并内置 QQ enhancer、统一记忆与最近 Codex 上下文检索。需要替换为更高级实现时，可以把外部升级包放到旁边覆盖默认模块。

项目不再提供自己的浏览器 WebUI。日常控制统一通过 `ncc` 脚本完成。

## 功能亮点

| 模块 | 说明 |
| :--- | :--- |
| iMessage 控制台 | 仅 macOS。接收可信联系人发来的 `/状态`、`/维护`、`/开启QQ`、`/关闭QQ`、`/节点检查`、`/切换节点`、`/远程执行` 等指令。 |
| iMessage 私聊回复 | 仅 macOS。调用 Codex CLI 生成回复，保存独立滚动上下文，在数据库权限故障后自动恢复轮询游标，并支持单条消息临时切换模型。 |
| QQ/OneBot 通道 | 接收 QQ 群聊和私聊，忽略尚未转写的语音消息，识别明确 @ 附图，在需要时继续向前翻上下文，并保存轻量群友画像。 |
| 远程执行模式 | 开启完整 Codex CLI 本机任务通道。iMessage 入口仅 macOS；后端和 QQ 桥接可在 Linux 和 Windows 运行。 |
| 代理与系统控制 | macOS 专用辅助脚本，支持 Shadowrocket 节点状态、测速、切换确认，以及防休眠、显示器休眠、内置屏背光控制。 |
| QQ 增强与记忆 | 默认内置 QQ enhancer、统一记忆和最近 Codex 上下文检索；存在外部 `qq-enhancer` 或自定义 `unified-memory` 时可覆盖增强。 |

## 项目结构

```text
codexremotecontact/
  src/server.js                         # Hub 主进程
  modules/
    imessage/                           # iMessage 模块说明（仅 macOS）
    qq-llbot/                           # QQ/LLBot 模块说明
    shadowrocket/                       # Shadowrocket 节点控制脚本（仅 macOS）
    system-control/                     # 系统控制脚本（仅 macOS）
    mac-client/                         # macOS 客户端源码（可选）
    macos-launcher/                     # 启动器源码（可选，仅 macOS）
  config/
    settings.example.json               # 配置示例
    local.codexremotecontact.chat-hub.plist.example
  data/                                 # 配置与记忆文件
  runtime/                              # 日志与运行时文件
  workspaces/codex-cli/                 # Codex CLI 临时工作区
```

## 安装要求

| 要求 | 说明 |
| :--- | :--- |
| Linux、macOS 或 Windows | Linux 和 Windows 支持 QQ/OneBot + Codex 后端；只有 iMessage、Shadowrocket 和 macOS GUI/系统控制辅助功能需要 macOS。 |
| Node.js 20+ | 用于运行 Hub。 |
| 3GB+ 可用内存 | 建议同时运行 Codex CLI、QQ 桥接器和 Hub 时保留。 |
| OpenAI Codex CLI 或 Codex.app 内置 CLI | 用于生成回复和远程执行。 |
| NapCat、LLBot Desktop 或其他 OneBot 兼容桥接器 | QQ 通道需要。 |
| 已登录“信息”App | 仅 macOS；iMessage 通道需要。 |
| Shadowrocket | 仅 macOS；Shadowrocket 代理指令需要。 |

安装基础依赖：

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install -y nodejs npm git curl zsh

# macOS
brew install node git curl zsh

# Windows PowerShell
winget install OpenJS.NodeJS Git.Git
```

macOS 可选依赖：

```bash
brew install brightness
xcode-select --install
```

## 部署教程

### 0. 下载方式

#### 通过 Codex Skill 下载

如果已经安装 `claude-to-im` Codex skill，可以直接让 Codex 下载并配置本项目：

```text
使用 claude-to-im skill 下载并配置 Codex QQ Bot。
把后端放到 /root/Codex-Remote-Contact，并使用 ncc 作为统一控制入口。
```

skill 会克隆或更新后端、安装 Node 依赖、保留已有本地改动，并用 `ncc status` 验证状态。

本仓库也内置了 skill 源文件：`skills/claude-to-im/SKILL.md`。本机安装到 Codex：

```bash
mkdir -p ~/.codex/skills/claude-to-im
cp skills/claude-to-im/SKILL.md ~/.codex/skills/claude-to-im/SKILL.md
```

#### 手动 Git 下载

```bash
git clone https://github.com/gl813788-byte/codex-qq-bot.git /root/Codex-Remote-Contact
cd /root/Codex-Remote-Contact
npm install --omit=dev
```

### 1. 放置项目

把源码放在长期稳定的位置。准备常驻运行时，不建议放在 Downloads。

```bash
PROJECT_DIR="$HOME/codexremotecontact"
cd "$PROJECT_DIR"
```

如果 macOS 隔离了下载的 zip 包：

```bash
xattr -dr com.apple.quarantine "$PROJECT_DIR"
```

### 2. 配置设置

编辑：

```bash
open -e "$PROJECT_DIR/data/settings.json"
```

最小配置示例：

```json
{
  "version": 1,
  "updatedAt": null,
  "qq": {
    "allowedGroups": ["QQ group id"],
    "ownerUserIds": ["administrator QQ id"],
    "bannedUserIds": [],
    "enhancer": {
      "enabled": false
    },
    "proactive": {
      "enabled": false,
      "minIntervalMs": 180000
    }
  },
  "imessage": {
    "trustedHandles": ["trusted phone number or email"],
    "replyHandle": "iMessage account used for replies"
  },
  "remoteExecution": {
    "model": "gpt-5.4",
    "reasoningEffort": "medium",
    "skill": ""
  },
  "branding": {
    "assistantName": "assistant",
    "ownerLabel": "主人",
    "assistantMentions": ["@assistant"]
  }
}
```

可以把自己的助手语气写进外部 profile 文件：

```bash
export CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH="/absolute/path/to/assistant-profile.md"
```

### 3. 可选 macOS 权限

Linux 和 Windows 部署可以跳过本节。macOS 上权限需要给到实际运行 Hub 的进程。终端运行时通常是 `Terminal`、`iTerm` 或 `node`；App 运行时则是编译后的客户端或启动器。

| 权限 | 用途 |
| :--- | :--- |
| 完全磁盘访问 | 读取 iMessage 数据库和 Shadowrocket 配置。 |
| 自动化 | 通过 AppleScript 控制“信息”、System Events、Shadowrocket 等 App。 |
| 辅助功能 | 远程执行模式操作 GUI。 |
| 屏幕录制 | 远程执行模式截图或看屏幕。 |

### 4. 可选 iMessage 设置

iMessage 仅 macOS 可用。Linux 和 Windows 部署可以跳过本节。macOS 上请在“信息”App 登录账号，并确认 `replyHandle` 能向 `trustedHandles` 发送 iMessage。

普通 iMessage 私聊可以在正文前或正文后追加一次性模型或思考强度指令：

```text
/5.5 /high
Analyze this problem
```

常用别名包括 `/5.5`、`/5.4`、`/mini`、`/low`、`/medium`、`/high` 和 `/xhigh`，只影响当前这一条回复。

### 5. 准备 QQ / OneBot

当前本机 NapCat + OneBot 方案统一通过 `ncc` 脚本控制。默认 OneBot API 地址：

```text
http://127.0.0.1:3000
```

如需覆盖：

```bash
export ONEBOT_API_BASE="http://127.0.0.1:3000"
```

### 6. 使用 ncc 控制

日常使用统一通过一个本机控制脚本：

```bash
ncc all
ncc status
ncc connect
ncc stop-hub
```

等价完整路径：

```bash
/root/napcat-codex-control.sh all
```

### 7. 后端 API

HTTP 服务只保留给 `ncc`、NapCat OneBot 回调和诊断使用。

开发模式：

```bash
cd "$PROJECT_DIR"
npm start
```

健康检查：

```bash
curl http://localhost:3789/api/state
```

### 8. 日志

后端会把统一结构化日志写到 `runtime/logs/hub.jsonl`。日常排障优先用 `ncc logs` 查看彩色、给人看的输出：

```bash
ncc logs
ncc logs --tail 200 --level error
ncc logs --verbose --category search
ncc logs -f
curl 'http://localhost:3789/api/logs?limit=50&category=qq'
```

默认日志会隐藏调试级细节，只显示翻译后的人类可读摘要。需要排查 QQ 消息内容、搜索触发原因、每个搜索厂商的 query 变体、命中标题/链接/摘要时，使用 `--verbose`。

`ncc` 仍会在名为 `codex-contact` 的 `screen` 会话里启动后端；只有排查进程启动输出时才需要 `screen -r codex-contact`。

## 内置记忆与可选升级包

推荐目录结构：

```text
Projects/
  codexremotecontact/
  qq-enhancer/                   # 可选：覆盖内置 QQ enhancer
  unified-memory/                # 可选：覆盖内置统一记忆实现
```

主程序默认使用 `src/qq-enhancer/` 和 `src/unified-memory/` 内置实现。需要替换为外部高级实现时，会按以下顺序尝试加载：

| 顺序 | 来源 |
| :--- | :--- |
| 1 | 环境变量指定的模块路径，例如 `CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE` 和 `CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE`。 |
| 2 | 主程序内部 `src/` 或 `modules/` 下的本地开发目录。 |
| 3 | 同级目录中的 `../qq-enhancer/` 和 `../unified-memory/`。 |
| 4 | 内置默认实现。 |

### QQ Enhancer

QQ enhancer 已内置在 `src/qq-enhancer/`，默认安装即可使用。它提供群聊风格提示、保守主动回复判断、图片提取、看图准备、本地表情包目录读取、气泡拆分和 QQ 媒体 marker 处理。主动回复兴趣策略单独放在 `src/qq-enhancer/proactive-interest.js`，用于控制 bot 在未被 @ 时是否真的对当前话题感兴趣。

在 `data/settings.json` 中启用：

```json
{
  "qq": {
    "enhancer": {
      "enabled": true
    },
    "proactive": {
      "enabled": true,
      "minIntervalMs": 180000,
      "judge": {
        "enabled": true,
        "provider": "openrouter",
        "model": "nousresearch/hermes-3-llama-3.1-405b:free",
        "minInterest": 62,
        "preset": {
          "likes": ["AI、Codex、编程报错、QQ bot 触发逻辑、图片/表情包、安全风险"],
          "dislikes": ["普通寒暄、短反应、两个人互相聊天、无关生活碎碎念"],
          "style": ["像群友自然接话，默认一句话", "少叫主人", "不解释触发规则"]
        }
      }
    }
  }
}
```

OpenRouter key 通过环境变量提供，不写入 `data/settings.json`：

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

主动兴趣判定会写入 `interest` 分类日志。查看详细分数、命中标签、模型理由和回复风格：

```bash
ncc logs --verbose --category interest
```

手动指定模块：

```bash
export CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE="/absolute/path/to/qq-enhancer/src/qq-enhancer/index.js"
```

### Unified Memory

统一记忆和最近 Codex 上下文检索已内置在 `src/unified-memory/`，默认安装即可使用。QQ bot 现在带 agent 式内部工具循环：可以先看聊天记录、联网搜索、读写记忆、执行允许的管理动作，再根据工具结果继续调用下一轮工具，最后发出 QQ 可见回复。

- `[[qq_command:/聊天记录 最近 50]]`
- `[[qq_command:/聊天记录 关键词]]`
- `[[qq_command:/联网 查询词]]`
- `[[qq_command:/搜索 查询词]]`
- `[[qq_command:/统一记忆 列表]]`
- `[[qq_command:/统一记忆 搜索 关键词]]`
- `[[qq_command:/统一记忆 添加 内容]]`
- `[[qq_command:/统一记忆 状态]]`

自定义数据路径：

```bash
export UNIFIED_MEMORY_PATH="/absolute/path/to/unified-memory.json"
export UNIFIED_MEMORY_SETTINGS_PATH="/absolute/path/to/settings.json"
```

手动指定模块：

```bash
export CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE="/absolute/path/to/unified-memory/src/unified-memory/index.js"
```

## 常用指令

```text
/状态
/维护
/开启QQ
/关闭QQ
/开启iMessage
/关闭iMessage
/清空QQ记忆
/清除记忆
/白名单
/加群 群号
/删群 群号
/联网开
/联网关
/代理状态
/代理开
/代理关
/当前节点
/节点列表
/入口测速 关键词
/节点检查
/切换节点 目标
/关闭背光
/恢复背光
/远程执行
/确认
/取消
/帮助
```

`/切换节点` 和 `/远程执行` 需要使用 `/确认` 或 `/取消` 二次确认。

## 环境变量

```bash
ONEBOT_API_BASE=http://127.0.0.1:3000
CODEX_CLI_PATH=/Applications/Codex.app/Contents/Resources/codex

CODEX_REMOTE_CONTACT_CODEX_MODEL=gpt-5.4-mini
CODEX_REMOTE_CONTACT_REASONING_EFFORT=low

CODEX_REMOTE_CONTACT_IMESSAGE_CODEX_MODEL=gpt-5.4
CODEX_REMOTE_CONTACT_IMESSAGE_REASONING_EFFORT=medium
CODEX_REMOTE_CONTACT_IMESSAGE_MEMORY_LIMIT=120

CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT=10
CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT=200
CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP=1
CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS=12000
CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS=6500
CODEX_REMOTE_CONTACT_QQ_WEB_PRESET=balanced
CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER=tavily
CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS=tavily,bing,baidu,so360,sogou,duckduckgo
TAVILY_API_KEY=tvly-...

CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MODEL=gpt-5.4
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_REASONING_EFFORT=medium
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MEMORY_LIMIT=160
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_IDLE_TTL_MS=900000
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_SKILL=

CODEX_REMOTE_CONTACT_SKILL_PATHS=custom-name=/absolute/path/to/SKILL.md
CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH=/absolute/path/to/assistant-profile.md
CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE=/absolute/path/to/qq-enhancer/src/qq-enhancer/index.js
CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE=/absolute/path/to/unified-memory/src/unified-memory/index.js
```

联网搜索可以自由配置：

- `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER`：优先厂商，可用 `auto`、`tavily`、`bing`、`baidu`、`so360`、`sogou`、`duckduckgo`。
- `CODEX_REMOTE_CONTACT_QQ_WEB_PRESET`：预设顺序，可用 `balanced`、`china`、`global`、`tavily`、`privacy`。
- `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS`：完全自定义厂商顺序，逗号分隔；例如 `tavily,bing,baidu`。
- `ncc search-config` 会把本机默认搜索配置写入 `config/local.env`；如果环境里有 `TAVILY_API_KEY`，会自动启用 Tavily 优先。

## 故障排查

| 问题 | 排查 |
| :--- | :--- |
| 端口占用 | `lsof -nP -iTCP:3789 -sTCP:LISTEN` |
| 无法读取 iMessage | 仅 macOS。授予完全磁盘访问权限并重启 Hub。 |
| 无法发送信息回复 | 仅 macOS。授予“信息”自动化权限。 |
| QQ 不响应 | 检查 NapCat/LLBot、`ONEBOT_API_BASE`、白名单群、QQ 总开关和 ban 列表。 |
| 远程执行 GUI 操作失败 | 仅 macOS GUI 自动化。给运行进程和 Codex 授予辅助功能、屏幕录制权限。 |
| Shadowrocket 指令失败 | 仅 macOS。确认已安装 Shadowrocket，并给 Hub 完全磁盘访问权限。 |

## 注意事项

部署前应在 `data/settings.json`、环境变量和外部 profile 文件中填写自己的配置。

本项目是本机自动化工具。启用 QQ、iMessage、远程执行、代理控制或 GUI 控制前，请确认你理解对应权限和本机安全影响。Linux 和 Windows 部署可以使用 QQ/OneBot + Codex 后端，不需要 macOS-only 的 iMessage 或 Shadowrocket 功能。
