import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { schemes, matchSchemes, UserProfile, Scheme } from "@/data/schemes";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, User, Mic, MicOff, Volume2, VolumeX, Send, Sparkles,
    ChevronRight, CheckCircle, XCircle, ArrowRight, X,
    FileText, AlertCircle, Info
} from "lucide-react";
import * as Icons from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { useElevenLabsVoice } from "@/hooks/useElevenLabsVoice";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "profile" | "matching" | "chat" | "form";

interface Message {
    id: string;
    from: "bot" | "user";
    text: string;
    type?: "text" | "chips" | "profile_done" | "schemes" | "form_field" | "success";
    meta?: any;
}

interface ProfileStep {
    key: keyof UserProfile;
    question: string;
    questionHi: string;
    type: "text" | "number" | "chips";
    chips?: { value: string; label: string; labelHi: string }[];
}

// ─── Category colours ─────────────────────────────────────────────────────────
const catColors: Record<string, string> = {
    Agriculture: "from-lime-500 to-green-600",
    Health: "from-red-500 to-pink-600",
    Employment: "from-blue-500 to-cyan-600",
    Housing: "from-amber-500 to-orange-600",
    Welfare: "from-purple-500 to-violet-600",
    Business: "from-cyan-500 to-teal-600",
    "Women & Child": "from-pink-500 to-rose-600",
    Education: "from-indigo-500 to-violet-600",
    Financial: "from-yellow-500 to-amber-600",
};

