const botNamePattern = /\b(?:bot|gpt|assistant|codex|chatgpt)\b|机器人|助手|小助手|这个ai|这ai|这个 AI|这 AI/i;
const directInvitePattern = /(?:你怎么看|你觉得|你会|你能|你来|出来说|出来看看|评价一下|锐评一下|帮忙看|帮我看|查一下|搜一下|联网查|总结一下|看记录|查记录|解释一下|分析一下)/i;
const shortNoisePattern = /^(?:[？?!.。！？~…\s]+|哈+|哈哈哈*|笑死|草+|6+|666+|哦+|嗯+|啊+|呃+|好+|行+|对+|不是|没事|牛+|nb|牛逼|卧槽|我去|乐|确实|离谱|绷|寄)$/i;
const reactionOnlyPattern = /^(?:[哈啊哦嗯呃草wW]+|[？?！!。,.，、\s]+|[\u{1f300}-\u{1faff}]+)$/u;
const imageIntentPattern = /(?:看|看看|看下|识别|认|评价|锐评|这图|图片|截图|表情包|什么梗|什么意思|像什么|这是啥|这是什么)/i;
const contextQuestionPattern = /(?:刚刚|刚才|前面|上面|之前|上下文|聊天记录|谁说的|在聊什么|什么情况|咋回事|怎么回事)/i;
const questionShapePattern = /(?:怎么|咋|为什么|如何|能不能|可以吗|有没有|是不是|对不对|哪[个些]|多少|咋修|怎么修|怎么弄|咋弄|吗|嘛|么)|[?？]$/i;
const defaultOpenRouterBaseUrl = "https://openrouter.ai/api/v1";
const defaultOpenRouterJudgeModel = "nousresearch/hermes-3-llama-3.1-405b:free";
const proactiveJudgeFinalMinInterest = 20;
const defaultJudgeEveryMessages = 20;
const defaultJudgeEveryMinutes = 5;
const minuteMs = 60 * 1000;

const likedTopicRules = [
  {
    label: "QQ bot 触发/权限/行为",
    weight: 7,
    pattern: /(?:bot|机器人|助手|assistant|gpt|艾特|@|主动回复|主动响应|触发|兴趣分|白名单|群模式|指令|菜单|权限|ban|unban|模型|记忆|联网|聊天记录|onebot|napcat|ncc)/i
  },
  {
    label: "AI / Codex / 编程排障",
    weight: 6,
    pattern: /(?:AI|人工智能|大模型|LLM|GPT|ChatGPT|OpenAI|Codex|代码|编程|程序|脚本|报错|bug|接口|API|Node|Python|JavaScript|Linux|命令行|终端|服务器|部署|配置|prompt|提示词)/i
  },
  {
    label: "图片识别 / 表情包 / 梗图",
    weight: 5,
    pattern: /(?:图片|截图|表情包|梗图|什么梗|这图|看图|识别|P图|画图|生成图|海报|贴纸|sticker)/i
  },
  {
    label: "本机自动化 / 文件任务",
    weight: 5,
    pattern: /(?:文件|目录|路径|截图|发图|发文件|保存|删除|清理|运行|启动|重启|日志|状态|配置|服务|进程|screen|curl|npm|git)/i
  },
  {
    label: "诈骗 / 安全 / 风险判断",
    weight: 4,
    pattern: /(?:诈骗|盗号|钓鱼|洗钱|病毒|木马|封号|风控|隐私|验证码|转账|链接|安全|风险|骗|可疑)/i
  }
];

export function scoreQqTextInterest(text, event = {}, helpers = {}) {
  return evaluateQqProactiveInterest(text, event, helpers).score;
}

