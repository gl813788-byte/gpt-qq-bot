#!/usr/bin/env bash

set -Eeuo pipefail

REPOSITORY="${CODEX_QQ_BOT_REPOSITORY:-gl813788-byte/codex-qq-bot}"
REPOSITORY_API_URL="${CODEX_QQ_BOT_REPOSITORY_API_URL:-https://api.github.com/repos/${REPOSITORY}}"
COMMIT_API_URL="${CODEX_QQ_BOT_COMMIT_API_URL:-}"
ARCHIVE_BASE_URL="${CODEX_QQ_BOT_ARCHIVE_BASE_URL:-https://github.com/${REPOSITORY}/archive}"
SOURCE_BRANCH="${CODEX_QQ_BOT_SOURCE_BRANCH:-}"
INSTALL_DIR="${CODEX_QQ_BOT_INSTALL_DIR:-}"
ARCHIVE_FILE="${CODEX_QQ_BOT_ARCHIVE_FILE:-}"
STATE_ROOT="${CODEX_QQ_BOT_INSTALL_STATE_DIR:-}"
NCC_BIN_OVERRIDE="${CODEX_QQ_BOT_NCC_BIN:-}"
STOP_AFTER="${CODEX_QQ_BOT_INSTALL_STOP_AFTER:-}"
CHECK_ONLY=0
LAUNCH_AFTER=0
CHECK_WORK_DIR=""
NCC_READY=0

log() {
  printf '\n[Codex QQ Bot 安装器] %s\n' "$*"
}

warn() {
  printf '\n[Codex QQ Bot 安装器] 提示：%s\n' "$*" >&2
}

die() {
  printf '\n[Codex QQ Bot 安装器] 错误：%s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Codex QQ Bot 中文安装器

推荐命令：
  npx -y codex-qq-bot
  pnpm dlx codex-qq-bot

未安装 Node.js 时可使用：
  curl -fsSL https://raw.githubusercontent.com/gl813788-byte/codex-qq-bot/main/install.sh | bash

安装器会读取 GitHub 默认分支的最新提交并下载对应源码 ZIP，不必等待 Release。
它按“解析提交、下载、校验、解压、安装 ncc 入口”分阶段保存进度；中断后重新运行
同一命令会复用已经完成的阶段。下载准备完成后，请运行 ncc 继续中文首次部署；
整个过程不需要打开 GitHub 网页。

选项：
  --check                 只检查最新版本和下载地址，不安装
  --install-dir <目录>    指定项目安装目录
  --archive <ZIP>         从本地 ZIP 安装，适合离线或测试
  --launch                准备完成后立即进入 ncc（默认只提示下一步）
  --no-launch             兼容旧命令；与当前默认行为相同
  -h, --help              显示本帮助

环境变量：
  CODEX_QQ_BOT_INSTALL_DIR        默认安装目录
  CODEX_QQ_BOT_INSTALL_STATE_DIR  断点续装缓存目录
  CODEX_QQ_BOT_NCC_BIN            自定义 ncc 入口路径
  CODEX_QQ_BOT_SOURCE_BRANCH      指定源码分支；默认读取仓库默认分支
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      shift
      ;;
    --install-dir)
      [ "$#" -ge 2 ] || die "--install-dir 后面需要目录。"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --archive)
      [ "$#" -ge 2 ] || die "--archive 后面需要 ZIP 路径。"
      ARCHIVE_FILE="$2"
      shift 2
      ;;
    --launch)
      LAUNCH_AFTER=1
      shift
      ;;
    --no-launch)
      LAUNCH_AFTER=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "不认识的参数：$1（运行 --help 查看用法）"
      ;;
  esac
done

