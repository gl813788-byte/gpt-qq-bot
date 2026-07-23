import { join } from "node:path";

export function createRuntimePaths({
  projectDir,
  env = process.env,
  homeDir = env.HOME || ""
}) {
  const dataDir = join(projectDir, "data");
  const codexHomeDir = join(homeDir, ".codex");
  const codexTmpDir = join(projectDir, "runtime", "replies");
  return {
    projectDir,
    dataDir,
    codexHomeDir,
    codexWorkspaceDir: join(projectDir, "workspaces", "codex-cli"),
    codexTmpDir,
    logFilePath: env.CODEX_REMOTE_CONTACT_LOG_FILE || join(projectDir, "runtime", "logs", "hub.jsonl"),
    qqStickerDir: env.CODEX_REMOTE_CONTACT_QQ_STICKER_DIR || join(projectDir, "data", "qq-stickers"),
    qqOutputImagesDir: env.CODEX_REMOTE_CONTACT_QQ_OUTPUT_IMAGE_DIR || join(projectDir, "runtime", "qq-output-images"),
    qqTaskWorkspacesDir: env.CODEX_REMOTE_CONTACT_QQ_TASK_WORKSPACE_DIR || join(projectDir, "runtime", "qq-task-workspaces"),
    codexSessionsDir: join(codexHomeDir, "sessions"),
    codexArchivedSessionsDir: join(codexHomeDir, "archived_sessions"),
    codexLogsDbPath: join(codexHomeDir, "logs_2.sqlite"),
    codexStateDbPath: join(codexHomeDir, "state_5.sqlite"),
    codexDesktopCacheDir: join(homeDir, "Library", "Application Support", "Codex", "Cache", "Cache_Data"),
    settingsPath: join(dataDir, "settings.json"),
    qqMemoryPath: join(dataDir, "qq-memory.json"),
    qqPublicMemoryPath: join(dataDir, "qq-public-memory.json"),
    qqKnowledgeBasePath: join(dataDir, "qq-knowledge-base.json"),
    qqRequestsPath: join(dataDir, "qq-requests.json"),
    qqPersonasPath: join(dataDir, "qq-personas.json"),
    qqSelfPersonaPath: join(dataDir, "qq-self-persona.json"),
    qqConversationMemoryPath: join(dataDir, "qq-conversation-memory.json"),
    qqCodexSessionsPath: join(dataDir, "qq-codex-sessions.json"),
    qqStickerLabelsPath: join(dataDir, "qq-sticker-labels.json"),
    qqStickerInventoryPath: join(dataDir, "qq-sticker-inventory.json"),
    unifiedMemoryPath: join(dataDir, "unified-memory.json"),
    assistantProfilePath: env.CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH || ""
  };
}
