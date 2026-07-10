let nextLeaseId = 0;

export function createScopedReplyScheduler() {
  const active = new Map();

  return {
    start(scopeId, metadata = {}) {
      const key = String(scopeId || "").trim();
      if (!key || active.has(key)) return null;
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

    finish(lease) {
      if (!lease?.scopeId || active.get(lease.scopeId) !== lease) return false;
      active.delete(lease.scopeId);
      return true;
    }
  };
}
