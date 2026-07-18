#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.platform === "win32") {
  console.error('[Codex QQ Bot 安装器] Windows 请先打开 WSL，再运行 npx -y "codex-qq-bot@$(npm view codex-qq-bot@latest version --prefer-online)"。');
  process.exit(1);
}

const installer = fileURLToPath(new URL("../install.sh", import.meta.url));
const packageMetadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const result = spawnSync("bash", [installer, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    CODEX_QQ_BOT_INSTALLER_VERSION: String(packageMetadata.version || "unknown")
  },
  stdio: "inherit"
});

if (result.error?.code === "ENOENT") {
  console.error("[Codex QQ Bot 安装器] 找不到 bash，请先安装 Bash 后重试。");
  process.exit(1);
}

if (result.error) {
  console.error(`[Codex QQ Bot 安装器] 无法启动安装器：${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
