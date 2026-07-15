---
name: claude-to-im
description: |
  Maintain, modify, deploy, operate, and diagnose the local Codex Remote Contact project
  and its NapCat + OneBot QQ bridge for THIS Codex session. Use for any work on
  /root/Codex-Remote-Contact, including architecture/refactoring, configuration and
  environment variables, QQ message logic, commands and permissions, memory/persona,
  proactive replies, dashboard/API, logs, tests, documentation, deployment, upgrades,
  startup and login recovery. Also trigger for phrases like "维护项目", "修改项目",
  "优化项目", "让 Codex 部署", "一键部署", "部署QQ机器人",
  "启动napcat", "连上qq", "QQ后台", "NapCat后台", "扫码登录", "OneBot",
  "群白名单", "控制台", "运行总览", "前端", "ncc", "napcat-codex-control".
  This local setup uses NapCat/QQ + OneBot HTTP
  and /root/Codex-Remote-Contact, not the official QQ Bot OpenAPI channel.
---

# Codex Remote Contact Project Maintenance

You are managing the local QQ bridge that lets the user talk to this Codex setup from QQ.

Primary control script:

```bash
/root/napcat-codex-control.sh
```

Convenience alias:

```bash
ncc
```

Persistent config:

```bash
/root/.napcat-codex-control.env
```

Default services:

- NapCat QQ executable: `/root/Napcat/opt/QQ/qq`
- NapCat WebUI: `http://127.0.0.1:6099/webui`
- OneBot API: `http://127.0.0.1:3000`
- Codex Remote Contact backend: `http://127.0.0.1:3789`
- Codex Remote Contact dashboard: `http://127.0.0.1:3789/` (alias `/dashboard`)
- Backend project: `/root/Codex-Remote-Contact`
- Use `ncc` for process lifecycle and the dashboard for state, health, channel, memory, log, and local appearance controls. The dashboard does not replace `ncc` startup/login recovery.
- Dashboard assets live in `/root/Codex-Remote-Contact/modules/mac-client/Resources` and are served through `/root/Codex-Remote-Contact/src/dashboard-assets.js`; the removed `modules/web-console` is not used.
- Do not add separate shortcut scripts for QQ on/off/status. The user wants one control entry: `ncc` / `/root/napcat-codex-control.sh`.
- `modules/mac-client` is the shared browser/macOS dashboard source. `modules/macos-launcher` remains optional and is not a replacement for `ncc`.
- Project homepage docs are split by language: `/root/Codex-Remote-Contact/README.md` is English and `/root/Codex-Remote-Contact/README_CN.md` is Simplified Chinese. Keep the top language-switch links in sync if either file is edited.
- Project structure is documented in `/root/Codex-Remote-Contact/docs/ARCHITECTURE.md`. Environment parsing belongs in `src/config/`, initial state/composition in `src/app/`, and untrusted QQ transport normalization in `src/channels/qq/`; do not add those responsibilities back into `src/server.js`.
- Allowed QQ groups are persisted in `/root/Codex-Remote-Contact/data/settings.json` and mirrored to `ALLOWED_GROUPS` in `/root/.napcat-codex-control.env`. When saved settings exist, `ncc connect` keeps that list instead of overwriting QQ-menu changes with an older environment value.
- Owner QQ user id: `3784642920` should be present in `/root/Codex-Remote-Contact/data/settings.json`
  under `qq.ownerUserIds`. Owner-only QQ slash commands are accepted from this QQ id
  in whitelisted groups without needing to @ the bot.

## Maintenance Contract

Use this skill as the project-specific operating manual, not only as a process launcher.

1. Inspect `/root/Codex-Remote-Contact/AGENTS.md`, the relevant document under `docs/`, and `git status --short --branch` before changing code. Existing modifications and untracked databases belong to the user.
2. Establish the current baseline with the narrowest relevant test; run `npm run verify` before handoff. If the baseline already fails, separate the pre-existing failure from the requested change.
3. Keep `src/server.js` as a composition root. New parsing, validation, policy, state construction, or persistence belongs in a focused module and is only wired from the root.
4. Preserve public HTTP behavior, persisted JSON schemas, QQ command permissions, and security boundaries unless the user explicitly requests a breaking change.
5. For diagnosis, identify and explain the cause before editing. For an implementation request, make the change, test it, update documentation, and validate the live service when it is in scope.
6. Keep Chinese and English docs structurally synchronized. If maintenance or operator behavior changes, update both this installed skill and `skills/claude-to-im/SKILL.md` in the project.

## Architecture and Message Logic

Runtime pipeline:

```text
OneBot webhook / dashboard API / iMessage
  -> HTTP origin, host, token, body-size and concurrency checks
  -> channel normalization and untrusted-path stripping
  -> sender/group/self enrichment and event deduplication
  -> channel enabled + allowlist + owner/permission + trigger policy
  -> rolling transcript + social memory + persona + media context
  -> Codex Agent loop with bounded internal tools
  -> validate and remove hidden markers
  -> OneBot/iMessage delivery
  -> atomic persistence + structured logs + public state
```

Source map:

| Path | Detailed responsibility |
|---|---|
| `src/server.js` | Transitional composition root, HTTP routes, startup/shutdown, and legacy logic awaiting small extractions. Do not expand it with a new subsystem. |
| `src/config/environment.js` | Normalize environment values, defaults, numeric bounds, secrets, ports and concurrency. This is authoritative for new environment settings. |
| `src/app/create-initial-state.js` | Create isolated mutable application state. Add new top-level state here and cover it with a test. |
| `src/channels/qq/onebot-event.js` | Normalize and deduplicate untrusted OneBot message events before policy consumes them. |
| `src/qq-agent.js` and `src/qq-agent-tools.js` | Build the QQ agent loop, expose bounded internal tools, enforce round/tool limits, and distinguish tool output from visible replies. |
| `src/qq-command-router.js` | Parse QQ slash commands and route permission-controlled management actions. |
| `src/qq-human-behavior.js` | Derive anonymous short-window conversation rhythm and plan response modes without copying a member's wording. |
| `src/qq-adaptive-learning.js` | Persist long-running group/member structural statistics and compact style guidance. It tunes behavior but never authorizes a reply. |
| `src/qq-enhancer/` | Image/media context, proactive-interest judging, reply enhancement and related optional behavior. |
| `src/unified-memory/` | Cross-channel long-term memory and recent Codex context recall with serialized, atomic writes. |
| `src/qq-request-store.js` | Persist friend/group requests and their upstream handling state. |
| `src/qq-sticker-inventory.js` | Maintain bounded local/account sticker metadata and labels. |
| `src/dashboard-assets.js` + `modules/mac-client/Resources/` | Register and serve the local dashboard under a strict CSP. Executable JS/CSS stays in external assets. |
| `src/codex-child-env.js` | Build the environment inherited by Codex child processes; reread the active profile when required. |
| `scripts/ncc.command` | Public repository setup/status helper, invoked unambiguously as `npm run ncc -- <command>`. |
| `/root/napcat-codex-control.sh` | This machine's full NapCat/Hub lifecycle controller, invoked as global `ncc`. It is not the same command surface as the repository helper. |

