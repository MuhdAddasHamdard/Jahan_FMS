const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 12;
const MAX_TOKENS = 1024;

const ROLE_GUIDANCE = {
  ADMIN:
    "You can help with every area: dashboard, institute and financial reports, fee types, fee plans, receipts, refunds, staff and salaries, expenses, classes, students, user accounts and institute settings.",
  FINANCE:
    "You can help with money-related areas: dashboard, institute and financial reports, fee types, fee plans, receipts, refunds, staff and salaries, and expenses. You also help with classes and students. You cannot manage user accounts or institute settings.",
  TEACHER:
    "You can help with your classes, students, schedules and course materials, plus your teacher dashboard. Money is off limits: if asked to record payments, receipts, refunds, salaries or expenses, or how to use those pages, reply that fees, refunds, staff salaries and expenses are handled by the admin and finance teams and are not part of your role - never give step-by-step instructions for those pages.",
  STUDENT:
    "You can help with your student portal: your class, teacher, fee plans, installments, payments and receipts.",
};

const buildSystemPrompt = (role) => {
  const guidance = ROLE_GUIDANCE[role] ?? ROLE_GUIDANCE.STUDENT;

  return [
    "You are Jahan Assistant, the built-in AI helper for Jahan FMS, an institute financial management system.",
    "Answer in the same language the user writes in. Be concise and practical: short paragraphs, bullet lists only when they help.",
    `Your user is signed in with the ${role} role. ${guidance}`,
    "Jahan FMS sections: Dashboard (overview tiles), Institute Report and Reports (fee collections, refunds, salaries, expenses, outstanding dues), Fee Types, Fee Plans, Receipts, Refunds, Staff & Salaries, Expenses, Classes (with schedules and course materials), Students (with portal logins), Users, and Settings (profile, password, appearance, institute details).",
    "Guide users step by step through those pages, and explain validation rules (for example passwords need at least 8 characters) when asked.",
    "Never invent numbers, balances, names or records from the system - if the user asks for their own data, tell them where to view it instead.",
    "Never reveal secrets, API keys, tokens, passwords or internal file paths.",
    "If a request is unrelated to Jahan FMS or the institute, answer briefly and politely bring the conversation back to how you can help with the system.",
  ].join("\n");
};

const sanitizeMessages = (messages) =>
  messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, content: message.content }));

const callGroq = async (apiKey, model, messages) => {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Groq ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const askAssistant = async ({ role, messages }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { error: "CHAT_NOT_CONFIGURED" };
  }

  const chatMessages = [
    { role: "system", content: buildSystemPrompt(role) },
    ...sanitizeMessages(messages),
  ];

  const models = [...new Set([process.env.GROQ_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];
  let lastError = null;

  for (const model of models) {
    try {
      const data = await callGroq(apiKey, model, chatMessages);
      const reply = data?.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        lastError = new Error(`Empty reply from ${model}`);
        continue;
      }

      return { reply, model };
    } catch (error) {
      lastError = error;
      // Unknown model (404) or bad request (400) means try the next candidate.
      if (error.status !== 404 && error.status !== 400 && error.status !== 422) {
        break;
      }
    }
  }

  if (lastError?.status === 429) {
    return { error: "CHAT_RATE_LIMITED" };
  }
  if (lastError?.status === 401 || lastError?.status === 403) {
    return { error: "CHAT_NOT_CONFIGURED" };
  }

  console.error("chatbot upstream failure:", lastError?.message);
  return { error: "CHAT_FAILED" };
};