export async function shouldProactivelyReplyToQq(event = {}, state = {}, helpers = {}) {
  if (!event.groupId) return { ok: false, reason: "not a group message" };
  if (!state.proactive?.enabled) return { ok: false, reason: "proactive disabled" };
  if (event.type === "group_at" || event.hasSelfAtSegment || event.isReplyToSelf || event.replyContext?.isSelf) {
    return { ok: false, reason: "explicit mention is handled by mention-only route" };
  }

  const proactiveState = state.proactive;
  const groupId = String(event.groupId);
  const now = typeof helpers.now === "function" ? helpers.now : Date.now;
  const triggerMode = helpers.triggerMode === "time" ? "time" : "message";
  const judgeEveryMessages = normalizeJudgeEveryMessages(state.proactive?.judgeEveryMessages);
  const judgeEveryMinutes = normalizeJudgeEveryMinutes(state.proactive?.judgeEveryMinutes);
  ensureProactiveCycleState(proactiveState);

  const previousCount = getProactiveMessageCount(proactiveState, groupId);
  const currentCount = triggerMode === "message" && helpers.countMessage !== false
    ? incrementProactiveMessageCount(proactiveState, groupId)
    : previousCount;
  if (previousCount === 0 && currentCount > 0) {
    proactiveState.lastJudgeAtByGroupId[groupId] = now();
  }

  if (proactiveState.judgeInFlightByGroupId[groupId]) {
    return {
      ok: false,
      reason: "proactive judge already in flight",
      messageCount: currentCount,
      judgeEveryMessages,
      judgeEveryMinutes,
      triggerMode
    };
  }

  const lastJudgeAt = Number(proactiveState.lastJudgeAtByGroupId[groupId] || now());
  const elapsedMs = Math.max(0, now() - lastJudgeAt);
  const messageTriggerDue = currentCount >= judgeEveryMessages;
  const timeTriggerDue = judgeEveryMinutes > 0 && currentCount > 0 && elapsedMs >= judgeEveryMinutes * minuteMs;
  const triggerDue = triggerMode === "time" ? timeTriggerDue : messageTriggerDue;
  if (!triggerDue) {
    return {
      ok: false,
      reason: triggerMode === "time"
        ? (currentCount > 0 ? "waiting for proactive judge minute interval" : "no new proactive messages to inspect")
        : "waiting for proactive judge message interval",
      messageCount: currentCount,
      judgeEveryMessages,
      judgeEveryMinutes,
      elapsedMs,
      triggerMode
    };
  }

  const consumedMessageCount = currentCount;
  proactiveState.judgeInFlightByGroupId[groupId] = true;
  let result;
  try {
    const text = helpers.stripMentionText ? helpers.stripMentionText(event.text || "") : String(event.text || "");
    const assessment = evaluateQqProactiveInterest(text, event, {
      ...helpers,
      ownerUserIds: state.ownerUserIds || []
    });
    const commonMeta = {
      messageCount: currentCount,
      judgeEveryMessages,
      judgeEveryMinutes,
      triggerMode,
      triggerReason: triggerMode === "time" ? "minute_interval" : "message_count",
      consumedMessageCount
    };

    if (triggerMode === "time" && isProactiveEventStale(event, now(), judgeEveryMinutes)) {
      result = {
        ok: false,
        reason: "latest proactive topic is stale",
        ...commonMeta,
        interestScore: assessment.score,
        interest: assessment
      };
    } else {
      const judgeConfig = normalizeJudgeConfig({
        ...(state.proactive?.judge || {}),
        judgeEveryMessages,
        judgeEveryMinutes,
        triggerMode
      });
      if (!judgeConfig.enabled) {
        result = {
          ok: false,
          reason: "model judge disabled",
          ...commonMeta,
          interestScore: assessment.score,
          interest: assessment
        };
      } else {
        const judge = await judgeProactiveInterestWithOpenRouter(event, assessment, {
          ...judgeConfig,
          apiKey: helpers.openRouterApiKey || "",
          fetch: helpers.fetch,
          recentMessages: helpers.recentMessages || [],
          humanStyle: helpers.humanStyle || null,
          assistantName: helpers.assistantName || "assistant",
          ownerLabel: helpers.ownerLabel || "主人"
        });
        if (judge.ok && judge.shouldReply && judge.interest >= judgeConfig.minInterest) {
          result = buildDecision("model final decision", assessment, judge, {
            ...commonMeta,
            replyContext: formatRecentMessages(helpers.recentMessages || [], judgeConfig.maxRecentMessages)
          });
        } else {
          result = {
            ok: false,
            reason: judge.ok ? "model final decision declined proactive reply" : `model judge failed: ${judge.reason || judge.error || "unknown error"}`,
            ...commonMeta,
            interestScore: assessment.score,
            interest: assessment,
            modelJudge: judge
          };
        }
      }
    }
  } catch (error) {
    result = {
      ok: false,
      reason: "proactive interest judge crashed",
      error: error.message,
      messageCount: currentCount,
      judgeEveryMessages,
      judgeEveryMinutes,
      triggerMode,
      consumedMessageCount
    };
  } finally {
    const countAfterJudge = getProactiveMessageCount(proactiveState, groupId);
    proactiveState.messageCountByGroupId[groupId] = Math.max(0, countAfterJudge - consumedMessageCount);
    proactiveState.lastJudgeAtByGroupId[groupId] = now();
    delete proactiveState.judgeInFlightByGroupId[groupId];
  }
  result.messageCountRemaining = getProactiveMessageCount(proactiveState, groupId);
  result.cycleCompletedAt = proactiveState.lastJudgeAtByGroupId[groupId];
  return result;
}