Transport rules:

- `/api/onebot/event` is the real OneBot webhook. With a token, require a valid token; without one, require both the request peer and Host to be loopback. Normalize IDs and local media paths before owner decisions.
- `/api/qq/event` is a local normalized event entry and must never grant owner trust from caller-provided fields.
- Group traffic is limited to `state.qq.allowedGroups`. Ordinary group messages are mention/reply-driven; recognized slash commands and separately authorized proactive-interest paths are exceptions.
- A scope has one reply lifecycle at a time. Later ordinary messages queue into a combined follow-up. `/stop` and `/新对话` cancel current work and clear that scope's queue.
- Every internal command executes with the original sender's permission. Hidden tool markers must be parsed, validated and stripped before delivery.

## Complete Configuration Model

Configuration is layered rather than stored in one file:

1. The process environment supplies startup defaults and secrets through `createEnvironmentConfig`.
2. The repository helper `npm run ncc -- start` sources `config/local.env`; a direct `npm start` does not source that file automatically.
3. This machine's global `ncc` controller uses `/root/.napcat-codex-control.env` plus `/root/.codex/ncc-profiles/active.env` and the selected profile such as `sharedchat.env`.
4. `data/settings.json` loads after startup defaults and overrides persisted user-facing settings. Existing settings must be merged by field, never replaced wholesale.
5. Secrets stay in an untracked environment/profile file. Do not put OneBot, management, OpenRouter or Tavily tokens in tracked JSON or documentation.

Important configuration groups:

