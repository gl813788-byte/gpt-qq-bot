# Features

[简体中文](FEATURES_CN.md) | English

Codex QQ Bot is a local message hub: OneBot provides QQ transport, the Hub owns permissions, context, tools, memory and delivery, and Codex CLI performs reasoning and tasks. QQ, NapCat and LLBot binaries are not distributed by this repository.

## QQ transport and triggers

- OneBot 11 HTTP API and reverse HTTP webhooks.
- Group traffic is limited to `qq.allowedGroups`; private and group chats have separate context.
- Ordinary group messages trigger on mention, reply to the Bot or a poke targeting the Bot.
- Recognized slash commands do not require a mention inside allowlisted groups. Proactive interest uses a separate constrained path.
- Message, user and group IDs are normalized, and duplicate OneBot events are dropped before domain policy.
- JSON/XML share cards and nested merged-forward records become bounded, readable, untrusted context.

## Codex Agent reply path

Every normal QQ reply uses the same Agent pipeline:

```text
trigger policy
  -> recent and related chat, images and memory
  -> first Codex round
  -> optional bounded internal tool rounds
  -> visible final response
  -> text/image/file/sticker/multi-bubble delivery
```

A simple conversation can finish in one round. Missing history, web facts, memory or management actions can enter the internal tool loop. Tools retain the original sender's permissions and cannot elevate the model to owner. Hidden markers such as `[[qq_done]]`, `[[qq_command:...]]` and memory patches are validated and stripped before delivery.

Codex defaults to two active child processes and 32 pending jobs. Each group or private scope has one complete reply lifecycle; later messages queue into a combined follow-up. `/stop` and `/新对话` cancel active work and clear that scope's queue.

## Context and memory

| Layer | Content | Storage |
| --- | --- | --- |
| Rolling context | Recent human and Bot messages per scope | `data/qq-memory.json` |
| Conversation transcript | Bounded messages and image references since `/新对话` | Runtime state and local persistence |
| Social memory | Group/private impressions, topics, interactions and short Bot thoughts | `data/qq-conversation-memory.json` |
| Public long-term memory | Stable, reusable, non-sensitive facts | `data/qq-public-memory.json` |
| Adaptive statistics | Group rhythm, structural style and interaction counts | `data/qq-personas.json` |
| Global self-persona | Privacy-filtered summaries from individual scopes | `data/qq-self-persona.json` |
| Unified memory | QQ, iMessage and recent Codex context | Data owned by `src/unified-memory/` |

`/新对话` clears short context but preserves long-lived social impressions. Explicit memory-clear APIs remove the selected longer-lived layer. Writes are bounded, privacy-filtered, serialized and atomically replaced.

## Adaptive social behavior

- `qq-human-behavior` derives anonymous short-window message length, rate, bursts, media/emoji, reply/mention, question and punctuation signals without copying a member's wording.
- `qq-adaptive-learning` persists activity, structure, interaction distance and post-Bot feedback to weakly tune length, sticker probability, bubble rhythm and delay.
- A persisted 24-hour review clock can produce at most five compact style improvements and replaces the previous set to keep prompts bounded.
- The global self-persona is generated only from privacy-filtered scope summaries. Raw private content must not cross scopes.
- Adaptive data changes style and cadence; it never bypasses allowlists, permissions or the interest judge.

## Proactive interest

Three constrained paths exist:

1. **Ordinary group interest:** unmentioned messages enter a per-group pending cycle. The first completed message or non-empty minute threshold invokes an OpenRouter semantic judge. Empty cycles do not call a model, and new activity can supersede an old result.
2. **Cold-group interest:** learned activity, latest human/Bot traffic, unanswered output and activity windows gate a single short outreach message after a long quiet period. Silence is a valid outcome.
3. **Private interest:** interaction frequency, time since activity and unanswered Bot output dynamically tune probability and cooldown.

The ordinary group judge streams through OpenRouter with a strict JSON Schema containing `analysis`, `semanticIntent`, `shouldReply`, `interest`, `reason` and `replyStyle`. `semanticIntent` is bounded, untrusted supporting context describing what the speaker may mean and what they appear to expect the Bot to say or do; it cannot bypass the interest threshold by itself. Hub performs at most one format retry for structurally invalid provider output. Timeouts, HTTP errors and rate limits are not blindly retried. The timeout measures idle time before the first token or between token chunks, so an active stream may continue to completion under a final token cap.

Proactive work does not force itself behind active generation. New activity suppresses stale results. Cold/private paths cannot invoke management tools, multi-bubble delivery or fallback chatter. State and decisions use the `interest` log category.

## Images, files, stickers and bubbles

- QQ images, screenshots, quoted images, share cards and bounded forwarded images can enter context.
- The model can request local delivery through `[[qq_image:...]]`, `[[qq_file:...]]` and `[[qq_sticker:...]]`.
- File/image tasks use `runtime/qq-task-workspaces/<request>/input|output`. Only real paths inside the current request's `output/` pass delivery validation, preventing arbitrary file disclosure and symlink escapes.
- Local stickers, QQ account favorites and downloaded metadata form a bounded catalog. Animated items support bounded frame inspection, with labels stored separately.
- Sticker-favorite judgment runs only inside an already-triggered lifecycle; an ordinary untriggered sticker does not call a model by itself.
- A standalone `|||` splits consecutive bubbles. Separator, count and delay are configurable, and adaptation changes rhythm only for suitable social replies.

## Commands, permissions and social tools

Common public commands include `/菜单`, `/新对话`, `/stop` and `/总结聊天记录`.

Owner capabilities include status/configuration, model and reasoning selection, proactive policy, group allowlists, bans, command permissions, moderation, request handling and notifications. When the local NapCat social extension supports them, owner-only tools can also initiate friend/group requests and perform QQ Space reads or writes.

Non-owner menu visibility and execution come from the same permission keys. Owner IDs and the Bot itself cannot be demoted, banned, muted or kicked by delegated users.

## Web lookup

The Hub performs QQ web lookup independently of this chat interface. Configured provider order can include Tavily, Bing, Baidu, 360, Sogou and DuckDuckGo, with `balanced`, `china`, `global`, `tavily` and `privacy` presets. Results remain untrusted material and cannot override sender permissions or system policy.

Inspect the effective provider, attempts and recent errors through `/api/maintenance` and `search` logs.

## Dashboard, API and logs

The local dashboard exposes service/channel state, allowlists, models, memory, adaptive learning, proactive interest, maintenance, structured log filters, language, theme and responsive layouts. Its persistent LAN switch creates a management token; the token can only be retrieved from a loopback-loaded dashboard.

Core read endpoints:

```text
GET /api/state
GET /api/maintenance
GET /api/logs
GET /api/memory
```

JSONL logs support level, category, trace, group, sender, query, time and latency filters. A QQ lifecycle shares one trace from inbound routing through judge, search, Codex and delivery.

## Optional macOS capabilities

- iMessage polling and replies for trusted handles.
- Confirmation-gated Codex remote execution; GUI work needs Accessibility and Screen Recording permissions.
- Shadowrocket node inspection, probes and confirmed switching.
- Built-in-display backlight, display sleep and keep-awake scripts.

These modules are not prerequisites for the core QQ deployment on Linux or Windows.

## Explicit boundaries

- This is not the official QQ Bot OpenAPI or a hosted public Bot service.
- QQ, NapCat and LLBot installers are not included.
- QQ risk controls, QR login, verification and OS permissions are not bypassed.
- LAN/public access and unauthenticated remote management are disabled by default.
- Adaptive behavior must not imitate or expose a specific member's private wording or facts.
