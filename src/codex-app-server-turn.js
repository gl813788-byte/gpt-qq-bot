import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_PROTOCOL_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 32 * 1024;
const DEFAULT_KILL_GRACE_MS = 1_000;

export function runCodexAppServerTurn({
  codexPath = "codex",
  cwd,
  env,
  model,
  reasoningEffort,
  prompt,
  resumePrompt = null,
  imagePaths = [],
  threadId: requestedThreadId = null,
  ephemeral = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxProtocolBytes = DEFAULT_MAX_PROTOCOL_BYTES,
  maxStderrBytes = DEFAULT_MAX_STDERR_BYTES,
  killGraceMs = DEFAULT_KILL_GRACE_MS,
  signal,
  spawnProcess = spawn,
  onSpawn,
  onReady,
  onExit
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError(signal.reason));
      return;
    }

    let child;
    try {
      child = spawnProcess(codexPath, ["app-server", "--stdio"], {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    let exited = false;
    let protocolBuffer = "";
    let protocolBytes = 0;
    let stderr = "";
    let requestId = 0;
    let threadId = null;
    let resumed = false;
    let turnId = null;
    let turnActive = false;
    let forceKillTimer = null;
    const pendingRequests = new Map();
    const agentMessages = [];

    const notifyExit = () => {
      if (exited) return;
      exited = true;
      try {
        onExit?.(child);
      } catch {
        // Lifecycle observers must not change the turn outcome.
      }
    };

    const terminateChild = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        return;
      }
      if (!forceKillTimer) {
        forceKillTimer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // The app-server process exited during the graceful window.
          }
        }, normalizePositiveInteger(killGraceMs, DEFAULT_KILL_GRACE_MS));
        forceKillTimer.unref?.();
      }
    };

    const rejectPendingRequests = (error) => {
      for (const pending of pendingRequests.values()) pending.reject(error);
      pendingRequests.clear();
    };

    const finish = (error, result = null) => {
      if (settled) return;
      settled = true;
      turnActive = false;
      clearTimeout(timeoutTimer);
      signal?.removeEventListener("abort", abortTurn);
      const terminalError = error || null;
      rejectPendingRequests(terminalError || createTurnInactiveError());
      terminateChild();
      if (terminalError) reject(terminalError);
      else resolve({ ...result, stderr });
    };

    const send = (message) => {
      if (settled || !child.stdin?.writable || child.stdin.destroyed) {
        throw createProtocolError("Codex app-server stdin is not writable");
      }
      child.stdin.write(`${JSON.stringify(message)}\n`);
    };

    const request = (method, params) => {
      if (settled) return Promise.reject(createTurnInactiveError());
      const id = ++requestId;
      return new Promise((requestResolve, requestReject) => {
        pendingRequests.set(id, { method, resolve: requestResolve, reject: requestReject });
        try {
          send({ method, id, params });
        } catch (error) {
          pendingRequests.delete(id);
          requestReject(error);
        }
      });
    };

    const recordAgentMessage = (item) => {
      if (item?.type !== "agentMessage" || typeof item.text !== "string") return;
      agentMessages.push({
        text: item.text,
        phase: item.phase || null
      });
    };

    const selectFinalResponse = (turn) => {
      const turnMessages = Array.isArray(turn?.items)
        ? turn.items.filter((item) => item?.type === "agentMessage" && typeof item.text === "string")
        : [];
      const candidates = turnMessages.length > 0 ? turnMessages : agentMessages;
      const final = [...candidates].reverse().find((item) => item.phase === "final_answer")
        || [...candidates].reverse().find((item) => item.phase !== "commentary");
      return String(final?.text || "");
    };

    const handleNotification = (message) => {
      if (message.method === "item/completed") {
        recordAgentMessage(message.params?.item);
        return;
      }
      if (message.method !== "turn/completed") return;
      const completedTurn = message.params?.turn;
      if (threadId && message.params?.threadId && message.params.threadId !== threadId) return;
      if (turnId && completedTurn?.id && completedTurn.id !== turnId) return;
      turnActive = false;
      const status = completedTurn?.status;
      if (status !== "completed") {
        const error = new Error(
          completedTurn?.error?.message
          || `Codex app-server turn ended with status ${status || "unknown"}`
        );
        error.code = status === "interrupted" ? "CODEX_TURN_INTERRUPTED" : "CODEX_TURN_FAILED";
        error.turnStatus = status || null;
        finish(error);
        return;
      }
      finish(null, {
        finalResponse: selectFinalResponse(completedTurn),
        threadId: message.params?.threadId || threadId,
        turnId: completedTurn?.id || turnId,
        status,
        resumed
      });
    };

    const handleProtocolMessage = (message) => {
      if (message && Object.hasOwn(message, "id")) {
        const pending = pendingRequests.get(message.id);
        if (!pending) return;
        pendingRequests.delete(message.id);
        if (message.error) {
          const error = createProtocolError(
            message.error.message || `${pending.method} failed`,
            message.error.code
          );
          pending.reject(error);
        } else {
          pending.resolve(message.result);
        }
        return;
      }
      if (message?.method) handleNotification(message);
    };

    const consumeProtocolChunk = (chunk) => {
      const text = String(chunk || "");
      protocolBytes += Buffer.byteLength(text);
      if (protocolBytes > normalizePositiveInteger(maxProtocolBytes, DEFAULT_MAX_PROTOCOL_BYTES)) {
        const error = createProtocolError("Codex app-server protocol output exceeded its limit");
        error.code = "CODEX_APP_SERVER_OUTPUT_LIMIT";
        finish(error);
        return;
      }
      protocolBuffer += text;
      let newlineIndex = protocolBuffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = protocolBuffer.slice(0, newlineIndex).trim();
        protocolBuffer = protocolBuffer.slice(newlineIndex + 1);
        if (line) {
          try {
            handleProtocolMessage(JSON.parse(line));
          } catch (error) {
            const protocolError = createProtocolError(`Invalid Codex app-server JSON: ${error.message}`);
            protocolError.code = "CODEX_APP_SERVER_INVALID_JSON";
            finish(protocolError);
            return;
          }
        }
        newlineIndex = protocolBuffer.indexOf("\n");
      }
    };

    const steer = async (input) => {
      if (!turnActive || !threadId || !turnId) throw createTurnInactiveError();
      const result = await request("turn/steer", {
        threadId,
        expectedTurnId: turnId,
        input: normalizeUserInput(input)
      });
      return {
        threadId,
        turnId: result?.turnId || turnId
      };
    };

    const interrupt = async () => {
      if (!turnActive || !threadId || !turnId) return false;
      await request("turn/interrupt", { threadId, turnId });
      return true;
    };

    const abortTurn = () => {
      const error = createAbortError(signal?.reason);
      if (turnActive && threadId && turnId) {
        void request("turn/interrupt", { threadId, turnId }).catch(() => undefined);
      }
      finish(error);
    };

    const timeoutTimer = setTimeout(() => {
      const error = new Error(`Codex app-server turn timed out after ${timeoutMs}ms`);
      error.code = "CODEX_TURN_TIMEOUT";
      if (turnActive && threadId && turnId) {
        void request("turn/interrupt", { threadId, turnId }).catch(() => undefined);
      }
      finish(error);
    }, normalizePositiveInteger(timeoutMs, DEFAULT_TIMEOUT_MS));
    timeoutTimer.unref?.();

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", consumeProtocolChunk);
    child.stderr?.on("data", (chunk) => {
      stderr = (stderr + String(chunk || "")).slice(-normalizePositiveInteger(maxStderrBytes, DEFAULT_MAX_STDERR_BYTES));
    });
    child.stdin?.on("error", (error) => {
      if (error?.code === "EPIPE" || error?.code === "ERR_STREAM_DESTROYED" || settled) return;
      finish(error);
    });
    child.once("error", (error) => {
      notifyExit();
      finish(error);
    });
    child.once("close", (code, exitSignal) => {
      if (forceKillTimer) clearTimeout(forceKillTimer);
      notifyExit();
      if (settled) return;
      const detail = stderr.trim().slice(-4_000);
      const error = new Error(
        `Codex app-server exited before turn completion (${code ?? exitSignal ?? "unknown"})${detail ? `: ${detail}` : ""}`
      );
      error.code = "CODEX_APP_SERVER_EXIT";
      error.exitCode = code;
      error.signal = exitSignal;
      finish(error);
    });

    signal?.addEventListener("abort", abortTurn, { once: true });
    try {
      onSpawn?.(child);
    } catch {
      // Lifecycle observers must not change the turn outcome.
    }

    void (async () => {
      try {
        await request("initialize", {
          clientInfo: {
            name: "codex_qq_bot",
            title: "Codex QQ Bot",
            version: "1"
          }
        });
        send({ method: "initialized", params: {} });
        let thread;
        const existingThreadId = String(requestedThreadId || "").trim();
        if (existingThreadId) {
          try {
            thread = await request("thread/resume", {
              threadId: existingThreadId,
              cwd,
              model: model || null,
              approvalPolicy: "never",
              sandbox: "read-only",
              config: reasoningEffort ? { model_reasoning_effort: reasoningEffort } : null
            });
            resumed = true;
          } catch {
            thread = null;
          }
        }
        if (!thread) {
          thread = await request("thread/start", {
            cwd,
            model: model || null,
            approvalPolicy: "never",
            sandbox: "read-only",
            ephemeral: Boolean(ephemeral),
            config: reasoningEffort ? { model_reasoning_effort: reasoningEffort } : null
          });
          resumed = false;
        }
        threadId = thread?.thread?.id || null;
        if (!threadId) throw createProtocolError("Codex app-server did not return a thread id");
        const turnInputText = resumed && resumePrompt != null ? String(resumePrompt) : String(prompt || "");
        const turn = await request("turn/start", {
          threadId,
          input: normalizeUserInput([
            { type: "text", text: turnInputText },
            ...normalizeImagePaths(imagePaths)
          ]),
          cwd,
          model: model || null,
          effort: reasoningEffort || null
        });
        turnId = turn?.turn?.id || null;
        if (!turnId) throw createProtocolError("Codex app-server did not return a turn id");
        turnActive = true;
        try {
          onReady?.({ child, threadId, turnId, steer, interrupt, resumed });
        } catch {
          // Lifecycle observers must not change the turn outcome.
        }
      } catch (error) {
        finish(error);
      }
    })();
  });
}

function normalizeUserInput(value) {
  const entries = Array.isArray(value)
    ? value
    : [{ type: "text", text: String(value || "") }];
  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      if (entry.type === "localImage" && entry.path) {
        return { type: "localImage", path: String(entry.path), detail: entry.detail || null };
      }
      return { type: "text", text: String(entry.text || "") };
    })
    .filter((entry) => entry.type !== "text" || entry.text.length > 0);
}

function normalizeImagePaths(paths) {
  return [...new Set((Array.isArray(paths) ? paths : []).map((path) => String(path || "").trim()).filter(Boolean))]
    .map((path) => ({ type: "localImage", path }));
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function createProtocolError(message, protocolCode = null) {
  const error = new Error(message);
  error.code = "CODEX_APP_SERVER_PROTOCOL";
  error.protocolCode = protocolCode;
  return error;
}

function createTurnInactiveError() {
  const error = new Error("Codex app-server turn is no longer active");
  error.code = "CODEX_TURN_NOT_ACTIVE";
  return error;
}

function createAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(reason == null ? "Codex app-server turn aborted" : String(reason));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}