export function evaluateQqProactiveInterest(text, event = {}, helpers = {}) {
  const normalized = normalizeText(text);
  const recent = recentBeforeCurrent(helpers.recentMessages, event);
  const result = {
    score: 0,
    directness: 0,
    likedTopicScore: 0,
    contextScore: 0,
    penalty: 0,
    labels: [],
    blockers: [],
    reason: "interest score too low",
    blocked: false,
    hasQuestionShape: questionShapePattern.test(normalized),
    normalized
  };

  if (!normalized) {
    result.blocked = true;
    result.reason = "empty text";
    return result;
  }

  applyDirectness(result, normalized, event);
  applyLikedTopics(result, normalized, event);
  applyContext(result, normalized, event, recent, helpers.ownerUserIds || []);
  applyMessageQuality(result, normalized, event);
  applyPenalties(result, normalized, event, recent);

  result.score = Math.max(0, result.directness + result.likedTopicScore + result.contextScore + result.penalty);
  if (result.blockers.length && result.directness < 7) {
    result.blocked = true;
    result.reason = result.blockers[0];
  }
  return result;
}

function applyDirectness(result, text, event) {
  if (event.isReplyToSelf || event.replyContext?.isSelf) {
    result.directness += 7;
    result.labels.push("回复 bot");
  }
  if (botNamePattern.test(text)) {
    result.directness += 5;
    result.labels.push("提到 bot");
  }
  if (directInvitePattern.test(text)) {
    result.directness += 4;
    result.labels.push("邀请 bot 接话");
  }
  if (/(?:你|机器人|助手|bot|gpt).*(?:怎么看|觉得|会不会|能不能|是不是|吗|嘛|么)/i.test(text)) {
    result.directness += 3;
    result.labels.push("向 bot 提问");
  }
}