if [ -z "$INSTALL_DIR" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    INSTALL_DIR="/root/Codex-QQ-Bot"
    LEGACY_INSTALL_DIR="/root/Codex-Remote-Contact"
  else
    INSTALL_DIR="${HOME:?HOME 未设置}/Codex-QQ-Bot"
    LEGACY_INSTALL_DIR="$HOME/Codex-Remote-Contact"
  fi
  if [ -d "$LEGACY_INSTALL_DIR" ] && [ -f "$LEGACY_INSTALL_DIR/scripts/ncc.command" ] && [ ! -e "$INSTALL_DIR" ]; then
    INSTALL_DIR="$LEGACY_INSTALL_DIR"
  fi
fi

case "$INSTALL_DIR" in
  /*) ;;
  *) INSTALL_DIR="$(pwd)/$INSTALL_DIR" ;;
esac

if [ -z "$STATE_ROOT" ]; then
  STATE_ROOT="${INSTALL_DIR}.install-cache"
fi
case "$STATE_ROOT" in
  /*) ;;
  *) STATE_ROOT="$(pwd)/$STATE_ROOT" ;;
esac

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

install_system_package() {
  local package="$1"
  if command -v brew >/dev/null 2>&1; then
    brew install "$package"
  elif command -v apt-get >/dev/null 2>&1; then
    run_privileged apt-get update && run_privileged apt-get install -y "$package"
  elif command -v dnf >/dev/null 2>&1; then
    run_privileged dnf install -y "$package"
  elif command -v yum >/dev/null 2>&1; then
    run_privileged yum install -y "$package"
  elif command -v pacman >/dev/null 2>&1; then
    run_privileged pacman -Sy --needed --noconfirm "$package"
  else
    return 1
  fi
}

ensure_command() {
  local command_name="$1"
  local package_name="$2"
  command -v "$command_name" >/dev/null 2>&1 && return 0
  log "缺少 ${command_name}，正在尝试自动安装 ${package_name}。"
  install_system_package "$package_name" || die "无法自动安装 ${package_name}，请安装后重试。"
  command -v "$command_name" >/dev/null 2>&1 || die "${package_name} 安装后仍不在 PATH 中。"
}

cleanup_check() {
  if [ -n "$CHECK_WORK_DIR" ] && [ -d "$CHECK_WORK_DIR" ]; then
    rm -rf "$CHECK_WORK_DIR"
  fi
}
trap cleanup_check EXIT

SOURCE_REVISION=""
SOURCE_LABEL=""
ASSET_NAME=""
ASSET_URL=""
EXPECTED_SHA256=""

read_default_branch() {
  local repository_file="$1"
  if command -v node >/dev/null 2>&1; then
    node - "$repository_file" <<'NODE'
const fs = require("node:fs");
const repository = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (typeof repository.default_branch !== "string" || !repository.default_branch) process.exit(2);
process.stdout.write(repository.default_branch);
NODE
  else
    sed -n 's/^[[:space:]]*"default_branch":[[:space:]]*"\([^"]*\)".*/\1/p' "$repository_file" | head -n 1
  fi
}

read_commit_revision() {
  local commit_file="$1"
  if command -v node >/dev/null 2>&1; then
    node - "$commit_file" <<'NODE'
const fs = require("node:fs");
const commit = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (typeof commit.sha !== "string" || !/^[0-9a-f]{40}$/i.test(commit.sha)) process.exit(2);
process.stdout.write(commit.sha.toLowerCase());
NODE
  else
    sed -n 's/^[[:space:]]*"sha":[[:space:]]*"\([0-9a-fA-F]\{40\}\)".*/\1/p' "$commit_file" | head -n 1 | tr '[:upper:]' '[:lower:]'
  fi
}

parse_source_metadata() {
  local repository_file="$1"
  local commit_file="$2"
  local configured_branch="$3"
  SOURCE_REVISION=""
  SOURCE_LABEL=""
  ASSET_NAME=""
  ASSET_URL=""
  EXPECTED_SHA256=""

  if [ -n "$configured_branch" ]; then
    SOURCE_BRANCH="$configured_branch"
  else
    SOURCE_BRANCH="$(read_default_branch "$repository_file")" || return 1
  fi
  case "$SOURCE_BRANCH" in
    ""|*[!A-Za-z0-9._/-]*) return 1 ;;
  esac
  SOURCE_REVISION="$(read_commit_revision "$commit_file")" || return 1
  [ -n "$SOURCE_REVISION" ] || return 1
  local short_revision="${SOURCE_REVISION:0:12}"
  SOURCE_LABEL="${SOURCE_BRANCH}@${short_revision}"
  ASSET_NAME="codex-qq-bot-${short_revision}.zip"
  ASSET_URL="${ARCHIVE_BASE_URL%/}/${SOURCE_REVISION}.zip"

  [ -n "$SOURCE_LABEL" ] && [ -n "$ASSET_NAME" ] && [ -n "$ASSET_URL" ]
}

