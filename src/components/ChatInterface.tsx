import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { schemes } from "@/data/schemes";
import LanguageSelector from "./LanguageSelector";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-primary"
        style={{ animation: `typing-dot 1.2s ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
);

const ChatInterface = () => {
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedScheme = searchParams.get("scheme");
  const isHi = lang === "hi";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Send initial message on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let initialMsg = isHi
      ? "🙏 नमस्ते! मैं सरकार साथी AI हूँ। सरकारी योजनाओं के बारे में कुछ भी पूछें।"
      : "🙏 Namaste! I'm Sarkar Saathi AI. Ask me anything about government schemes.";

    if (preSelectedScheme) {
      const scheme = schemes.find((s) => s.id === preSelectedScheme);
      if (scheme) {
        initialMsg = isHi
          ? `🙏 नमस्ते! आप **${scheme.nameHi}** के बारे में जानना चाहते हैं। मैं आपकी पात्रता जाँच सकता हूँ। कृपया अपनी वार्षिक आय, भूमि का आकार, और आधार स्थिति बताएं।`
          : `🙏 Namaste! You want to know about **${scheme.name}**. I can check your eligibility. Please share your annual income, land size, and Aadhaar status.`;
      }
    }

    setMessages([{ role: "assistant", content: initialMsg }]);
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMessages.length) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Failed to connect to AI. Please try again.");
      setIsLoading(false);
    }
  };

  const quickQuestions = preSelectedScheme
    ? []
    : [
        isHi ? "मेरे लिए कौन सी योजनाएं उपलब्ध हैं?" : "Which schemes am I eligible for?",
        isHi ? "PM-KISAN क्या है?" : "What is PM-KISAN?",
        isHi ? "आयुष्मान भारत के लिए कैसे अप्लाई करें?" : "How to apply for Ayushman Bharat?",
      ];

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-5 rounded-full gradient-brand" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">AI Assistant</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-foreground">Sarkar Saathi</h2>
            </div>
            <LanguageSelector />
          </div>
        </motion.div>

        {/* Chat window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl border border-glass overflow-hidden flex flex-col shadow-elevated"
          style={{ height: "72vh" }}
        >
          {/* Header bar */}
          <div className="gradient-brand px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Sarkar Saathi Bot</h3>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Online · AI Powered
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {["bg-red-400", "bg-amber-400", "bg-emerald-400"].map((c, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5 shadow-brand">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "gradient-brand text-white rounded-br-sm shadow-brand"
                        : "glass border border-glass text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-line">{msg.content}</span>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full glass border border-glass flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 shadow-brand">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="glass border border-glass rounded-2xl rounded-bl-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Quick questions */}
            {messages.length === 1 && quickQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mt-2 pl-10"
              >
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-2 rounded-xl glass border border-glass text-sm font-medium text-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-glass shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isHi ? "अपना सवाल यहाँ लिखें..." : "Type your question here..."}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-2xl bg-[hsl(220_20%_8%)] border border-glass text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-brand disabled:opacity-40 hover:shadow-[0_0_30px_hsl(28_100%_54%/0.4)] transition-all"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatInterface;