// ─── Profile questions ────────────────────────────────────────────────────────
const profileSteps: ProfileStep[] = [
    {
        key: "name",
        question: "First, may I know your name? 😊",
        questionHi: "पहले, क्या मैं आपका नाम जान सकता हूँ? 😊",
        type: "text",
    },
    {
        key: "age",
        question: "How old are you?",
        questionHi: "आपकी उम्र क्या है?",
        type: "number",
    },
    {
        key: "gender",
        question: "What is your gender?",
        questionHi: "आपका लिंग क्या है?",
        type: "chips",
        chips: [
            { value: "male", label: "Male", labelHi: "पुरुष" },
            { value: "female", label: "Female", labelHi: "महिला" },
            { value: "other", label: "Other", labelHi: "अन्य" },
        ],
    },
    {
        key: "state",
        question: "Which state are you from?",
        questionHi: "आप किस राज्य से हैं?",
        type: "chips",
        chips: [
            { value: "UP", label: "Uttar Pradesh", labelHi: "उत्तर प्रदेश" },
            { value: "MH", label: "Maharashtra", labelHi: "महाराष्ट्र" },
            { value: "RJ", label: "Rajasthan", labelHi: "राजस्थान" },
            { value: "MP", label: "Madhya Pradesh", labelHi: "मध्य प्रदेश" },
            { value: "GJ", label: "Gujarat", labelHi: "गुजरात" },
            { value: "TN", label: "Tamil Nadu", labelHi: "तमिलनाडु" },
            { value: "AP", label: "Andhra Pradesh", labelHi: "आंध्र प्रदेश" },
            { value: "TS", label: "Telangana", labelHi: "तेलंगाना" },
            { value: "KA", label: "Karnataka", labelHi: "कर्नाटक" },
            { value: "OT", label: "Other State", labelHi: "अन्य राज्य" },
        ],
    },
    {
        key: "occupation",
        question: "What is your main occupation?",
        questionHi: "आपका मुख्य व्यवसाय क्या है?",
        type: "chips",
        chips: [
            { value: "farmer", label: "🌾 Farmer", labelHi: "🌾 किसान" },
            { value: "labourer", label: "🔨 Daily Labourer", labelHi: "🔨 दैनिक मजदूर" },
            { value: "business", label: "🏪 Business Owner", labelHi: "🏪 व्यापारी" },
            { value: "student", label: "📚 Student", labelHi: "📚 छात्र" },
            { value: "unemployed", label: "🔍 Unemployed", labelHi: "🔍 बेरोजगार" },
            { value: "other", label: "👤 Other", labelHi: "👤 अन्य" },
        ],
    },
    {
        key: "annualIncome",
        question: "What is your approximate annual household income (in ₹)?",
        questionHi: "आपकी अनुमानित वार्षिक पारिवारिक आय क्या है (₹ में)?",
        type: "number",
    },
    {
        key: "category",
        question: "What is your caste/social category?",
        questionHi: "आपकी जाति/सामाजिक श्रेणी क्या है?",
        type: "chips",
        chips: [
            { value: "SC", label: "Scheduled Caste (SC)", labelHi: "अनुसूचित जाति (SC)" },
            { value: "ST", label: "Scheduled Tribe (ST)", labelHi: "अनुसूचित जनजाति (ST)" },
            { value: "OBC", label: "OBC", labelHi: "OBC" },
            { value: "General", label: "General", labelHi: "सामान्य" },
            { value: "EWS", label: "EWS", labelHi: "EWS" },
            { value: "Minority", label: "Minority", labelHi: "अल्पसंख्यक" },
        ],
    },
    {
        key: "landHolding",
        question: "Do you own agricultural land? If yes, how many acres? (Enter 0 if none)",
        questionHi: "क्या आपके पास कृषि भूमि है? यदि हाँ, तो कितने एकड़? (नहीं है तो 0 लिखें)",
        type: "number",
    },
    {
        key: "hasBankAccount",
        question: "Do you have a bank account?",
        questionHi: "क्या आपके पास बैंक खाता है?",
        type: "chips",
        chips: [
            { value: "true", label: "✅ Yes", labelHi: "✅ हाँ" },
            { value: "false", label: "❌ No", labelHi: "❌ नहीं" },
        ],
    },
    {
        key: "hasBPLCard",
        question: "Do you have a BPL (Below Poverty Line) ration card?",
        questionHi: "क्या आपके पास BPL राशन कार्ड है?",
        type: "chips",
        chips: [
            { value: "true", label: "✅ Yes", labelHi: "✅ हाँ" },
            { value: "false", label: "❌ No", labelHi: "❌ नहीं" },
        ],
    },
    {
        key: "hasLPGConnection",
        question: "Do you have an LPG gas connection at home?",
        questionHi: "क्या आपके घर में LPG गैस कनेक्शन है?",
        type: "chips",
        chips: [
            { value: "true", label: "✅ Yes", labelHi: "✅ हाँ" },
            { value: "false", label: "❌ No", labelHi: "❌ नहीं" },
        ],
    },
    {
        key: "hasGirlChild",
        question: "Do you have a girl child under 10 years old?",
        questionHi: "क्या आपके परिवार में 10 वर्ष से कम उम्र की बेटी है?",
        type: "chips",
        chips: [
            { value: "true", label: "✅ Yes", labelHi: "✅ हाँ" },
            { value: "false", label: "❌ No", labelHi: "❌ नहीं" },
        ],
    },
];

// ─── Typing indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex items-center gap-1.5 px-4 py-3">
        {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-[hsl(28,100%,64%)]"
                style={{ animation: `typing-dot 1.2s ${i * 0.2}s infinite` }} />
        ))}
    </div>
);

// useVoice hook removed — now using useElevenLabsVoice from hooks