resolve_latest_source() {
  local metadata_dir="$1"
  local repository_file="$metadata_dir/repository.json"
  local commit_file="$metadata_dir/commit.json"
  local configured_branch="$SOURCE_BRANCH"
  mkdir -p "$metadata_dir"
  ensure_command curl curl
  if [ -f "$repository_file" ] && [ -f "$commit_file" ] && parse_source_metadata "$repository_file" "$commit_file" "$configured_branch"; then
    log "发现未完成安装的源码信息，将从上次进度继续：$SOURCE_LABEL"
    return 0
  fi

  local repository_tmp="${repository_file}.part"
  local commit_tmp="${commit_file}.part"
  if [ -z "$configured_branch" ]; then
    log "正在查询仓库默认分支……"
    curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$REPOSITORY_API_URL" -o "$repository_tmp" || die "无法读取仓库信息，请检查网络后重试。"
    SOURCE_BRANCH="$(read_default_branch "$repository_tmp")" || die "仓库信息中没有有效的默认分支。"
  else
    SOURCE_BRANCH="$configured_branch"
    printf '{"default_branch":"%s"}\n' "$SOURCE_BRANCH" > "$repository_tmp"
  fi
  case "$SOURCE_BRANCH" in
    ""|*[!A-Za-z0-9._/-]*) die "源码分支名称无效。" ;;
  esac

  local effective_commit_api="$COMMIT_API_URL"
  [ -n "$effective_commit_api" ] || effective_commit_api="${REPOSITORY_API_URL%/}/commits/${SOURCE_BRANCH}"
  log "正在解析 ${SOURCE_BRANCH} 分支的最新提交……"
  curl -fsSL \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$effective_commit_api" -o "$commit_tmp" || die "无法读取最新提交信息，请检查网络后重试。"
  parse_source_metadata "$repository_tmp" "$commit_tmp" "$configured_branch" || die "最新提交信息无效。"
  mv "$repository_tmp" "$repository_file"
  mv "$commit_tmp" "$commit_file"
}

calculate_sha256() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    return 1
  fi
}

archive_is_verified() {
  local archive="$1"
  local marker="$2"
  [ -f "$marker" ] || return 1
  local actual recorded
  actual="$(calculate_sha256 "$archive")" || return 1
  recorded="$(sed -n '1p' "$marker")"
  [ "$actual" = "$recorded" ]
}

verify_archive() {
  local archive="$1"
  local marker="$2"
  local actual_sha256=""
  if archive_is_verified "$archive" "$marker"; then
    log "ZIP 已在上次运行中完成校验，跳过重复校验。"
    return 0
  fi

  actual_sha256="$(calculate_sha256 "$archive")" || die "系统缺少 SHA-256 校验工具。"
  actual_sha256="$(printf '%s' "$actual_sha256" | tr '[:upper:]' '[:lower:]')"
  if [ -n "$EXPECTED_SHA256" ]; then
    EXPECTED_SHA256="$(printf '%s' "$EXPECTED_SHA256" | tr '[:upper:]' '[:lower:]')"
    [ "$actual_sha256" = "$EXPECTED_SHA256" ] || die "ZIP 摘要校验失败，已停止安装；缓存文件保留供排查。"
    log "SHA-256 摘要校验通过。"
  else
    log "此安装源没有提供 SHA-256 摘要，将继续检查 ZIP 完整性和目录结构。"
  fi

  unzip -tq "$archive" >/dev/null || die "ZIP 完整性检查失败；缓存文件保留供排查。"
  if unzip -Z1 "$archive" | awk '
    BEGIN { bad=0 }
    /^\// || /(^|\/)\.\.($|\/)/ { bad=1 }
    END { exit bad ? 0 : 1 }
  '; then
    die "ZIP 包含不安全路径，已停止安装。"
  fi
  printf '%s\n' "$actual_sha256" > "$marker"
}