| Area | Keys / persisted fields | Method and invariant |
|---|---|---|
| Hub network | `CODEX_REMOTE_CONTACT_HOST`, `CODEX_REMOTE_CONTACT_PORT`, `CODEX_REMOTE_CONTACT_ALLOW_REMOTE`, `CODEX_REMOTE_CONTACT_CORS_ORIGINS`, `CODEX_REMOTE_CONTACT_API_TOKEN`; `network.allowLanAccess` and generated token in settings | Default is `127.0.0.1:3789`. Non-loopback requires explicit remote allowance and an API token; wildcard CORS without a token is refused. |
| Codex | `CODEX_CLI_PATH`, `CODEX_REMOTE_CONTACT_CODEX_MODEL`, `CODEX_REMOTE_CONTACT_REASONING_EFFORT`, `CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY`, `CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING`, `CODEX_REMOTE_CONTACT_QUOTA_CACHE_TTL_MS`; `ai.*` | Default queue is 2 active and 32 pending. Model changes must use the live account model list and supported reasoning efforts. |
| OneBot | `ONEBOT_API_BASE`, `ONEBOT_ACCESS_TOKEN`/`CODEX_REMOTE_CONTACT_ONEBOT_TOKEN`, `CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS`, `CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY`, `CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING` | Default API is `127.0.0.1:3000`, timeout 10s, queue 8 active/32 pending. Verify `/get_login_info`, not only the port. |
| QQ authority | `qq.allowedGroups`, `ownerUserIds`, bans, `commandPermissions` | Owner authority is absolute. Non-owner menu visibility and executability come from the same permission keys. |
| QQ behavior | `CODEX_REMOTE_CONTACT_QQ_ENHANCER`, memory limits, `CODEX_REMOTE_CONTACT_QQ_PROACTIVE*`, `CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA*`, `CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKER*`, bubble separator/delay/count | Environment creates defaults; the matching `qq.enhancer` and `qq.proactive` settings persist user changes. Adaptive signals never bypass the interest judge. |
| Search | `CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP`, provider/preset/provider order/timeouts, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`, base URLs | Search is performed by the Hub. Diagnose provider attempts through maintenance state and `search` logs before changing prompts. |
| Memory/media | QQ group/private limits, `QQ_IMAGE_MAX_BYTES`, `CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE`, SQLite timeout/output caps, unified-memory settings | Validate real paths and size limits. Safe fetch defaults to `strict`; `proxy-compatible` additionally permits DNS names mapped to proxy Fake-IP range `198.18.0.0/15`, but still blocks literal private IPs and every other reserved range. Deliverable task files must remain under the current request's `output/` workspace. |
| iMessage/remote | iMessage model/reasoning/memory/attachments and remote-execution model/reasoning/skill/idle TTL | macOS only; trusted handles, Full Disk Access and Automation are required. Remote execution remains confirmation-gated. |
| Logs | `CODEX_REMOTE_CONTACT_LOG_LEVEL`, `CODEX_REMOTE_CONTACT_LOG_CONSOLE`, `CODEX_REMOTE_CONTACT_LOG_CONSOLE_LEVELS`, `CODEX_REMOTE_CONTACT_LOG_MAX_BYTES`, `CODEX_REMOTE_CONTACT_LOG_MAX_FILES`, optional log path | JSONL defaults to `runtime/logs/hub.jsonl`; keep trace, category, group and sender context useful without leaking secrets. |

Use `/root/Codex-Remote-Contact/src/config/environment.js` for exact names, defaults and bounds, and `config/settings.example.json` for the persisted schema. Remaining direct `process.env` reads in `server.js` are migration debt, not a pattern for new code.

Persistent state methods:

- `data/settings.json`: atomically saved runtime configuration, permissions, network state and branding.
- `data/qq-memory.json`: lightweight rolling QQ context.
- `data/qq-conversation-memory.json`: bounded group/private social impressions and topics.
- `data/qq-public-memory.json`: shared stable, non-sensitive facts maintained through internal tools.
- `data/qq-personas.json`: adaptive-learning aggregates and style-review state.
- `data/qq-self-persona.json`: privacy-filtered scope summaries and generated global self-persona.
- `data/qq-requests.json`: pending and handled QQ friend/group requests.
- `data/qq-sticker-inventory.json`, `qq-sticker-labels.json`, `qq-stickers/`: sticker metadata, labels and files.
- `runtime/`: logs, replies and per-request workspaces. Runtime content is local evidence, never source code.

All writes that can race must be serialized and atomically replaced. Preserve malformed files for diagnosis instead of silently replacing them with empty data. A schema change needs normalization for old files plus focused load/save tests.

## Modification Recipes

- **Add an environment setting:** parse/default/bound it in `src/config/environment.js`, pass the normalized value into its consumer, add `test/environment-config.test.js` coverage, then document it. Do not add a new direct `process.env` read to `server.js`.
- **Change OneBot input:** update the pure normalizer/deduplicator in `src/channels/qq/`, keep raw payloads untrusted, add malformed/group/private/poke/duplicate tests, then wire it in the composition root.
- **Change QQ reply behavior:** locate trigger policy, context construction, agent tool policy and delivery as separate stages. Confirm the change does not bypass allowlists, owner permissions, cancellation, proactive judging or marker stripping.
- **Add a QQ command:** define parsing and aliases, assign a permission key, enforce owner protection at execution time, persist before acknowledging, expose it in `/菜单` only when executable, and test owner/non-owner/group/private cases.
- **Change memory or persona logic:** keep rolling transcript, social impressions, public memory, unified memory and self-persona separate. Bound raw content, prevent cross-scope private leakage, add compatibility normalization and atomic-save tests.
- **Change dashboard/API:** keep origin/token/loopback protections, public-state redaction and CSP intact. Register new assets in `src/dashboard-assets.js`, keep selectors/translation keys aligned, then restart only the Hub after checking active QQ work.
- **Change deployment/control behavior:** first distinguish global `ncc` from `npm run ncc --`. Update both language docs and both skill copies, verify the exact command on this machine, and never overwrite a working same-name controller.
- **Refactor:** extract one pure boundary at a time, preserve behavior, wire a small adapter in `server.js`, and land regression tests with the extraction. Avoid a broad move-only rewrite mixed with behavior changes.

## Required Verification

For code or configuration work:

```bash
cd /root/Codex-Remote-Contact
npm run verify
```

For a running-stack change, also check:

```bash
ncc status
curl -fsS --max-time 3 http://127.0.0.1:3789/api/state | jq .
curl -fsS --max-time 3 http://127.0.0.1:3789/api/maintenance | jq .
curl -fsS --max-time 3 http://127.0.0.1:3000/get_login_info | jq .
```

Report tests, Hub, dashboard, OneBot login, QQ channel and recent fatal/error logs separately. A process existing is not sufficient proof that the message path works.

## Codex-First Backend Deployment

Use this when the user asks Codex to download, install, reinstall, upgrade, or deploy the Codex QQ Bot / Codex Remote Contact backend.

Codex is the deployment operator. Inspect the machine, execute safe in-scope commands, repair ordinary setup issues, run verification, start the services, and report the actual end state. Ask the user only for actions Codex cannot perform, such as scanning a QQ QR code, supplying a missing secret, or approving a privileged command. Do not stop after printing a command list when the requested deployment can continue automatically.

Default backend repository:

```bash
https://github.com/gl813788-byte/codex-qq-bot.git
```

Default install path:

```bash
/root/Codex-Remote-Contact
```

Deployment flow:

1. Inspect the host and existing installation before changing anything:

   ```bash
   uname -a
   command -v git node npm codex ncc || true
   node --version
   codex --version
   git -C /root/Codex-Remote-Contact status --short --branch 2>/dev/null || true
   ```

   Require Node.js 20 or newer. Preserve local changes and runtime data. Never reset, clean, or overwrite a dirty worktree to make deployment easier.

2. If `/root/Codex-Remote-Contact/.git` does not exist, clone the backend:

   ```bash
   git clone https://github.com/gl813788-byte/codex-qq-bot.git /root/Codex-Remote-Contact
   ```

3. If the repo already exists, verify its remote and worktree before updating:

   ```bash
   git -C /root/Codex-Remote-Contact status --short
   git -C /root/Codex-Remote-Contact remote -v
   ```

   If there are local changes, do not overwrite them. Continue using the current checkout when safe, or ask before pulling/merging if an update is required. A clean checkout may be fast-forwarded with `git pull --ff-only`.

4. Install dependencies and verify the checkout before starting it:

   ```bash
   npm --prefix /root/Codex-Remote-Contact install
   npm --prefix /root/Codex-Remote-Contact run verify
   ```

5. Verify the single control entry:

   ```bash
   command -v ncc
   test -x /root/napcat-codex-control.sh
   ```

   If `/root/napcat-codex-control.sh` exists but `ncc` is missing, create or repair only the wrapper:

   ```bash
   ln -sf /root/napcat-codex-control.sh /usr/local/bin/ncc
   chmod +x /root/napcat-codex-control.sh /usr/local/bin/ncc
   ```

   If the control script itself is missing, stop and report that the local `ncc` controller is missing rather than inventing a replacement.

6. Start and connect the stack:

   ```bash
   ncc status
   ncc all
   ```

   If NapCat requires login, surface the QR URL or local WebUI details and pause only for the user's scan. After login, run `ncc connect` yourself.

7. Verify the deployment end to end:

   ```bash
   ncc status
   curl -fsS --max-time 3 http://127.0.0.1:3789/api/state | jq '{channels, maintenance}'
   curl -fsS --max-time 3 http://127.0.0.1:3000/get_login_info | jq .
   ```

   Report separately whether the Hub, NapCat login, OneBot, QQ channel, dashboard, and test suite succeeded. Never describe the deployment as complete while a required component is unavailable.

Do not install or start the old `~/.claude-to-im` daemon as part of this flow. This machine's QQ setup is NapCat + OneBot + `/root/Codex-Remote-Contact` controlled by `ncc`.

## Command Mapping

Map user intent to the existing control script whenever possible:

| User intent | Command |
|---|---|
| start, 启动, 一键启动, 连上 QQ | `ncc all` |
| status, 状态, 看看跑没跑 | `ncc status` |
| connect, 修复连接, 扫码后继续连接 | `ncc connect` |
| start NapCat only | `ncc napcat` |
| start backend only | `ncc hub` |
| dashboard, 控制台, 运行总览, 前端 | open `http://127.0.0.1:3789/`; first confirm with `ncc status` |
| logs, 日志, 看日志 | `ncc logs` for full diagnostics, optionally filtered with `--category` / `--level`, or `ncc logs --compact` for a high-signal summary |
| groups, 群白名单 | `ncc groups` or non-interactive `ncc group-add`, `ncc group-remove`, `ncc group-set` |
| stop backend | `ncc stop-hub` |
| help | `ncc help` |

Prefer the `ncc` alias in user-facing instructions when it is available; use the full `/root/napcat-codex-control.sh` path in scripts or when absolute clarity is useful.

Do not run the old `~/.claude-to-im` daemon for QQ unless the user explicitly asks for the official QQ Bot OpenAPI bridge. This machine's QQ workflow is NapCat + OneBot + Codex Remote Contact.

## Local Dashboard

