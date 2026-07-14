---
name: claude-to-im
description: |
  Manage the local NapCat + Codex Remote Contact QQ bridge for THIS Codex session.
  Use when the user asks to start, connect, diagnose, log in, or check QQ/NapCat,
  OneBot, Codex Remote Contact, its local dashboard, QQ group whitelist, or phrases
  like "启动napcat", "连上qq", "QQ后台", "NapCat后台", "扫码登录", "OneBot",
  "群白名单", "控制台", "运行总览", "前端", "ncc", "napcat-codex-control".
  This local setup uses NapCat/QQ + OneBot HTTP
  and /root/Codex-Remote-Contact, not the official QQ Bot OpenAPI channel.
---

# NapCat/Codex QQ Bridge

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
- Allowed QQ groups: read `ALLOWED_GROUPS` from `/root/.napcat-codex-control.env`
- Owner QQ user id: `3784642920` should be present in `/root/Codex-Remote-Contact/data/settings.json`
  under `qq.ownerUserIds`. Owner-only QQ slash commands are accepted from this QQ id
  in whitelisted groups without needing to @ the bot.

## Backend Install / Download

Use this when the user asks Codex to download, install, reinstall, or set up the Codex QQ Bot / Codex Remote Contact backend through this skill.

Default backend repository:

```bash
https://github.com/gl813788-byte/codex-qq-bot.git
```

Default install path:

```bash
/root/Codex-Remote-Contact
```

Install flow:

1. If `/root/Codex-Remote-Contact/.git` does not exist, clone the backend:

   ```bash
   git clone https://github.com/gl813788-byte/codex-qq-bot.git /root/Codex-Remote-Contact
   ```

2. If the repo already exists, check it before updating:

   ```bash
   git -C /root/Codex-Remote-Contact status --short
   git -C /root/Codex-Remote-Contact remote -v
   ```

   If there are local changes, do not overwrite them. Report the dirty files and either continue without pulling or ask before merging/rebasing.

3. Install backend dependencies:

   ```bash
   npm --prefix /root/Codex-Remote-Contact install --omit=dev
   ```

4. Verify the single control entry:

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

5. Verify runtime status:

   ```bash
   ncc status
   ```

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
- `/模型 5.5`, `/模型 5.4`, `/模型 5.4-mini`, `/模型 5.3-codex`, or short forms `/5.5`, `/5.4`, `/mini`, `/codex`: switch the QQ reply model.
- `/智能等级 low|medium|high|xhigh`: switch QQ reasoning effort.
- `/白名单`, `/加群 群号`, `/删群 群号`: manage whitelisted QQ groups. The owner menu displays all three lines; aliases also include `/添加白名单群 群号`, `/加入白名单群 群号`, `/删除白名单群 群号`, and `/移除白名单群 群号`.
- `/群管理`, `/禁言 @用户 10m`, `/解禁言 @用户`, `/踢人 @用户`, `/全员禁言 开启|关闭`, `/群禁言列表`: perform real OneBot group moderation in the current group. These commands use the configurable `groupAdmin` permission key. Owner QQ ids and the Bot itself are protected from mute/kick actions.
- `/ban @用户`, `/ban QQ号`, `/ban QQ号 10m`, `/ban QQ号 2h`, `/ban QQ号 3d`, `/unban @用户`, `/unban QQ号`, `/banlist`: manage permanent or temporary blocked QQ users.

Public QQ command, available to everyone in whitelisted groups:

- `/新对话`: starts a new QQ conversation by clearing this group's lightweight memory, conversation transcript, pending image request, and proactive cooldown. In private QQ, it clears all QQ context. Old aliases such as `/清空上下文` remain supported.
- `/stop`: force-stops the currently generating QQ reply, if any, and starts a new conversation. It does not change the QQ channel state.
- `/总结聊天记录` / `/总结上下文`: summarizes the current QQ conversation history. In groups it summarizes the current group buffer; in private QQ it summarizes the current private chat buffer.

Important behavior:

