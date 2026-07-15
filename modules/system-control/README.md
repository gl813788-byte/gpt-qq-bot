# macOS System Control / macOS 系统控制

Optional scripts for display sleep, keep-awake and built-in-display backlight. They are not required for QQ, OneBot or Hub.

用于显示器休眠、防休眠和内置屏背光的可选脚本；QQ、OneBot 和 Hub 不依赖这些能力。

## Commands / 命令

Run them from this directory or use the full path:

```bash
./build-backlight-helper.command
./backlight-off-keep-awake.command
./backlight-restore.command
./keep-awake-display-off.command
./stop-keep-awake.command
```

| Script | Purpose / 用途 |
| --- | --- |
| `build-backlight-helper.command` | Compile the local C helper / 编译本地 C helper |
| `backlight-off-keep-awake.command` | Turn off built-in backlight while keeping the system awake / 关闭内置屏背光并保持系统唤醒 |
| `backlight-restore.command` | Restore saved backlight state / 恢复保存的背光状态 |
| `keep-awake-display-off.command` | Keep work running with display sleep / 保持任务运行并允许显示器关闭 |
| `stop-keep-awake.command` | Stop the matching keep-awake process / 停止对应防休眠进程 |

The helper built from `src/codexremotecontact-backlight.c` targets online built-in displays only and skips external displays.

由 `src/codexremotecontact-backlight.c` 编译的 helper 只处理在线内置屏，跳过外接显示器。

## Requirements and safety / 依赖与安全

- macOS and Xcode Command Line Tools / macOS 与 Xcode Command Line Tools。
- `brightness` is optional for diagnostics and fallback workflows / `brightness` 仅用于可选排障与备用流程。
- Build before the first backlight command and verify `modules/system-control/bin/` / 首次控制背光前先编译并检查输出目录。
- Do not run display-changing commands merely to test project code; use them only on explicit request / 不要为了测试项目代码改变显示器状态，只在明确请求时使用。
- Restore backlight and stop keep-awake when the task ends / 任务结束时恢复背光并停止防休眠。
