import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import Icon from "./Icons";

const MAX_MESSAGE_LENGTH = 2000;
const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm Jahan Assistant. Ask me anything about using the system - dashboards, reports, fees, classes, students or settings.",
};

const QUICK_PROMPTS = [
  "What can I do in this system?",
  "How do I record a payment?",
  "How do I reset my password?",
];

const ChatBot = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const history = messages.filter((message) => message !== GREETING);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      const payload = nextMessages
        .filter(
          (message) =>
            message !== GREETING &&
            (message.role === "user" || message.role === "assistant"),
        )
        .map((message) => ({ role: message.role, content: message.content }));
      const data = await api.post("/chat", { messages: payload });
      setMessages((current) => [
        ...current,
        ...(data.actions ?? []).map((action) => ({
          role: "action",
          content: action.summary,
        })),
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err?.message || "The assistant could not respond. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="brand-mark animate-pulse-ring fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <Icon
          name={open ? "close" : "sparkles"}
          className="h-6 w-6"
        />
      </button>

      {open && (
        <div className="glass-strong animate-scale-in fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-float)]">
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand), var(--teal))",
            }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Jahan Assistant</p>
              <p className="text-xs text-white/75">
                {user?.role
                  ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
                  : "Assistant"}{" "}
                mode
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-1.5 transition hover:bg-white/20"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div ref={listRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) =>
              message.role === "action" ? (
                <div key={`${message.role}-${index}`} className="flex justify-center">
                  <span className="badge badge-brand">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    {message.content}
                  </span>
                </div>
              ) : (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm text-[color:var(--brand-ink)]"
                        : "rounded-bl-sm bg-surface-2 text-content"
                    }`}
                    style={
                      message.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, var(--brand), var(--brand-600, var(--brand)))",
                          }
                        : undefined
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ),
            )}

            {history.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-brand-strong transition hover:bg-surface-2"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="alert alert-error !py-2 text-xs">{error}</p>
            )}
          </div>

          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={1}
                placeholder="Ask the assistant..."
                className="input max-h-28 min-h-[42px] flex-1 resize-none"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="btn btn-primary h-[42px] w-[42px] !p-0"
              >
                <Icon name="send" className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-faint">
              AI answers may be wrong - check important numbers in the app.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
