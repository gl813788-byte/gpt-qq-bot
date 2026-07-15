const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const diagnosticPattern = /^(?:error|warning|warn|fatal|caused by|unexpected status|access blocked|reconnecting)\b|\b(?:HTTP\s*[45]\d{2}|403 Forbidden|Cloudflare|timed out|ECONN\w*|ENOTFOUND|EAI_AGAIN)\b/i;

export function summarizeProcessDiagnostics({ stderr = "", stdout = "", maxLines = 10, maxLineLength = 480 } = {}) {
  const rawLines = `${stderr || ""}\n${stdout || ""}`
    .replace(ansiPattern, "")
    .split(/\r?\n/g)
    .map((line) => line.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const diagnosticLines = rawLines.filter((line) => diagnosticPattern.test(line));
  const selectedSource = diagnosticLines;
  const uniqueLines = [];
  for (const line of selectedSource) {
    const compact = line.length > maxLineLength ? `${line.slice(0, maxLineLength - 1)}…` : line;
    if (!uniqueLines.includes(compact)) uniqueLines.push(compact);
  }
  const lines = uniqueLines.slice(-Math.max(1, Number(maxLines) || 10));
  const preferredSummary = [...lines].reverse().find((line) => !/^ERROR:\s*Reconnecting/i.test(line)) || lines.at(-1) || "";
  return {
    summary: preferredSummary,
    lines,
    omittedLineCount: Math.max(0, rawLines.length - lines.length)
  };
}
