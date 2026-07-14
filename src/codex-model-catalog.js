import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const defaultTimeoutMs = 8_000;
const defaultCacheTtlMs = 60_000;

export function createCodexModelCatalog({
  codexPath = "codex",
  timeoutMs = defaultTimeoutMs,
  cacheTtlMs = defaultCacheTtlMs,
  envProvider = () => process.env,
  spawnProcess = spawn
} = {}) {
  let cache = null;
  let pending = null;

  return {
    async list({ refresh = false } = {}) {
      if (!refresh && cache && Date.now() - cache.loadedAt < cacheTtlMs) return cache.models;
      if (!refresh && pending) return pending;
      pending = readCodexModels({ codexPath, timeoutMs, env: envProvider(), spawnProcess })
        .then((models) => {
          cache = { loadedAt: Date.now(), models };
          return models;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clear() {
      cache = null;
    }
  };
}

export async function readCodexModels({
  codexPath = "codex",
  timeoutMs = defaultTimeoutMs,
  env = process.env,
  spawnProcess = spawn
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(codexPath, ["app-server", "--stdio"], {
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const lines = createInterface({ input: child.stdout });
    let stderr = "";
    let settled = false;
    let initialized = false;

    const finish = (error, models) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lines.close();
      child.kill();
      if (error) reject(error);
      else resolve(normalizeCodexModels(models));
    };
    const send = (message) => {
      if (settled) return;
      if (!child.stdin?.writable || child.stdin.destroyed) {
        finish(new Error("Codex model catalog stdin closed before the request was sent"));
        return;
      }
      child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error) finish(error);
      });
    };
    const timer = setTimeout(() => finish(new Error("Timed out while reading the Codex model catalog")), timeoutMs);

    child.stdin.on("error", (error) => finish(error));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(error));
    child.on("exit", (code) => {
      if (!settled) finish(new Error(`Codex model catalog exited with ${code}: ${stderr.trim()}`));
    });
    lines.on("line", (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.id === 1 && message.result && !initialized) {
        initialized = true;
        send({ method: "initialized" });
        send({ id: 2, method: "model/list", params: { limit: 100, includeHidden: false } });
        return;
      }
      if (message.id === 1 && message.error) {
        finish(new Error(message.error.message || "Codex app-server initialization failed"));
        return;
      }
      if (message.id === 2 && message.result) {
        finish(null, message.result.data || []);
        return;
      }
      if (message.id === 2 && message.error) {
        finish(new Error(message.error.message || "Codex model/list failed"));
      }
    });

    send({
      id: 1,
      method: "initialize",
      params: { clientInfo: { name: "codex-remote-contact", version: "1.1.1" } }
    });
  });
}

export function normalizeCodexModels(models) {
  const seen = new Set();
  return (Array.isArray(models) ? models : [])
    .filter((item) => item && !item.hidden && typeof item.model === "string" && item.model.trim())
    .map((item) => ({
      id: String(item.id || item.model),
      model: item.model.trim(),
      displayName: String(item.displayName || item.model).trim(),
      description: String(item.description || "").trim(),
      isDefault: Boolean(item.isDefault),
      defaultReasoningEffort: String(item.defaultReasoningEffort || "medium"),
      supportedReasoningEfforts: (Array.isArray(item.supportedReasoningEfforts) ? item.supportedReasoningEfforts : [])
        .map((option) => typeof option === "string" ? option : option?.reasoningEffort)
        .filter(Boolean)
        .map(String)
    }))
    .filter((item) => {
      if (seen.has(item.model)) return false;
      seen.add(item.model);
      return true;
    });
}

export function findCodexModel(models, selector) {
  const value = String(selector || "").trim();
  if (/^[1-9][0-9]*$/.test(value)) return models[Number(value) - 1] || null;
  const lower = value.toLowerCase();
  return models.find((item) => item.model.toLowerCase() === lower || item.id.toLowerCase() === lower) || null;
}
