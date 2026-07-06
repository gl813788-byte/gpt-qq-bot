#!/usr/bin/env node
import { open, stat } from "node:fs/promises";

const levelNames = { debug: "调试", info: "信息", success: "成功", warn: "警告", error: "错误" };
const categoryNames = {
  system: "系统",
  qq: "QQ",
  onebot: "OneBot",
  codex: "Codex",
  imessage: "iMessage",
  web: "接口",
  memory: "记忆",
  command: "指令"
};
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
};

const options = parseArgs(process.argv.slice(2));
if (!options.file) {
  usage();
  process.exit(2);
}

await printExisting(options);
if (options.follow) await followFile(options);

function parseArgs(args) {
  const output = {
    file: "",
    tail: 120,
    follow: false,
    level: "",
    category: "",
    plain: !process.stdout.isTTY
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!output.file && !arg.startsWith("-")) {
      output.file = arg;
    } else if (arg === "-n" || arg === "--tail") {
      output.tail = Math.max(1, Math.min(1000, Number(args[++index] || 120) || 120));
    } else if (arg === "-f" || arg === "--follow") {
      output.follow = true;
    } else if (arg === "--level") {
      output.level = String(args[++index] || "").toLowerCase();
    } else if (arg === "--category") {
      output.category = String(args[++index] || "").toLowerCase();
    } else if (arg === "--plain") {
      output.plain = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return output;
}

async function printExisting(options) {
  const body = await readTail(options.file, Math.max(64 * 1024, options.tail * 2048)).catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const rendered = body
    .split("\n")
    .filter(Boolean)
    .map((line) => renderLine(line, options))
    .filter(Boolean)
    .slice(-options.tail);
  for (const line of rendered) process.stdout.write(`${line}\n`);
}

async function followFile(options) {
  let offset = await stat(options.file).then((entry) => entry.size).catch(() => 0);
  process.stdout.write(color(`正在跟随日志: ${options.file}\n`, "dim", options));
  setInterval(async () => {
    const current = await stat(options.file).catch(() => null);
    if (!current) return;
    if (current.size < offset) offset = 0;
    if (current.size === offset) return;
    const handle = await open(options.file, "r");
    try {
      const size = current.size - offset;
      const buffer = Buffer.alloc(size);
      await handle.read(buffer, 0, size, offset);
      offset = current.size;
      for (const line of buffer.toString("utf8").split("\n").filter(Boolean)) {
        const rendered = renderLine(line, options);
        if (rendered) process.stdout.write(`${rendered}\n`);
      }
    } finally {
      await handle.close().catch(() => null);
    }
  }, 1000);
  await new Promise(() => {});
}

async function readTail(file, bytes) {
  const handle = await open(file, "r");
  try {
    const { size } = await handle.stat();
    const readSize = Math.min(size, bytes);
    const buffer = Buffer.alloc(readSize);
    await handle.read(buffer, 0, readSize, Math.max(0, size - readSize));
    return buffer.toString("utf8");
  } finally {
    await handle.close().catch(() => null);
  }
}

function renderLine(line, options) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return null;
  }
  if (options.level && String(entry.level || "").toLowerCase() !== options.level) return null;
  if (options.category && String(entry.category || "").toLowerCase() !== options.category) return null;
  const level = String(entry.level || "info").toLowerCase();
  const category = String(entry.category || "system").toLowerCase();
  const ts = String(entry.ts || "").replace("T", " ").replace(/\.\d+Z$/, "");
  const colorName = colorFor(level, category);
  const header = [
    color(ts.padEnd(19, " "), "dim", options),
    color((levelNames[level] || level).padEnd(2, " "), colorName, options),
    color((categoryNames[category] || category).padEnd(7, " "), colorName, options)
  ].join(" ");
  const details = entry.details && Object.keys(entry.details).length
    ? ` ${color(JSON.stringify(entry.details), "gray", options)}`
    : "";
  return `${header} ${entry.message || ""}${details}`;
}

function colorFor(level, category) {
  if (level === "error") return "red";
  if (level === "warn") return "yellow";
  if (level === "success") return "green";
  if (category === "qq") return "blue";
  if (category === "codex") return "magenta";
  if (category === "onebot") return "cyan";
  return "gray";
}

function color(text, colorName, options) {
  if (options.plain) return text;
  return `${colors[colorName] || ""}${text}${colors.reset}`;
}

function usage() {
  process.stderr.write("用法: ncc-log-viewer.mjs LOG_FILE [--tail N] [-f] [--level LEVEL] [--category CATEGORY] [--plain]\n");
}