- Serve `/`, `/dashboard`, `/client.css`, `/client.js`, and explicitly registered image assets from the Hub. Keep executable code and styles in external files to satisfy the dashboard CSP.
- Treat the dashboard as a local operational surface: overview, QQ/iMessage channels, unified memory, structured logs, and device-local preferences. It supports Chinese/English, light/dark/system themes, responsive layouts, and `Cmd/Ctrl+K` quick actions.
- The dashboard uses six focused views: Overview, Channels, Intelligence, Memory, Live Logs, and Settings. Keep channel connection/allowlist/contact controls separate from Bot behavior. Intelligence may persist the QQ enhancer, web lookup, proactive-interest and judge switches plus message/minute cadence, judge model, idle timeout, and recent-context size through `/api/qq/bot-settings`; explicit @Bot replies remain independent from proactive-interest settings. Its diagnostic chips may expose provider names, credential-configured booleans, active generation counts, and pending reply counts, but never secret values.
- The Live Logs view requests verbose structured entries once per second while visible and enabled, renders every safe `details` field inline in chronological order with distinct level/category/trace/error/outcome/latency colors, and follows the newest row by default. Keep pause, follow, row-limit, filtering, and raw-JSON detail controls; page visibility pauses live polling. Browser logs are operational diagnostics and must retain the same redaction boundary as `/api/logs`.
- The Settings page has a persistent LAN-access switch. It keeps the default loopback-only binding when off and dynamically rebinds the Hub to `0.0.0.0` when on without restarting NapCat or the Hub process. Enabling it creates a persistent API token automatically; loopback requests remain usable without a token, remote management API requests require that token, and the token can only be copied from a loopback-loaded dashboard. Displayed LAN URLs exclude proxy/VPN tunnels and virtual/container adapters, prioritizing physical Wi-Fi/Ethernet addresses that other LAN devices can actually reach. If client proxy software still intercepts private traffic, its rules must set the displayed address to DIRECT/bypass. An explicit `CODEX_REMOTE_CONTACT_HOST` environment value remains authoritative and makes the web switch read-only.
- Keep static selector ids unique, Chinese/English translation keys aligned, reduced-motion behavior intact, and at least desktop/tablet/mobile responsive breakpoints. Run `npm run verify` after dashboard changes.
- The asset handler caches loaded files in memory. After changing dashboard files or adding an asset route, verify that no QQ generation is active, then use `ncc stop-hub` followed by `ncc hub`; do not kill NapCat or restart the Hub merely to inspect status.
- If a dashboard asset returns 404, confirm the route is registered in `src/dashboard-assets.js`, the file exists under `modules/mac-client/Resources`, and the running Hub was restarted after the change.

## QQ In-Chat Commands

The Codex Remote Contact backend also handles QQ slash commands in whitelisted QQ groups.

Owner-only commands, accepted only from QQ `3784642920`:

- `/菜单`, `/帮助`, `/指令`: show the QQ management menu.
- `/状态`: show concise QQ runtime status.
- `/详细配置`: show detailed QQ/backend model, owner, group, memory, and feature config.
- `/兴趣配置`, `/兴趣间隔 20`, `/兴趣分钟 5` (or `/兴趣分钟 关闭`), `/兴趣模型 nousresearch/hermes-3-llama-3.1-405b:free`, `/兴趣超时 6500`, `/兴趣最近 8`, `/兴趣重置`: show or adjust QQ proactive interest judging. The message count and elapsed-minute thresholds are independent triggers for the same per-group cycle; whichever check completes first resets both. The minute trigger is only a fallback for a cycle containing at least one new ordinary unmentioned group message, so an idle group with no pending messages never calls the judge.
- `/菜单权限`: show command keys and whether each command is owner-only, public, granted to specific QQ users, or hidden from non-owners.
- `/允许指令 key`, `/禁用指令 key`: control which menu items all non-owner users can see and use.
- `/允许指令 key QQ号`, `/禁用指令 key QQ号`: control which menu items a specific non-owner QQ user can see and use.
- `/模型`: dynamically read and list the models currently available to the logged-in Codex account. `/模型 序号` or `/模型 model-id` switches the QQ reply model, but only to an entry in that live list. An unavailable saved model falls back to the Codex default during Hub startup.
- `/思考强度`: list the reasoning efforts supported by the currently selected model. `/思考强度 low|medium|high|xhigh|max|ultra` (limited to the values advertised for that model) switches QQ reasoning effort. `/智能等级` remains an alias.
- `/白名单`, `/加群 群号`, `/删群 群号`: manage whitelisted QQ groups. The owner menu displays all three lines; aliases also include `/添加白名单群 群号`, `/加入白名单群 群号`, `/删除白名单群 群号`, and `/移除白名单群 群号`.
- `/群管理`, `/禁言 @用户 10m`, `/解禁言 @用户`, `/踢人 @用户`, `/全员禁言 开启|关闭`, `/群禁言列表`: perform real OneBot group moderation in the current group. These commands use the configurable `groupAdmin` permission key. Owner QQ ids and the Bot itself are protected from mute/kick actions.
- `/ban @用户`, `/ban QQ号`, `/ban QQ号 10m`, `/ban QQ号 2h`, `/ban QQ号 3d`, `/unban @用户`, `/unban QQ号`, `/banlist`: manage permanent or temporary blocked QQ users.

Public QQ command, available to everyone in whitelisted groups:

- `/新对话`: starts a new QQ conversation by clearing this group's lightweight memory, conversation transcript, pending image request, and proactive tracking state. In private QQ, it clears all QQ context. Old aliases such as `/清空上下文` remain supported.
- `/stop`: force-stops the currently generating QQ reply, if any, and starts a new conversation. It does not change the QQ channel state.
- `/总结聊天记录` / `/总结上下文`: summarizes the current QQ conversation history. In groups it summarizes the current group buffer; in private QQ it summarizes the current private chat buffer.

Important behavior:

