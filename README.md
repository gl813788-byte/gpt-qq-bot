<div align="center">

# Codex QQ Bot

### A local Codex assistant for QQ group chats

**A local QQ/OneBot and Codex CLI assistant hub for the `gl813788-byte/codex-qq-bot` project.**

[简体中文](README_CN.md) | English

![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![Linux](https://img.shields.io/badge/Linux-supported-blue)
![macOS](https://img.shields.io/badge/macOS-supported-blue)
![Windows](https://img.shields.io/badge/Windows-supported-blue)
![Memory](https://img.shields.io/badge/free%20memory-3GB%2B-orange)
![Optional Packages](https://img.shields.io/badge/optional%20packages-supported-purple)

</div>

---

## Introduction

Codex QQ Bot runs locally and connects QQ/OneBot, Codex CLI, local automation scripts, proxy node control, and an HTTP API controlled by `ncc` into one service.

The main program is intentionally usable by itself and includes built-in QQ enhancer, unified memory, and recent Codex context search. External packages can still be placed next to it when you want to override the default modules.

The project no longer serves its own browser WebUI. Normal operation is controlled through the single `ncc` script.

## Highlights

| Module | Description |
| :--- | :--- |
| iMessage console | macOS-only. Receive trusted commands such as `/状态`, `/维护`, `/开启QQ`, `/关闭QQ`, `/节点检查`, `/切换节点`, and `/远程执行`. |
| iMessage private replies | macOS-only. Generate replies through Codex CLI, keep independent rolling context, recover the polling cursor after database permission failures, and support one-message model overrides. |
| QQ/OneBot channel | Receive QQ group and private messages, ignore untranscribed voice messages, inspect explicitly mentioned images, expand recent context when needed, and keep lightweight member personas. |
| Remote execution | Start a full Codex CLI local task channel. The iMessage entry point is macOS-only; the backend and QQ bridge can run on Linux and Windows. |
| Proxy and system control | macOS-specific helper scripts for Shadowrocket, keep-awake, display sleep, and built-in-display backlight control. |
| QQ enhancement and memory | Built-in QQ enhancer, unified memory, and recent Codex context search are enabled by default; external `qq-enhancer` or custom `unified-memory` packages can override or extend behavior. |

## Project Structure

```text
codexremotecontact/
  src/server.js                         # Hub main process
  modules/
    imessage/                           # iMessage notes (macOS-only)
    qq-llbot/                           # QQ/LLBot notes
    shadowrocket/                       # Shadowrocket scripts (macOS-only)
    system-control/                     # Keep-awake and backlight scripts (macOS-only)
    mac-client/                         # macOS WebKit client source (optional)
    macos-launcher/                     # Launcher source (optional, macOS)
  config/
    settings.example.json               # Example settings
    local.codexremotecontact.chat-hub.plist.example
  data/                                 # Settings and memory files
  runtime/                              # Runtime logs and generated files
  workspaces/codex-cli/                 # Codex CLI temporary workspace
```

## Requirements

| Requirement | Notes |
| :--- | :--- |
| Linux, macOS, or Windows | Linux and Windows are supported for the QQ/OneBot + Codex backend. macOS is required only for iMessage, Shadowrocket, and macOS GUI/system-control helpers. |
| Node.js 20+ | Used to run the hub. |
| 3GB+ free memory | Recommended when Codex CLI, QQ bridge, and the hub run together. |
| OpenAI Codex CLI or Codex.app bundled CLI | Used for reply generation and remote execution. |
| NapCat, LLBot Desktop, or another OneBot-compatible bridge | Required for QQ. |
| Messages app signed in | macOS-only; required for iMessage. |
| Shadowrocket | macOS-only; required for Shadowrocket proxy commands. |

Install the basic dependency:

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install -y nodejs npm git curl zsh

# macOS
brew install node git curl zsh

# Windows PowerShell
winget install OpenJS.NodeJS Git.Git
```

Optional macOS dependencies:

```bash
brew install brightness
xcode-select --install
```

## Deployment

### 0. Download Options

#### Codex Skill Assisted Download

If the `claude-to-im` Codex skill is installed, you can ask Codex to download and set up this project for you:

```text
Use the claude-to-im skill to download and set up Codex QQ Bot.
Put the backend at /root/Codex-Remote-Contact and use ncc as the control entry.
```

The skill will clone or update the backend, install Node dependencies, preserve existing local changes, and verify the setup with `ncc status`.

This repository also includes the skill source at `skills/claude-to-im/SKILL.md`. To install it locally for Codex:

```bash
mkdir -p ~/.codex/skills/claude-to-im
cp skills/claude-to-im/SKILL.md ~/.codex/skills/claude-to-im/SKILL.md
```

#### Manual Git Download

```bash
git clone https://github.com/gl813788-byte/codex-qq-bot.git /root/Codex-Remote-Contact
cd /root/Codex-Remote-Contact
npm install --omit=dev
```

### 1. Place The Project

Put the source folder somewhere stable. Avoid Downloads for long-running deployments.

```bash
PROJECT_DIR="$HOME/codexremotecontact"
cd "$PROJECT_DIR"
```

If macOS quarantines the downloaded zip package:

```bash
xattr -dr com.apple.quarantine "$PROJECT_DIR"
```

### 2. Configure Settings

Edit:

```bash
open -e "$PROJECT_DIR/data/settings.json"
```

Minimal example:

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
      "judgeEveryMessages": 20
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

Deployment-specific assistant style can live in an external profile file:

```bash
export CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH="/absolute/path/to/assistant-profile.md"
```

### 3. Optional macOS Permissions

Skip this section on Linux and Windows. On macOS, grant permissions to the process that actually runs the hub. For Terminal deployment this is usually `Terminal`, `iTerm`, or `node`; for app deployment it is the compiled client or launcher.

| Permission | Required For |
| :--- | :--- |
| Full Disk Access | iMessage database and Shadowrocket configuration. |
| Automation | AppleScript control of Messages, System Events, Shadowrocket, and other apps. |
| Accessibility | GUI operations in remote execution mode. |
| Screen Recording | Screenshots or screen inspection in remote execution mode. |

### 4. Optional iMessage Setup

iMessage is macOS-only. Skip this section on Linux and Windows. On macOS, sign in to Messages and make sure `replyHandle` can send iMessages to the configured `trustedHandles`.

For a one-message model or reasoning override, add a directive line before or after the message body:

```text
/5.5 /high
Analyze this problem
```

Common aliases include `/5.5`, `/5.4`, `/mini`, `/low`, `/medium`, `/high`, and `/xhigh`. These overrides affect only the current reply.

### 5. Prepare QQ / OneBot

Use the local `ncc` script for the current NapCat + OneBot setup. The default OneBot API base is:

```text
http://127.0.0.1:3000
```

Override if needed:

```bash
export ONEBOT_API_BASE="http://127.0.0.1:3000"
```

### 6. Control With ncc

Normal operation goes through one local control script:

```bash
ncc all
ncc status
ncc connect
ncc stop-hub
```

Equivalent full path:

```bash
/root/napcat-codex-control.sh all
```

### 7. Backend API

The HTTP service is kept for `ncc`, NapCat OneBot callbacks, and diagnostics.

Development mode:

```bash
cd "$PROJECT_DIR"
npm start
```

Health check:

```bash
curl http://localhost:3789/api/state
```

### 8. Logs

The hub writes structured JSONL logs to `runtime/logs/hub.jsonl`. Use `ncc logs` for colored, human-readable output:

```bash
ncc logs
ncc logs --tail 200 --level error
ncc logs --verbose --category search
ncc logs -f
curl 'http://localhost:3789/api/logs?limit=50&category=qq'
```

Default logs hide debug-level details and show translated, human-readable summaries. Use `--verbose` when diagnosing QQ message text, web lookup trigger reasons, provider query variants, result titles, URLs, and snippets.

`ncc` also starts the hub in a `screen` session named `codex-contact`; use `screen -r codex-contact` only when diagnosing process-level startup output.

## Built-In Memory And Optional Packages

Recommended layout:

```text
Projects/
  codexremotecontact/
  qq-enhancer/                   # Optional: override built-in QQ enhancer
  unified-memory/                # Optional: override built-in unified memory
```

The hub uses the built-in `src/qq-enhancer/` and `src/unified-memory/` implementations by default. If you want to replace them with external advanced implementations, modules are loaded in this order:

| Order | Source |
| :--- | :--- |
| 1 | Environment module paths, such as `CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE` and `CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE`. |
| 2 | Local development folders under `src/` or `modules/`. |
| 3 | Sibling packages such as `../qq-enhancer/` and `../unified-memory/`. |
| 4 | Built-in default implementation. |

### QQ Enhancer

QQ enhancer is built into `src/qq-enhancer/` and works out of the box. It provides group-chat style guidance, conservative proactive reply decisions, image extraction and preparation, local sticker catalog loading, bubble splitting, and QQ media marker handling. Proactive interest routing lives in `src/qq-enhancer/proactive-interest.js`, which controls whether the bot is genuinely interested enough to reply when it was not mentioned.

Enable in `data/settings.json`:

```json
{
  "qq": {
    "enhancer": {
      "enabled": true
    },
    "proactive": {
      "enabled": true,
      "judgeEveryMessages": 20,
      "judge": {
        "enabled": true,
        "provider": "openrouter",
        "model": "nousresearch/hermes-3-llama-3.1-405b:free",
        "minInterest": 20,
        "timeoutMs": 6500,
        "maxRecentMessages": 8,
        "preset": {
          "likes": ["AI, Codex, code debugging, QQ bot routing, images/stickers, safety risk checks"],
          "dislikes": ["small talk, short reactions, two-person side chats, unrelated life chatter"],
          "style": ["reply like a natural group member", "use one short line by default", "do not explain trigger rules"]
        }
      }
    }
  }
}
```

Provide the OpenRouter key through the environment, not `data/settings.json`:

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Proactive interest decisions are logged under the `interest` category. To inspect scores, matched labels, model reasons, and suggested reply style:

```bash
ncc logs --verbose --category interest
```

Owners can adjust proactive interest settings from QQ:

```text
/兴趣配置
/兴趣 开启
/兴趣间隔 20
/兴趣模型 nousresearch/hermes-3-llama-3.1-405b:free
/兴趣超时 6500
/兴趣最近 8
/兴趣重置
```

Manual module path:

```bash
export CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE="/absolute/path/to/qq-enhancer/src/qq-enhancer/index.js"
```

### Unified Memory

Unified memory and recent Codex context search are built into `src/unified-memory/` and work out of the box. The QQ bot has an agent-style internal tool loop: it can inspect chat history, search the web, read/write memory, execute allowed management actions, then continue with more tool calls before sending the final QQ reply.

- `[[qq_command:/聊天记录 最近 50]]`
- `[[qq_command:/聊天记录 关键词]]`
- `[[qq_command:/联网 查询词]]`
- `[[qq_command:/搜索 查询词]]`
- `[[qq_command:/统一记忆 列表]]`
- `[[qq_command:/统一记忆 搜索 关键词]]`
- `[[qq_command:/统一记忆 添加 内容]]`
- `[[qq_command:/统一记忆 状态]]`

Custom data paths:

```bash
export UNIFIED_MEMORY_PATH="/absolute/path/to/unified-memory.json"
export UNIFIED_MEMORY_SETTINGS_PATH="/absolute/path/to/settings.json"
```

Manual module path:

```bash
export CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE="/absolute/path/to/unified-memory/src/unified-memory/index.js"
```

## Common Commands

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

`/切换节点` and `/远程执行` require confirmation with `/确认` or `/取消`.

## Environment Variables

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

Web lookup is configurable:

- `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER`: preferred provider, one of `auto`, `tavily`, `bing`, `baidu`, `so360`, `sogou`, `duckduckgo`.
- `CODEX_REMOTE_CONTACT_QQ_WEB_PRESET`: provider preset, one of `balanced`, `china`, `global`, `tavily`, `privacy`.
- `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS`: fully custom provider order, comma-separated, such as `tavily,bing,baidu`.
- `ncc search-config` writes the local default search config into `config/local.env`. If `TAVILY_API_KEY` is present, Tavily is used first.

## Troubleshooting

| Problem | Check |
| :--- | :--- |
| Port already in use | `lsof -nP -iTCP:3789 -sTCP:LISTEN` |
| iMessage cannot be read | macOS-only. Grant Full Disk Access and restart the hub. |
| Messages cannot send replies | macOS-only. Grant Automation permission for Messages. |
| QQ does not respond | Check NapCat/LLBot, `ONEBOT_API_BASE`, allowed groups, QQ switch, and ban list. |
| Remote execution GUI operations fail | macOS GUI automation only. Grant Accessibility and Screen Recording to the running process and Codex. |
| Shadowrocket commands fail | macOS-only. Verify Shadowrocket is installed and grant Full Disk Access to the hub. |

## Notice

Add your own configuration through `data/settings.json`, environment variables, and external profile files.

This is a local automation tool. Before enabling QQ, iMessage, remote execution, proxy control, or GUI control, make sure you understand the related permissions and local security impact. Linux and Windows deployments can use the QQ/OneBot + Codex backend without macOS-only iMessage or Shadowrocket features.
