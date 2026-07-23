# 配置参考

简体中文 | [English](CONFIGURATION.md)

项目把“可持久修改的用户设置”和“密钥/进程启动参数”分开保存。部署或修改配置时，优先让 Codex 检查当前机器并做字段级合并，避免整文件覆盖。

## 配置来源与优先级

```text
进程环境变量
    -> src/config/environment.js 归一化为启动默认值
    -> data/settings.json 覆盖可持久字段
    -> 运行时通过仪表盘或 QQ 命令修改并原子保存
```

- `npm run ncc -- start` 会先加载 `config/local.env`。
- 直接执行 `npm start` 不会自动加载 `config/local.env`，只继承当前 shell 的环境。
- 本机定制的全局 `ncc` 可能改用 `/root/.napcat-codex-control.env` 与 `/root/.codex/ncc-profiles/active.env`；先运行 `ncc help` 判断命令来源。
- `data/settings.json` 加载后会覆盖对应的环境默认值，例如模型、群白名单和主动兴趣开关。
- OneBot、管理 API、OpenRouter 和 Tavily 密钥应保留在未跟踪环境文件中。

## 配置文件

| 文件 | 用途 | 是否提交 |
| --- | --- | --- |
| `config/settings.example.json` | 持久配置 schema 与示例 | 是 |
| `data/settings.json` | 当前机器的用户设置、权限和网络状态 | 否 |
| `config/local.env` | 仓库 `ncc start` 使用的本地环境变量与密钥 | 否；权限建议 `600` |
| `src/config/environment.js` | 环境变量名称、默认值、范围和归一化的权威实现 | 是 |
| `runtime/logs/hub.jsonl` | 结构化运行日志，不是配置 | 否 |

首次配置：

```bash
cp config/settings.example.json data/settings.json
chmod 600 data/settings.json
npm run ncc -- setup
```

已有 `data/settings.json` 时不要再次复制示例文件。

## `data/settings.json`

最小可用配置：

```json
{
  "version": 1,
  "qq": {
    "allowedGroups": ["QQ群号"],
    "ownerUserIds": ["主人QQ号"],
    "bannedUserIds": [],
    "bannedUntilByUserId": {},
    "enhancer": { "enabled": true },
    "webLookup": { "enabled": true },
    "proactive": {
      "enabled": true,
      "judgeEveryMessages": 20,
      "judgeEveryMinutes": 5,
      "judge": { "enabled": true }
    },
    "commandPermissions": {
      "publicCommands": {
        "menu": true,
        "newDialog": true,
        "stop": true,
        "summary": true
      },
      "userCommands": {}
    },
    "codexSession": {
      "defaultMode": "auto",
      "scopes": {
        "QQ群号": "persistent",
        "private:QQ号": "temporary"
      }
    }
  },
  "ai": {
    "model": "gpt-5.4-mini",
    "reasoningEffort": "low"
  },
  "branding": {
    "assistantName": "assistant",
    "ownerLabel": "主人",
    "assistantMentions": ["@assistant"]
  }
}
```

主要字段：

| 路径 | 含义 |
| --- | --- |
| `qq.allowedGroups` | 允许处理的 QQ 群号；群号按字符串保存 |
| `qq.ownerUserIds` | 拥有绝对管理权限的 QQ 号 |
| `qq.bannedUserIds` / `bannedUntilByUserId` | 永久与临时 ban |
| `qq.enhancer.enabled` | 图片、风格、兴趣等 QQ 增强总开关 |
| `qq.webLookup.enabled` | QQ 联网查询运行时开关；可由网页端持久化修改 |
| `qq.proactive.*` | 普通消息/分钟兴趣触发与 judge 配置 |
| `qq.commandPermissions` | 非主人可见且可执行的公共/用户级指令 |
| `qq.codexSession.defaultMode` | 未单独覆盖 scope 的 `auto` / `persistent` / `temporary` 默认模式 |
| `qq.codexSession.scopes` | 按群号或 `private:QQ号` 覆盖会话模式；线程 ID 不写入设置文件 |
| `ai.*` | QQ 使用的模型和思考强度 |
| `unifiedMemory.*` | 自动写入与手动交接策略 |
| `branding.*` | 助手名称、主人称呼和 @ 别名 |
| `network.allowLanAccess` | 仪表盘持久化的局域网开关 |
| `network.publicTunnelEnabled` | Cloudflare 临时 Quick Tunnel 的持久期望状态；默认 `false` |
| `network.apiToken` | 自动生成的远程管理 token；真实值只能保留在未跟踪本机设置或环境中 |

