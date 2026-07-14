export function createConcurrencyLimiter(limit = 1, { maxPending = Number.POSITIVE_INFINITY } = {}) {
  const maxConcurrent = normalizePositiveInteger(limit, 1);
  const pendingLimit = normalizePendingLimit(maxPending);
  const queue = [];
  let queueHead = 0;
  let pendingCount = 0;
  let tombstoneCount = 0;
  let active = 0;
  let closed = false;
  let closeReason = null;

  function drain() {
    while (!closed && active < maxConcurrent && pendingCount > 0) {
      const next = takeNextPending();
      if (!next) break;
      next.state = "active";
      pendingCount -= 1;
      next.signal?.removeEventListener("abort", next.abortQueued);
      active += 1;
      Promise.resolve()
        .then(next.operation)
        .then(next.resolve, next.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
    compactQueue();
  }

  function takeNextPending() {
    while (queueHead < queue.length) {
      const entry = queue[queueHead++];
      if (entry?.state === "pending") return entry;
      if (entry) tombstoneCount = Math.max(0, tombstoneCount - 1);
    }
    return null;
  }

  function compactQueue(force = false) {
    if (queueHead === queue.length) {
      queue.length = 0;
      queueHead = 0;
      tombstoneCount = 0;
    } else if (force || (tombstoneCount >= 64 && tombstoneCount > pendingCount)) {
      const liveEntries = queue.slice(queueHead).filter((entry) => entry?.state === "pending");
      queue.length = 0;
      queue.push(...liveEntries);
      queueHead = 0;
      tombstoneCount = 0;
    } else if (queueHead >= 1024 && queueHead * 2 >= queue.length) {
      queue.splice(0, queueHead);
      queueHead = 0;
    }
  }

  function rejectQueued(entry, error, { compact = true } = {}) {
    if (entry.state !== "pending") return false;
    entry.state = "rejected";
    pendingCount -= 1;
    tombstoneCount += 1;
    entry.signal?.removeEventListener("abort", entry.abortQueued);
    entry.reject(error);
    if (compact) compactQueue();
    return true;
  }

  return {
    run(operation, { signal } = {}) {
      if (typeof operation !== "function") {
        return Promise.reject(new TypeError("operation must be a function"));
      }
      if (closed) return Promise.reject(closeReason || createLimiterError("LIMITER_CLOSED", "Concurrency limiter is closed"));
      if (signal?.aborted) return Promise.reject(createAbortError(signal.reason));
      if (active >= maxConcurrent && pendingCount >= pendingLimit) {
        return Promise.reject(createLimiterError("LIMITER_QUEUE_FULL", `Concurrency queue is full (${pendingLimit} pending)`));
      }

      return new Promise((resolve, reject) => {
        const entry = {
          operation,
          resolve,
          reject,
          signal,
          state: "pending",
          abortQueued: null
        };
        entry.abortQueued = () => rejectQueued(entry, createAbortError(signal?.reason));
        if (signal) signal.addEventListener("abort", entry.abortQueued, { once: true });
        queue.push(entry);
        pendingCount += 1;
        drain();
      });
    },

    close(reason = createLimiterError("LIMITER_CLOSED", "Concurrency limiter is closed")) {
      if (closed) return false;
      closed = true;
      closeReason = normalizeCloseReason(reason);
      for (let index = queueHead; index < queue.length; index += 1) {
        rejectQueued(queue[index], closeReason, { compact: false });
      }
      queueHead = queue.length;
      compactQueue();
      return true;
    },

    snapshot() {
      return {
        active,
        pending: pendingCount,
        buffered: Math.max(0, queue.length - queueHead),
        maxConcurrent,
        maxPending: pendingLimit,
        closed
      };
    }
  };
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizePendingLimit(value) {
  if (value === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Number.POSITIVE_INFINITY;
}

function normalizeCloseReason(reason) {
  if (reason instanceof Error) return reason;
  return createLimiterError("LIMITER_CLOSED", String(reason || "Concurrency limiter is closed"));
}

function createLimiterError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = code === "LIMITER_QUEUE_FULL" ? 429 : 503;
  return error;
}

function createAbortError(reason) {
  if (reason instanceof Error) return reason;
  const error = new Error(reason == null ? "Operation aborted while queued" : String(reason));
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}
