export function createCoalescingWriter(writeLatest, {
  delayMs = 100,
  setTimer = setTimeout,
  clearTimer = clearTimeout
} = {}) {
  if (typeof writeLatest !== "function") throw new TypeError("writeLatest must be a function");
  const delay = Math.max(0, Math.floor(Number(delayMs) || 0));
  let requestedVersion = 0;
  let completedVersion = 0;
  let timer = null;
  let inFlight = null;
  let closed = false;
  let closePromise = null;
  let lastError = null;
  const waiters = [];

  function schedule() {
    if (closed) return Promise.reject(createClosedError());
    const version = ++requestedVersion;
    const promise = new Promise((resolve, reject) => waiters.push({ version, resolve, reject }));
    arm();
    return promise;
  }

  function arm() {
    if (timer || inFlight || completedVersion >= requestedVersion) return;
    timer = setTimer(() => {
      timer = null;
      void drain();
    }, delay);
  }

  function settleWaiters(version, error) {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (waiter.version > version) continue;
      waiters.splice(index, 1);
      if (error) waiter.reject(error);
      else waiter.resolve(version);
    }
  }

  function drain() {
    if (inFlight) return inFlight;
    if (timer) {
      clearTimer(timer);
      timer = null;
    }
    if (completedVersion >= requestedVersion) return Promise.resolve();
    const targetVersion = requestedVersion;
    const write = Promise.resolve().then(() => writeLatest(targetVersion));
    inFlight = write
      .then(() => {
        lastError = null;
        completedVersion = Math.max(completedVersion, targetVersion);
        settleWaiters(targetVersion, null);
      }, (error) => {
        lastError = error;
        completedVersion = Math.max(completedVersion, targetVersion);
        settleWaiters(targetVersion, error);
      })
      .finally(() => {
        inFlight = null;
        if (completedVersion < requestedVersion) arm();
      });
    return inFlight;
  }

  async function flush() {
    while (completedVersion < requestedVersion || inFlight || timer) {
      await drain();
      if (inFlight) await inFlight;
    }
    if (lastError) throw lastError;
  }

  function close() {
    if (closePromise) return closePromise;
    closed = true;
    closePromise = flush();
    return closePromise;
  }

  return {
    schedule,
    flush,
    close,
    snapshot: () => ({
      requestedVersion,
      completedVersion,
      pending: waiters.length,
      writing: Boolean(inFlight),
      scheduled: Boolean(timer),
      closed,
      failed: Boolean(lastError)
    })
  };
}

function createClosedError() {
  const error = new Error("Coalescing writer is closed");
  error.code = "WRITER_CLOSED";
  return error;
}