function applyLikedTopics(result, text, event) {
  for (const rule of likedTopicRules) {
    if (!rule.pattern.test(text)) continue;
    result.likedTopicScore += rule.weight;
    result.labels.push(rule.label);
  }
  if ((Array.isArray(event.images) && event.images.length > 0) || /\[CQ:image,/i.test(text)) {
    result.likedTopicScore += imageIntentPattern.test(text) ? 4 : 1;
    result.labels.push(imageIntentPattern.test(text) ? "明确看图" : "带图但未明确看图");
  }
}

function applyContext(result, text, event, recent, ownerUserIds) {
  const lastAssistantIndex = findLastIndex(recent, (item) => item.isAssistant || item.senderId === "assistant");
  const ownerRecentlySpoke = recent.slice(-8).some((item) => ownerUserIds.includes(String(item.senderId || "")) || item.isOwner);

  if (lastAssistantIndex >= Math.max(0, recent.length - 4) && (contextQuestionPattern.test(text) || /[?？]$/.test(text))) {
    result.contextScore += 3;
    result.labels.push("接着 bot 上文追问");
  }
  if (ownerRecentlySpoke) {
    result.contextScore += 1;
    result.labels.push("主人近期在场");
  }
  if (event.isOwner) {
    result.contextScore += 1;
    result.labels.push("主人发言");
  }
}

function applyMessageQuality(result, text, event) {
  if (result.hasQuestionShape) result.contextScore += 1;
  if (text.length >= 8 && text.length <= 180) result.contextScore += 1;
  if (text.length > 180) result.contextScore += 2;
  if (contextQuestionPattern.test(text)) result.contextScore += 1;
  if (Array.isArray(event.images) && event.images.length > 0 && imageIntentPattern.test(text)) {
    result.contextScore += 1;
  }
}

function applyPenalties(result, text, event, recent) {
  if (shortNoisePattern.test(text) || reactionOnlyPattern.test(text)) {
    result.penalty -= 8;
    result.blockers.push("short reaction ignored");
  }
  if (text.length <= 3 && result.directness < 7) {
    result.penalty -= 6;
    result.blockers.push("too short without bot hook");
  }
  if (event.hasAtSegment && !event.hasSelfAtSegment) {
    result.penalty -= 5;
    result.blockers.push("message targets another user");
  }
  if (event.replyContext && !event.replyContext.isSelf && result.directness < 5 && result.likedTopicScore < 6) {
    result.penalty -= 4;
    result.blockers.push("replying to another user");
  }
  if (looksLikePrivateBackAndForth(recent, event) && result.directness < 7 && result.likedTopicScore < 6) {
    result.penalty -= 5;
    result.blockers.push("private back-and-forth in group");
  }
  const recentBotMessages = recent.slice(-8).filter((item) => item.isAssistant || item.senderId === "assistant").length;
  const botJustSpoke = recent.slice(-3).some((item) => item.isAssistant || item.senderId === "assistant");
  if (botJustSpoke && !result.hasQuestionShape && result.directness < 5) {
    result.penalty -= 4;
    result.blockers.push("bot just spoke and has no new turn hook");
  }
  if (recentBotMessages >= 2 && result.directness < 5) {
    result.penalty -= 4;
    result.blockers.push("bot has spoken often in recent context");
  }
  if (/^(?:我|你|他|她|他们|我们).{0,8}(?:吃饭|睡觉|放假|考试|上课|下课|到家|出门|回家|游戏|开黑)/.test(text) && result.likedTopicScore < 5) {
    result.penalty -= 4;
    result.blockers.push("ordinary life chatter");
  }
}

async function judgeProactiveInterestWithOpenRouter(event, assessment, config) {
  if (!config.apiKey) {
    return { ok: false, fallback: true, reason: "OpenRouter API key is not configured" };
  }
  const timeoutMs = Math.max(1500, Math.min(20000, Number(config.timeoutMs || 6500)));
  const controller = new AbortController();
  const fetchImpl = typeof config.fetch === "function" ? config.fetch : globalThis.fetch;
  let idleTimeout = null;
  let idleTimedOut = false;
  const resetIdleTimeout = () => {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      idleTimedOut = true;
      controller.abort();
    }, timeoutMs);
  };
  resetIdleTimeout();
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(`${String(config.baseUrl || defaultOpenRouterBaseUrl).replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${config.apiKey}`,
        "content-type": "application/json",
        "http-referer": "http://localhost:3789",
        "x-title": "Codex QQ Bot proactive interest judge"
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: 2048,
        reasoning: {
          effort: "none"
        },
        stream: true,
        messages: buildJudgeMessages(event, assessment, config)
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const bodyText = await response.text();
      const errorBody = parseJsonObject(bodyText);
      return {
        ok: false,
        fallback: true,
        status: response.status,
        reason: String(errorBody?.error?.message || `OpenRouter returned HTTP ${response.status}`).slice(0, 500),
        durationMs: Date.now() - startedAt
      };
    }
    const streamed = await readOpenRouterCompletion(response, { onToken: resetIdleTimeout });
    const content = String(streamed.content || "").trim();
    const judge = parseJudgeJson(content);
    if (typeof judge.shouldReply !== "boolean" || !Number.isFinite(Number(judge.interest))) {
      return {
        ok: false,
        fallback: true,
        provider: "openrouter",
        model: config.model,
        durationMs: Date.now() - startedAt,
        finishReason: streamed.finishReason,
        streamedTokenChunks: streamed.tokenChunks,
        reasoningLength: streamed.reasoning.length,
        raw: content.slice(0, 800),
        reason: "OpenRouter judge did not return valid FINAL_JSON"
      };
    }
    return {
      ok: true,
      provider: "openrouter",
      model: config.model,
      durationMs: Date.now() - startedAt,
      finishReason: streamed.finishReason,
      streamedTokenChunks: streamed.tokenChunks,
      reasoningLength: streamed.reasoning.length,
      raw: content.slice(0, 800),
      shouldReply: Boolean(judge.shouldReply),
      interest: clampNumber(judge.interest, 0, 100, 0),
      reason: String(judge.reason || "").slice(0, 300),
      replyStyle: String(judge.replyStyle || "").slice(0, 80)
    };
  } catch (error) {
    return {
      ok: false,
      fallback: true,
      reason: idleTimedOut || error.name === "AbortError"
        ? `OpenRouter judge produced no new token for ${timeoutMs}ms`
        : error.message,
      durationMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(idleTimeout);
  }
}

