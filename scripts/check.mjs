#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const sourceRoots = ["src", "scripts", "test", "modules"];
const ignoredDirectories = new Set(["node_modules", "build", "runtime", "tmp", "vendor", ".git"]);

const sourceFiles = (await Promise.all(sourceRoots.map((root) => listFiles(join(projectDir, root)))))
  .flat()
  .filter((filePath) => [".js", ".mjs"].includes(extname(filePath)))
  .sort();

const jsonFiles = (await Promise.all([
  listFiles(join(projectDir, "config")),
  Promise.resolve([join(projectDir, "package.json")])
])).flat().filter((filePath) => extname(filePath) === ".json").sort();

const failures = [];
const sourceResults = await mapWithConcurrency(sourceFiles, 4, runNodeCheck);
for (const [index, result] of sourceResults.entries()) {
  const filePath = sourceFiles[index];
  if (!result.ok) failures.push({ filePath, error: result.error });
}
for (const filePath of jsonFiles) {
  try {
    JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    failures.push({ filePath, error: error.message });
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`check failed: ${relative(projectDir, failure.filePath)}\n${failure.error}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Checked ${sourceFiles.length} JavaScript files and ${jsonFiles.length} JSON files.\n`);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const output = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(filePath));
    else if (entry.isFile()) output.push(filePath);
  }
  return output;
}

function runNodeCheck(filePath) {
  return new Promise((resolveCheck) => {
    const child = spawn(process.execPath, ["--check", filePath], {
      cwd: projectDir,
      stdio: ["ignore", "ignore", "pipe"]
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-8_000);
    });
    child.on("error", (error) => resolveCheck({ ok: false, error: error.message }));
    child.on("close", (code) => resolveCheck({
      ok: code === 0,
      error: stderr.trim() || `node --check exited with ${code}`
    }));
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
