import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "./LanguageSelector";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSpeech } from "@/hooks/useWebSpeech";

interface Message {
  role: "assistant" | "user";
  content: string;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-[hsl(28,100%,64%)]"
        style={{ animation: `typing-dot 1.2s ${i * 0.2}s infinite` }}
      />
    ))}
  </div>
);

const MessageSpeakerButton = ({ text, speakFn, stopFn, isSpeaking }: { text: string; speakFn: (t: string) => void; stopFn: () => void; isSpeaking: boolean }) => (
  <button
    onClick={() => isSpeaking ? stopFn() : speakFn(text)}
    className="inline-flex items-center justify-center w-6 h-6 rounded-full glass border border-glass text-muted-foreground hover:text-[hsl(28,100%,64%)] transition-all mt-1 shrink-0"
    title={isSpeaking ? "Stop speaking" : "Play aloud"}
  >
    {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
  </button>
);

const ChatInterface = () => {
  const { lang } = useLanguage();
  const isHi = lang === "hi";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { listening, speaking, voiceEnabled, setVoiceEnabled, speak, stopSpeaking, startListening, stopListening } = useWebSpeech();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Load voices on mount (needed for some browsers)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal("");
    setStreaming(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ messages: newMessages, mode: "general" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }

      // Auto-speak the response if voice is enabled
      if (assistantContent && voiceEnabled) {
        speak(assistantContent);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: isHi ? "माफ़ करें, कोई त्रुटि हुई। कृपया पुनः प्रयास करें।" : "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-5 rounded-full gradient-brand" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">AI Assistant</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white">Sarkar Saathi AI</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setVoiceEnabled(!voiceEnabled); if (speaking) stopSpeaking(); }}
                className={`p-2 rounded-xl glass border transition-all ${voiceEnabled ? "border-[hsl(28_100%_54%/0.4)] text-[hsl(28,100%,64%)]" : "border-glass text-muted-foreground"}`}
                title={voiceEnabled ? "Disable auto-speak" : "Enable auto-speak"}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <LanguageSelector />
            </div>
          </div>
        </motion.div>

        {/* Chat container */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl border border-glass overflow-hidden flex flex-col shadow-elevated"
          style={{ height: "76vh" }}
        >
          {/* Header bar */}
          <div className="gradient-brand px-5 py-3.5 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">Sarkar Saathi Bot</h3>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {listening ? "Listening..." : "Online · AI Powered"}
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
            {messages.length === 0 && !streaming && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center shadow-brand">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg mb-1">
                    {isHi ? "सरकार साथी AI से पूछें" : "Ask Sarkar Saathi AI"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {isHi
                      ? "सरकारी योजनाओं, पात्रता, दस्तावेज़ों, या ऐप के बारे में कुछ भी पूछें।"
                      : "Ask anything about government schemes, eligibility, documents, or how to use this app."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    isHi ? "PM-KISAN क्या है?" : "What is PM-KISAN?",
                    isHi ? "आवास योजना की पात्रता?" : "Eligibility for PM Awas?",
                    isHi ? "छात्रवृत्ति कैसे मिलेगी?" : "How to get scholarships?",
                    isHi ? "डैशबोर्ड कैसे देखें?" : "How to use the dashboard?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-3 py-2 rounded-xl glass border border-glass text-xs font-medium text-muted-foreground hover:text-white hover:border-[hsl(28_100%_54%/0.4)] hover:bg-[hsl(28_100%_54%/0.08)] transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5 shadow-brand">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "gradient-brand text-white rounded-br-sm shadow-brand"
                          : "glass border border-glass text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-line">{msg.content}</span>
                      )}
                    </div>
                    {msg.role === "assistant" && msg.content && (
                      <MessageSpeakerButton
                        text={msg.content}
                        speakFn={speak}
                        stopFn={stopSpeaking}
                        isSpeaking={speaking}
                      />
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

            {streaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 shadow-brand">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="glass border border-glass rounded-2xl rounded-bl-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-glass shrink-0">
            <div className="flex gap-2 items-center">
              <button
                onMouseDown={() => startListening()}
                onMouseUp={async () => { const text = await stopListening(); if (text) sendMessage(text); }}
                onTouchStart={() => startListening()}
                onTouchEnd={async () => { const text = await stopListening(); if (text) sendMessage(text); }}
                className={`p-2.5 rounded-xl border transition-all duration-200 ${
                  listening
                    ? "gradient-brand border-transparent text-white shadow-brand animate-pulse"
                    : "glass border-glass text-muted-foreground hover:text-white"
                }`}
                title="Hold to speak"
              >
                {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(inputVal)}
                placeholder={isHi ? "योजनाओं के बारे में कुछ भी पूछें..." : "Ask anything about schemes..."}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(220_20%_8%)] border border-glass text-white placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[hsl(28_100%_54%/0.5)] transition-all"
              />
              <button
                onClick={() => sendMessage(inputVal)}
                disabled={!inputVal.trim() || streaming}
                className="p-2.5 rounded-xl gradient-brand text-white shadow-brand disabled:opacity-40 hover:shadow-[0_0_30px_hsl(28_100%_54%/0.4)] hover:scale-[1.05] transition-all duration-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-muted-foreground mt-3"
        >
          🎙️ {isHi ? "माइक बटन दबाकर बोलें — हिंदी, तमिल, तेलुगु, मराठी में भी" : "Hold mic button to speak in Hindi, Tamil, Telugu, Marathi & more"}
        </motion.p>
      </div>
    </div>
  );
};

export default ChatInterface;