网页端“智能行为”页可持久化修改 `qq.enhancer.enabled`、`qq.webLookup.enabled`、主动兴趣开关、判定开关、消息/分钟间隔、判定模型、静默超时和最近上下文数量。显式 @ Bot 的正常回复不依赖主动兴趣开关。模型切换应使用当前 Codex 登录实际提供的模型列表；不要把历史模型名当成永久可用值。

主人可在 QQ 使用 `/会话模式` 和 `/会话模式 自动|长期|临时` 修改当前群/私聊。管理 API 为 `POST /api/qq/session-mode`，请求体为 `{"mode":"auto|persistent|temporary","scopeId":"可选群号或 private:QQ号"}`；scope 使用 `inherit` 可删除覆盖。仓库控制器使用 `npm run ncc -- session` 与 `npm run ncc -- session-mode MODE [SCOPE]`，支持该能力的全局控制器使用相同命令名。实际线程映射单独保存在 `data/qq-codex-sessions.json`，`/新对话` 只停止复用当前映射，不删除 Codex CLI 自身的历史文件。

## 一键部署环境变量

这些变量只控制安装阶段，不会成为 Hub 的运行配置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CODEX_QQ_BOT_INSTALL_NAPCAT` | `auto` | `auto` 在 apt-get/dnf Linux 自动安装，`required` 在不受支持平台提前失败，`skip` 复用外部 OneBot |
| `CODEX_QQ_BOT_NODE_MAJOR` | `22` | 自动安装的 Node.js 官方主版本；最终必须满足 Node 20+ |
| `CODEX_QQ_BOT_BOOTSTRAP_CACHE_DIR` | `~/.cache/codex-qq-bot/bootstrap` | Node/NapCat 自举下载缓存 |
| `CODEX_QQ_BOT_MANAGED_NODE_HOME` | `~/.local/share/codex-qq-bot/node` | 项目自管 Node.js 目录 |
| `CODEX_QQ_BOT_NAPCAT_HOME` | `~/Napcat` | NapCat 官方 Rootless Shell 安装目录 |

`--dry-run` 可在不修改机器的情况下查看冷启动安装计划；`--check` 只报告当前环境。测试专用的 `CODEX_QQ_BOT_BOOTSTRAP_FORCE_*` 变量不属于用户配置接口。

## 核心环境变量

### Hub 与安全

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_HOST` | 回环地址 | 显式监听地址 |
| `CODEX_REMOTE_CONTACT_PORT` | `3789` | Hub 端口，必须为有效端口 |
| `CODEX_REMOTE_CONTACT_ALLOW_REMOTE` | `0` | 设为 `1` 才允许显式非回环绑定 |
| `CODEX_REMOTE_CONTACT_CORS_ORIGINS` | 本机三个默认 Origin | 允许的 Origin 列表 |
| `CODEX_REMOTE_CONTACT_API_TOKEN` | 空 | 非回环管理 API 认证 token |

非回环监听必须同时满足远程绑定开关和 API token；通配符 CORS 没有 token 时会拒绝启动。

