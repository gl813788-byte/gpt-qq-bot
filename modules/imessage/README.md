# iMessage Integration / iMessage 集成

This is an optional macOS-only channel implemented in the Hub; this directory is documentation, not a separate daemon.

这是 Hub 内置的可选 macOS 通道，本目录只说明边界，不是独立守护进程。

## Scope / 职责

- Poll the local Messages database and normalize new messages. / 轮询本机 Messages 数据库并归一化新消息。
- Accept commands only from `imessage.trustedHandles`. / 只接受 `imessage.trustedHandles` 中的联系人。
- Reply through Messages automation and retain bounded context in `data/imessage-memory.json`. / 通过“信息”自动化回复，并保存有界上下文。
- Route explicitly confirmed `/远程执行` work to the Codex remote-execution channel. / 将明确确认的 `/远程执行` 任务交给 Codex 远程执行通道。

The current polling, routing and sending logic remains in the transitional `src/server.js`. New transport parsing should move into `src/channels/imessage/` rather than expanding the composition root.

当前轮询、路由和发送仍在渐进拆分中的 `src/server.js`；新增传输解析应移入 `src/channels/imessage/`。

## Persistent configuration / 持久配置

```json
{
  "imessage": {
    "trustedHandles": ["trusted@example.com"],
    "replyHandle": "trusted@example.com"
  },
  "ai": {
    "imessageModel": "gpt-5.4",
    "imessageReasoningEffort": "medium"
  }
}
```

Attachment delivery, memory size and remote execution are controlled by `CODEX_REMOTE_CONTACT_IMESSAGE_*` and `CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_*`; see [Configuration](../../docs/CONFIGURATION.md) / [配置参考](../../docs/CONFIGURATION_CN.md).

## macOS permissions / macOS 权限

- Full Disk Access for the Hub process / Hub 进程的“完全磁盘访问权限”。
- Automation permission for Messages / “信息”自动化权限。
- Accessibility and Screen Recording only when confirmed GUI execution needs them / 只有确认式 GUI 执行需要“辅助功能”和“屏幕录制”。

## Verification / 验证

Enable the channel only after permissions and trusted handles are correct. Check `/api/state`, iMessage-category logs and a real trusted-handle round trip. Never test with an untrusted contact or expose the Messages database.

权限和可信联系人正确后再启用通道；检查 `/api/state`、iMessage 日志和一次真实往返。不要向不可信联系人测试，也不要暴露 Messages 数据库。