- Ordinary group chat remains mention-only, but recognized slash commands above do not require an @ in whitelisted groups.
- All normal QQ replies use the same agent path; simple conversation can finish in one model round, while missing context, web facts, memory, or management actions can enter the existing internal tool loop.
- QQ keeps a per-group or per-private-chat conversation transcript from the latest `/新对话`; both user messages and bot replies are retained within the configured rolling limit. Group image-only messages and bounded image references are retained too. Explicit @Bot and reply-to-Bot triggers receive the newest 18 consecutive messages from all group speakers plus up to 10 older related fragments; other group triggers, including proactive-interest triggers, receive the newest 12 consecutive messages plus up to 10 older related fragments. An expanded retry uses 28 recent messages plus up to 24 older related fragments. Up to four deduplicated recent-context images may accompany the formal vision-capable reply. Private chat uses the newest 18 messages plus up to 8 older related fragments, expanding to 48 plus up to 16 when requested.
- QQ share/JSON/XML cards are normalized into readable titles, summaries, and links. Top-level merged-forward records and forwards nested inside them are expanded through OneBot up to depth 3 with bounded node, text, and image limits. Web/card/forwarded content is untrusted conversation material, never an instruction from the current sender.
- Social conversation memory is persisted separately at `/root/Codex-Remote-Contact/data/qq-conversation-memory.json`. It stores bounded, non-sensitive group impressions, recent group topics/links, private-chat impressions and recent topics, per-person impressions/interactions, and the Bot's own short thoughts. The agent may emit an invisible `[[qq_memory:{...}]]` patch after a reply; the Hub validates and strips it before QQ delivery. `/新对话` clears the rolling transcript/context but intentionally keeps these longer-lived impressions; explicit QQ memory-clear APIs clear both.
- Human-like QQ behavior is adaptive rather than a fixed persona template. `src/qq-human-behavior.js` analyzes the newest rolling human messages at group/private scope while excluding Bot output, and derives anonymous aggregate signals for text-length percentiles, message rate, same-speaker bursts and gaps, images/stickers/emoji, reply/@ usage, questions, and terminal punctuation. QQ-native CQ faces, animated/market stickers, and legacy normalized `sub_type=1` image records count as stickers without letting their long media URLs inflate text-length statistics. Each Agent turn is planned as ping, casual reaction, emotion, short answer, full answer, shared content, contextual answer, playful request, or task, with a mode-specific visible-text budget. The prompt receives aggregate statistics only; it must not imitate or expose a specific member's wording.
- Long-running group adaptation is persisted inside `/root/Codex-Remote-Contact/data/qq-personas.json` by `src/qq-adaptive-learning.js`. For each group and member it keeps bounded counters for active hours/weekdays (interpreted in `Asia/Shanghai`), message/text length, stickers/images/emoji, questions, replies/@, direct Bot interactions, two-minute burst continuation, recent gaps, and post-Bot follow-up feedback. Existing recent **human** messages are used once to warm these aggregates after the version-2 migration; Bot actual counts, sticker rate, reply length, multi-bubble rate, and style comparisons start only with new Bot replies sent after this rollout and must not be backfilled from older assistant transcript entries. These statistics weakly personalize reply length, sticker/emoji and consecutive-message tendencies for the current member, shorten replies in a busy group, tune bubble delays, and derive bounded per-group proactive message/minute intervals around the owner's configured baseline. They never authorize proactive replies or bypass the interest judge by themselves.
- The adaptive layer periodically compares recent human structural style with new Bot replies. Reviews are driven by a persisted 24-hour clock rather than a message-count trigger. The background minute scheduler initializes and checks each group's review clock even when no new message arrives; a due review waits until the available rolling context contains at least 12 human text samples and 4 post-rollout Bot text samples, then compares up to the full bounded recent buffer (240 requested, subject to the configured transcript cap). It compares length, punctuation, questions, emoji/stickers, multi-bubble use, generic acknowledgements, and service-like endings. The result is a short summary plus at most five deduplicated improvement rules. Each successful review replaces the prior rule set instead of appending to it, so prompt context stays bounded. Only statistics and compressed structural guidance enter the prompt; do not persist or imitate a member's exact wording. `/api/state` and the QQ dashboard expose the complete safe group-level aggregate under `qq.humanBehavior.adaptiveLearning`: sample/confidence counts, text-length ratios, media/expression/reply/mention/question ratios, gap/burst/activity signals, Bot actuals, review sample/times/guidance, ordinary-interest cadence, and cold-interest timing. Each dashboard group is expandable. Startup snapshots, review-clock initialization, and completed reviews are persisted as detailed `learning` logs; the dashboard's auto-learning log button opens that category. The dashboard's Bot actual sticker count is likewise the new-reply counter, not a historical estimate.
- The Bot maintains one generated global self-persona in `/root/Codex-Remote-Contact/data/qq-self-persona.json`. Every group/private scope first produces a bounded anonymous summary that excludes identity, private facts, and raw quotes; after configurable activity thresholds, the current QQ reply model regenerates the global traits, self-description, interest keywords, full interest paragraph, weighted interests, dislikes, proactive topics, and conversation style. The persona name is always forced to the nickname reported by the currently logged-in OneBot QQ account, and that nickname is always the first immutable interest keyword. Raw private content must never be copied into another scope. Safe persona content, generation progress, and the active refresh policy are exposed at `qq.selfPersona` and in the QQ dashboard; scope-summary and global-generation lifecycle entries use the `learning` log category. The default scope policy is 64 messages for the first summary, then 96 new human messages or 24 Bot replies with a four-hour cooldown. The first global persona needs 160 total messages across at least two summarized scopes; later updates need 320 human messages, 80 Bot replies, or 12 scope-summary revisions with a 12-hour cooldown. Failed generation retries wait one hour. These defaults are configurable through `CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_SCOPE_INITIAL_MESSAGES`, `..._SCOPE_MESSAGES`, `..._SCOPE_BOT_REPLIES`, `..._SCOPE_COOLDOWN_HOURS`, `..._GENERATION_INITIAL_MESSAGES`, `..._GENERATION_MESSAGES`, `..._GENERATION_BOT_REPLIES`, `..._GENERATION_SCOPE_SUMMARIES`, `..._GENERATION_COOLDOWN_HOURS`, and `..._FAILURE_RETRY_HOURS`.
- Multi-bubble output is intentionally more frequent but still follows the group's rhythm. Casual/social turns learn from the current same-speaker multi-message-run rate with a small positive boost (bounded rather than always-on); answer/task turns use a lower fraction. When a round prefers multiple bubbles, the Agent should use the first for the reaction/result and the next for one real detail, afterthought, or punchline. The Hub can split two natural clauses through the configured `|||` separator, but must not manufacture filler or mechanically chop a long report. Short casual bubbles may omit the final Chinese period when that matches the group aggregate. Inter-bubble delay starts from `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEND_DELAY_MS`, learns from the observed same-speaker follow-up gap with a compressed scale, and is capped at 1.8 seconds so human-like pacing does not add a long artificial wait. `/api/state` exposes only these safe group-level behavior aggregates under `qq.humanBehavior.groupStyles`.
- Emoji behavior also adapts to the recent aggregate rate and safe emoji palette. It should normally use at most one fitting emoji and must not append one mechanically to every message. For casual/social turns, the Bot's planned sticker probability follows the recent human sticker rate with a modest positive boost (`human rate * 1.35 + 3.5 percentage points`, bounded by chat type); the model prompt and a deterministic semantic matcher may attach one relevant catalog sticker, but errors, safety notices, tasks, long replies, and unrelated media remain excluded. New Bot replies persist their sticker count, and `/api/state` plus the QQ dashboard expose group-level recent-human actual, post-rollout Bot actual, and planned casual rates under `qq.humanBehavior.stickerFrequency`. Explicit mentions/replies must still receive a response; only a proactive-interest turn may return `[[qq_silent]]` when the thread moved on, two humans are talking, the Bot recently spoke too often, or the proposed reply adds no value. The Hub strips this marker and sends nothing.
- A QQ group or private-chat scope has one reply lifecycle at a time, covering model work through delivery and cleanup. Additional ordinary messages are queued and combined into one follow-up turn labeled `消息一`, `消息二`, etc. `/stop` and `/新对话` cancel the in-flight lifecycle and clear that scope's queue before starting fresh. Codex CLI work is globally capped at two concurrent runs by default; tune `CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY` only when the host has sufficient capacity.
- Non-owner users who send owner-only slash commands are rejected or ignored; they must not be allowed to change model, groups, or permissions.
- Non-owner menu visibility is permission-driven: if a command appears in `/菜单` for a non-owner, that command is also executable by that non-owner. Permissions can be public for all non-owners or granted to specific QQ user ids. Configurable keys include `menu`, `newDialog`, `stop`, `summary`, `status`, `config`, `interest`, `model`, `reasoning`, `allowlist`, `groupAdmin`, and `ban`. `permissions` is always owner-only.
- QQ menu configuration changes (model, reasoning effort, proactive-interest settings, allowlist, ban list, and command permissions) are atomically saved to `/root/Codex-Remote-Contact/data/settings.json` before the confirmation reply is sent. A QQ delivery failure must not make an acknowledged configuration change disappear after restart. QQ channel shutdown is intentionally not exposed in the QQ menu; use `ncc` or the external control API for channel lifecycle management.
- Owner QQ ids have absolute authority. Even if other users are granted management-like commands, they must never be allowed to modify, remove, ban, downgrade, or delegate away owner permissions.
- The QQ bot itself can use internal tools that are not shown in `/菜单`: it may emit `[[qq_command:/...]]` for permitted menu actions, `[[qq_command:/聊天记录 最近 50]]`, `[[qq_command:/聊天记录 20-40]]`, or `[[qq_command:/聊天记录 关键词]]` to inspect the current scope, and `[[qq_command:/联网 查询词]]` or `[[qq_command:/搜索 查询词]]` for web lookup. The hub supports an agent-style multi-round tool loop and strips `[[qq_done]]` before sending. Internal menu commands always use the original sender's permissions; they must never grant owner-equivalent authority.
- Built-in social tools are also hidden from `/菜单`: `[[qq_command:/点赞 发送者 1]]`, `[[qq_command:/申请 列表]]`, `[[qq_command:/申请 同步]]`, `[[qq_command:/申请 同意 最新]]`, `[[qq_command:/申请 拒绝 #申请ID 理由]]`, `[[qq_command:/主动加好友 QQ号 验证=验证信息 | 答案=正确答案 | 备注=好友备注]]`, `[[qq_command:/主动加群 群号 答案=正确答案]]`, `[[qq_command:/动态 最近 QQ号 10]]`, `[[qq_command:/发动态 内容]]`, and `[[qq_command:/评论动态 QQ号 tid 内容]]`. Non-owner like targets are limited to the sender, mentioned users, and the replied-to user. Request handling, active add actions, and QQ Space writes are owner-only.
- OneBot friend requests, group join requests, and group invitations are persisted at `/root/Codex-Remote-Contact/data/qq-requests.json` and sent to every configured owner by private QQ message. Requests whose `user_id` is a configured owner are trusted and automatically approved, then reported; other requests remain pending until the owner/Bot accepts or rejects them. `/申请 同步` backfills group requests missed before Hub startup and QQ's separate suspicious-friend queue. Suspicious friend requests can be approved but cannot be reliably rejected because NapCat provides no reject action for that queue. Handling results are reported again and failed upstream actions remain pending with an error instead of being reported as success.
- This machine currently runs NapCat 4.18.9. Its public OneBot API supports request approval but does not expose actions that initiate friend or group requests. `ncc connect` deploys the loopback-only plugin from `modules/napcat-social-bridge` as `napcat-plugin-builtin` and configures `CODEX_REMOTE_CONTACT_QQ_SOCIAL_API_BASE`. `/主动加好友` supports verification messages, correct answers, answer-plus-review, remarks, and friend categories through the current QQNT `ReqToFriend` object. `/主动加群` searches the group, reads its question and join mode, and submits the QQNT join request with the supplied answer and join authorization. Both paths detect already-friend/member, disabled requests, missing answers, full groups, native failures, and QQ risk control; report `submitted`/`pending_approval` only after the upstream call succeeds; and never claim that a rejected or unsupported operation was sent. QQ Space actions use credentials obtained from NapCat and the currently deployed Tencent QZone web endpoints.
- OneBot poke notices are handled only when `target_id` is the bot's own QQ id. Other users poking each other, or bot-originated poke notices, are ignored. A poke targeting the bot is passed to the agent as a normal trigger, and the agent can optionally emit `[[qq_command:/拍一拍 发送者]]` or `[[qq_command:/拍一拍 QQ号]]` to send a poke action back through OneBot. NapCat poke calls include both `user_id` and `target_id`, preserve both endpoint errors for diagnosis, and when the model explicitly says it is poking back but omitted the hidden command, the Hub performs the poke deterministically before retaining that visible claim.
- The QQ bot also has its own public long-term memory store at `/root/Codex-Remote-Contact/data/qq-public-memory.json`. This is for the bot's internal use and is not shown in `/菜单`. The bot may emit `[[qq_command:/记忆 列表]]`, `[[qq_command:/记忆 添加 内容]]`, `[[qq_command:/记忆 修改 编号 内容]]`, or `[[qq_command:/记忆 删除 编号]]` to maintain shared long-term facts. Memory ids can be list positions or `#id`. It should write only stable, reusable, non-sensitive facts, and delete or update entries that become wrong or obsolete.
- The usual default requested by the user is QQ model `gpt-5.5` with reasoning effort `low`, when that model and effort are present in the live Codex model catalog.
- Every Hub-launched Codex process follows the current main Codex login configuration without requiring a Hub restart. Before each child starts, the Hub rereads `/root/.codex/config.toml`, clears login variables inherited from the Hub, and matches custom provider/base-URL settings to the corresponding env file in `/root/.codex/ncc-profiles/`; official `codex login` uses the shared auth files under the current `HOME` / `CODEX_HOME`. Non-auth settings from `active.env` are still reloaded. A main-login change or `ncc codex-use NAME` therefore affects the next QQ/remote-execution request, while already-running generations keep the auth state they started with.
- QQ replies can request local media delivery by emitting markers on their own lines:
  - Images: `[[qq_image:/absolute/path/to/image.png]]`
  - Files: `[[qq_file:/absolute/path/to/file]]` or `[[qq_file:/absolute/path/to/file|filename.ext]]`
  - Stickers: `[[qq_sticker:表情包名]]` when the available sticker catalog contains that name. The catalog combines local files from `data/qq-stickers`, detailed QQ account favorites read through NapCat `/fetch_custom_face_detail`, and persisted marketplace/download metadata from `data/qq-sticker-inventory.json`. Native QQ description/OCR labels are retained as tags, animations are marked, and account/market items are sent back as image URL segments.
