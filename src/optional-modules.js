import { pathToFileURL } from "node:url";

const expectedOptionalModuleErrors = new Set([
  "ERR_MODULE_NOT_FOUND",
  "ERR_INVALID_FILE_URL_PATH",
  "ERR_UNSUPPORTED_ESM_URL_SCHEME"
]);

export async function importOptionalModule(label, candidates, { logger } = {}) {
  for (const candidate of candidates.filter(Boolean)) {
    try {
      const specifier = candidate.startsWith("file:") || candidate.startsWith(".")
        ? candidate
        : pathToFileURL(candidate).href;
      return await import(specifier);
    } catch (error) {
      if (error?.code && !expectedOptionalModuleErrors.has(error.code)) {
        logger?.warn?.(`${label} failed to load`, { candidate, error }, "system");
      }
    }
  }
  logger?.warn?.(`${label} not installed; continuing with built-in fallback.`, {}, "system");
  return null;
}