### Codex

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CODEX_CLI_PATH` | macOS App 内置路径 | Codex 可执行文件；Linux/Windows 部署应设置或保证 `codex` 可发现 |
| `CODEX_REMOTE_CONTACT_CODEX_MODEL` | `gpt-5.4-mini` | QQ 默认模型 |
| `CODEX_REMOTE_CONTACT_REASONING_EFFORT` | `low` | QQ 默认思考强度 |
| `CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY` | `2` | Codex 同时运行数，范围 1–8 |
| `CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING` | `32` | 等待队列，范围 0–256 |
| `CODEX_REMOTE_CONTACT_QUOTA_CACHE_TTL_MS` | `30000` | 额度信息缓存时间 |
| `CODEX_REMOTE_CONTACT_CODEX_REPLY_TIMEOUT_MS` | `120000` | 普通文字回复单轮时限 |
| `CODEX_REMOTE_CONTACT_CODEX_VISION_REPLY_TIMEOUT_MS` | `180000` | 带图片理解的回复单轮时限 |
| `CODEX_REMOTE_CONTACT_CODEX_CONTEXT_SUMMARY_TIMEOUT_MS` | `90000` | `/总结聊天记录` 时限 |
| `CODEX_REMOTE_CONTACT_CODEX_SELF_PERSONA_TIMEOUT_MS` | `90000` | 自我人格摘要/刷新时限 |
| `CODEX_REMOTE_CONTACT_CODEX_FILE_TASK_TIMEOUT_MS` | `300000` | 主人本机文件任务时限 |
| `CODEX_REMOTE_CONTACT_CODEX_IMAGE_GENERATION_TIMEOUT_MS` | `600000` | 图片生成时限；允许配置到 60 分钟 |

Hub 会先识别 Codex 任务类型，再选择对应时限；画图不再和普通回复共用同一个硬编码截止时间。以上值的单位都是毫秒，默认允许范围为 10 秒到 30 分钟，图片生成单独允许到 60 分钟。`/详细配置`、`/api/maintenance` 和 Codex 结构化日志会显示当前策略或本次任务实际采用的类型与时限。

### OneBot

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ONEBOT_API_BASE` | `http://127.0.0.1:3000` | OneBot HTTP API |
| `ONEBOT_ACCESS_TOKEN` | 空 | 首选 OneBot token |
| `CODEX_REMOTE_CONTACT_ONEBOT_TOKEN` | 空 | OneBot token 兼容名称 |
| `CODEX_REMOTE_CONTACT_ONEBOT_TIMEOUT_MS` | `10000` | 单次 API 超时，范围 1–30 秒 |
| `CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY` | `8` | Webhook 并发，范围 1–32 |
| `CODEX_REMOTE_CONTACT_ONEBOT_MAX_PENDING` | `32` | Webhook 等待队列，范围 0–256 |

Hub 和 OneBot 两端 token 应一致。未配置 token 时，Webhook 仅信任 Host 和真实连接地址都为回环的请求。

