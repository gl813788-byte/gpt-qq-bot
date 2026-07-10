export function createConcurrencyLimiter(limit = 1) {
  const maxConcurrent = Math.max(1, Math.floor(Number(limit) || 1));
  const pending = [];
  let active = 0;

  function drain() {
    while (active < maxConcurrent && pending.length > 0) {
      const next = pending.shift();
      active += 1;
      Promise.resolve()
        .then(next.operation)
        .then(next.resolve, next.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  }

  return {
    run(operation) {
      if (typeof operation !== "function") {
        return Promise.reject(new TypeError("operation must be a function"));
      }
      return new Promise((resolve, reject) => {
        pending.push({ operation, resolve, reject });
        drain();
      });
    },

    snapshot() {
      return { active, pending: pending.length, maxConcurrent };
    }
  };
}