maybe_stop_after() {
  local stage="$1"
  if [ "$STOP_AFTER" = "$stage" ]; then
    log "已按测试设置在“${stage}”阶段后停止；重新运行会继续下一阶段。"
    exit 75
  fi
}

existing_project_is_valid() {
  [ -d "$INSTALL_DIR" ] &&
    [ -f "$INSTALL_DIR/package.json" ] &&
    [ -f "$INSTALL_DIR/scripts/ncc.command" ] &&
    [ -f "$INSTALL_DIR/一键部署.command" ]
}

wrapper_matches_project() {
  local candidate="$1"
  local ncc_source="$INSTALL_DIR/scripts/ncc.command"
  [ -e "$candidate" ] || return 1
  if [ "$(readlink -f "$candidate" 2>/dev/null || printf '%s' "$candidate")" = "$(readlink -f "$ncc_source" 2>/dev/null || printf '%s' "$ncc_source")" ]; then
    return 0
  fi
  grep -Fq "# CODEX_QQ_BOT_NCC=$INSTALL_DIR" "$candidate" 2>/dev/null
}

write_ncc_wrapper() {
  local destination="$1"
  local wrapper_tmp="$STATE_ROOT/ncc-wrapper"
  mkdir -p "$STATE_ROOT"
  {
    printf '#!/usr/bin/env bash\n'
    printf '# CODEX_QQ_BOT_NCC=%s\n' "$INSTALL_DIR"
    printf 'exec bash %q "$@"\n' "$INSTALL_DIR/一键部署.command"
  } > "$wrapper_tmp"
  chmod 755 "$wrapper_tmp"

  if [ -e "$destination" ] && ! wrapper_matches_project "$destination"; then
    warn "检测到已有 ncc：$destination。为避免覆盖其他控制器，已保留原命令。"
    return 1
  fi

  mkdir -p "$(dirname "$destination")" 2>/dev/null || true
  if [ -w "$(dirname "$destination")" ]; then
    install -m 755 "$wrapper_tmp" "$destination"
  elif ! run_privileged install -m 755 "$wrapper_tmp" "$destination"; then
    return 1
  fi
  NCC_READY=1
  log "已安装 ncc 入口：$destination"
}