- Ordinary group chat remains mention-only, but recognized slash commands above do not require an @ in whitelisted groups.
- QQ keeps a per-group or per-private-chat conversation transcript from the latest `/新对话`; both user messages and bot replies are included as context for every following reply in that same conversation, bounded by the configured rolling limit. Group image-only messages and bounded image references are retained too. Explicit @Bot and reply-to-Bot triggers receive the newest 18 consecutive messages from all group speakers, expanding to 28 when the model requests more context; other group triggers use the newest 12 by default. Up to four deduplicated recent-context images may accompany the formal vision-capable reply.
- Human-like QQ behavior is adaptive rather than a fixed persona template. `src/qq-human-behavior.js` analyzes recent human messages while excluding Bot output and derives anonymous aggregate signals for text length, message rate, bursts/gaps, images/stickers/emoji, reply/@ usage, questions, and punctuation. QQ-native faces and animated/market stickers count as stickers without letting media URLs inflate text-length statistics. The prompt receives aggregate statistics only and must not imitate or expose a specific member's wording.
- Long-running group adaptation is persisted in `data/qq-personas.json` by `src/qq-adaptive-learning.js`. Each group and member keeps bounded counters for active hours/weekdays in `Asia/Shanghai`, message/text length, stickers/images/emoji, questions, replies/@, direct Bot interactions, bursts, recent gaps, and post-Bot follow-up feedback. Human history warms the aggregates once; Bot actual counts start only with new replies after rollout. These weak signals personalize reply length, stickers/emoji, multi-bubble rhythm, bubble delay, and bounded per-group proactive message/minute intervals without authorizing a reply by themselves.
- Every group has a persisted 24-hour style-review clock. A due review waits for at least 12 human text samples and 4 post-rollout Bot text samples, compares up to 240 bounded recent entries, and replaces the prior compact rule set with at most five deduplicated improvements. `/api/state` and the dashboard expose safe group-level samples, ratios, timing, Bot actuals, review state/guidance, ordinary-interest cadence, and cold-interest timing in expandable per-group panels. Startup snapshots and completed reviews are detailed `learning` logs, and the dashboard can open that category directly.
- Casual/social sticker planning follows the learned human sticker rate with a bounded boost (`human rate * 1.35 + 3.5 percentage points`). The prompt and deterministic matcher may attach one relevant catalog sticker, but tasks, errors, safety notices, long replies, and unrelated media remain excluded. Bot actual sticker and multi-bubble counts are persisted separately and exposed alongside recent human actuals in `/api/state` and the dashboard.
- A QQ group or private-chat scope has one reply lifecycle at a time, covering model work through delivery and cleanup. Additional ordinary messages are queued and combined into one follow-up turn labeled `消息一`, `消息二`, etc. `/stop` and `/新对话` cancel the in-flight lifecycle and clear that scope's queue before starting fresh. Codex CLI work is globally capped at two concurrent runs by default; tune `CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY` only when the host has sufficient capacity.
- Non-owner users who send owner-only slash commands are rejected or ignored; they must not be allowed to change model, groups, or permissions.
- Non-owner menu visibility is permission-driven: if a command appears in `/菜单` for a non-owner, that command is also executable by that non-owner. Permissions can be public for all non-owners or granted to specific QQ user ids. Configurable keys include `menu`, `newDialog`, `stop`, `summary`, `status`, `config`, `interest`, `model`, `reasoning`, `allowlist`, `groupAdmin`, and `ban`. `permissions` is always owner-only.
- QQ menu configuration changes (model, reasoning effort, proactive-interest settings, allowlist, ban list, and command permissions) are atomically saved to `/root/Codex-Remote-Contact/data/settings.json` before the confirmation reply is sent. A QQ delivery failure must not make an acknowledged configuration change disappear after restart. QQ channel shutdown is intentionally not exposed in the QQ menu; use `ncc` or the external control API for channel lifecycle management.
- Owner QQ ids have absolute authority. Even if other users are granted management-like commands, they must never be allowed to modify, remove, ban, downgrade, or delegate away owner permissions.
- The QQ bot itself can use internal tools that are not shown in `/菜单`: it may emit `[[qq_command:/...]]` for permitted menu actions, `[[qq_command:/聊天记录 最近 50]]`, `[[qq_command:/聊天记录 20-40]]`, or `[[qq_command:/聊天记录 关键词]]` to inspect the current scope, plus its bounded memory and web-query tools. Internal menu commands always use the original sender's permissions; they must never grant owner-equivalent authority. The bot can call tools repeatedly and should emit `[[qq_done]]` in its final answer; the hub strips internal markers before sending.
- Built-in social tools are also hidden from `/菜单`: `[[qq_command:/点赞 发送者 1]]`, `[[qq_command:/申请 列表]]`, `[[qq_command:/申请 同步]]`, `[[qq_command:/申请 同意 最新]]`, `[[qq_command:/申请 拒绝 #申请ID 理由]]`, `[[qq_command:/主动加好友 QQ号 验证=验证信息 | 答案=正确答案 | 备注=好友备注]]`, `[[qq_command:/主动加群 群号 答案=正确答案]]`, `[[qq_command:/动态 最近 QQ号 10]]`, `[[qq_command:/发动态 内容]]`, and `[[qq_command:/评论动态 QQ号 tid 内容]]`. Non-owner like targets are limited to the sender, mentioned users, and the replied-to user. Request handling, active add actions, and QQ Space writes are owner-only.
- OneBot friend requests, group join requests, and group invitations are persisted at `/root/Codex-Remote-Contact/data/qq-requests.json` and sent to every configured owner by private QQ message. Requests whose `user_id` is a configured owner are trusted and automatically approved, then reported; other requests remain pending until the owner/Bot accepts or rejects them. `/申请 同步` backfills group requests missed before Hub startup and QQ's separate suspicious-friend queue. Suspicious friend requests can be approved but cannot be reliably rejected because NapCat provides no reject action for that queue. Handling results are reported again and failed upstream actions remain pending with an error instead of being reported as success.
- This machine currently runs NapCat 4.18.9. Its public OneBot API supports request approval but does not expose actions that initiate friend or group requests. `ncc connect` deploys the loopback-only plugin from `modules/napcat-social-bridge` as `napcat-plugin-builtin` and configures `CODEX_REMOTE_CONTACT_QQ_SOCIAL_API_BASE`. `/主动加好友` supports verification messages, correct answers, answer-plus-review, remarks, and friend categories through the current QQNT `ReqToFriend` object. `/主动加群` searches the group, reads its question and join mode, and submits the QQNT join request with the supplied answer and join authorization. Both paths detect already-friend/member, disabled requests, missing answers, full groups, native failures, and QQ risk control; report `submitted`/`pending_approval` only after the upstream call succeeds; and never claim that a rejected or unsupported operation was sent.
- OneBot poke notices are handled only when `target_id` is the Bot's own QQ id. NapCat poke calls include `user_id` and `target_id`, preserve all endpoint failures for diagnosis, and when the model explicitly says it is poking back but omitted the hidden command, the Hub performs the poke deterministically before retaining that visible claim.
- The QQ bot also has its own public long-term memory store at `/root/Codex-Remote-Contact/data/qq-public-memory.json`. This is for the bot's internal use and is not shown in `/菜单`. The bot may emit `[[qq_command:/记忆 列表]]`, `[[qq_command:/记忆 添加 内容]]`, `[[qq_command:/记忆 修改 编号 内容]]`, or `[[qq_command:/记忆 删除 编号]]` to maintain shared long-term facts. Memory ids can be list positions or `#id`. It should write only stable, reusable, non-sensitive facts, and delete or update entries that become wrong or obsolete.
- The usual default requested by the user is QQ model `gpt-5.5` with reasoning effort `low`.
- QQ replies can request local media delivery by emitting markers on their own lines:
  - Images: `[[qq_image:/absolute/path/to/image.png]]`
  - Files: `[[qq_file:/absolute/path/to/file]]` or `[[qq_file:/absolute/path/to/file|filename.ext]]`
  - Stickers: `[[qq_sticker:表情包名]]` when the available catalog contains that name. The catalog combines local files, detailed QQ account favorites, and persisted marketplace/download metadata; native QQ descriptions/OCR labels are retained as tags and animations are marked.
