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

The project includes a responsive browser dashboard. Daily control is available through either the visual interface or the `ncc` script.

## Highlights

| Module | Description |
| :--- | :--- |
| Browser dashboard | Monitor overview, channels, memory, logs, and settings on desktop or mobile, with light/dark themes, polling, log filters, and common configuration actions. |
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

### 7. Browser Dashboard And Backend API

The HTTP service hosts the same-origin dashboard as well as the `ncc`, NapCat OneBot callback, and diagnostic APIs.

Development mode:

```bash
cd "$PROJECT_DIR"
npm start
```

Health check:

```bash
curl http://localhost:3789/api/state
```

After starting the Hub, open:

```text
http://127.0.0.1:3789/
```

The dashboard includes overview, QQ/iMessage channel management, unified and conversation memory, structured logs, themes, and refresh settings. The macOS WebKit client loads this same URL so the desktop app and browser stay consistent.

### 8. Logs

The hub writes structured JSONL logs to `runtime/logs/hub.jsonl`. Use `ncc logs` for colored, human-readable output:

```bash
ncc logs
ncc logs --errors --since 30m --summary
ncc logs --verbose --category search
ncc logs --trace 8d27a910
ncc logs --group 1084253274 --sender 3784642920 --search timeout
ncc logs --slow 2000 --summary
ncc logs -f
curl 'http://localhost:3789/api/logs?limit=50&trace=8d27a910'
curl 'http://localhost:3789/api/logs?group=1084253274&slow=2000&q=timeout'
```

Logs save and display debug-level diagnostics by default, including QQ message handling, lookup triggers, provider query variants, and matched results. New entries use schema v2 identifiers and correlate each QQ reply lifecycle through a shared trace id across routing, proactive-interest judging, web lookup, Codex generation, delivery, and persistence. The lifecycle completion entry records stage and total durations. `ncc logs` searches the current and rotated log files; filters include `--level`, `--category`, `--trace`, `--group`, `--sender`, `--search`, `--since`, `--until`, and `--slow`. Interactive output independently color-codes levels, categories, stable trace ids, outcomes, errors, and latency severity; use `--color` to force ANSI colors through a pipe or `--plain` to disable them. Use `--summary` for counts plus P95/max latency, `--json` for JSONL output, or `--compact` for a temporary high-signal view. `/api/logs` supports the equivalent `level`, `category`, `trace`, `group`, `sender`, `q`, `since`, `until`, and `slow` parameters and returns a summary. Set `CODEX_REMOTE_CONTACT_LOG_LEVEL=info` to reduce persisted detail.

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

QQ enhancer is built into `src/qq-enhancer/` and works out of the box. It provides group-chat style guidance, conservative proactive reply decisions, image extraction and preparation, local, QQ-favorite, and observed marketplace sticker catalogs, native QQ sticker labels, animated-sticker frame inspection, bubble splitting, and QQ media marker handling. Animated stickers are marked in the catalog; inspection defaults to three middle frames, while the reply model may choose the number of animations, frame count, or exact positions. Only a message already selected for a Bot reply can trigger the model's optional decision to save one of that message's stickers into the real QQ account favorites. Proactive interest routing lives in `src/qq-enhancer/proactive-interest.js`, which controls whether the bot is genuinely interested enough to reply when it was not mentioned. Recent group memory retains bounded image references, including image-only messages. The lightweight proactive judge receives image counts but not image URLs; only an affirmative final decision forwards up to four deduplicated images from its exact context window to the formal vision-capable reply. An explicit @Bot or reply-to-Bot trigger uses the newest 18 consecutive messages from all speakers (28 on expanded retry) and may likewise attach up to four of their most recent images.

Interest judging merges the current message, quoted message, recent context, global-persona keywords, and the sender's interaction distance into one decision. The Bot's own name is always a fixed interest keyword. A direct @Bot or reply-to-Bot still always enters the reply path, while the first bubble independently chooses a quote, sender mention, or plain delivery based on messages and minutes since the previous interaction. Immediately after an interaction, ordinary interest cadence may contract to a minimum of one message or one minute, then smoothly decay back to the configured `/兴趣间隔` and `/兴趣分钟` baselines.

