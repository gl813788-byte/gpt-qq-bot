export const QQ_AUTONOMOUS_PROACTIVE_KINDS = Object.freeze({
  ORDINARY_GROUP_REPLY: "ordinary_group_reply",
  COLD_GROUP_TOPIC: "cold_group_topic",
  COLD_GROUP_CHATTER: "cold_group_chatter",
  PRIVATE_CONTACT: "private_contact"
});

const supportedKinds = new Set(Object.values(QQ_AUTONOMOUS_PROACTIVE_KINDS));

function compactText(value, maxLength = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function createQqTwoModelProactiveApproval({
  kind,
  provider = "",
  model = "",
  task = "",
  interest = 0,
  reason = "",
  durationMs = 0,
  temperature = null
} = {}) {
  if (!supportedKinds.has(kind)) {
    throw new TypeError(`Unsupported QQ autonomous proactive kind: ${kind || "empty"}`);
  }
  return {
    autonomous: true,
    proactiveKind: kind,
    modelPipeline: {
      contract: "interest_gate_then_main_content",
      interestGate: {
        required: true,
        approved: true,
        task: compactText(task, 120),
        provider: compactText(provider, 120),
        model: compactText(model, 240),
        interest: Math.max(0, Math.min(100, Number(interest) || 0)),
        reason: compactText(reason),
        durationMs: Math.max(0, Number(durationMs) || 0),
        temperature: Number.isFinite(Number(temperature)) ? Number(temperature) : null
      },
      mainContent: {
        required: true,
        role: "conversation_content"
      }
    }
  };
}

export function validateQqTwoModelProactiveDecision(decision = {}, { forceRequired = false } = {}) {
  const required = forceRequired || decision?.autonomous === true;
  if (!required) return { ok: true, required: false, kind: null, reason: "not autonomous" };

  const kind = String(decision?.proactiveKind || "");
  const pipeline = decision?.modelPipeline;
  const interestGate = pipeline?.interestGate;
  const mainContent = pipeline?.mainContent;
  const valid = decision?.ok === true
    && decision?.proactive === true
    && supportedKinds.has(kind)
    && pipeline?.contract === "interest_gate_then_main_content"
    && interestGate?.required === true
    && interestGate?.approved === true
    && mainContent?.required === true
    && mainContent?.role === "conversation_content";

  return valid
    ? { ok: true, required: true, kind, reason: "two-model approval present" }
    : {
      ok: false,
      required: true,
      kind: kind || null,
      reason: "autonomous QQ chat requires an approved interest gate before main-model generation"
    };
}
