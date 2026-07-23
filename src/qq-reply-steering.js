export function createQqReplySteeringCoordinator({
  delayMs = 120,
  maxDelayMs = 2_500,
  getActiveGeneration,
  getPendingEntries,
  buildSteeringInput,
  consumeEntries,
  onResult
} = {}) {
  const scheduled = new Map();
  let closed = false;

  const report = (result) => {
    try {
      onResult?.(result);
    } catch {
      // Diagnostics must not alter reply delivery.
    }
    return result;
  };

  const run = async (scopeId) => {
    const generation = getActiveGeneration?.(scopeId) || null;
    if (!generation || typeof generation.steer !== "function") {
      return report({ ok: false, scopeId, reason: "no_steerable_generation", consumedCount: 0 });
    }
    const entries = [...(getPendingEntries?.(scopeId) || [])];
    if (entries.length === 0) {
      return report({ ok: false, scopeId, reason: "no_pending_entries", consumedCount: 0 });
    }
    try {
      const input = await buildSteeringInput?.(entries, generation);
      if (!input || (Array.isArray(input) && input.length === 0)) {
        return report({ ok: false, scopeId, reason: "empty_steering_input", consumedCount: 0 });
      }
      const currentGeneration = getActiveGeneration?.(scopeId) || null;
      if (!currentGeneration || currentGeneration.id !== generation.id || currentGeneration.steer !== generation.steer) {
        return report({ ok: false, scopeId, reason: "generation_changed", consumedCount: 0 });
      }
      const steered = await generation.steer(input);
      const consumedCount = Number(consumeEntries?.(scopeId, entries, generation, steered) || 0);
      return report({
        ok: true,
        scopeId,
        generationId: generation.id,
        threadId: steered?.threadId || generation.threadId || null,
        turnId: steered?.turnId || generation.turnId || null,
        queuedCount: entries.length,
        consumedCount
      });
    } catch (error) {
      return report({
        ok: false,
        scopeId,
        generationId: generation.id,
        reason: error?.code || "steer_failed",
        error,
        consumedCount: 0
      });
    }
  };

  const schedule = (scopeId) => {
    const key = String(scopeId || "").trim();
    if (closed || !key) {
      return Promise.resolve({ ok: false, scopeId: key, reason: closed ? "closed" : "missing_scope", consumedCount: 0 });
    }
    const existing = scheduled.get(key);
    if (existing) {
      if (existing.timer) {
        clearTimeout(existing.timer);
        const elapsed = Date.now() - existing.startedAt;
        const remaining = Math.max(0, normalizeMaxDelay(maxDelayMs) - elapsed);
        existing.timer = setTimeout(existing.run, Math.min(normalizeDelay(delayMs), remaining));
      }
      return existing.promise;
    }

    let resolveScheduled;
    const entry = {
      timer: null,
      startedAt: Date.now(),
      run: null,
      resolve: null,
      promise: null
    };
    const promise = new Promise((resolve) => {
      resolveScheduled = resolve;
      entry.run = () => {
        entry.timer = null;
        void run(key).then(resolve);
      };
      entry.timer = setTimeout(entry.run, normalizeDelay(delayMs));
    }).then((result) => {
      const current = scheduled.get(key);
      if (current?.promise === promise) scheduled.delete(key);
      if (result.ok && !closed && (getPendingEntries?.(key) || []).length > 0) {
        const generation = getActiveGeneration?.(key);
        if (generation && typeof generation.steer === "function") void schedule(key);
      }
      return result;
    });
    entry.promise = promise;
    entry.resolve = resolveScheduled;
    scheduled.set(key, entry);
    return promise;
  };

  return {
    schedule,

    cancel(scopeId) {
      const key = String(scopeId || "").trim();
      const entry = scheduled.get(key);
      if (!entry) return false;
      if (entry.timer) clearTimeout(entry.timer);
      scheduled.delete(key);
      entry.resolve?.({ ok: false, scopeId: key, reason: "cancelled", consumedCount: 0 });
      return true;
    },

    close() {
      if (closed) return false;
      closed = true;
      for (const [scopeId, entry] of scheduled.entries()) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.resolve?.({ ok: false, scopeId, reason: "closed", consumedCount: 0 });
      }
      scheduled.clear();
      return true;
    },

    snapshot() {
      return { scheduled: scheduled.size, closed };
    }
  };
}

function normalizeDelay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(2_000, Math.floor(number))) : 120;
}

function normalizeMaxDelay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(100, Math.min(10_000, Math.floor(number))) : 2_500;
}
