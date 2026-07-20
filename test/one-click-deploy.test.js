import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
const bootstrapPath = fileURLToPath(new URL("scripts/bootstrap-environment.sh", new URL("..", import.meta.url)));
const remoteInstallerPath = fileURLToPath(new URL("install.sh", new URL("..", import.meta.url)));
const npmInstallerPath = fileURLToPath(new URL("bin/codex-qq-bot.mjs", new URL("..", import.meta.url)));
const packagePath = fileURLToPath(new URL("package.json", new URL("..", import.meta.url)));

test("Chinese one-click deployment entry is executable and has valid Bash syntax", async () => {
  await access(launcherPath, constants.X_OK);
  await access(bootstrapPath, constants.X_OK);
  const syntax = spawnSync("bash", ["-n", launcherPath], {
    cwd: projectDir,
    encoding: "utf8"
  });
  assert.equal(syntax.status, 0, syntax.stderr);
  const bootstrapSyntax = spawnSync("bash", ["-n", bootstrapPath], {
    cwd: projectDir,
    encoding: "utf8"
  });
  assert.equal(bootstrapSyntax.status, 0, bootstrapSyntax.stderr);
});

test("fresh-machine bootstrap plans every required layer without mutating the host", () => {
  const result = spawnSync("bash", [bootstrapPath, "--all"], {
    cwd: projectDir,
    encoding: "utf8",
    env: {
      ...process.env,
      CODEX_QQ_BOT_BOOTSTRAP_DRY_RUN: "1",
      CODEX_QQ_BOT_BOOTSTRAP_OS: "linux",
      CODEX_QQ_BOT_BOOTSTRAP_PACKAGE_MANAGER: "apt-get",
      CODEX_QQ_BOT_BOOTSTRAP_FORCE_MISSING: "curl git unzip zip jq zsh screen tar xz pgrep sha256sum sudo codex",
      CODEX_QQ_BOT_BOOTSTRAP_FORCE_NODE_INSTALL: "1",
      CODEX_QQ_BOT_BOOTSTRAP_FORCE_NAPCAT_INSTALL: "1"
    }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /apt-get 安装/);
  assert.match(result.stdout, /Node\.js 官方发行页/);
  assert.match(result.stdout, /Codex CLI/);
  assert.match(result.stdout, /NapCat 官方安装器/);
  assert.match(result.stdout, /LinuxQQ、NapCat 和运行库/);
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
    assert.match(help.stdout, /npx -y .*npm view codex-qq-bot@latest version --prefer-online/);
    assert.match(help.stdout, /pnpm dlx .*npm view codex-qq-bot@latest version --prefer-online/);
    assert.match(help.stdout, /不需要打开 GitHub 网页/);
    assert.match(help.stdout, /中文首次部署/);
    assert.match(help.stdout, /默认分支的最新提交/);
    assert.doesNotMatch(help.stdout, /最新 GitHub Release/);
  }

  const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
  assert.equal(packageMetadata.name, "codex-qq-bot");
  assert.equal(packageMetadata.version, "1.1.8");
  const installerSource = await readFile(remoteInstallerPath, "utf8");
  assert.match(installerSource, /\/root\/Codex-QQ-Bot/);
  assert.match(installerSource, /Codex-Remote-Contact/);
  assert.match(installerSource, /--continue-at -/);
  assert.match(installerSource, /command -v wget/);
  assert.match(installerSource, /源码 ZIP 缺少中文一键部署入口/);
  assert.match(installerSource, /下一步请运行/);
});