// ─── SchemeCard (inside assistant) ───────────────────────────────────────────
const SchemeResultCard = ({
    scheme, score, reasons, onApply
}: {
    scheme: Scheme; score: number; reasons: string[]; onApply: (s: Scheme) => void;
}) => {
    const { lang } = useLanguage();
    const isHi = lang === "hi";
    const IconComp = (Icons as any)[scheme.icon] || Icons.FileText;
    const grad = catColors[scheme.category] || "from-gray-500 to-slate-600";
    const pct = Math.min(100, score);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl border border-glass p-4 flex flex-col gap-3"
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-lg`}>
                    <IconComp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm leading-tight">{isHi ? scheme.nameHi : scheme.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{isHi ? scheme.benefitHi : scheme.benefit}</p>
                </div>
                <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[hsl(28,100%,64%)]">{pct}%</span>
                    <div className="w-10 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-[hsl(28,100%,54%)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>
            {reasons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{r}</span>
                    ))}
                </div>
            )}
            <button
                onClick={() => onApply(scheme)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl gradient-brand text-white text-xs font-semibold shadow-brand hover:shadow-[0_0_30px_hsl(28_100%_54%/0.4)] hover:scale-[1.02] transition-all duration-200"
            >
                <FileText className="h-3.5 w-3.5" />
                {isHi ? "आवेदन करें" : "Apply for this Scheme"}
                <ArrowRight className="h-3 w-3" />
            </button>
        </motion.div>
    );
};

// ─── FormFiller ───────────────────────────────────────────────────────────────
const FormFiller = ({
    scheme, onDone, speak, lang
}: {
    scheme: Scheme; onDone: () => void; speak: (t: string) => void; lang: string
}) => {
    const isHi = lang === "hi";
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
    const [typing, setTyping] = useState(false);
    const [inputVal, setInputVal] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const IconComp = (Icons as any)[scheme.icon] || Icons.FileText;
    const grad = catColors[scheme.category] || "from-gray-500 to-slate-600";

    const addBotMsg = (text: string) => {
        setTyping(true);
        setTimeout(() => {
            setMessages(p => [...p, { from: "bot", text }]);
            setTyping(false);
            speak(text);
        }, 800);
    };

    useEffect(() => {
        const intro = isHi
            ? `बढ़िया! चलिए ${scheme.nameHi} के लिए आवेदन भरते हैं। मैं आपसे एक-एक प्रश्न पूछूँगा।`
            : `Great! Let's fill your application for ${scheme.name}. I'll ask you one question at a time.`;
        addBotMsg(intro);
        setTimeout(() => askQuestion(0), 1500);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    const askQuestion = (idx: number) => {
        if (idx >= scheme.formFields.length) {
            const done = isHi
                ? "✅ बहुत बढ़िया! आपका फॉर्म पूरा हो गया। नीचे अपना पूरा आवेदन देखें।"
                : "✅ All done! Your application is complete. Review your details below.";
            addBotMsg(done);
            setSubmitted(true);
            return;
        }
        const field = scheme.formFields[idx];
        if (field.type === "select") {
            const opts = field.options?.map(o => `• ${isHi ? o.labelHi : o.label}`).join("\n") || "";
            const q = (isHi ? field.labelHi : field.label) + ":\n" + opts;
            addBotMsg(q);
        } else {
            addBotMsg(isHi ? field.labelHi + "?" : field.label + "?");
        }
    };

    const handleAnswer = (val: string) => {
        if (!val.trim()) return;
        const field = scheme.formFields[currentIdx];
        setMessages(p => [...p, { from: "user", text: val }]);
        setFormData(p => ({ ...p, [field.key]: val }));
        setInputVal("");
        const next = currentIdx + 1;
        setCurrentIdx(next);
        setTimeout(() => askQuestion(next), 600);
    };

    const handleOption = (optValue: string, optLabel: string) => {
        handleAnswer(optLabel);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Scheme header */}
            <div className={`bg-gradient-to-r ${grad} p-4 flex items-center gap-3 shrink-0`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <IconComp className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-xs text-white/70 uppercase tracking-widest">Applying for</p>
                    <h3 className="font-bold text-white text-sm">{isHi ? scheme.nameHi : scheme.name}</h3>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-xs text-white/70">Field {Math.min(currentIdx + 1, scheme.formFields.length)} of {scheme.formFields.length}</p>
                    <div className="w-24 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${(Math.min(currentIdx, scheme.formFields.length) / scheme.formFields.length) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.from === "bot" && (
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                                    <Bot className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm whitespace-pre-line leading-relaxed ${msg.from === "user" ? "gradient-brand text-white rounded-br-sm" : "glass border border-glass text-foreground rounded-bl-sm"
                                }`}>{msg.text}</div>
                            {msg.from === "user" && (
                                <div className="w-7 h-7 rounded-full glass border border-glass flex items-center justify-center shrink-0">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {typing && (
                    <div className="flex gap-2 justify-start">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                            <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="glass border border-glass rounded-2xl rounded-bl-sm"><TypingIndicator /></div>
                    </div>
                )}

                {/* Select options */}
                {!submitted && !typing && currentIdx < scheme.formFields.length &&
                    scheme.formFields[currentIdx].type === "select" && messages.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-wrap gap-2 pl-9">
                            {scheme.formFields[currentIdx].options?.map((opt) => (
                                <button key={opt.value}
                                    onClick={() => handleOption(opt.value, isHi ? opt.labelHi : opt.label)}
                                    className="px-3 py-1.5 rounded-xl glass border border-glass text-xs font-medium hover:border-[hsl(28_100%_54%/0.4)] hover:text-white hover:bg-[hsl(28_100%_54%/0.1)] transition-all">
                                    {isHi ? opt.labelHi : opt.label}
                                </button>
                            ))}
                        </motion.div>
                    )}

                {/* Submitted summary */}
                {submitted && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl border border-emerald-500/30 p-4 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                            <h4 className="font-bold text-white text-sm">{isHi ? "आवेदन सारांश" : "Application Summary"}</h4>
                        </div>
                        <div className="space-y-1.5">
                            {Object.entries(formData).map(([k, v]) => {
                                const field = scheme.formFields.find(f => f.key === k);
                                if (!field) return null;
                                return (
                                    <div key={k} className="flex items-start gap-2 text-xs">
                                        <span className="text-muted-foreground min-w-[120px]">{isHi ? field.labelHi : field.label}:</span>
                                        <span className="text-white font-medium">{v}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <div className="flex items-start gap-2">
                                <Info className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-amber-300 font-semibold mb-1">{isHi ? "आवश्यक दस्तावेज़:" : "Documents Required:"}</p>
                                    <ul className="text-xs text-muted-foreground space-y-0.5">
                                        {(isHi ? scheme.documentsHi : scheme.documents).map((d, i) => (
                                            <li key={i} className="flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        {scheme.officialUrl && (
                            <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl gradient-brand text-white text-xs font-semibold shadow-brand hover:scale-[1.02] transition-all">
                                <ArrowRight className="h-3.5 w-3.5" />
                                {isHi ? "आधिकारिक पोर्टल पर जाएँ" : "Go to Official Portal"}
                            </a>
                        )}
                        <button onClick={onDone}
                            className="mt-2 w-full py-2 rounded-xl glass border border-glass text-xs text-muted-foreground hover:text-white transition-all">
                            {isHi ? "← वापस जाएँ" : "← Back to Schemes"}
                        </button>
                    </motion.div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!submitted && !typing && currentIdx < scheme.formFields.length &&
                scheme.formFields[currentIdx].type !== "select" && (
                    <div className="p-3 border-t border-glass shrink-0">
                        <div className="flex gap-2">
                            <input
                                type={scheme.formFields[currentIdx].type === "number" ? "number" : "text"}
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAnswer(inputVal)}
                                placeholder={scheme.formFields[currentIdx].placeholder || "Type your answer..."}
                                className="flex-1 px-3 py-2.5 rounded-xl bg-[hsl(220_20%_8%)] border border-glass text-white placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[hsl(28_100%_54%/0.5)] transition-all"
                            />
                            <button onClick={() => handleAnswer(inputVal)}
                                className="px-4 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-brand hover:scale-[1.02] transition-all">
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
        </div>
    );
};

// ─── Main AIAssistant ─────────────────────────────────────────────────────────
const AIAssistant = () => {
    const { lang } = useLanguage();
    const isHi = lang === "hi";
    const navigate = useNavigate();
    const { listening, speaking, voiceEnabled, setVoiceEnabled, speak, stopSpeaking, startListening, stopListening } = useElevenLabsVoice();

    const [phase, setPhase] = useState<Phase>("profile");
    const [messages, setMessages] = useState<Message[]>([]);
    const [typing, setTyping] = useState(false);
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
    const [profileStep, setProfileStep] = useState(0);
    const [inputVal, setInputVal] = useState("");
    const [matchedSchemes, setMatchedSchemes] = useState<{ scheme: Scheme; score: number; reasons: string[] }[]>([]);
    const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const uid = () => Math.random().toString(36).slice(2);

    const addBotMsg = (text: string, type: Message["type"] = "text", meta?: any) => {
        setTyping(true);
        setTimeout(() => {
            setMessages(p => [...p, { id: uid(), from: "bot", text, type, meta }]);
            setTyping(false);
            speak(text);
        }, 900);
    };

    const addUserMsg = (text: string) => {
        setMessages(p => [...p, { id: uid(), from: "user", text }]);
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    // Start profile collection
    useEffect(() => {
        const welcome = isHi
            ? "🙏 नमस्ते! मैं सरकार साथी AI हूँ। मैं आपको सही सरकारी योजनाएँ खोजने में मदद करूँगा।"
            : "🙏 Namaste! I'm Sarkar Saathi AI. I'll help you find the right government schemes for you.";
        addBotMsg(welcome);
        setTimeout(() => askProfileQuestion(0), 1800);
    }, []);

    const askProfileQuestion = (idx: number) => {
        if (idx >= profileSteps.length) {
            finishProfile();
            return;
        }
        const step = profileSteps[idx];
        const q = isHi ? step.questionHi : step.question;
        addBotMsg(q, step.type === "chips" ? "chips" : "text", step.chips);
    };

    const finishProfile = () => {
        setPhase("matching");
        const analyzing = isHi
            ? "🔍 बढ़िया! मैं आपके लिए सबसे अच्छी योजनाएँ खोज रहा हूँ..."
            : "🔍 Perfect! Analyzing your profile to find the best schemes for you...";
        addBotMsg(analyzing);
        setTimeout(() => {
            const profile = profileData as UserProfile;
            profile.isStudent = profile.occupation === "student";
            profile.hasAadhaar = true;
            const results = matchSchemes(profile);
            setMatchedSchemes(results);
            const found = isHi
                ? `🎯 मुझे आपके लिए ${results.length} उपयुक्त योजनाएँ मिलीं! इनमें से किसी के लिए आवेदन करें:`
                : `🎯 I found ${results.length} schemes that match your profile! Tap "Apply" on any to start:`;
            setMessages(p => [...p, { id: uid(), from: "bot", text: found, type: "schemes", meta: results }]);
            setPhase("chat");
        }, 2000);
    };

    const handleProfileAnswer = (value: string, displayText: string) => {
        const step = profileSteps[profileStep];
        addUserMsg(displayText);

        let parsedValue: any = value;
        if (step.key === "age" || step.key === "annualIncome" || step.key === "landHolding") {
            parsedValue = parseFloat(value) || 0;
        } else if (step.key === "hasBankAccount" || step.key === "hasBPLCard" ||
            step.key === "hasLPGConnection" || step.key === "hasGirlChild") {
            parsedValue = value === "true";
        }

        setProfileData(p => ({ ...p, [step.key]: parsedValue }));
        const next = profileStep + 1;
        setProfileStep(next);
        setTimeout(() => askProfileQuestion(next), 600);
    };

    const handleChipSelect = (chip: { value: string; label: string; labelHi: string }) => {
        handleProfileAnswer(chip.value, isHi ? chip.labelHi : chip.label);
    };

    const handleTextInput = () => {
        if (!inputVal.trim()) return;
        if (phase === "chat") {
            askGroq(inputVal);
        } else {
            handleProfileAnswer(inputVal, inputVal);
            setInputVal("");
        }
    };

    const askGroq = async (text: string) => {
        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!groqKey) {
            addBotMsg(isHi ? "डेवलपर ने अभी तक .env में Groq API Key सेट नहीं किया है।" : "The developer hasn't set the Groq API Key in the .env file yet.");
            return;
        }

        addUserMsg(text);
        setInputVal("");
        setTyping(true);

        try {
            const systemPrompt = `You are Sarkar Saathi AI, a helpful Indian government scheme assistant. 
User Profile: ${JSON.stringify(profileData)}
Matched Schemes: ${JSON.stringify(matchedSchemes.map(m => m.scheme.name))}
Answer the user's questions in ${lang === "hi" ? "Hindi" : "English"}.
Keep responses brief, polite, and directly address the user's profile and matched schemes. DO NOT make up schemes not in the list.`;

            const history = messages
                .filter(m => m.type === "text" || !m.type)
                .slice(-6)
                .map(m => ({
                    role: m.from === "bot" ? "assistant" : "user",
                    content: m.text
                }));

            const res = await window.fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...history,
                        { role: "user", content: text }
                    ]
                })
            });

            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            const botReply = data.choices[0].message.content;

            setTyping(false);
            addBotMsg(botReply);
        } catch (e) {
            console.error(e);
            setTyping(false);
            addBotMsg(isHi ? "माफ़ करें, मैं सर्वर तक नहीं पहुँच सकता। अपना API Key जांचें।" : "Sorry, I couldn't reach the server. Please check your API key.");
        }
    };

    const handleApplyScheme = (scheme: Scheme) => {
        setSelectedScheme(scheme);
        setPhase("form");
    };

    const handleFormDone = () => {
        setSelectedScheme(null);
        setPhase("chat");
    };

    const currentStep = profileSteps[profileStep];
    const isChipStep = currentStep?.type === "chips";
    const showInput = phase === "profile" && !isChipStep && !typing;
    const showChips = phase === "profile" && isChipStep && !typing && messages.length > 0;

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
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {phase === "profile" ? `Step ${Math.min(profileStep + 1, profileSteps.length)}/${profileSteps.length}` :
                                        phase === "matching" ? "Analyzing..." :
                                            phase === "form" ? "Form Filling" : "Schemes Found"}
                                </span>
                            </div>
                            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white">Sarkar Saathi AI</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setVoiceEnabled(!voiceEnabled); if (speaking) stopSpeaking(); }}
                                className={`p-2 rounded-xl glass border transition-all ${voiceEnabled ? "border-[hsl(28_100%_54%/0.4)] text-[hsl(28,100%,64%)]" : "border-glass text-muted-foreground"}`}
                                title={voiceEnabled ? "Disable voice" : "Enable voice"}
                            >
                                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </button>
                            <LanguageSelector />
                        </div>
                    </div>

                </motion.div>

                {/* FORM PHASE */}
                <AnimatePresence mode="wait">
                    {phase === "form" && selectedScheme && (
                        <motion.div key="form" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                            className="glass-card rounded-3xl border border-glass overflow-hidden shadow-elevated"
                            style={{ height: "76vh" }}>
                            <FormFiller scheme={selectedScheme} onDone={handleFormDone} speak={speak} lang={lang} />
                        </motion.div>
                    )}

                    {/* CHAT / PROFILE PHASE */}
                    {phase !== "form" && (
                        <motion.div key="chat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-3xl border border-glass overflow-hidden flex flex-col shadow-elevated"
                            style={{ height: "76vh" }}>
                            {/* Chat header bar */}
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
                                        {speaking ? "Speaking..." : listening ? "Listening..." : "Online · AI Powered"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {["bg-red-400", "bg-amber-400", "bg-emerald-400"].map((c, i) => (
                                        <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Progress bar for profile */}
                            {phase === "profile" && (
                                <div className="px-5 pt-2 pb-0 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full gradient-brand rounded-full transition-all duration-500"
                                                style={{ width: `${(profileStep / profileSteps.length) * 100}%` }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{profileStep}/{profileSteps.length}</span>
                                    </div>
                                </div>
                            )}

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <AnimatePresence>
                                    {messages.map((msg) => (
                                        <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex gap-2.5 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                                            {msg.from === "bot" && (
                                                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5 shadow-brand">
                                                    <Bot className="h-4 w-4 text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[80%] ${msg.type === "schemes" ? "w-full max-w-full" : ""}`}>
                                                {(msg.type === "text" || msg.type === "chips" || !msg.type) && (
                                                    <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${msg.from === "user" ? "gradient-brand text-white rounded-br-sm shadow-brand" : "glass border border-glass text-foreground rounded-bl-sm"
                                                        }`}>{msg.text}</div>
                                                )}
                                                {msg.type === "schemes" && (
                                                    <div className="space-y-2 w-full">
                                                        <div className="glass border border-glass rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-foreground">{msg.text}</div>
                                                        <div className="space-y-2">
                                                            {(msg.meta as any[]).map(({ scheme, score, reasons }) => (
                                                                <SchemeResultCard key={scheme.id} scheme={scheme} score={score} reasons={reasons} onApply={handleApplyScheme} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {msg.from === "user" && (
                                                <div className="w-8 h-8 rounded-full glass border border-glass flex items-center justify-center shrink-0 mt-0.5">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {typing && (
                                    <div className="flex gap-2.5 justify-start">
                                        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center shrink-0 shadow-brand">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="glass border border-glass rounded-2xl rounded-bl-sm"><TypingIndicator /></div>
                                    </div>
                                )}

                                {/* Chip options */}
                                {showChips && currentStep.chips && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-wrap gap-2 pl-10">
                                        {currentStep.chips.map((chip) => (
                                            <button key={chip.value} onClick={() => handleChipSelect(chip)}
                                                className="px-4 py-2 rounded-2xl glass border border-glass text-sm font-medium text-foreground hover:border-[hsl(28_100%_54%/0.5)] hover:text-white hover:bg-[hsl(28_100%_54%/0.08)] active:scale-95 transition-all duration-200">
                                                {isHi ? chip.labelHi : chip.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}

                                <div ref={bottomRef} />
                            </div>

                            {/* Input bar */}
                            {(showInput || phase === "chat") && (
                                <div className="p-3 border-t border-glass shrink-0">
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onMouseDown={() => startListening()}
                                            onMouseUp={async () => { const text = await stopListening(); if (text) setInputVal(text); }}
                                            className={`p-2.5 rounded-xl border transition-all duration-200 ${listening ? "gradient-brand border-transparent text-white shadow-brand animate-pulse" : "glass border-glass text-muted-foreground hover:text-white"
                                                }`}
                                            title="Hold to speak"
                                        >
                                            {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                        </button>
                                        <input
                                            type="text"
                                            value={inputVal}
                                            onChange={e => setInputVal(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleTextInput()}
                                            placeholder={phase === "chat"
                                                ? (isHi ? "योजनाओं के बारे में कुछ भी पूछें..." : "Ask me anything about these schemes...")
                                                : (isHi ? "यहाँ टाइप करें या माइक दबाएँ..." : "Type or hold mic to speak...")}
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-[hsl(220_20%_8%)] border border-glass text-white placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[hsl(28_100%_54%/0.5)] transition-all"
                                        />
                                        <button onClick={handleTextInput}
                                            disabled={!inputVal.trim()}
                                            className="p-2.5 rounded-xl gradient-brand text-white shadow-brand disabled:opacity-40 hover:shadow-[0_0_30px_hsl(28_100%_54%/0.4)] hover:scale-[1.05] transition-all duration-200">
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Voice hint */}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                    className="text-center text-xs text-muted-foreground mt-3">
                    🎙️ {isHi ? "माइक बटन दबाकर बोलें — हिंदी, तमिल, तेलुगु, मराठी में भी" : "Hold mic button to speak in Hindi, Tamil, Telugu, Marathi & more"}
                </motion.p>
            </div>
        </div>
    );
};

export default AIAssistant;