async function readOpenRouterCompletion(response, { onToken } = {}) {
  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("text/event-stream")) {
    const parsed = parseJsonObject(await response.text());
    const message = parsed?.choices?.[0]?.message || {};
    const content = String(message.content || "");
    const reasoning = String(message.reasoning || message.reasoning_content || "");
    if (content || reasoning) onToken?.();
    return {
      content,
      reasoning,
      finishReason: parsed?.choices?.[0]?.finish_reason || null,
      tokenChunks: content || reasoning ? 1 : 0
    };
  }

  if (!response.body?.getReader) throw new Error("OpenRouter returned an unreadable event stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let finishReason = null;
  let tokenChunks = 0;

  const consumeEvent = (eventText) => {
    const data = eventText
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data || data === "[DONE]") return;
    const parsed = parseJsonObject(data);
    if (parsed?.error) throw new Error(String(parsed.error.message || parsed.error));
    const choice = parsed?.choices?.[0] || {};
    const delta = choice.delta || {};
    const contentDelta = String(delta.content || "");
    const reasoningDelta = String(delta.reasoning || delta.reasoning_content || "");
    if (contentDelta || reasoningDelta) {
      content += contentDelta;
      reasoning += reasoningDelta;
      tokenChunks += 1;
      onToken?.();
    }
    if (choice.finish_reason) finishReason = choice.finish_reason;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";
    for (const eventText of events) consumeEvent(eventText);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consumeEvent(buffer);
  return { content, reasoning, finishReason, tokenChunks };
}

function parseJsonObject(value) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return {};
  }
}

