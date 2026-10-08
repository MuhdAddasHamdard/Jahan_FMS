import { askAssistant, MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH } from "../services/chat.service";
import { businessErrorToResponse } from "../utils/errors";

const validateMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "CHAT_INVALID_MESSAGE";
  }
  if (messages.length > MAX_HISTORY_MESSAGES) {
    return "CHAT_INVALID_MESSAGE";
  }

  for (const message of messages) {
    if (!message || (message.role !== "user" && message.role !== "assistant")) {
      return "CHAT_INVALID_MESSAGE";
    }
    if (typeof message.content !== "string" || !message.content.trim()) {
      return "CHAT_INVALID_MESSAGE";
    }
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return "CHAT_MESSAGE_TOO_LONG";
    }
  }

  if (messages[messages.length - 1].role !== "user") {
    return "CHAT_INVALID_MESSAGE";
  }

  return null;
};

export const postChat = async (req, res) => {
  try {
    const invalid = validateMessages(req.body?.messages);
    if (invalid) {
      const mapped = businessErrorToResponse(invalid);
      return res.status(mapped.status).json({ message: mapped.message });
    }

    const result = await askAssistant({
      user: req.user,
      messages: req.body.messages,
    });

    if (result.error) {
      const mapped = businessErrorToResponse(result.error);
      return res.status(mapped.status).json({ message: mapped.message });
    }

    res.status(200).json({ reply: result.reply, actions: result.actions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};