- The QQ reply model can inspect a catalog sticker or current-message candidate with `[[qq_command:/看表情 表情名]]`. For an animation the default is the middle three frames; it may instead append `| 20%,50%,80%`, `| 中段5帧`, or `| 均匀6帧`, and it may choose how many current animations to inspect through separate bounded tool calls. A previously unlabeled catalog sticker must still be labeled with `[[qq_command:/表情标签 表情名 | 标签1,标签2 | 画面和适用语境]]` before the reply loop can finish. Persistent labels remain in `data/qq-sticker-labels.json`.
- Sticker-favorite judgment happens only inside a reply lifecycle that was already triggered for another reason and whose current/quoted message contains a sticker. It never invokes the model merely because an ordinary untriggered sticker was posted. In that reply lifecycle the model may use `[[qq_command:/收藏表情 序号]]` for one worthwhile candidate; the Hub calls NapCat `add_custom_face` so the save is real, and no command means do not save it.
- QQ replies can send multiple consecutive text bubbles by putting `|||` on a line by itself between bubbles. The separator is configurable with `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR`; the default send delay is controlled by `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEND_DELAY_MS`.
- QQ web lookup is implemented inside `/root/Codex-Remote-Contact`, not through this chat's built-in browser tool. The live backend is configured through `/root/.codex/ncc-profiles/active.env` and `/root/.codex/ncc-profiles/sharedchat.env`; `ncc search-config` writes the default search config. Current supported providers are `tavily`, `bing`, `baidu`, `so360`, `sogou`, and `duckduckgo`. Provider presets include `balanced`, `china`, `global`, `tavily`, and `privacy`; `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS` can override the exact comma-separated provider order. If `TAVILY_API_KEY` is configured, `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER='tavily'` should be active. If QQ search fails, check `/api/maintenance`, `ncc logs --verbose --category search`, and Tavily connectivity before changing model prompts.
- Unified memory and recent Codex context search are built into `/root/Codex-Remote-Contact/src/unified-memory/` by default. The QQ bot can call unified memory with internal tools such as `[[qq_command:/统一记忆 列表]]`, `[[qq_command:/统一记忆 搜索 关键词]]`, `[[qq_command:/统一记忆 添加 内容]]`, and `[[qq_command:/统一记忆 状态]]`. If startup logs say unified-memory is not installed, inspect syntax/import errors in `src/unified-memory/index.js` and `src/unified-memory/recent-context.js`; it should no longer be treated as a missing optional package.
- QQ enhancer is built into `/root/Codex-Remote-Contact/src/qq-enhancer/` by default. It provides group-chat style prompts, proactive reply routing, image extraction/preparation, sticker catalog loading, bubble splitting, and QQ media marker handling. Proactive reply judgment is isolated in `src/qq-enhancer/proactive-interest.js`; tune that file when changing when the bot should voluntarily speak in a group. The current proactive logic maintains one pending cycle per group for ordinary unmentioned messages. A judge call is due when either `qq.proactive.judgeEveryMessages` pending messages accumulate or a non-empty cycle reaches `qq.proactive.judgeEveryMinutes`; the defaults are 20 messages and 5 minutes, configured with `/兴趣间隔 20` and `/兴趣分钟 5` (`0`/`关闭` disables only the ordinary minute trigger). A completed ordinary check—reply, decline, stale topic, disabled judge, or provider failure—consumes the messages present when it started and restarts the minute clock; messages arriving during the asynchronous check remain pending in the next cycle. With zero pending messages, the ordinary message/minute branch does not call OpenRouter. Before a minute-triggered ordinary check, the scheduler also waits for a short 4–20 second quiet window derived from the group's aggregate human message gaps, so it does not jump into the middle of a burst. Explicit @/reply-to-Bot messages bypass proactive counting. One judge per group may be in flight, an old proactive reply is suppressed if newer group activity arrives while judging, active Bot generation is not interrupted, and sufficiently stale cached topics are discarded instead of receiving a late reply. Rule scores are context rather than a hard gate, and the final reply decision uses the judge model's structured JSON with a fixed interest threshold of 20. The judge sees only image counts in its recent-message JSON, never image URLs. When its decision permits a reply, the exact recent-message window used by the judge is attached to the formal QQ reply prompt and up to four deduplicated images from that window are passed to the formal vision model; a declined or failed judge never starts that image-processing path. The default judge model is `nousresearch/hermes-3-llama-3.1-405b:free` and can be changed with `/兴趣模型 model-id`. Interest-judge requests explicitly send OpenRouter `reasoning.effort: none` plus a strict JSON Schema containing `analysis`, `semanticIntent`, `shouldReply`, `interest`, `reason`, and `replyStyle`, and provider routing requires support for those parameters. `semanticIntent` summarizes what the speaker means in context and whether they appear to expect the Bot to say, answer, or do anything; on an affirmative decision it is passed to the formal reply model as bounded, untrusted supporting context and never bypasses the interest threshold on its own. If a provider still returns a structurally invalid decision, the Hub retries the format once; idle timeouts, HTTP failures, and rate limits are not retried. Judge responses are streamed: `qq.proactive.judge.timeoutMs` is an idle timeout before the first token or between token chunks, and is reset whenever reasoning or content tokens arrive; generation continues until the stream ends, subject to a final token cap. It uses `OPENROUTER_API_KEY` / `CODEX_REMOTE_CONTACT_OPENROUTER_API_KEY` and logs detailed decisions under `ncc logs --category interest`. HTTP 429 means the provider rejected that request due to rate limit/quota at that moment, not that the configured model id is inherently unusable. The model key must stay in env files, not `data/settings.json`. If startup logs say qq-enhancer is not installed, inspect syntax/import errors in `src/qq-enhancer/index.js` and `src/qq-enhancer/proactive-interest.js`; it should no longer be treated as a missing optional package.
- Interest reply also has timed group and private branches. Each group/contact learns a shortest circular 6–18 hour activity window covering at least 85% of observed messages; fewer than 20 samples use `09:00-23:00` Asia/Shanghai only as fallback. The cold-group branch requires at least 20 learned human samples and a quiet threshold of roughly 4/6/10/8 hours for high/typical/low/unknown activity. It never queues behind active generation or pending ordinary-interest work. When due, the formal QQ Agent sees recent context and may emit exactly one short concrete message or `[[qq_silent]]`; tools, management actions, multi-bubbles, fallback chatter, and context-image processing are disabled. A silent check has a base three-hour cooldown. Delivered Bot bubbles increase `unansweredBotStreak`; until a human replies, interest is multiplicatively suppressed and both the quiet threshold and retry cooldown grow exponentially, but outreach is not permanently blocked. The private branch uses interaction frequency plus time since the latest activity: probability is relatively high shortly after a learned delay, falls to a very low middle period, then rises again after a long gap. Unanswered Bot messages reduce that probability and lengthen its cooldown, with stronger suppression outside the long-gap phase. New activity supersedes stale generation. `/api/state` exposes group state at `qq.humanBehavior.adaptiveLearning.*.coldInterest`, private state at `qq.humanBehavior.privateAdaptiveLearning.*.privateInterest`, and policies under `qq.proactive`. The dashboard has global-persona, cold-group, and private-interest panels. Status changes and every silent/sent/superseded/failed outcome are structured `interest` logs.
- Ordinary proactive interest uses the generated persona and relationship distance. The logged-in QQ nickname is a fixed keyword; a match in the current message or quoted message immediately wakes the judge, while current/quoted hits, recent-context hits, relationship timing, and learned cadence are merged into one contextual decision. Topic/persona interest is the primary decision criterion and insertion timing is secondary. After a direct interaction with a sender, that sender's ordinary cadence contracts to at least one message and one minute, then smoothly decays to the configured group baselines as both message and time distance grow. Unanswered Bot output applies an interest multiplier. Explicit @Bot/reply-to-Bot messages always enter the reply path, but the first bubble uses `src/qq-relationship-interest.js` to choose quote, sender mention, or plain delivery; quote/@ probability rises with messages and minutes since the last Bot/person interaction. Interest logs include trigger reason, keyword hits, relationship distances, effective model interest, and addressing mode/probability.
- QQ image generation and owner file/image tasks use a per-request workspace under `runtime/qq-task-workspaces/<timestamp-kind-id>/` with `input/` for downloaded QQ images and `output/` for deliverable assets. The Hub only sends files whose real path remains under the current task's `output/`; images may additionally use the legacy `runtime/qq-output-images/` or local sticker directory. Markers pointing at task inputs, old workspaces, project files, arbitrary paths, or symlink escapes are rejected. An owner task that needs to send an existing local file must first copy it into this request's `output/`. Cleanup is a direct, path-validated recursive removal after delivery, not another Codex task. If an image marker has no permitted readable image, QQ receives an explicit failure instead of a false “已生成”.
- Safe downloads use `strict` address validation by default. On hosts where a local proxy maps public DNS names to `198.18.0.0/15`, set `CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE=proxy-compatible`; this exception applies only to DNS names resolved into that Fake-IP range. Literal private/Fake-IP URLs, localhost and all other private or reserved ranges remain blocked, and every redirect is revalidated.
- Unified-memory writes and Hub state saves are serialized and atomically replaced. A malformed unified-memory file is preserved and reported instead of being silently replaced with an empty store. Recent Codex context discovery retains the newest files by modification time even when session directories are large.
- OneBot calls use a bounded timeout (`CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS`, default 10 seconds). When no OneBot token is configured, the webhook is trusted only if both the HTTP Host and the actual peer socket address are loopback; this keeps owner identity working for the local tokenless NapCat client without trusting spoofed remote requests. Hub HTTP bodies must be JSON objects and are capped at 1 MiB; the Hub binds to `127.0.0.1` by default (`CODEX_REMOTE_CONTACT_HOST` and `CODEX_REMOTE_CONTACT_PORT` override it).
- Structured logs persist `debug` and higher by default, so routine inbound QQ/OneBot diagnostics are stored. New entries use schema v2 ids plus optional trace/span ids. Each QQ reply lifecycle shares one trace across inbound handling, routing, proactive-interest judging, web lookup, Codex generation, sending, and persistence; the final `lifecycle` record reports outcome and per-stage/total durations without copying the reply body. `ncc logs` reads the current and rotated JSONL files, shows full fields by default, and supports `--level`/`--errors`, `--category`, `--trace`, `--group`, `--sender`, `--search`, `--since`, `--until`, `--slow`, `--summary`, and `--json`; use `--compact` for a high-signal view. Human-readable interactive output uses unified Chinese event names and independently color-codes severity, category, stable trace id, outcome/error values, and latency bands; explicit @-Bot messages remain highlighted. `--color` forces ANSI output when stdout is not a TTY and `--plain` disables it. Multiline values are folded for human display, while `--json` retains raw structured fields. Codex child failures persist extracted diagnostic lines rather than copying the complete input prompt. `/api/logs` supports equivalent `level`, `category`, `trace`, `group`, `sender`, `q`, `since`, `until`, and `slow` filters, adds `messageZh` and a concise `errorZh`, returns matched-count and level/category/latency summary fields, and remains verbose unless `verbose=0`. Set `CODEX_REMOTE_CONTACT_LOG_LEVEL=info` to reduce persisted detail. Console output defaults to success/warn/error and can be tuned with `CODEX_REMOTE_CONTACT_LOG_CONSOLE_LEVELS` (or disabled with `CODEX_REMOTE_CONTACT_LOG_CONSOLE=0`).
- When changing Codex Remote Contact behavior in a way that contradicts or extends this skill, update this `SKILL.md` after finishing the code change so future sessions follow the live behavior.

