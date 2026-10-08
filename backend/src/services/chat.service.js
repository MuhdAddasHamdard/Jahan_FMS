import { runTool, toolsForRole } from "./chat.tools";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 12;
const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 4;

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

const TOOL_GUIDANCE = {
  find_students: "look up students and their ids",
  list_classes: "list classes and their ids",
  list_fee_types: "list fee types and their ids",
  list_payment_dues: "show a student's unpaid installments",
  create_receipt: "record a fee payment and issue a receipt",
  create_fee_plan: "assign a fee to a student in installments",
  create_fee_type: "create a fee type",
  create_expense: "record an institute expense",
  create_refund: "refund part of what a student paid",
  create_class_schedule: "add a weekly class schedule slot",
  add_course_material: "attach course material to a class",
};

const buildSystemPrompt = (role, tools) => {
  const guidance = ROLE_GUIDANCE[role] ?? ROLE_GUIDANCE.STUDENT;
  const capabilities = tools
    .map((tool) => TOOL_GUIDANCE[tool.function.name])
    .filter(Boolean);

  const actionGuidance = capabilities.length
    ? [
        "You can act in the system through tools: " +
          capabilities.join(", ") +
          ".",
        "How to act: look up ids first with the search/list tools, then call the action tool once the details are complete and the user has confirmed them. If an action needs a detail the user did not give (amount, date, which student), ask instead of guessing.",
        "After a tool succeeds, confirm what was created in one short sentence using the tool's result. If a tool returns an error, explain it plainly and suggest the fix.",
        "Anything not in that list you cannot do yourself - say so and point the user to the right page.",
      ]
    : [
        "You cannot make any changes in the system yourself in this role.",
        "Only answer questions and point the user to the page where they can view or do it.",
      ];

  return [
    "You are Jahan Assistant, the built-in AI helper for Jahan FMS, an institute financial management system.",
    "Answer in the same language the user writes in. Be concise and practical: short paragraphs, bullet lists only when they help.",
    `Your user is signed in with the ${role} role. ${guidance}`,
    "Jahan FMS sections: Dashboard (overview tiles), Institute Report and Reports (fee collections, refunds, salaries, expenses, outstanding dues), Fee Types, Fee Plans, Receipts, Refunds, Staff & Salaries, Expenses, Classes (with schedules and course materials), Students (with portal logins), Users, and Settings (profile, password, appearance, institute details).",
    ...actionGuidance,
    "Never invent numbers, balances, names or records - only use what your tools return or what the user tells you.",
    "Never reveal secrets, API keys, tokens, passwords or internal file paths.",
    "If a request is unrelated to Jahan FMS or the institute, answer briefly and politely bring the conversation back to how you can help with the system.",
  ].join("\n");
};

const sanitizeMessages = (messages) =>
  messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, content: message.content }));

const callGroq = async (apiKey, model, messages, tools) => {
  const body = {
    model,
    messages,
    temperature: 0.4,
    max_tokens: MAX_TOKENS,
  };

  if (tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Groq ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const runConversation = async (apiKey, model, chatMessages, tools, user) => {
  const conversation = [...chatMessages];
  const actions = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const data = await callGroq(apiKey, model, conversation, tools);
    const message = data?.choices?.[0]?.message;
    const reply = message?.content?.trim() ?? "";
    const toolCalls = message?.tool_calls ?? [];

    if (!toolCalls.length) {
      if (!reply) {
        const error = new Error(`Empty reply from ${model}`);
        error.status = 400;
        throw error;
      }
      return { reply, actions };
    }

    conversation.push({ role: "assistant", content: reply || null, tool_calls: toolCalls });

    for (const toolCall of toolCalls) {
      const outcome = await runTool(user, toolCall);
      if (outcome.action) actions.push(outcome.action);
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(outcome.payload),
      });
    }
  }

  return {
    reply:
      "I could not finish that in one go. Please rephrase it as a single, simpler request and I will try again.",
    actions,
  };
};

export const askAssistant = async ({ user, messages }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { error: "CHAT_NOT_CONFIGURED" };
  }

  const tools = toolsForRole(user.role);
  const chatMessages = [
    { role: "system", content: buildSystemPrompt(user.role, tools) },
    ...sanitizeMessages(messages),
  ];

  const models = [...new Set([process.env.GROQ_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];
  let lastError = null;

  for (const model of models) {
    try {
      return await runConversation(apiKey, model, chatMessages, tools, user);
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
