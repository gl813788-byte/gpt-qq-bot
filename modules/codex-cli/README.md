# Codex CLI Integration / Codex CLI 集成

English and 简体中文 are presented together because this directory is a capability marker, not a standalone package.

## Scope / 职责

- Run the locally authenticated Codex CLI for the QQ/OneBot Agent path.
- 为 QQ/OneBot Agent 链路调用本机已登录的 Codex CLI。
- Apply QQ model/reasoning settings, bounded concurrency and cancellation.
- 应用 QQ 模型/思考强度、并发上限和取消逻辑。
- Build a controlled child environment and refresh the active Codex profile before new work.
- 构造受控子进程环境，并在新任务前刷新当前 Codex profile。

## Implementation / 实现入口

| Path | Responsibility / 职责 |
| --- | --- |
| `src/codex-child-env.js` | Child environment and login/profile refresh / 子进程环境与登录配置刷新 |
| `src/qq-agent.js` | QQ Agent rounds and Codex orchestration / QQ Agent 轮次与 Codex 编排 |
| `src/server.js` | Transitional process wiring, queue and channel calls / 渐进拆分中的进程接线、队列和通道调用 |
| `workspaces/codex-cli/` | Controlled temporary working context / 受控临时工作上下文 |
| `runtime/replies/` | Generated reply artifacts / 生成回复文件 |

## Configuration / 配置

```bash
export CODEX_CLI_PATH=/path/to/codex
export CODEX_REMOTE_CONTACT_CODEX_MODEL=gpt-5.4-mini
export CODEX_REMOTE_CONTACT_REASONING_EFFORT=low
export CODEX_REMOTE_CONTACT_CODEX_MAX_CONCURRENCY=2
export CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING=32
```

The built-in default path points to the macOS Codex app. Linux and Windows deployments should set `CODEX_CLI_PATH` or ensure the controller resolves the installed CLI. See [Configuration](../../docs/CONFIGURATION.md) / [配置参考](../../docs/CONFIGURATION_CN.md).

内置默认路径指向 macOS Codex App；Linux 和 Windows 应显式设置路径，或由控制器解析已安装 CLI。

## Verification / 验证

```bash
codex --version
npm run verify
curl -fsS http://127.0.0.1:3789/api/maintenance | jq '.codex // .'
```

Never copy Codex credentials into project files.

不要把 Codex 凭据复制到项目文件。