## Start Flow

1. Run `ncc status`.
2. If dead screen sessions are reported, run `screen -wipe`.
3. Run `ncc all`.
4. If the backend is running but OneBot is unavailable, inspect NapCat screen output:

```bash
screen -S napcat -X hardcopy /tmp/napcat.screen.log
tail -n 160 /tmp/napcat.screen.log
```

5. If a QQ QR login URL appears, give that URL to the user and tell them to scan it with mobile QQ.
6. After the user confirms login, run `ncc connect`.
7. Confirm success with `ncc status`.

## NapCat WebUI Token

This section is only about NapCat's own login/backend WebUI on port `6099`. It is distinct from the Codex Remote Contact dashboard on port `3789`.

When the user asks for the NapCat backend/login token, read it from:

```bash
/root/Napcat/opt/QQ/resources/app/app_launcher/napcat/config/webui.json
```

The value is `.token`. Provide it only when needed for local login, and identify the URL as `http://127.0.0.1:6099/webui`.

## Diagnosis

Useful checks:

```bash
ps -ef | rg -i 'napcat|QQ/qq|Codex-Remote-Contact|node src/server|npm start|xvfb'
ss -ltnp | rg ':3000|:3789|:6099|qq|node'
curl -fsS --max-time 3 -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:3789/
curl -fsS --max-time 3 http://127.0.0.1:3789/api/state | jq .
curl -fsS --max-time 3 http://127.0.0.1:3789/api/maintenance | jq '.webLookup'
curl -fsS --max-time 3 'http://127.0.0.1:3789/api/logs?limit=50' | jq .
ncc logs --tail 80
ncc logs --verbose --category search --tail 120
ncc logs -f
curl -fsS --max-time 3 http://127.0.0.1:3000/get_login_info | jq .
screen -ls
```

