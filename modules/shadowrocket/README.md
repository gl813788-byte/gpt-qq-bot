# Shadowrocket Control / Shadowrocket 控制

Optional macOS integration for inspecting and, after confirmation, changing the selected Shadowrocket node.

这是可选 macOS 集成，用于检查节点，并在确认后切换 Shadowrocket 当前节点。

## Entry / 入口

```bash
./modules/shadowrocket/shadowrocket-node-control.command
```

The script reads the current App Group `ServerManager` and preference plist on every run; it does not keep a stale node cache.

脚本每次都读取当前 App Group 的 `ServerManager` 和偏好 plist，不缓存可能过期的节点列表。

## Capabilities / 能力

- Show the selected node and list available nodes / 显示当前节点与可用节点。
- Run TCP entry probes and route reachability checks / 执行 TCP 入口和线路可达性检查。
- Resolve a requested target and switch only after confirmation / 解析目标，并且只在确认后切换。

## Requirements and safety / 依赖与安全

- macOS with Shadowrocket installed and configured / 已安装配置 Shadowrocket 的 macOS。
- Full Disk Access for the calling process / 调用进程的“完全磁盘访问权限”。
- Treat node names, endpoints and preferences as local private data / 把节点名称、地址和偏好视为本地隐私数据。
- Do not change a node as part of ordinary diagnosis; switching requires explicit confirmation / 普通排障不切换节点，切换必须明确确认。

The network route may update before the Shadowrocket UI; restart the app if its UI still shows the old selection.

网络线路可能先于 UI 更新；如果 App 仍显示旧节点，可重启 Shadowrocket。
