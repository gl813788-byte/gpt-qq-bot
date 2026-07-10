import { mkdir, open, rename, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const fileOperations = new Map();

export function serializeFileOperation(filePath, operation) {
  if (typeof operation !== "function") {
    throw new TypeError("operation must be a function");
  }

  const key = String(filePath);
  const previous = fileOperations.get(key) || Promise.resolve();
  const task = previous
    .catch(() => undefined)
    .then(operation);
  const trackedTask = task.catch(() => undefined);

  fileOperations.set(key, trackedTask);
  void trackedTask.finally(() => {
    if (fileOperations.get(key) === trackedTask) {
      fileOperations.delete(key);
    }
  });

  return task;
}

export async function writeJsonAtomically(filePath, value, options = {}) {
  return writeTextAtomically(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

export async function writeTextAtomically(filePath, content, { mode = 0o600 } = {}) {
  const directory = dirname(filePath);
  const temporaryPath = join(
    directory,
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  let handle = null;

  await mkdir(directory, { recursive: true });
  try {
    handle = await open(temporaryPath, "w", mode);
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporaryPath, filePath);
  } finally {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
  }
}
