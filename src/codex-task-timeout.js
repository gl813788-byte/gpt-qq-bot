export const CODEX_TASK_TYPES = Object.freeze({
  QQ_REPLY: "qq-reply",
  QQ_VISION_REPLY: "qq-vision-reply",
  QQ_CONTEXT_SUMMARY: "qq-context-summary",
  QQ_SELF_PERSONA: "qq-self-persona",
  QQ_FILE_TASK: "qq-file-task",
  QQ_IMAGE_GENERATION: "qq-image-generation"
});

export const CODEX_TASK_TIMEOUT_DEFAULTS = Object.freeze({
  [CODEX_TASK_TYPES.QQ_REPLY]: 120_000,
  [CODEX_TASK_TYPES.QQ_VISION_REPLY]: 180_000,
  [CODEX_TASK_TYPES.QQ_CONTEXT_SUMMARY]: 90_000,
  [CODEX_TASK_TYPES.QQ_SELF_PERSONA]: 90_000,
  [CODEX_TASK_TYPES.QQ_FILE_TASK]: 300_000,
  [CODEX_TASK_TYPES.QQ_IMAGE_GENERATION]: 600_000
});

export function getCodexTaskTimeoutMs(timeouts, taskType) {
  const fallback = CODEX_TASK_TIMEOUT_DEFAULTS[CODEX_TASK_TYPES.QQ_REPLY];
  const defaultValue = CODEX_TASK_TIMEOUT_DEFAULTS[taskType] || fallback;
  const configured = Number(timeouts?.[taskType]);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : defaultValue;
}
