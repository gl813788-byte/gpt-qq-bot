import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const launcherPath = fileURLToPath(new URL("一键部署.command", new URL("..", import.meta.url)));
const nccPath = fileURLToPath(new URL("scripts/ncc.command", new URL("..", import.meta.url)));
const deployPath = fileURLToPath(new URL("scripts/deploy.command", new URL("..", import.meta.url)));
const remoteInstallerPath = fileURLToPath(new URL("install.sh", new URL("..", import.meta.url)));
const npmInstallerPath = fileURLToPath(new URL("bin/codex-qq-bot.mjs", new URL("..", import.meta.url)));
const packagePath = fileURLToPath(new URL("package.json", new URL("..", import.meta.url)));

test("Chinese one-click deployment entry is executable and has valid Bash syntax", async () => {
  await access(launcherPath, constants.X_OK);
  const syntax = spawnSync("bash", ["-n", launcherPath], {
    cwd: projectDir,
    encoding: "utf8"
  });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("remote and npm installers expose a Chinese no-GitHub-web entry", async () => {
  await access(remoteInstallerPath, constants.X_OK);
  await access(npmInstallerPath, constants.X_OK);
  const syntax = spawnSync("bash", ["-n", remoteInstallerPath], {
    cwd: projectDir,
    encoding: "utf8"
  });
  assert.equal(syntax.status, 0, syntax.stderr);

  for (const [command, args] of [
    ["bash", [remoteInstallerPath, "--help"]],
    [process.execPath, [npmInstallerPath, "--help"]]
  ]) {
    const help = spawnSync(command, args, { cwd: projectDir, encoding: "utf8" });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /npx -y codex-qq-bot/);
    assert.match(help.stdout, /pnpm dlx codex-qq-bot/);
    assert.match(help.stdout, /不需要打开 GitHub 网页/);
    assert.match(help.stdout, /中文首次部署/);
  }

  const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(packageMetadata.name, "codex-qq-bot");
  assert.equal(packageMetadata.version, "1.1.7-1");
  const installerSource = await readFile(remoteInstallerPath, "utf8");
  assert.match(installerSource, /\/root\/Codex-QQ-Bot/);
  assert.match(installerSource, /Codex-Remote-Contact/);
  assert.match(installerSource, /--continue-at -/);
  assert.match(installerSource, /下一步请运行/);
});

test("remote installer validates and extracts a local release without launching", async (t) => {
  const zip = spawnSync("zip", ["-v"], { encoding: "utf8" });
  if (zip.error?.code === "ENOENT") {
    t.skip("zip command is unavailable");
    return;
  }

  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-remote-install-"));
  try {
    const fixtureRoot = join(home, "fixture", "codex-qq-bot-v1.1.7");
    await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
    await writeFile(join(fixtureRoot, "package.json"), '{"name":"fixture"}\n');
    await writeFile(
      join(fixtureRoot, "一键部署.command"),
      '#!/usr/bin/env bash\nexec zsh "$(dirname "$0")/scripts/ncc.command" "$@"\n'
    );
    await writeFile(
      join(fixtureRoot, "scripts", "ncc.command"),
      '#!/usr/bin/env zsh\nprintf "fixture ncc:%s\\n" "$*"\n'
    );
    await writeFile(join(fixtureRoot, "scripts", "deploy.command"), "#!/usr/bin/env zsh\nexit 0\n");
    const archive = join(home, "fixture.zip");
    const packed = spawnSync("zip", ["-qr", archive, "codex-qq-bot-v1.1.7"], {
      cwd: join(home, "fixture"),
      encoding: "utf8"
    });
    assert.equal(packed.status, 0, packed.stderr);

    const target = join(home, "installed");
    const stateDir = join(home, "install-state");
    const binDir = join(home, "bin");
    const nccBin = join(binDir, "ncc");
    await mkdir(binDir);
    const installerEnv = {
      ...process.env,
      PATH: `${binDir}:/usr/bin:/bin`,
      CODEX_QQ_BOT_INSTALL_STATE_DIR: stateDir,
      CODEX_QQ_BOT_NCC_BIN: nccBin
    };
    const installerArgs = [
      remoteInstallerPath,
      "--archive", archive,
      "--install-dir", target
    ];

    const stoppedAfterDownload = spawnSync("bash", installerArgs, {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...installerEnv, CODEX_QQ_BOT_INSTALL_STOP_AFTER: "download" }
    });
    assert.equal(stoppedAfterDownload.status, 75, stoppedAfterDownload.stderr);
    assert.match(stoppedAfterDownload.stdout, /download.*重新运行会继续下一阶段/);
    await access(join(stateDir, "fixture.zip", "fixture.zip"));
    await assert.rejects(access(target));

    const stoppedAfterExtract = spawnSync("bash", installerArgs, {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...installerEnv, CODEX_QQ_BOT_INSTALL_STOP_AFTER: "extract" }
    });
    assert.equal(stoppedAfterExtract.status, 75, stoppedAfterExtract.stderr);
    assert.match(stoppedAfterExtract.stdout, /发现已下载的安装包/);
    assert.match(stoppedAfterExtract.stdout, /extract.*重新运行会继续下一阶段/);
    await assert.rejects(access(target));

    const installed = spawnSync("bash", installerArgs, {
      cwd: projectDir,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(installed.status, 0, installed.stderr);
    assert.match(installed.stdout, /无需打开 GitHub 网页/);
    assert.match(installed.stdout, /发现已下载的安装包/);
    assert.match(installed.stdout, /ZIP 已在上次运行中完成校验/);
    assert.match(installed.stdout, /ZIP 已在上次运行中完成解压/);
    assert.match(installed.stdout, /项目已安装到/);
    assert.match(installed.stdout, /已安装 ncc 入口/);
    assert.match(installed.stdout, /下一步请运行[\s\S]*ncc/);
    assert.doesNotMatch(installed.stdout, /正在按要求进入中文 ncc/);
    await access(join(target, "package.json"));
    await access(join(target, "scripts", "ncc.command"), constants.X_OK);
    await access(nccBin, constants.X_OK);

    const directNcc = spawnSync("ncc", ["--help"], {
      cwd: home,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(directNcc.status, 0, directNcc.stderr);
    assert.match(directNcc.stdout, /fixture ncc:--help/);

    const resumedCompletedInstall = spawnSync("bash", installerArgs, {
      cwd: projectDir,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(resumedCompletedInstall.status, 0, resumedCompletedInstall.stderr);
    assert.match(resumedCompletedInstall.stdout, /发现已有项目/);
    assert.match(resumedCompletedInstall.stdout, /下一步请运行[\s\S]*ncc/);

    const marker = join(home, "occupied", "keep.txt");
    await mkdir(join(home, "occupied"));
    await writeFile(marker, "保留\n");
    const refused = spawnSync("bash", [
      remoteInstallerPath,
      "--archive", archive,
      "--install-dir", join(home, "occupied"),
      "--no-launch"
    ], { cwd: projectDir, encoding: "utf8" });
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /拒绝覆盖/);
    assert.equal(await readFile(marker, "utf8"), "保留\n");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("remote installer preserves an unrelated ncc command", async (t) => {
  const zip = spawnSync("zip", ["-v"], { encoding: "utf8" });
  if (zip.error?.code === "ENOENT") {
    t.skip("zip command is unavailable");
    return;
  }

  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-ncc-conflict-"));
  try {
    const fixtureRoot = join(home, "fixture", "codex-qq-bot-v1.1.7");
    await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
    await writeFile(join(fixtureRoot, "package.json"), '{"name":"fixture"}\n');
    await writeFile(join(fixtureRoot, "一键部署.command"), "#!/usr/bin/env bash\nexit 0\n");
    await writeFile(join(fixtureRoot, "scripts", "ncc.command"), "#!/usr/bin/env zsh\nexit 0\n");
    await writeFile(join(fixtureRoot, "scripts", "deploy.command"), "#!/usr/bin/env zsh\nexit 0\n");
    const archive = join(home, "fixture.zip");
    const packed = spawnSync("zip", ["-qr", archive, "codex-qq-bot-v1.1.7"], {
      cwd: join(home, "fixture"),
      encoding: "utf8"
    });
    assert.equal(packed.status, 0, packed.stderr);

    const binDir = join(home, "bin");
    await mkdir(binDir);
    const existingNcc = join(binDir, "ncc");
    await writeFile(existingNcc, "#!/usr/bin/env bash\necho unrelated-ncc\n", { mode: 0o755 });
    const target = join(home, "installed");
    const result = spawnSync("bash", [
      remoteInstallerPath,
      "--archive", archive,
      "--install-dir", target
    ], {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:/usr/bin:/bin`,
        CODEX_QQ_BOT_INSTALL_STATE_DIR: join(home, "state")
      }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /已有的其他 ncc 控制器/);
    assert.match(result.stdout, /一键部署\.command/);
    assert.equal(await readFile(existingNcc, "utf8"), "#!/usr/bin/env bash\necho unrelated-ncc\n");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("one-click launcher delegates first-run and later daily behavior to ncc", async () => {
  const source = await readFile(launcherPath, "utf8");
  const nccSource = await readFile(nccPath, "utf8");
  const deploySource = await readFile(deployPath, "utf8");
  assert.match(source, /exec zsh "\$NCC_SCRIPT"/);
  assert.match(nccSource, /CODEX_REMOTE_CONTACT_NCC_SETUP_COMPLETED/);
  assert.match(nccSource, /首次部署/);
  assert.match(nccSource, /以后运行 ncc/);
  assert.match(nccSource, /主人 QQ/);
  assert.match(nccSource, /群白名单/);
  assert.match(nccSource, /OneBot/);
  assert.match(deploySource, /npm install/);
  assert.match(deploySource, /npm run verify/);

  const help = spawnSync("bash", [launcherPath, "--help"], {
    cwd: projectDir,
    encoding: "utf8"
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /首次直接运行 ncc/);
  assert.match(help.stdout, /自动检测环境/);
  assert.match(help.stdout, /安装依赖/);
  assert.match(help.stdout, /常规功能菜单/);
});

test("fresh ncc run enters first-run deployment and keeps it pending when cancelled", async () => {
  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-first-run-"));
  try {
    const result = spawnSync("zsh", [nccPath], {
      cwd: projectDir,
      encoding: "utf8",
      input: "n\n",
      env: { ...process.env, GPT_QQ_BOT_HOME: home }
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /Codex QQ Bot 首次部署/);
    assert.match(result.stdout, /下次运行 ncc 会继续询问/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("existing installations are adopted once and later ncc runs open the normal menu", async () => {
  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-existing-"));
  try {
    await mkdir(join(home, "data"), { recursive: true });
    await mkdir(join(home, "config"), { recursive: true });
    await writeFile(join(home, "data", "settings.json"), "{}\n");
    await writeFile(join(home, "config", "local.env"), "");
    const result = spawnSync("zsh", [nccPath], {
      cwd: projectDir,
      encoding: "utf8",
      input: "0\n",
      env: { ...process.env, GPT_QQ_BOT_HOME: home }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /已识别并接管现有部署/);
    assert.match(result.stdout, /Codex QQ Bot 控制中心/);
    const envFile = await readFile(join(home, "config", "local.env"), "utf8");
    assert.match(envFile, /CODEX_REMOTE_CONTACT_NCC_SETUP_COMPLETED=1/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("a status check on a fresh checkout does not accidentally skip first-run deployment", async () => {
  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-status-first-"));
  try {
    await mkdir(join(home, "config"), { recursive: true });
    await writeFile(
      join(home, "config", "settings.example.json"),
      '{"version":1,"qq":{},"branding":{}}\n'
    );
    const status = spawnSync("zsh", [nccPath, "status"], {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...process.env, GPT_QQ_BOT_HOME: home }
    });
    assert.equal(status.status, 0, status.stderr);
    const envFile = await readFile(join(home, "config", "local.env"), "utf8");
    assert.match(envFile, /CODEX_REMOTE_CONTACT_NCC_SETUP_COMPLETED=0/);

    const menu = spawnSync("zsh", [nccPath], {
      cwd: projectDir,
      encoding: "utf8",
      input: "n\n",
      env: { ...process.env, GPT_QQ_BOT_HOME: home }
    });
    assert.equal(menu.status, 1, menu.stderr);
    assert.match(menu.stdout, /Codex QQ Bot 首次部署/);
    assert.doesNotMatch(menu.stdout, /已识别并接管现有部署/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