test("remote installer repairs a missing Chinese launcher in an otherwise valid ZIP", async (t) => {
  const zip = spawnSync("zip", ["-v"], { encoding: "utf8" });
  if (zip.error?.code === "ENOENT") {
    t.skip("zip command is unavailable");
    return;
  }

  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-repair-launcher-"));
  try {
    const fixtureRoot = join(home, "fixture", "codex-qq-bot-without-launcher");
    await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
    await writeFile(join(fixtureRoot, "package.json"), '{"name":"repair-fixture"}\n');
    await writeFile(join(fixtureRoot, "scripts", "ncc.command"), "#!/usr/bin/env zsh\nexit 0\n");
    await writeFile(join(fixtureRoot, "scripts", "deploy.command"), "#!/usr/bin/env zsh\nexit 0\n");
    const archive = join(home, "fixture.zip");
    const packed = spawnSync("zip", ["-qr", archive, "codex-qq-bot-without-launcher"], {
      cwd: join(home, "fixture"),
      encoding: "utf8"
    });
    assert.equal(packed.status, 0, packed.stderr);

    const target = join(home, "installed");
    const result = spawnSync("bash", [
      remoteInstallerPath,
      "--archive", archive,
      "--install-dir", target,
      "--no-launch"
    ], {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_QQ_BOT_INSTALL_STATE_DIR: join(home, "state"),
        CODEX_QQ_BOT_NCC_BIN: join(home, "bin", "ncc")
      }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /源码 ZIP 缺少中文一键部署入口/);
    assert.match(result.stdout, /中文一键部署入口已恢复/);
    const repaired = await readFile(join(target, "一键部署.command"), "utf8");
    assert.match(repaired, /scripts\/ncc\.command/);
    await access(join(target, "一键部署.command"), constants.X_OK);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("remote installer validates and extracts a local source archive without launching", async (t) => {
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
    const cachedArchive = join(stateDir, "fixture.zip", "fixture.zip");
    const staleExtractDir = join(stateDir, "fixture.zip", "extracted");
    await access(cachedArchive);
    await assert.rejects(access(target));
    await writeFile(cachedArchive, "broken cached zip\n");
    await mkdir(staleExtractDir, { recursive: true });
    await writeFile(join(staleExtractDir, "stale.txt"), "partial extraction\n");
    await writeFile(join(stateDir, "fixture.zip", "extracted.sha256"), "stale\n");

    const stoppedAfterExtract = spawnSync("bash", installerArgs, {
      cwd: projectDir,
      encoding: "utf8",
      env: { ...installerEnv, CODEX_QQ_BOT_INSTALL_STOP_AFTER: "extract" }
    });
    assert.equal(stoppedAfterExtract.status, 75, stoppedAfterExtract.stderr);
    assert.match(stoppedAfterExtract.stderr, /损坏或不完整的已下载 ZIP/);
    assert.match(stoppedAfterExtract.stdout, /正在保存本地安装包/);
    assert.match(stoppedAfterExtract.stdout, /extract.*重新运行会继续下一阶段/);
    assert.equal((await readdir(join(stateDir, "fixture.zip"))).some((name) => name.startsWith("fixture.zip.invalid-")), true);
    await assert.rejects(access(join(staleExtractDir, "stale.txt")));
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

test("remote installer resolves and extracts the default branch head instead of a Release", async (t) => {
  const zip = spawnSync("zip", ["-v"], { encoding: "utf8" });
  if (zip.error?.code === "ENOENT") {
    t.skip("zip command is unavailable");
    return;
  }

  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-head-install-"));
  try {
    const revision = "1234567890abcdef1234567890abcdef12345678";
    const metadataDir = join(home, "metadata");
    const archiveDir = join(home, "archives");
    const fixtureRoot = join(home, "fixture", `codex-qq-bot-${revision}`);
    await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
    await mkdir(metadataDir);
    await mkdir(archiveDir);
    await writeFile(join(metadataDir, "repository.json"), '{"default_branch":"main"}\n');
    await writeFile(join(metadataDir, "commit.json"), JSON.stringify({ sha: revision }));
    await writeFile(join(fixtureRoot, "package.json"), '{"name":"latest-head-fixture"}\n');
    await writeFile(join(fixtureRoot, "一键部署.command"), "#!/usr/bin/env bash\nexit 0\n");
    await writeFile(join(fixtureRoot, "scripts", "ncc.command"), "#!/usr/bin/env zsh\nexit 0\n");
    await writeFile(join(fixtureRoot, "scripts", "deploy.command"), "#!/usr/bin/env zsh\nexit 0\n");
    const archive = join(archiveDir, `${revision}.zip`);
    const packed = spawnSync("zip", ["-qr", archive, `codex-qq-bot-${revision}`], {
      cwd: join(home, "fixture"),
      encoding: "utf8"
    });
    assert.equal(packed.status, 0, packed.stderr);

    const target = join(home, "installed");
    const nccBin = join(home, "bin", "ncc");
    await mkdir(join(home, "bin"));
    const installed = spawnSync("bash", [remoteInstallerPath, "--install-dir", target], {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_QQ_BOT_REPOSITORY_API_URL: `file://${join(metadataDir, "repository.json")}`,
        CODEX_QQ_BOT_COMMIT_API_URL: `file://${join(metadataDir, "commit.json")}`,
        CODEX_QQ_BOT_ARCHIVE_BASE_URL: `file://${archiveDir}`,
        CODEX_QQ_BOT_INSTALL_STATE_DIR: join(home, "state"),
        CODEX_QQ_BOT_NCC_BIN: nccBin
      }
    });
    assert.equal(installed.status, 0, installed.stderr);
    assert.match(installed.stdout, /正在查询仓库默认分支/);
    assert.match(installed.stdout, /目标源码：main@1234567890ab/);
    assert.doesNotMatch(installed.stdout, /Release/);
    assert.equal(JSON.parse(await readFile(join(target, "package.json"), "utf8")).name, "latest-head-fixture");
    await access(nccBin, constants.X_OK);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("remote installer refreshes cached head metadata and upgrades an archive install without losing local state", async (t) => {
  const zip = spawnSync("zip", ["-v"], { encoding: "utf8" });
  if (zip.error?.code === "ENOENT") {
    t.skip("zip command is unavailable");
    return;
  }

  const home = await mkdtemp(join(tmpdir(), "codex-qq-bot-upgrade-install-"));
  try {
    const firstRevision = "1111111111111111111111111111111111111111";
    const secondRevision = "2222222222222222222222222222222222222222";
    const metadataDir = join(home, "metadata");
    const archiveDir = join(home, "archives");
    const fixtureDir = join(home, "fixture");
    const stateDir = join(home, "state");
    const target = join(home, "installed");
    const nccBin = join(home, "bin", "ncc");
    await mkdir(metadataDir);
    await mkdir(archiveDir);
    await mkdir(join(home, "bin"));
    await writeFile(join(metadataDir, "repository.json"), '{"default_branch":"main"}\n');

    const createArchive = async (revision, featureValue) => {
      const rootName = `codex-qq-bot-${revision}`;
      const fixtureRoot = join(fixtureDir, rootName);
      await mkdir(join(fixtureRoot, "scripts"), { recursive: true });
      await mkdir(join(fixtureRoot, "config"), { recursive: true });
      await mkdir(join(fixtureRoot, "data"), { recursive: true });
      await writeFile(join(fixtureRoot, "package.json"), JSON.stringify({ name: "upgrade-fixture", version: featureValue }));
      await writeFile(join(fixtureRoot, "feature.txt"), `${featureValue}\n`);
      await writeFile(join(fixtureRoot, "config", "settings.example.json"), JSON.stringify({ featureValue }));
      await writeFile(join(fixtureRoot, "data", "unified-memory.json"), '[]\n');
      await writeFile(join(fixtureRoot, "一键部署.command"), "#!/usr/bin/env bash\nexit 0\n");
      await writeFile(join(fixtureRoot, "scripts", "ncc.command"), "#!/usr/bin/env zsh\nexit 0\n");
      await writeFile(join(fixtureRoot, "scripts", "deploy.command"), "#!/usr/bin/env zsh\nexit 0\n");
      const packed = spawnSync("zip", ["-qr", join(archiveDir, `${revision}.zip`), rootName], {
        cwd: fixtureDir,
        encoding: "utf8"
      });
      assert.equal(packed.status, 0, packed.stderr);
    };

    await createArchive(firstRevision, "old-feature");
    await createArchive(secondRevision, "new-feature");

    const installerEnv = {
      ...process.env,
      CODEX_QQ_BOT_REPOSITORY_API_URL: `file://${join(metadataDir, "repository.json")}`,
      CODEX_QQ_BOT_COMMIT_API_URL: `file://${join(metadataDir, "commit.json")}`,
      CODEX_QQ_BOT_ARCHIVE_BASE_URL: `file://${archiveDir}`,
      CODEX_QQ_BOT_INSTALL_STATE_DIR: stateDir,
      CODEX_QQ_BOT_NCC_BIN: nccBin,
      CODEX_QQ_BOT_INSTALLER_VERSION: "test"
    };

    await writeFile(join(metadataDir, "commit.json"), JSON.stringify({ sha: firstRevision }));
    const firstInstall = spawnSync("bash", [remoteInstallerPath, "--install-dir", target], {
      cwd: projectDir,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(firstInstall.status, 0, firstInstall.stderr);
    assert.equal(await readFile(join(target, "feature.txt"), "utf8"), "old-feature\n");

    await writeFile(join(target, "data", "settings.json"), '{"owner":"keep"}\n');
    await writeFile(join(target, "data", "unified-memory.json"), '["keep-old-data"]\n');
    await writeFile(join(target, "config", "local.env"), "SECRET_VALUE=keep\n");
    await writeFile(join(target, "custom.db"), "keep custom file\n");

    await writeFile(join(metadataDir, "commit.json"), JSON.stringify({ sha: secondRevision }));
    const upgraded = spawnSync("bash", [remoteInstallerPath, "--install-dir", target], {
      cwd: projectDir,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(upgraded.status, 0, upgraded.stderr);
    assert.match(upgraded.stdout, /发现上次解析的源码信息/);
    assert.match(upgraded.stdout, /仍会联网检查默认分支是否已有更新/);
    assert.match(upgraded.stdout, /目标源码：main@222222222222/);
    assert.match(upgraded.stdout, /项目已升级到最新源码/);
    assert.match(upgraded.stdout, /升级前的完整备份保留在/);
    assert.equal(await readFile(join(target, "feature.txt"), "utf8"), "new-feature\n");
    assert.equal(await readFile(join(target, "data", "settings.json"), "utf8"), '{"owner":"keep"}\n');
    assert.equal(await readFile(join(target, "data", "unified-memory.json"), "utf8"), '["keep-old-data"]\n');
    assert.equal(await readFile(join(target, "config", "local.env"), "utf8"), "SECRET_VALUE=keep\n");
    assert.equal(await readFile(join(target, "custom.db"), "utf8"), "keep custom file\n");
    assert.match(await readFile(join(target, ".codex-qq-bot-install-source"), "utf8"), /source_revision=222222222222/);
    assert.equal((await readdir(join(stateDir, "backups"))).length, 1);

    const unchanged = spawnSync("bash", [remoteInstallerPath, "--install-dir", target], {
      cwd: projectDir,
      encoding: "utf8",
      env: installerEnv
    });
    assert.equal(unchanged.status, 0, unchanged.stderr);
    assert.match(unchanged.stdout, /安装源码与最新版本一致/);
    assert.equal((await readdir(join(stateDir, "backups"))).length, 1);
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