The Hub creates a separate anonymous, non-identifying summary for every group and private scope. After enough messages and Bot replies accumulate, the current QQ reply model generates a global Bot persona whose name is forced to the logged-in QQ nickname. The persona includes traits, a self-description, interest keywords, a full interest paragraph, weighted interests, and proactive topics, and is stored in `data/qq-self-persona.json`. Scopes contribute summaries only; private raw text is never copied across conversations. By default, a scope first summarizes after 32 messages, then after 48 new human messages or 12 Bot replies with a 12-hour minimum interval. The first global persona requires 80 total messages across at least two summarized scopes; later updates require 160 new human messages, 40 Bot replies, or eight scope summaries with a 48-hour minimum interval. Human-versus-Bot style review likewise runs at most once every 48 hours. The QQ dashboard shows the current persona, keywords, generation progress, and update policy.

Timed outreach uses learned active hours per group or contact. Cold-group outreach lowers interest and exponentially lengthens retries as unanswered Bot messages accumulate instead of blocking forever. Private proactive interest follows an interaction-frequency-aware short-high, middle-low, long-rising probability curve, with the same unanswered-message suppression and backoff. The dashboard exposes learned hours, unanswered streaks, interest multipliers, private phases, candidate probabilities, and next-check times. Keyword hits, relationship distance, quote/@ selection, persona refreshes, and group/private proactive outcomes are persisted as structured `interest` or `learning` logs.

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

The proactive-interest judge uses streaming output. `/兴趣超时` controls the maximum idle time before the first token or between tokens; generation may continue past that duration while tokens keep arriving. A token limit remains as a final guard against unbounded generation.

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

Configuration changes made through the QQ management menu are atomically saved to `data/settings.json` before the confirmation reply is sent, so a delivery timeout does not roll them back. The QQ menu intentionally has no channel shutdown command; manage the channel through `ncc` or the external control API.

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

### QQ Social Actions and Group Administration

The Bot also has built-in social tools that stay out of `/菜单`: likes, friend/group request review, QQ Space mood reading, text mood publishing, and mood comments. Incoming friend requests, group join requests, and group invitations are persisted in `data/qq-requests.json` and reported to every configured owner. Requests sent by a configured owner are trusted, automatically approved, and still reported; all other requests wait for an owner/Bot decision. `/申请 同步` backfills group requests missed before startup plus QQ's separate suspicious-friend queue. Suspicious friend requests can be approved but cannot be reliably rejected because NapCat exposes no reject operation for that queue.

- `[[qq_command:/点赞 发送者 1]]`
- `[[qq_command:/申请 列表]]`
- `[[qq_command:/申请 同步]]`
- `[[qq_command:/申请 同意 最新]]`
- `[[qq_command:/申请 拒绝 #申请ID 理由]]`
- `[[qq_command:/动态 最近 QQ号 10]]`
- `[[qq_command:/发动态 内容]]`
- `[[qq_command:/评论动态 QQ号 tid 内容]]`

Group administration is visible and permission-controlled under the `groupAdmin` command key:

```text
/群管理
/禁言 @用户 10m
/解禁言 @用户
/踢人 @用户
/全员禁言 开启
/群禁言列表
```

NapCat 4.18.9 does not expose public OneBot actions for initiating a friend or group request, so `ncc connect` deploys the loopback-only bridge configured through `CODEX_REMOTE_CONTACT_QQ_SOCIAL_API_BASE`. The bridge supports QQNT friend verification modes (no verification, verification message, correct answer, answer plus approval, or requests disabled) and group modes (direct join, admin approval, join disabled, correct answer, or answer plus approval). It reports questions, disabled/full/already-member states, and QQ risk-control failures without claiming success prematurely.

```text
/主动加好友 QQ号 验证=验证信息 | 答案=正确答案 | 备注=好友备注 | 分组=3
/主动加群 群号 答案=正确答案
```

The legacy single trailing argument remains valid as a friend verification message or group answer.

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
/群管理
/禁言 @用户 10m
/解禁言 @用户
/踢人 @用户
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
# Recommended: authenticates inbound callbacks and is sent on outbound requests
ONEBOT_ACCESS_TOKEN=
CODEX_CLI_PATH=/Applications/Codex.app/Contents/Resources/codex

CODEX_REMOTE_CONTACT_CODEX_MODEL=gpt-5.4-mini
CODEX_REMOTE_CONTACT_REASONING_EFFORT=low