Unified backend logs are written as JSONL to `/root/Codex-Remote-Contact/runtime/logs/hub.jsonl` unless `CODEX_REMOTE_CONTACT_LOG_FILE` overrides the path. Prefer `ncc logs` for detailed human-readable colored output; use `ncc logs --compact` for a shorter high-signal view. `/api/logs` is detailed by default; add `verbose=0` for compact structured entries.

Common states:

- NapCat process running, WebUI on `6099`, OneBot on `3000` unavailable: QQ is probably not logged in yet, or NapCat has not loaded the OneBot config.
- Backend on `3789` running, `channels.qq` false: run `connect` after OneBot is available.
- Backend API works but `/` or a dashboard asset is 404/stale: check `src/dashboard-assets.js` and restart only the Hub with `ncc stop-hub`, then `ncc hub` after confirming no active QQ generation.
- Dead screen sockets: run `screen -wipe`, then retry.
- No `onebot11_*.json`: log in to NapCat once so it creates an account-specific OneBot config.
- QQ web lookup should show `webLookupProvider: "tavily"` in `status` when a Tavily key is configured, and `/api/maintenance` should show `.webLookup.effectiveProvider == "tavily"` after a search-triggering QQ query. `/api/maintenance` also exposes `.webLookup.configuredProviders`, `.webLookup.providerPreset`, `.webLookup.lastAttempts`, and `.webLookup.lastProviderErrors`. `ncc logs` is concise by default; use `ncc logs --verbose --category search` for translated detailed logs showing QQ message text, trigger reason, provider attempts, result titles, URLs, and snippets.

## Safety

- Do not expose unrelated secrets from `~/.claude-to-im/config.env`.
- Do not kill QQ, Node, or screen sessions unless the user asked to stop/restart or the status clearly shows stale/dead sessions.
- Prefer non-interactive commands for automation. Use the interactive group manager only when the user asks for menu-style management.