function buildJudgeMessages(event, assessment, config) {
  const preset = normalizePreset(config.preset);
  const recent = formatRecentMessages(config.recentMessages, Number(config.maxRecentMessages || 8));
  return [
    {
      role: "system",
      content: [
        "你是 QQ 群聊 bot 的主动回复判定器，只判断未被 @ 时是否值得主动插一句。",
        "达到配置的消息数或分钟间隔时，普通群消息会交给你判断；规则评分、blockers、labels 只作为参考信号，不是硬性过滤器。",
        "兴趣不等于应该说话。先判断最新消息属于谁的对话、话题是否仍在继续、Bot 能否增加一个具体新信息或真正好笑的接点。",
        "如果是两个人的来回、已经有人回答、只是生活碎片/短反应、话题已转走，或 Bot 只能复述与泛泛赞同，应当不回复；Bot 不需要抢答群里的每个问题。",
        "只有插话不会打断当前节奏，而且内容比沉默更有价值时，才判定回复。",
        "先在普通回复正文中输出一行简短的 ANALYSIS:，用不超过 200 个汉字完成判断；不要把分析放进 reasoning 字段。",
        "最后必须单独输出一行 FINAL_JSON: {\"shouldReply\":boolean,\"interest\":0-100,\"reason\":\"string\",\"replyStyle\":\"string\"}。",
        "Hub 只读取最后的 FINAL_JSON；shouldReply 和 interest 是最终依据。不要使用 Markdown。"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        assistantName: config.assistantName,
        ownerLabel: config.ownerLabel,
        proactiveJudgeInterval: {
          everyMessages: config.judgeEveryMessages,
          everyMinutes: config.judgeEveryMinutes,
          triggeredBy: config.triggerMode === "time" ? "minute_interval" : "message_count",
          note: config.triggerMode === "time"
            ? "这是定时兴趣检查。只在当前话题仍活跃、此刻插话不显得迟到时回复；最终是否回复仍只看 FINAL_JSON。"
            : "这是消息数兴趣检查；最终是否回复仍只看 FINAL_JSON。"
        },
        currentMessage: {
          text: assessment.normalized,
          senderIsOwner: Boolean(event.isOwner),
          isReplyToBot: Boolean(event.isReplyToSelf || event.replyContext?.isSelf),
          hasImage: Array.isArray(event.images) && event.images.length > 0,
          replyContext: event.replyContext ? {
            isBot: Boolean(event.replyContext.isSelf),
            text: String(event.replyContext.text || "").slice(0, 240),
            imageCount: Array.isArray(event.replyContext.images) ? event.replyContext.images.length : 0
          } : null
        },
        ruleAssessment: {
          score: assessment.score,
          directness: assessment.directness,
          likedTopicScore: assessment.likedTopicScore,
          contextScore: assessment.contextScore,
          penalty: assessment.penalty,
          labels: assessment.labels,
          blockers: assessment.blockers
        },
        botInterestPreset: preset,
        groupHumanRhythm: config.humanStyle ? {
          sampleSize: Number(config.humanStyle.sampleSize || 0),
          messagesPerHour: Number(config.humanStyle.messagesPerHour || 0),
          multiMessageRunRatio: Number(config.humanStyle.multiMessageRunRatio || 0),
          messagesInMultiRunsRatio: Number(config.humanStyle.messagesInMultiRunsRatio || 0),
          medianTextChars: Number(config.humanStyle.medianTextChars || 0),
          p90TextChars: Number(config.humanStyle.p90TextChars || 0),
          imageMessageRatio: Number(config.humanStyle.imageMessageRatio || 0),
          emojiMessageRatio: Number(config.humanStyle.emojiMessageRatio || 0),
          replyMessageRatio: Number(config.humanStyle.replyMessageRatio || 0)
        } : null,
        recentMessages: recent,
        outputPolicy: {
          replyOnlyIfInterestAtLeast: config.minInterest,
          finalResultOnly: "最后一行 FINAL_JSON 是唯一生效结果；前面的分析不会被当作结论。",
          ifReplyStyle: "短、自然、像群友顺口接话；不要解释触发规则；不要频繁叫主人；不要服务式结尾。"
        }
      })
    }
  ];
}

