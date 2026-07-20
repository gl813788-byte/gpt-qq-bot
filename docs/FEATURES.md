# Features

[简体中文](FEATURES_CN.md) | English

Codex QQ Bot is a local message hub: OneBot provides QQ transport, the Hub owns permissions, context, tools, memory and delivery, and Codex CLI performs reasoning and tasks. QQ, NapCat and LLBot binaries are not distributed by this repository.

## QQ transport and triggers

- OneBot 11 HTTP API and reverse HTTP webhooks.
- Group traffic is limited to `qq.allowedGroups`; private and group chats have separate context.
- Ordinary group messages trigger on mention, reply to the Bot or a poke targeting the Bot.
- Recognized slash commands do not require a mention inside allowlisted groups. Proactive interest uses a separate constrained path.
- Message, user and group IDs are normalized, and duplicate OneBot events are dropped before domain policy.
- Current-scope reply context identifies human speakers as `current group card/nickname + QQ number`. Mention targets retain their QQ numbers and are enriched from the current group's member profile when an inline name is unavailable. One QQ number remains the stable person identity across groups, while different group cards remain group-scoped.
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

Codex deadlines are selected by task type instead of sharing one constant. Defaults are two minutes for ordinary replies, three minutes for vision replies, 90 seconds for context summaries, 90 seconds for self-persona work, five minutes for owner file tasks, and ten minutes for image generation. Each class has an independent environment override. Runtime state and logs report the selected task type and deadline, while `/stop` can still terminate work early.

## Context and memory

| Layer | Content | Storage |
| --- | --- | --- |
| Rolling context | Recent human and Bot messages per scope | `data/qq-memory.json` |
| Conversation transcript | Bounded messages and image references since `/新对话` | Runtime state and local persistence |
| Short-term memory | Current-scope temporary notes managed by `/记忆`; cleared by `/新对话` | `data/qq-memory.json` |
| Social memory | Group-scoped impressions plus bounded cross-group person impressions keyed by QQ number | `data/qq-conversation-memory.json` |
| Long-term knowledge base | Titled stable knowledge and slang scoped globally, by group, person or group-person | `data/qq-knowledge-base.json` |
| Legacy public memory | Compatibility data imported once into the long-term knowledge base | `data/qq-public-memory.json` |
| Adaptive statistics | Group rhythm, structural style and interaction counts | `data/qq-personas.json` |
| Global self-persona | Privacy-filtered summaries from individual scopes | `data/qq-self-persona.json` |
| Unified memory | QQ and durable local context | Data owned by `src/unified-memory/` |

`/新对话` clears rolling context, the current transcript and current-scope `/记忆` notes, while social impressions and the long-term knowledge base survive. Group impressions stay inside their group. A stable, non-sensitive person impression can follow the same QQ number across shared groups, but raw group conversation and group-private facts are not copied into that layer. Version-1 per-group person impressions migrate into the version-2 identity layer, and legacy public memory is imported into the knowledge base.

Raw chat records remain stored message by message for frequency accounting, time-based reasoning, and audit. Compaction happens only while assembling model input. A semantically identical adjacent run is collapsed from two messages onward, keeping the last message as the current sender representative and appending `（连续重复 N 条）`. Separate runs are compacted independently, non-adjacent identical text is never merged, and differences in Bot/human role, mentions, quotes, or images prevent a merge. The same rule covers main-reply context, interest judgments, cold/private context, chat/persona summaries, the history tool, and knowledge-deletion evidence.

Every knowledge entry requires a title. Slang stores a term and explanation with global, group, person or group-person variants; group name/number and person nickname/QQ number remain as scope identity. If the same person has the same interpretation in multiple groups, Hub promotes it to one cross-group person variant. When a message matches slang, only interpretations applicable to the current group and current speaker are shown to the reply and interest models. Hidden `/知识库` tools list titles, search or view a title, add ordinary knowledge or slang, and support current or owner-authorized cross-scope ranges.

Ordinary knowledge is not a fixed catalog. Each scope-summary pass receives the previous summary and topics as compressed evidence from older chat, then combines them with new messages to retain, revise, or remove topics; the everyday main model also receives the current scope summary as weak context. Knowledge selection therefore follows what that group actually discusses over time, evolves with its changing focus, and never assumes or permanently applies a predefined domain. Only reusable facts, references, experience, or agreements tied to those real topics are saved, so different groups naturally develop different knowledge. External changing knowledge uses a stable title without a date or version number, while its content records an as-of date, verification state, fact, and source; formatted entries expose their latest update time. On a relevant future turn, when old content may be stale or the user asks for the latest state, the tool-capable main model checks the old title, uses an already supplied web summary or searches, and overwrites the same title and scope. Conflicting sources are not promoted to a settled fact. Summary jobs without web tools may only label chat-derived claims as `conversation pending verification`; they cannot claim web verification. Internal group rules that cannot be checked publicly are labeled as group agreements or consensus.