install_ncc_entry() {
  chmod +x "$INSTALL_DIR/一键部署.command" "$INSTALL_DIR/scripts/ncc.command" "$INSTALL_DIR/scripts/deploy.command" 2>/dev/null || true

  if [ -n "$NCC_BIN_OVERRIDE" ]; then
    write_ncc_wrapper "$NCC_BIN_OVERRIDE" || die "无法写入指定的 ncc 入口：$NCC_BIN_OVERRIDE"
    return
  fi

  local existing_ncc=""
  existing_ncc="$(command -v ncc 2>/dev/null || true)"
  if [ -n "$existing_ncc" ]; then
    if wrapper_matches_project "$existing_ncc"; then
      NCC_READY=1
      log "现有 ncc 已正确指向本项目：$existing_ncc"
    else
      warn "检测到已有的其他 ncc 控制器：$existing_ncc，未进行覆盖。"
      warn "本项目可改用：$INSTALL_DIR/一键部署.command"
    fi
    return
  fi

  local path_dir=""
  if [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    write_ncc_wrapper "/usr/local/bin/ncc" && return
  fi
  case ":$PATH:" in
    *":$HOME/.local/bin:"*)
      mkdir -p "$HOME/.local/bin"
      write_ncc_wrapper "$HOME/.local/bin/ncc" && return
      ;;
  esac
  IFS=: read -r -a path_dirs <<<"$PATH"
  for path_dir in "${path_dirs[@]}"; do
    case "$path_dir" in
      /*) ;;
      *) continue ;;
    esac
    if [ -d "$path_dir" ] && [ -w "$path_dir" ]; then
      write_ncc_wrapper "$path_dir/ncc" && return
    fi
  done
  if write_ncc_wrapper "/usr/local/bin/ncc"; then
    return
  fi

  mkdir -p "$HOME/.local/bin"
  if write_ncc_wrapper "$HOME/.local/bin/ncc"; then
    warn "$HOME/.local/bin 当前不在 PATH。新开终端后若仍找不到 ncc，请执行：export PATH="$HOME/.local/bin:\$PATH""
    return
  fi
  warn "无法安装 ncc 快捷入口，请使用：$INSTALL_DIR/一键部署.command"
}

print_next_step() {
  log "项目下载、校验和解压已经完成。"
  if [ "$NCC_READY" = "1" ]; then
    printf '\n下一步请运行：\n\n  ncc\n\n'
    printf '首次运行会检测环境、安装依赖并引导填写配置；中断后再次运行 ncc 即可继续。\n'
  else
    printf '\n当前机器已有其他同名 ncc，因此没有覆盖它。请运行：\n\n  "%s"\n\n' "$INSTALL_DIR/一键部署.command"
  fi
}

launch_ncc_if_requested() {
  [ "$LAUNCH_AFTER" = "1" ] || return 0
  log "正在按要求进入中文 ncc。"
  if [ -r /dev/tty ]; then
    "$INSTALL_DIR/一键部署.command" </dev/tty
  else
    die "当前没有交互终端。请稍后运行 ncc 继续安装。"
  fi
}

log "无需打开 GitHub 网页；安装器支持中断后从已完成阶段继续。"

if [ "$CHECK_ONLY" = "1" ]; then
  if [ -n "$ARCHIVE_FILE" ]; then
    [ -f "$ARCHIVE_FILE" ] || die "找不到本地 ZIP：$ARCHIVE_FILE"
    log "本地安装包可读取：$ARCHIVE_FILE"
    printf '目标目录：%s\n' "$INSTALL_DIR"
  else
    CHECK_WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-qq-bot-check.XXXXXX")"
    resolve_latest_source "$CHECK_WORK_DIR/source"
    log "最新源码：${SOURCE_LABEL}"
    printf '源码提交：%s\n' "$SOURCE_REVISION"
    printf '安装包：%s\n' "$ASSET_NAME"
    printf '下载地址：%s\n' "$ASSET_URL"
    printf '目标目录：%s\n' "$INSTALL_DIR"
  fi
  log "检查完成，没有下载或修改任何项目文件。"
  exit 0
fi

if existing_project_is_valid; then
  log "发现已有项目，不会覆盖其中的配置、数据或代码：$INSTALL_DIR"
  install_ncc_entry
  print_next_step
  launch_ncc_if_requested
  exit 0
fi

if [ -e "$INSTALL_DIR" ]; then
  if [ -d "$INSTALL_DIR" ] && [ -z "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
    rmdir "$INSTALL_DIR" || die "无法使用空目录：$INSTALL_DIR"
  else
    die "目标路径已存在但不是可识别的项目，拒绝覆盖：$INSTALL_DIR"
  fi
fi

ensure_command unzip unzip
parent_dir="$(dirname "$INSTALL_DIR")"
mkdir -p "$parent_dir" "$STATE_ROOT"

if [ -n "$ARCHIVE_FILE" ]; then
  [ -f "$ARCHIVE_FILE" ] || die "找不到本地 ZIP：$ARCHIVE_FILE"
  SOURCE_LABEL="local"
  ASSET_NAME="$(basename "$ARCHIVE_FILE")"
  ASSET_URL=""
else
  resolve_latest_source "$STATE_ROOT/source"
  log "目标源码：${SOURCE_LABEL}"
fi

safe_asset_name="$(printf '%s' "$ASSET_NAME" | tr -c 'A-Za-z0-9._-' '_')"
stage_dir="$STATE_ROOT/$safe_asset_name"
mkdir -p "$stage_dir"
downloaded_archive="$stage_dir/$safe_asset_name"
partial_archive="${downloaded_archive}.part"
verified_marker="$stage_dir/verified.sha256"
extract_dir="$stage_dir/extracted"
extracted_marker="$stage_dir/extracted.sha256"

if [ -f "$downloaded_archive" ]; then
  log "发现已下载的安装包，跳过下载并继续下一阶段：$downloaded_archive"
elif [ -n "$ARCHIVE_FILE" ]; then
  log "正在保存本地安装包，完成后可断点继续。"
  cp "$ARCHIVE_FILE" "$partial_archive"
  mv "$partial_archive" "$downloaded_archive"
else
  partial_is_complete=0
  if [ -f "$partial_archive" ]; then
    if [ -n "$EXPECTED_SHA256" ]; then
      partial_sha256="$(calculate_sha256 "$partial_archive" 2>/dev/null || true)"
      partial_sha256="$(printf '%s' "$partial_sha256" | tr '[:upper:]' '[:lower:]')"
      expected_partial_sha256="$(printf '%s' "$EXPECTED_SHA256" | tr '[:upper:]' '[:lower:]')"
      if [ -n "$partial_sha256" ] && [ "$partial_sha256" = "$expected_partial_sha256" ]; then
        partial_is_complete=1
      fi
    elif unzip -tq "$partial_archive" >/dev/null 2>&1; then
      partial_is_complete=1
    fi
    if [ "$partial_is_complete" = "1" ]; then
      log "发现已经下载完整的临时 ZIP，将直接进入校验阶段。"
      mv "$partial_archive" "$downloaded_archive"
    fi
  fi
  if [ "$partial_is_complete" = "1" ]; then
    :
  elif [ -f "$partial_archive" ]; then
    log "发现未完成的下载，正在从现有文件续传：$partial_archive"
    curl -fL --retry 3 --retry-delay 1 --continue-at - "$ASSET_URL" -o "$partial_archive" || die "下载中断，已保留进度；重新运行同一命令即可续传。"
    mv "$partial_archive" "$downloaded_archive"
  else
    log "正在下载 ${ASSET_NAME}……"
    curl -fL --retry 3 --retry-delay 1 "$ASSET_URL" -o "$partial_archive" || die "下载中断，已保留进度；重新运行同一命令即可续传。"
    mv "$partial_archive" "$downloaded_archive"
  fi
fi

maybe_stop_after download
verify_archive "$downloaded_archive" "$verified_marker"
maybe_stop_after verify
archive_sha256="$(sed -n '1p' "$verified_marker")"

archive_root="$(unzip -Z1 "$downloaded_archive" | awk -F/ 'NF && $1 != "" { print $1; exit }')"
[ -n "$archive_root" ] || die "ZIP 没有可安装内容。"
source_dir="$extract_dir/$archive_root"
if [ -f "$extracted_marker" ] && [ "$(sed -n '1p' "$extracted_marker")" = "$archive_sha256" ] && [ -d "$source_dir" ]; then
  log "ZIP 已在上次运行中完成解压，跳过重复解压。"
else
  log "正在解压项目……"
  mkdir -p "$extract_dir"
  unzip -oq "$downloaded_archive" -d "$extract_dir"
  [ -d "$source_dir" ] || die "ZIP 顶层目录无效。"
  printf '%s\n' "$archive_sha256" > "$extracted_marker"
fi

[ -f "$source_dir/package.json" ] || die "ZIP 缺少 package.json。"
[ -f "$source_dir/scripts/ncc.command" ] || die "ZIP 缺少仓库 ncc。"
[ -f "$source_dir/一键部署.command" ] || die "ZIP 缺少中文一键部署入口。"
maybe_stop_after extract

mv "$source_dir" "$INSTALL_DIR" || die "无法写入目标目录：$INSTALL_DIR"
log "项目已安装到：$INSTALL_DIR"
maybe_stop_after install
install_ncc_entry
print_next_step
launch_ncc_if_requested