function parseJudgeJson(content) {
  const cleaned = String(content || "").trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const finalLine = cleaned
    .split(/\r?\n/)
    .reverse()
    .map((line) => line.trim())
    .find((line) => /^FINAL_JSON\s*:/i.test(line));
  if (finalLine) {
    const finalMatch = finalLine.replace(/^FINAL_JSON\s*:/i, "").trim().match(/\{[\s\S]*\}$/);
    if (finalMatch) {
      try {
        return JSON.parse(finalMatch[0]);
      } catch {
        return {};
      }
    }
  }
  const matches = [...cleaned.matchAll(/\{[^{}]*(?:"shouldReply"|'shouldReply')[\s\S]*?\}/g)];
  const match = matches[matches.length - 1] || cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

function normalizeJudgeConfig(value = {}) {
  return {
    enabled: value?.enabled !== false,
    provider: "openrouter",
    baseUrl: value?.baseUrl || defaultOpenRouterBaseUrl,
    model: value?.model || defaultOpenRouterJudgeModel,
    timeoutMs: Number(value?.timeoutMs || 6500),
    minInterest: proactiveJudgeFinalMinInterest,
    judgeEveryMessages: normalizeJudgeEveryMessages(value?.judgeEveryMessages),
    judgeEveryMinutes: normalizeJudgeEveryMinutes(value?.judgeEveryMinutes),
    triggerMode: value?.triggerMode === "time" ? "time" : "message",
    maxRecentMessages: Number(value?.maxRecentMessages || 8),
    preset: value?.preset
  };
}

function normalizeJudgeEveryMessages(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return defaultJudgeEveryMessages;
  return Math.max(1, Math.min(1000, Math.floor(number)));
}

function normalizeJudgeEveryMinutes(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return defaultJudgeEveryMinutes;
  return Math.max(0, Math.min(1440, Math.floor(number)));
}

function ensureProactiveCycleState(proactiveState = {}) {
  if (!proactiveState.messageCountByGroupId || typeof proactiveState.messageCountByGroupId !== "object") {
    proactiveState.messageCountByGroupId = {};
  }
  if (!proactiveState.lastJudgeAtByGroupId || typeof proactiveState.lastJudgeAtByGroupId !== "object") {
    proactiveState.lastJudgeAtByGroupId = {};
  }
  if (!proactiveState.judgeInFlightByGroupId || typeof proactiveState.judgeInFlightByGroupId !== "object") {
    proactiveState.judgeInFlightByGroupId = {};
  }
}

function getProactiveMessageCount(proactiveState = {}, groupId) {
  const count = Number(proactiveState.messageCountByGroupId?.[String(groupId)] || 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function incrementProactiveMessageCount(proactiveState = {}, groupId) {
  if (!groupId) return 0;
  ensureProactiveCycleState(proactiveState);
  const key = String(groupId);
  const next = getProactiveMessageCount(proactiveState, key) + 1;
  proactiveState.messageCountByGroupId[key] = next;
  return next;
}

function isProactiveEventStale(event = {}, nowMs, judgeEveryMinutes) {
  const observedAt = Number(event.proactiveObservedAtMs || event.observedAtMs || 0);
  if (!Number.isFinite(observedAt) || observedAt <= 0) return false;
  const maxAgeMs = Math.max(10 * minuteMs, Math.max(1, judgeEveryMinutes) * 2 * minuteMs);
  return nowMs - observedAt > maxAgeMs;
}

function normalizePreset(value = {}) {
  const defaults = {
    name: "default",
    likes: [
      "QQ bot 的触发逻辑、权限、模型、记忆、联网、白名单、主动回复",
      "AI、Codex、编程报错、脚本、接口、部署和本机排障",
      "图片识别、截图、表情包、梗图、生成图",
      "诈骗、盗号、钓鱼链接、安全风险判断"
    ],
    dislikes: [
      "普通寒暄和短反应",
      "两个人互相聊天",
      "没有明确问 bot 的生活碎碎念",
      "重复道歉、解释自己为什么出现"
    ],
    style: [
      "像群友自然接话，默认一句话",
      "少叫主人，除非正在直接回应主人或管理命令",
      "不说自己刚探头、醒着、冒泡",
      "不做客服式结尾，不问还能不能帮忙"
    ]
  };
  return {
    name: String(value?.name || defaults.name),
    likes: normalizeStringList(value?.likes, defaults.likes),
    dislikes: normalizeStringList(value?.dislikes, defaults.dislikes),
    style: normalizeStringList(value?.style, defaults.style)
  };
}

function buildDecision(reason, assessment, judge = null, meta = {}) {
  const topic = assessment.labels.slice(0, 3).join(" / ") || "偏好话题";
  const judgeHint = judge?.replyStyle ? `模型建议风格：${judge.replyStyle}。` : "";
  return {
    ok: true,
    reason,
    proactive: true,
    includeRecentContext: true,
    messageCount: meta.messageCount,
    judgeEveryMessages: meta.judgeEveryMessages,
    judgeEveryMinutes: meta.judgeEveryMinutes,
    triggerMode: meta.triggerMode,
    triggerReason: meta.triggerReason,
    consumedMessageCount: meta.consumedMessageCount,
    interestScore: assessment.score,
    interest: assessment,
    modelJudge: judge,
    replyContext: meta.replyContext || [],
    promptHint: `触发原因：这条群聊命中了你的主动回复兴趣（${topic}，规则分 ${assessment.score}${judge ? `，模型兴趣 ${judge.interest}` : ""}）。${judgeHint}请像自然被喜欢的话题吸引一样短促接话，不要假装对方直接 @ 了你，不要解释触发规则，也不要连续刷屏。`
  };
}

function formatRecentMessages(recentMessages = [], maxRecentMessages = 8) {
  const memberAliases = new Map();
  let nextMember = 1;
  return (Array.isArray(recentMessages) ? recentMessages : [])
    .slice(-Math.max(1, Math.min(12, maxRecentMessages)))
    .map((item) => {
      const senderId = String(item.senderId || "unknown");
      if (!item.isAssistant && item.senderId !== "assistant" && !item.isOwner && !memberAliases.has(senderId)) {
        memberAliases.set(senderId, `member${nextMember++}`);
      }
      return {
        sender: item.isAssistant || item.senderId === "assistant"
          ? "bot"
          : (item.isOwner ? "owner" : memberAliases.get(senderId) || "member"),
        text: String(item.text || "").slice(0, 220),
        replyToBot: Boolean(item.replyContext?.isSelf)
      };
    })
    .filter((item) => item.text);
}

function normalizeStringList(value, fallback) {
  const list = Array.isArray(value) ? value : fallback;
  return list.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\[CQ:reply,[^\]]+\]/g, "")
    .replace(/\[CQ:at,[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function recentBeforeCurrent(recentMessages = [], event = {}) {
  const list = Array.isArray(recentMessages) ? recentMessages : [];
  const currentMessageId = event.raw?.message_id == null ? "" : String(event.raw.message_id);
  return currentMessageId
    ? list.filter((item) => String(item.messageId || "") !== currentMessageId)
    : list.slice(0, -1);
}

function looksLikePrivateBackAndForth(recent, event) {
  const senderId = String(event.senderId || "");
  if (!senderId) return false;
  const lastHuman = recent
    .filter((item) => item.senderId && item.senderId !== "assistant")
    .slice(-4);
  if (lastHuman.length < 3) return false;
  const participants = new Set(lastHuman.map((item) => String(item.senderId)));
  return participants.size <= 2;
}

function findLastIndex(list, predicate) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index], index)) return index;
  }
  return -1;
}