Summary and impression updates receive existing in-scope knowledge. The same title and scope replace old content, and equivalent renames keep an alias, preventing append-only growth. Slang hits track counts and first/last timestamps and retain a bounded copy of each matching message with up to three messages before and after it. Old, persistently low-frequency slang creates a deletion application rather than being deleted directly. The interest model first sees statistics plus a small first/last sample for low-temperature triage and risk labels; the main model then reads all retained evidence and makes the final keep/delete decision. Failure in either stage keeps the entry. Any new hit or content change during review also keeps it. A malformed knowledge file is preserved and writes are blocked.

Recurring QQ behavior uses persisted wall-clock timestamps instead of process uptime. The scheduler checks immediately at Hub startup, again when the QQ channel is enabled, and then at the configured poll cadence. If the device or Hub was stopped past a due time, it performs one catch-up check; it never replays every missed interval in a burst. After a catch-up action completes, its next interval starts from completion time. Ordinary group-interest cycles persist their pending count, cycle start and bounded latest candidate in `data/qq-memory.json`; adaptive reviews, cold/private interest and self-persona summaries/generation use the timestamps in their existing persona stores. Manual `/总结聊天记录` and unified-memory read/write remain event-driven rather than being turned into artificial recurring jobs.

## Adaptive social behavior

- `qq-human-behavior` derives anonymous short-window message length, rate, bursts, media/emoji, reply/mention, question and punctuation signals without copying a member's wording. The main model receives the per-turn dynamic behavior plan without a second fixed "group chat style" block.
- `qq-adaptive-learning` persists activity, structure, interaction distance and post-Bot feedback to weakly tune length, sticker probability, bubble rhythm and delay. It also treats consecutive human messages no more than two minutes apart as active transitions and records the share whose sender changes as the group-level interjection rate.
- A persisted 24-hour review clock can produce at most five compact style improvements and replaces the previous set to keep prompts bounded.
- The global self-persona is generated only from privacy-filtered scope summaries. Raw private content must not cross scopes.
- Adaptive data changes style and cadence; it never bypasses allowlists, permissions or the interest judge.

## Proactive interest

Three constrained paths exist:

1. **Ordinary group interest:** unmentioned messages enter a persisted per-group pending cycle. The first completed message or non-empty wall-clock minute threshold invokes an OpenRouter semantic judge. Empty cycles do not call a model, and a restart immediately checks an overdue non-empty cycle. A cycle restored from disk bypasses the normal online stale-topic discard exactly for that catch-up judge, so a long shutdown cannot silently consume the overdue work; new activity during the judge can still supersede its result.
2. **Cold-group interest:** once learned activity, recent human/Bot traffic, unanswered output and activity windows make a quiet group eligible, the interest model returns `silent`, `topic`, or `chatter`. A decline or judge failure never starts the main model. `topic` lets the main model select from its own interests and optionally use multi-round Agent research; `chatter` authorizes rare lightweight presence. The interest model never supplies a concrete topic, query, reply draft, or chat style.
3. **Private interest:** interaction frequency, time since activity and unanswered Bot output first produce a frequency prior and human-like variation roll. The interest model then makes the final start decision. A decline or failure does not launch the main model; after approval, the main model writes the message without re-deciding whether to contact the person.

The ordinary group judge streams through OpenRouter with a strict JSON Schema containing only `shouldReply`, `interest`, and `reason`; it no longer emits an analysis trace, semantic summary, reply draft, or style advice. The approved main model reads the original message, quote, and recent context directly, and the interest reason cannot override that evidence. Ordinary group judgment uses temperature `0.65`, while cold/private start gates use `0.8` for human-like variation. Interest triage for complex deletion review uses `0.15`. Detailed logs retain the actual temperature and bounded raw structured output. Invalid structure gets at most one retry; timeouts, HTTP failures, and rate limits are not blindly retried.

The interest model is the lightweight background-decision and miscellaneous-triage plane. Ordinary proactive gates, cold/private starts, short classification, risk labels, and the first bounded pass of a complex task use the same configured channel. It never writes user-facing chat and does not own conversation summaries, group/person impressions, persona summaries, or knowledge extraction. The main model owns conversation, summaries, and complex work: final replies, contextual understanding, tool research, topic expression, every summary/knowledge extraction task, and the final handling of long-context or multi-evidence work.

The interest judge receives the learned group interjection rate, its active-transition sample count and the measurement window. These are timing references only: a high rate never triggers a reply by itself, and a low rate is not a hard silence rule. The structured model decision and interest threshold remain authoritative.

Proactive work does not force itself behind active generation. New activity suppresses stale results. Ordinary interjection, cold autonomous topic, cold lightweight chatter, and private outreach all carry one enforced `interest gate -> main content` contract; Hub blocks sending if either stage is missing. The main prompt is organized as role, interpretation order, response method, memory, safety, the one dynamic style plan, and the current task; approval appears only once. Common research tools stay visible while unrelated social operations are shown only when the current message makes them relevant. Detailed logs retain the two-model contract, cold/private judgments, temperature, bounded model outputs, cold exploration rounds, tool kinds, queries, failures, and final delivery outcome.

## Images, files, stickers and bubbles