### QQ 行为、兴趣与媒体

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_QQ_ENHANCER` | `1` | 设为 `0` 关闭增强启动默认值 |
| `CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT` | `10` | 轻量会话记忆上限 |
| `CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT` | `200` | 群聊滚动记录上限 |
| `CODEX_REMOTE_CONTACT_QQ_PROACTIVE` | `1` | 主动兴趣总开关默认值 |
| `CODEX_REMOTE_CONTACT_QQ_PROACTIVE_JUDGE` | `1` | 语义 judge 开关 |
| `..._JUDGE_EVERY_MESSAGES` | `20` | 普通未 @ 消息阈值，范围 1–1000 |
| `..._JUDGE_EVERY_MINUTES` | `5` | 非空周期的分钟阈值；`0` 关闭分钟分支 |
| `..._JUDGE_PROVIDER` | `openrouter` | 兴趣模型厂商：`openrouter`、`deepseek` 或 `custom` |
| `..._JUDGE_MODEL` | 随厂商变化 | OpenRouter 默认 `openrouter/free`；DeepSeek 默认 `deepseek-v4-flash` |
| `..._JUDGE_API_KEY` | 空 | `custom` 厂商的 key |
| `..._JUDGE_BASE_URL` | 空 | `custom` 厂商的 OpenAI 兼容 API 根地址 |
| `..._JUDGE_TIMEOUT_MS` | `6500` | judge 流式空闲超时 |
| `CODEX_REMOTE_CONTACT_QQ_IMAGE_MAX_BYTES` | `20971520` | QQ 图片上限，默认 20 MiB |
| `CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE` | `strict` | 安全下载模式；`proxy-compatible` 仅额外允许域名解析到 `198.18.0.0/15` 代理 Fake-IP，仍拦截字面私网 IP 和其他保留地址 |
| `CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR` | `|||` | 多气泡分隔符 |
| `..._BUBBLE_SEND_DELAY_MS` | `650` | 气泡间基础延迟 |
| `..._BUBBLE_MAX_COUNT` | `6` | 一次回复最大气泡数 |

自我人格刷新阈值使用 `CODEX_REMOTE_CONTACT_QQ_SELF_PERSONA_*`；账号贴纸使用 `CODEX_REMOTE_CONTACT_QQ_ACCOUNT_STICKER_*`。所有精确名称、范围和默认值以 `src/config/environment.js` 为准。

### 联网搜索与 judge 服务

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP` | `1` | QQ 联网搜索 |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER` | `auto` | 首选 provider |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PRESET` | `balanced` | provider 预设 |
| `CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDERS` | 空 | 自定义 provider 顺序 |
| `CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS` | `12000` | 整体搜索超时 |
| `CODEX_REMOTE_CONTACT_QQ_WEB_ATTEMPT_TIMEOUT_MS` | 自动 | 单 provider 超时 |
| `TAVILY_API_KEY` | 空 | Tavily key |
| `OPENROUTER_API_KEY` | 空 | OpenRouter 兴趣模型 key |
| `OPENROUTER_BASE_URL` | OpenRouter 官方 API | OpenRouter 端点 |
| `DEEPSEEK_API_KEY` | 空 | DeepSeek 兴趣模型 key |
| `DEEPSEEK_BASE_URL` | DeepSeek 官方 API | DeepSeek 端点 |

仪表盘“智能行为”页或 QQ 主人命令 `/兴趣厂商 openrouter|deepseek|custom` 可切换厂商，`/兴趣模型 模型ID` 可覆盖默认模型。密钥始终只从环境读取，不写入 `data/settings.json`。OpenRouter 使用严格 JSON Schema；DeepSeek 和自定义兼容服务使用 JSON Object 模式。可运行 `npm run ncc -- search-config` 初始化仓库环境文件。排障先看 `/api/maintenance` 和 `search` / `interest` 日志。

### 日志

- Hub 只保留一条 QQ/OneBot 消息链路。旧的 `CODEX_REMOTE_CONTACT_IMESSAGE_*` 与 `CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_*` 变量会被忽略。
- `CODEX_REMOTE_CONTACT_LOG_LEVEL` 默认 `debug`；`LOG_CONSOLE`、`LOG_CONSOLE_LEVELS`、`LOG_MAX_BYTES` 和 `LOG_MAX_FILES` 控制控制台与轮转。
- `CODEX_REMOTE_CONTACT_SQLITE_TIMEOUT_MS` 和 `..._MAX_OUTPUT_BYTES` 限制本地 SQLite 查询。

## 本地环境文件示例

```bash
export CODEX_CLI_PATH=/usr/local/bin/codex
export ONEBOT_API_BASE=http://127.0.0.1:3000
export ONEBOT_ACCESS_TOKEN=请使用真实随机值
export OPENROUTER_API_KEY=请使用真实密钥
export TAVILY_API_KEY=请使用真实密钥
export CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE=proxy-compatible
export CODEX_REMOTE_CONTACT_LOG_LEVEL=debug
```

```bash
chmod 600 config/local.env
npm run ncc -- status
```

不要把真实秘密值复制到 issue、聊天记录、截图或 Git diff 中。

## 修改与验证

新增环境变量时：

1. 在 `src/config/environment.js` 添加解析、默认值和范围限制。
2. 把归一化值传给消费者，不在 `server.js` 新增直接读取。
3. 补充 `test/environment-config.test.js`。
4. 同步本页中英文版本和维护 Skill。
5. 运行 `npm run verify`。