- The QQ reply model can inspect a catalog or current-message sticker with `[[qq_command:/看表情 表情名]]`. Animated inspection defaults to the middle three frames; the model may instead specify percentages, a middle/even frame count, and may inspect as many current animations as useful through separate bounded tool calls. Previously unlabeled catalog stickers still require `/表情标签` after their first inspection.
- Sticker-favorite judgment happens only inside a reply lifecycle that was already triggered for another reason and whose current/quoted message contains a sticker. It never invokes the model merely because an ordinary untriggered sticker was posted. In that reply lifecycle the model may use `[[qq_command:/收藏表情 序号]]` for one worthwhile candidate; the Hub calls NapCat `add_custom_face` so the save is real, and no command means do not save it.
- QQ replies can send multiple consecutive text bubbles by putting `|||` on a line by itself between bubbles. The separator is configurable with `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR`; the default send delay is controlled by `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEND_DELAY_MS`.
- QQ web lookup is implemented inside `/root/Codex-Remote-Contact`, not through this chat's built-in browser tool. The live backend is configured through `/root/.codex/ncc-profiles/active.env` and `/root/.codex/ncc-profiles/sharedchat.env`; `ncc search-config` writes the default search config. Current supported providers are `tavily`, `bing`, `baidu`, `so360`, `sogou`, and `duckduckgo`. Provider presets include `balanced`, `china`, `global`, `tavily`, and `privacy`; `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS` can override the exact comma-separated provider order. If `TAVILY_API_KEY` is configured, `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER='tavily'` should be active. If QQ search fails, check `/api/maintenance`, `ncc logs --verbose --category search`, and Tavily connectivity before changing model prompts.
- Unified memory and recent Codex context search are built into `/root/Codex-Remote-Contact/src/unified-memory/` by default. The QQ bot can call unified memory with internal tools such as `[[qq_command:/统一记忆 列表]]`, `[[qq_command:/统一记忆 搜索 关键词]]`, `[[qq_command:/统一记忆 添加 内容]]`, and `[[qq_command:/统一记忆 状态]]`. If startup logs say unified-memory is not installed, inspect syntax/import errors in `src/unified-memory/index.js` and `src/unified-memory/recent-context.js`; it should no longer be treated as a missing optional package.
- QQ enhancer is built into `/root/Codex-Remote-Contact/src/qq-enhancer/` by default. Ordinary unmentioned messages maintain one pending cycle per group. A judge call is due when either the learned message threshold or a non-empty cycle's learned minute threshold completes; whichever finishes first consumes only the messages present when it started and restarts both clocks. A short learned quiet window avoids interrupting human bursts, newer activity suppresses stale decisions, and zero pending messages never call OpenRouter. Explicit @/reply-to-Bot triggers bypass proactive counting. Detailed decisions are logged under `ncc logs --category interest`.
- Interest reply also has a cold-group time branch for allowlisted groups. It measures from the latest human or Bot transcript entry, requires at least 20 learned human samples, and only considers outreach during `09:00-23:00` Asia/Shanghai after roughly 4 hours for high activity, 6 for typical, 10 for low, or 8 while unknown. It never queues behind active work. When due, the formal Agent sees the recent ten-message context and may emit one short message or `[[qq_silent]]`; tools, management actions, multi-bubble output, error fallback chatter, and context-image processing are disabled. Silence waits three hours before retry; a delivered cold message blocks further outreach until a human posts, and new activity during generation suppresses the stale reply. `/api/state`, the dashboard, and detailed `interest` logs expose eligibility, thresholds, timestamps, runtime blockers, silent/sent/superseded/failed outcomes, durations, and trace ids.
- QQ image generation and owner file/image tasks use a per-request workspace under `runtime/qq-task-workspaces/<timestamp-kind-id>/` with `input/` for downloaded QQ images and `output/` for deliverable assets. The Hub only sends files whose real path remains under the current task's `output/`; images may additionally use the legacy `runtime/qq-output-images/` or local sticker directory. Markers pointing at task inputs, old workspaces, project files, arbitrary paths, or symlink escapes are rejected. An owner task that needs to send an existing local file must first copy it into this request's `output/`. Cleanup is a direct, path-validated recursive removal after delivery, not another Codex task. If an image marker has no permitted readable image, QQ receives an explicit failure instead of a false “已生成”.
- Unified-memory writes and Hub state saves are serialized and atomically replaced. A malformed unified-memory file is preserved and reported instead of being silently replaced with an empty store. Recent Codex context discovery retains the newest files by modification time even when session directories are large.
- OneBot calls use a bounded timeout (`CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS`, default 10 seconds). When no token is configured, the webhook is trusted only if both the Host header and actual peer address are loopback. Hub HTTP bodies must be JSON objects and are capped at 1 MiB.
- Structured logs persist `debug` and higher by default. `ncc logs` and `/api/logs` show full details by default and support level/category/trace/group/sender/query/time/latency filters; use `--compact` or `verbose=0` for a high-signal summary. Adaptive snapshots use category `learning`; cold-group states and decisions use `interest`. The dashboard's feature log buttons open these categories prefiltered.
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

Unified backend logs are written as JSONL to `/root/Codex-Remote-Contact/runtime/logs/hub.jsonl` unless `CODEX_REMOTE_CONTACT_LOG_FILE` overrides the path. Prefer `ncc logs` for detailed human-readable output; use `ncc logs --compact` for a shorter high-signal view. `/api/logs` is detailed by default; add `verbose=0` for compact structured entries.

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