- QQ images, screenshots, quoted images, share cards and bounded forwarded images can enter context.
- Explicit drawing/generation requests and reference-edit wording such as edit, modify, replace the background, add/remove an element, change the style, or draw another image from this reference take the image-task path instead of the ordinary vision path. When the current or quoted message contains an image, a short instruction such as “change the background to blue” also passes that image to the drawing model as a reference; a plain “look at this image” remains a vision reply.
- The model can request local delivery through `[[qq_image:...]]`, `[[qq_file:...]]` and `[[qq_sticker:...]]`. Sticker delivery is selectable per reply: combine text and sticker in one QQ message, send only the sticker, or place the standalone multi-bubble separator between text and the sticker marker to send them as two ordered messages.
- File/image tasks use `runtime/qq-task-workspaces/<request>/input|output`. Only real paths inside the current request's `output/` pass delivery validation, preventing arbitrary file disclosure and symlink escapes.
- Local stickers, QQ account favorites and downloaded metadata form a bounded catalog. Animated items support bounded frame inspection, with labels stored separately.
- Sticker-favorite judgment runs only inside an already-triggered lifecycle; an ordinary untriggered sticker does not call a model by itself.
- A standalone `|||` splits consecutive bubbles. For separate sticker delivery, the text bubble is sent first and the sticker-only bubble follows as its own message. Separator, count and delay are configurable, and adaptation changes rhythm only for suitable social replies.

## Commands, permissions and social tools

Common public commands include `/菜单`, `/新对话`, `/stop` and `/总结聊天记录`.

Owner capabilities include status/configuration, model and reasoning selection, proactive policy, group allowlists, bans, command permissions, moderation, request handling and notifications. When the local NapCat social extension supports them, owner-only tools can also initiate friend/group requests and perform QQ Space reads or writes. On NapCat 4.18.9, active friend adds use the native two-argument `reqToAddFriends(QQ number, verification text)` signature; the bridge selects the verification message or question answer as appropriate and uses the structured-object form only when the runtime explicitly exposes a one-argument method. A `submitted` result means the corrected native call completed without a reported error, not that the peer has already accepted the request.

Non-owner menu visibility and execution come from the same permission keys. Owner IDs and the Bot itself cannot be demoted, banned, muted or kicked by delegated users.

## Web lookup

The Hub performs QQ web lookup independently of this chat interface. Configured provider order can include Tavily, Bing, Baidu, 360, Sogou and DuckDuckGo, with `balanced`, `china`, `global`, `tavily` and `privacy` presets. Results remain untrusted material and cannot override sender permissions or system policy.

Inspect the effective provider, attempts and recent errors through `/api/maintenance` and `search` logs.

## Dashboard, API and logs

The local dashboard exposes service/channel state, allowlists, models, short-term memory, adaptive learning, proactive interest, maintenance, structured log filters, language, theme and responsive layouts. Its dedicated long-term Knowledge workspace filters slang or notes by global, group, member, or group-member scope; it shows same-title scoped meanings, hit frequency, recent chat context and model-review outcomes, and can precisely create, edit or delete the selected scope. Its persistent LAN switch creates a management token; the token can only be retrieved from a loopback-loaded dashboard. A separate, default-off Cloudflare Quick Tunnel switch can create a temporary HTTPS address without rebinding the Hub away from loopback. Remote management APIs still require the same token, while tunnel start/stop and token-copy controls remain local-only.

Automatic polling keeps server-backed readouts current without overwriting a control that is being changed or unsaved Bot settings. The current browser tab keeps Bot-setting drafts, the group-ID draft, short-term-memory tab/search/expanded groups, knowledge filters/selection, and log filters/pause/follow/scroll context in session storage, then restores them after a full page reload. Knowledge edits use both entry and variant IDs for stale-write protection, and deletion affects only the selected scope. The returned server state remains authoritative after a successful mutation.

Core read endpoints:

```text
GET /api/state
GET /api/maintenance
GET /api/logs
GET /api/memory
POST /api/qq/knowledge
```

JSONL logs support level, category, trace, group, sender, query, time and latency filters. A QQ lifecycle shares one trace from inbound routing through judge, search, Codex and delivery. Short-term memory changes, knowledge queries/updates, slang frequency hits, low-frequency deletion applications and model reviews all use the same structured `memory` category. Concrete Codex and interest-model output is retained as bounded, secret-redacted `debug` detail without copying the full input prompt; the Chinese terminal and browser logs recursively localize startup adaptive-learning snapshots and other detail fields.

## macOS client

The native macOS client is a WebKit wrapper around the same local dashboard and QQ/OneBot Hub used by the browser. It does not read the Messages database, poll iMessage, require Messages Automation and Full Disk Access, or expose macOS-only proxy, display, keep-awake or desktop-control features.

## Explicit boundaries

- This is not the official QQ Bot OpenAPI or a hosted public Bot service.
- QQ, NapCat and LLBot installers are not included.
- QQ risk controls, QR login, verification and OS permissions are not bypassed.
- LAN/public access and unauthenticated remote management are disabled by default.
- Adaptive behavior must not imitate or expose a specific member's private wording or facts.
