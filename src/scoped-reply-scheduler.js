let nextLeaseId = 0;

export function createScopedReplyScheduler() {
  const active = new Map();
  let closed = false;

  return {
    start(scopeId, metadata = {}) {
      const key = String(scopeId || "").trim();
      if (closed || !key || active.has(key)) return null;
      const controller = new AbortController();
      const lease = {
        id: `reply-${++nextLeaseId}`,
        scopeId: key,
        startedAt: new Date().toISOString(),
        ...metadata,
        cancelled: false,
        signal: controller.signal,
        abortController: controller
      };
      active.set(key, lease);
      return lease;
    },

    get(scopeId) {
      return active.get(String(scopeId || "").trim()) || null;
    },

    cancel(scopeId) {
      const lease = active.get(String(scopeId || "").trim());
      if (!lease) return null;
      lease.cancelled = true;
      lease.abortController?.abort();
      return lease;
    },

    cancelAll(reason) {
      const cancelled = [];
      for (const lease of active.values()) {
        lease.cancelled = true;
        lease.abortController?.abort(reason);
        cancelled.push(lease);
      }
      active.clear();
      return cancelled;
    },

    close(reason) {
      if (closed) return false;
      closed = true;
      this.cancelAll(reason);
      return true;
    },

    finish(lease) {
      if (!lease?.scopeId || active.get(lease.scopeId) !== lease) return false;
      active.delete(lease.scopeId);
      return true;
    },

    snapshot() {
      return { active: active.size, closed };
    }
  };
}