CODEX_REMOTE_CONTACT_IMESSAGE_CODEX_MODEL=gpt-5.4
CODEX_REMOTE_CONTACT_IMESSAGE_REASONING_EFFORT=medium
CODEX_REMOTE_CONTACT_IMESSAGE_MEMORY_LIMIT=120

CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT=10
CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT=200
CODEX_REMOTE_CONTACT_QQ_SCOPE_LIMIT=500
CODEX_REMOTE_CONTACT_QQ_PERSONA_MEMBER_LIMIT=500
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_INITIAL_MESSAGES=32
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_MESSAGES=48
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_BOT_REPLIES=12
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_COOLDOWN_HOURS=12
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_INITIAL_MESSAGES=80
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_MESSAGES=160
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_BOT_REPLIES=40
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_SCOPE_SUMMARIES=8
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_GENERATION_COOLDOWN_HOURS=48
CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_FAILURE_RETRY_HOURS=2
CODEX_REMOTE_CONTACT_QQ_IMAGE_MAX_BYTES=20971520
CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP=1
CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS=12000
CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS=6500
CODEX_REMOTE_CONTACT_QQ_WEB_PRESET=balanced
CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER=tavily
CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS=tavily,bing,baidu,so360,sogou,duckduckgo
CODEX_REMOTE_CONTACT_QQ_SOCIAL_API_BASE=
TAVILY_API_KEY=tvly-...

CODEX_REMOTE_CONTACT_HOST=127.0.0.1
CODEX_REMOTE_CONTACT_PORT=3789
CODEX_REMOTE_CONTACT_CORS_ORIGINS=http://127.0.0.1:3789,http://localhost:3789
# When set, the dashboard asks once after a 401 and stores it for the current tab only
CODEX_REMOTE_CONTACT_API_TOKEN=
# Set to 1 only when you intentionally need a LAN/public bind address
CODEX_REMOTE_CONTACT_ALLOW_REMOTE=0

CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY=2
CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING=32
CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY=8
CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING=32
CODEX_REMOTE_CONTACT_QUOTA_CACHE_TTL_MS=30000
CODEX_REMOTE_CONTACT_ONEBOT_HEALTH_TTL_MS=15000
CODEX_REMOTE_CONTACT_SQLITE_TIMEOUT_MS=8000
CODEX_REMOTE_CONTACT_SQLITE_MAX_OUTPUT_BYTES=2097152

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

Inbound OneBot callback handling is bounded by `CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY` (default `8`) and `CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING` (default `32`). When both limits are occupied, additional callbacks receive HTTP `429` instead of growing an unbounded in-memory queue.

The Hub binds to loopback by default. A non-loopback bind requires both `CODEX_REMOTE_CONTACT_ALLOW_REMOTE=1` and a non-empty `CODEX_REMOTE_CONTACT_API_TOKEN`; public access should still sit behind a reverse proxy with TLS and access control. Without a management API token, every `/api/*` request must use a literal loopback `Host` (`localhost`, `127.0.0.1`, or `[::1]`, with an optional port). An arbitrary hostname is rejected even if DNS resolves it to loopback, which blocks browser DNS-rebinding access to the local API. Cross-origin browser requests are limited to `CODEX_REMOTE_CONTACT_CORS_ORIGINS`, and wildcard CORS is refused unless a management token is configured; the same-origin dashboard, native OneBot, `curl`, and `ncc` remain compatible. State-changing endpoints only accept `application/json`.

OneBot webhook authentication uses `ONEBOT_ACCESS_TOKEN` when it is set. Otherwise, it falls back to `CODEX_REMOTE_CONTACT_API_TOKEN`, so enabling remote management does not accidentally leave the callback endpoint unauthenticated. Only when both tokens are empty are callbacks accepted without authentication; those callbacks are treated as untrusted and cannot receive owner privileges.

## Development Verification

```bash
npm run check          # Check every project JS/MJS file and example JSON file
npm test               # Run the complete test suite
npm run test:coverage  # Run the suite with coverage reporting
npm run verify         # Run source checks and the complete suite
```

Web search lives in `src/web-search.js`, separate from the main service orchestration. Search and snippet responses have bounded body sizes, and snippet enrichment rejects localhost, private IP addresses, and redirects into private networks.

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
