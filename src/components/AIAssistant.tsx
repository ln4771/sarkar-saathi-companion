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
type L = Record<string, string>;

interface Message {
    id: string;
    from: "bot" | "user";
    text: string;
    type?: "text" | "chips" | "profile_done" | "schemes" | "form_field" | "success";
    meta?: any;
}

interface ProfileStep {
    key: keyof UserProfile;
    q: L;
    type: "text" | "number" | "chips";
    chips?: { value: string; l: L }[];
}

// ─── Multilingual helper ─────────────────────────────────────────────────────
const tl = (map: L, lang: string) => map[lang] || map["en"];

const yesNo = (lang: string) => [
    { value: "true", l: { en: "✅ Yes", hi: "✅ हाँ", ta: "✅ ஆம்", mr: "✅ होय", te: "✅ అవును" } },
    { value: "false", l: { en: "❌ No", hi: "❌ नहीं", ta: "❌ இல்லை", mr: "❌ नाही", te: "❌ కాదు" } },
];

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

// ─── UI strings ──────────────────────────────────────────────────────────────
const ui = {
    welcome: { en: "🙏 Namaste! I'm Sarkar Saathi AI. I'll help you find the right government schemes for you.", hi: "🙏 नमस्ते! मैं सरकार साथी AI हूँ। मैं आपको सही सरकारी योजनाएँ खोजने में मदद करूँगा।", ta: "🙏 வணக்கம்! நான் சர்கார் சாதி AI. உங்களுக்கு சரியான அரசு திட்டங்களைக் கண்டறிய உதவுவேன்.", mr: "🙏 नमस्कार! मी सरकार साथी AI आहे. मी तुम्हाला योग्य सरकारी योजना शोधण्यात मदत करेन.", te: "🙏 నమస్కారం! నేను సర్కార్ సాథీ AI. మీకు సరైన ప్రభుత్వ పథకాలను కనుగొనడంలో సహాయం చేస్తాను." },
    analyzing: { en: "🔍 Perfect! Analyzing your profile to find the best schemes for you...", hi: "🔍 बढ़िया! मैं आपके लिए सबसे अच्छी योजनाएँ खोज रहा हूँ...", ta: "🔍 சிறப்பு! உங்களுக்கான சிறந்த திட்டங்களைத் தேடுகிறேன்...", mr: "🔍 छान! तुमच्यासाठी सर्वोत्तम योजना शोधत आहे...", te: "🔍 అద్భుతం! మీ కోసం ఉత్తమ పథకాలను వెతుకుతున్నాను..." },
    found: { en: "🎯 I found {n} schemes that match your profile! Tap \"Apply\" on any to start:", hi: "🎯 मुझे आपके लिए {n} उपयुक्त योजनाएँ मिलीं! इनमें से किसी के लिए आवेदन करें:", ta: "🎯 உங்கள் சுயவிவரத்துடன் பொருந்தும் {n} திட்டங்கள் கண்டறியப்பட்டன! விண்ணப்பிக்க தட்டவும்:", mr: "🎯 तुमच्या प्रोफाइलशी जुळणाऱ्या {n} योजना सापडल्या! अर्ज करण्यासाठी टॅप करा:", te: "🎯 మీ ప్రొఫైల్‌కు సరిపోయే {n} పథకాలు దొరికాయి! దరఖాస్తు చేయడానికి నొక్కండి:" },
    apply: { en: "Apply for this Scheme", hi: "आवेदन करें", ta: "இந்தத் திட்டத்திற்கு விண்ணப்பிக்கவும்", mr: "या योजनेसाठी अर्ज करा", te: "ఈ పథకానికి దరఖాస్తు చేయండి" },
    askAnything: { en: "Ask me anything about these schemes...", hi: "योजनाओं के बारे में कुछ भी पूछें...", ta: "இந்த திட்டங்கள் பற்றி எதையும் கேளுங்கள்...", mr: "या योजनांबद्दल काहीही विचारा...", te: "ఈ పథకాల గురించి ఏదైనా అడగండి..." },
    typeOrSpeak: { en: "Type or hold mic to speak...", hi: "यहाँ टाइप करें या माइक दबाएँ...", ta: "டைப் செய்யுங்கள் அல்லது மைக் அழுத்துங்கள்...", mr: "टाइप करा किंवा माइक दाबा...", te: "టైప్ చేయండి లేదా మైక్ నొక్కండి..." },
    error: { en: "Sorry, something went wrong. Please try again.", hi: "माफ़ करें, कोई त्रुटि हुई। कृपया पुनः प्रयास करें।", ta: "மன்னிக்கவும், ஏதோ தவறு ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.", mr: "क्षमस्व, काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.", te: "క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి." },
    micHint: { en: "Hold mic button to speak in Hindi, Tamil, Telugu, Marathi & more", hi: "माइक बटन दबाकर बोलें — हिंदी, तमिल, तेलुगु, मराठी में भी", ta: "மைக் பொத்தானை அழுத்திப் பிடித்து பேசுங்கள்", mr: "माइक बटन दाबून बोला — हिंदी, तमिळ, तेलुगू, मराठीमध्ये", te: "మైక్ బటన్ నొక్కి మాట్లాడండి" },
    myApps: { en: "My Applications", hi: "मेरे आवेदन", ta: "எனது விண்ணப்பங்கள்", mr: "माझे अर्ज", te: "నా దరఖాస్తులు" },
};

// ─── Profile questions ────────────────────────────────────────────────────────
const profileSteps: ProfileStep[] = [
    {
        key: "name", type: "text",
        q: { en: "First, may I know your name? 😊", hi: "पहले, क्या मैं आपका नाम जान सकता हूँ? 😊", ta: "முதலில், உங்கள் பெயரை அறியலாமா? 😊", mr: "प्रथम, मी तुमचे नाव जाणून घेऊ शकतो का? 😊", te: "మొదట, మీ పేరు తెలుసుకోవచ్చా? 😊" },
    },
    {
        key: "age", type: "number",
        q: { en: "How old are you?", hi: "आपकी उम्र क्या है?", ta: "உங்கள் வயது என்ன?", mr: "तुमचे वय किती आहे?", te: "మీ వయసు ఎంత?" },
    },
    {
        key: "gender", type: "chips",
        q: { en: "What is your gender?", hi: "आपका लिंग क्या है?", ta: "உங்கள் பாலினம் என்ன?", mr: "तुमचे लिंग काय आहे?", te: "మీ లింగం ఏమిటి?" },
        chips: [
            { value: "male", l: { en: "Male", hi: "पुरुष", ta: "ஆண்", mr: "पुरुष", te: "పురుషుడు" } },
            { value: "female", l: { en: "Female", hi: "महिला", ta: "பெண்", mr: "स्त्री", te: "స్త్రీ" } },
            { value: "other", l: { en: "Other", hi: "अन्य", ta: "மற்றவை", mr: "इतर", te: "ఇతరం" } },
        ],
    },
    {
        key: "state", type: "chips",
        q: { en: "Which state are you from?", hi: "आप किस राज्य से हैं?", ta: "நீங்கள் எந்த மாநிலத்தைச் சேர்ந்தவர்?", mr: "तुम्ही कोणत्या राज्यातून आहात?", te: "మీరు ఏ రాష్ట్రం నుండి?" },
        chips: [
            { value: "UP", l: { en: "Uttar Pradesh", hi: "उत्तर प्रदेश", ta: "உத்தர பிரதேசம்", mr: "उत्तर प्रदेश", te: "ఉత్తర ప్రదేశ్" } },
            { value: "MH", l: { en: "Maharashtra", hi: "महाराष्ट्र", ta: "மகாராஷ்டிரா", mr: "महाराष्ट्र", te: "మహారాష్ట్ర" } },
            { value: "RJ", l: { en: "Rajasthan", hi: "राजस्थान", ta: "ராஜஸ்தான்", mr: "राजस्थान", te: "రాజస్థాన్" } },
            { value: "MP", l: { en: "Madhya Pradesh", hi: "मध्य प्रदेश", ta: "மத்திய பிரதேசம்", mr: "मध्य प्रदेश", te: "మధ్య ప్రదేశ్" } },
            { value: "GJ", l: { en: "Gujarat", hi: "गुजरात", ta: "குஜராத்", mr: "गुजरात", te: "గుజరాత్" } },
            { value: "TN", l: { en: "Tamil Nadu", hi: "तमिलनाडु", ta: "தமிழ்நாடு", mr: "तमिळनाडू", te: "తమిళనాడు" } },
            { value: "AP", l: { en: "Andhra Pradesh", hi: "आंध्र प्रदेश", ta: "ஆந்திர பிரதேசம்", mr: "आंध्र प्रदेश", te: "ఆంధ్ర ప్రదేశ్" } },
            { value: "TS", l: { en: "Telangana", hi: "तेलंगाना", ta: "தெலங்கானா", mr: "तेलंगणा", te: "తెలంగాణ" } },
            { value: "KA", l: { en: "Karnataka", hi: "कर्नाटक", ta: "கர்நாடகா", mr: "कर्नाटक", te: "కర్ణాటక" } },
            { value: "OT", l: { en: "Other State", hi: "अन्य राज्य", ta: "பிற மாநிலம்", mr: "इतर राज्य", te: "ఇతర రాష్ట్రం" } },
        ],
    },
    {
        key: "occupation", type: "chips",
        q: { en: "What is your main occupation?", hi: "आपका मुख्य व्यवसाय क्या है?", ta: "உங்கள் முக்கிய தொழில் என்ன?", mr: "तुमचा मुख्य व्यवसाय काय आहे?", te: "మీ ప్రధాన వృత్తి ఏమిటి?" },
        chips: [
            { value: "farmer", l: { en: "🌾 Farmer", hi: "🌾 किसान", ta: "🌾 விவசாயி", mr: "🌾 शेतकरी", te: "🌾 రైతు" } },
            { value: "labourer", l: { en: "🔨 Daily Labourer", hi: "🔨 दैनिक मजदूर", ta: "🔨 தினக்கூலி", mr: "🔨 दैनिक मजूर", te: "🔨 దినసరి కూలీ" } },
            { value: "business", l: { en: "🏪 Business Owner", hi: "🏪 व्यापारी", ta: "🏪 வணிக உரிமையாளர்", mr: "🏪 व्यापारी", te: "🏪 వ్యాపారి" } },
            { value: "student", l: { en: "📚 Student", hi: "📚 छात्र", ta: "📚 மாணவர்", mr: "📚 विद्यार्थी", te: "📚 విద్యార్థి" } },
            { value: "unemployed", l: { en: "🔍 Unemployed", hi: "🔍 बेरोजगार", ta: "🔍 வேலையில்லாத", mr: "🔍 बेरोजगार", te: "🔍 నిరుద్యోగి" } },
            { value: "other", l: { en: "👤 Other", hi: "👤 अन्य", ta: "👤 மற்றவை", mr: "👤 इतर", te: "👤 ఇతరం" } },
        ],
    },
    {
        key: "annualIncome", type: "number",
        q: { en: "What is your approximate annual household income (in ₹)?", hi: "आपकी अनुमानित वार्षिक पारिवारिक आय क्या है (₹ में)?", ta: "உங்கள் தோராயமான வருடாந்திர குடும்ப வருமானம் (₹)?", mr: "तुमचे अंदाजे वार्षिक कौटुंबिक उत्पन्न (₹ मध्ये)?", te: "మీ సుమారు వార్షిక కుటుంబ ఆదాయం (₹లో)?" },
    },
    {
        key: "category", type: "chips",
        q: { en: "What is your caste/social category?", hi: "आपकी जाति/सामाजिक श्रेणी क्या है?", ta: "உங்கள் சாதி/சமூக வகை என்ன?", mr: "तुमची जात/सामाजिक श्रेणी काय आहे?", te: "మీ కులం/సామాజిక వర్గం ఏమిటి?" },
        chips: [
            { value: "SC", l: { en: "Scheduled Caste (SC)", hi: "अनुसूचित जाति (SC)", ta: "பட்டியல் சாதி (SC)", mr: "अनुसूचित जाती (SC)", te: "షెడ్యూల్డ్ కులం (SC)" } },
            { value: "ST", l: { en: "Scheduled Tribe (ST)", hi: "अनुसूचित जनजाति (ST)", ta: "பழங்குடி (ST)", mr: "अनुसूचित जमाती (ST)", te: "షెడ్యూల్డ్ తెగ (ST)" } },
            { value: "OBC", l: { en: "OBC", hi: "OBC", ta: "OBC", mr: "OBC", te: "OBC" } },
            { value: "General", l: { en: "General", hi: "सामान्य", ta: "பொது", mr: "सामान्य", te: "జనరల్" } },
            { value: "EWS", l: { en: "EWS", hi: "EWS", ta: "EWS", mr: "EWS", te: "EWS" } },
            { value: "Minority", l: { en: "Minority", hi: "अल्पसंख्यक", ta: "சிறுபான்மையினர்", mr: "अल्पसंख्याक", te: "మైనారిటీ" } },
        ],
    },
    {
        key: "landHolding", type: "number",
        q: { en: "Do you own agricultural land? If yes, how many acres? (Enter 0 if none)", hi: "क्या आपके पास कृषि भूमि है? यदि हाँ, तो कितने एकड़? (नहीं है तो 0 लिखें)", ta: "உங்களுக்கு விவசாய நிலம் உள்ளதா? இருந்தால் எத்தனை ஏக்கர்? (இல்லை என்றால் 0)", mr: "तुमच्याकडे शेतजमीन आहे का? असल्यास किती एकर? (नसल्यास 0 लिहा)", te: "మీకు వ్యవసాయ భూమి ఉందా? ఉంటే ఎన్ని ఎకరాలు? (లేకపోతే 0)" },
    },
    {
        key: "hasBankAccount", type: "chips",
        q: { en: "Do you have a bank account?", hi: "क्या आपके पास बैंक खाता है?", ta: "உங்களிடம் வங்கிக் கணக்கு உள்ளதா?", mr: "तुमचे बँक खाते आहे का?", te: "మీకు బ్యాంక్ ఖాతా ఉందా?" },
        chips: yesNo(""),
    },
    {
        key: "hasBPLCard", type: "chips",
        q: { en: "Do you have a BPL (Below Poverty Line) ration card?", hi: "क्या आपके पास BPL राशन कार्ड है?", ta: "உங்களிடம் BPL ரேஷன் கார்டு உள்ளதா?", mr: "तुमच्याकडे BPL रेशन कार्ड आहे का?", te: "మీ దగ్గర BPL రేషన్ కార్డ్ ఉందా?" },
        chips: yesNo(""),
    },
    {
        key: "hasLPGConnection", type: "chips",
        q: { en: "Do you have an LPG gas connection at home?", hi: "क्या आपके घर में LPG गैस कनेक्शन है?", ta: "உங்கள் வீட்டில் LPG இணைப்பு உள்ளதா?", mr: "तुमच्या घरी LPG गॅस कनेक्शन आहे का?", te: "మీ ఇంట్లో LPG గ్యాస్ కనెక్షన్ ఉందా?" },
        chips: yesNo(""),
    },
    {
        key: "hasGirlChild", type: "chips",
        q: { en: "Do you have a girl child under 10 years old?", hi: "क्या आपके परिवार में 10 वर्ष से कम उम्र की बेटी है?", ta: "உங்கள் குடும்பத்தில் 10 வயதுக்குட்பட்ட பெண் குழந்தை உள்ளதா?", mr: "तुमच्या कुटुंबात 10 वर्षांखालील मुलगी आहे का?", te: "మీ కుటుంబంలో 10 సంవత్సరాల లోపు ఆడపిల్ల ఉందా?" },
        chips: yesNo(""),
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

// ─── SchemeCard ──────────────────────────────────────────────────────────────
const SchemeResultCard = ({
    scheme, score, reasons, onApply
}: {
    scheme: Scheme; score: number; reasons: string[]; onApply: (s: Scheme) => void;
}) => {
    const { lang } = useLanguage();
    const IconComp = (Icons as any)[scheme.icon] || Icons.FileText;
    const grad = catColors[scheme.category] || "from-gray-500 to-slate-600";
    const pct = Math.min(100, score);

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
            className="glass-card rounded-2xl border border-glass p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-lg`}>
                    <IconComp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm leading-tight">{lang === "hi" ? scheme.nameHi : scheme.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{lang === "hi" ? scheme.benefitHi : scheme.benefit}</p>
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
            <button onClick={() => onApply(scheme)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl gradient-brand text-white text-xs font-semibold shadow-brand hover:shadow-[0_0_30px_hsl(28_100%_54%/0.4)] hover:scale-[1.02] transition-all duration-200">
                <FileText className="h-3.5 w-3.5" />
                {tl(ui.apply, lang)}
                <ArrowRight className="h-3 w-3" />
            </button>
        </motion.div>
    );
};

// ─── FormFiller ──────────────────────────────────────────────────────────────
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
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm whitespace-pre-line leading-relaxed ${msg.from === "user" ? "gradient-brand text-white rounded-br-sm" : "glass border border-glass text-foreground rounded-bl-sm"}`}>{msg.text}</div>
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

                {!submitted && !typing && currentIdx < scheme.formFields.length &&
                    scheme.formFields[currentIdx].type === "select" && messages.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 pl-9">
                            {scheme.formFields[currentIdx].options?.map((opt) => (
                                <button key={opt.value}
                                    onClick={() => handleOption(opt.value, isHi ? opt.labelHi : opt.label)}
                                    className="px-3 py-1.5 rounded-xl glass border border-glass text-xs font-medium hover:border-[hsl(28_100%_54%/0.4)] hover:text-white hover:bg-[hsl(28_100%_54%/0.1)] transition-all">
                                    {isHi ? opt.labelHi : opt.label}
                                </button>
                            ))}
                        </motion.div>
                    )}

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
    const navigate = useNavigate();
    const { listening, speaking, voiceEnabled, setVoiceEnabled, speak, speakSequentially, stopSpeaking, startListening, stopListening } = useElevenLabsVoice(lang);

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

    const addBotMsg = (text: string, type: Message["type"] = "text", meta?: any, shouldSpeak = true) => {
        setTyping(true);
        setTimeout(() => {
            setMessages(p => [...p, { id: uid(), from: "bot", text, type, meta }]);
            setTyping(false);
            if (shouldSpeak && voiceEnabled) speakSequentially([text]);
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
        const welcome = tl(ui.welcome, lang);
        addBotMsg(welcome, "text", undefined, false);
        setTimeout(() => {
            const step = profileSteps[0];
            const q = tl(step.q, lang);
            addBotMsg(q, step.type === "chips" ? "chips" : "text", step.chips, false);
            if (voiceEnabled) speakSequentially([welcome, q]);
        }, 1800);
    }, []);

    const askProfileQuestion = (idx: number) => {
        if (idx >= profileSteps.length) {
            finishProfile();
            return;
        }
        const step = profileSteps[idx];
        const q = tl(step.q, lang);
        addBotMsg(q, step.type === "chips" ? "chips" : "text", step.chips);
    };

    const finishProfile = () => {
        setPhase("matching");
        addBotMsg(tl(ui.analyzing, lang));
        setTimeout(() => {
            const profile = profileData as UserProfile;
            profile.isStudent = profile.occupation === "student";
            profile.hasAadhaar = true;
            const results = matchSchemes(profile);
            setMatchedSchemes(results);
            const found = tl(ui.found, lang).replace("{n}", String(results.length));
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

    const handleChipSelect = (chip: { value: string; l: L }) => {
        handleProfileAnswer(chip.value, tl(chip.l, lang));
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
        addUserMsg(text);
        setInputVal("");
        setTyping(true);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const systemPrompt = `You are Sarkar Saathi AI, a helpful Indian government scheme assistant. 
User Profile: ${JSON.stringify(profileData)}
Matched Schemes: ${JSON.stringify(matchedSchemes.map(m => m.scheme.name))}
Keep responses brief, polite, and directly address the user's profile and matched schemes. DO NOT make up schemes not in the list.`;

            const history = messages
                .filter(m => m.type === "text" || !m.type)
                .slice(-6)
                .map(m => ({
                    role: m.from === "bot" ? "assistant" : "user",
                    content: m.text
                }));

            const res = await window.fetch(`${supabaseUrl}/functions/v1/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...history,
                        { role: "user", content: text }
                    ],
                    mode: "discover",
                    language: lang,
                })
            });

            if (!res.ok) throw new Error("API Error");

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No reader");

            const decoder = new TextDecoder();
            let botReply = "";

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
                        if (delta) botReply += delta;
                    } catch {}
                }
            }

            setTyping(false);
            if (botReply) addBotMsg(botReply);
        } catch (e) {
            console.error(e);
            setTyping(false);
            addBotMsg(tl(ui.error, lang));
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

                            {/* Progress bar */}
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
                                                    <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${msg.from === "user" ? "gradient-brand text-white rounded-br-sm shadow-brand" : "glass border border-glass text-foreground rounded-bl-sm"}`}>{msg.text}</div>
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
                                                {msg.from === "bot" && msg.text && (
                                                    <button
                                                        onClick={() => speaking ? stopSpeaking() : speakSequentially([msg.text])}
                                                        className="inline-flex items-center justify-center w-6 h-6 rounded-full glass border border-glass text-muted-foreground hover:text-[hsl(28,100%,64%)] transition-all mt-1"
                                                        title={speaking ? "Stop" : "Play aloud"}
                                                    >
                                                        {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                                    </button>
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
                                {showChips && currentStep?.chips && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-wrap gap-2 pl-10">
                                        {currentStep.chips.map((chip) => (
                                            <button key={chip.value} onClick={() => handleChipSelect(chip)}
                                                className="px-4 py-2 rounded-2xl glass border border-glass text-sm font-medium text-foreground hover:border-[hsl(28_100%_54%/0.5)] hover:text-white hover:bg-[hsl(28_100%_54%/0.08)] active:scale-95 transition-all duration-200">
                                                {tl(chip.l, lang)}
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
                                            className={`p-2.5 rounded-xl border transition-all duration-200 ${listening ? "gradient-brand border-transparent text-white shadow-brand animate-pulse" : "glass border-glass text-muted-foreground hover:text-white"}`}
                                            title="Hold to speak"
                                        >
                                            {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                        </button>
                                        <input
                                            type="text"
                                            value={inputVal}
                                            onChange={e => setInputVal(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleTextInput()}
                                            placeholder={phase === "chat" ? tl(ui.askAnything, lang) : tl(ui.typeOrSpeak, lang)}
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
                    🎙️ {tl(ui.micHint, lang)}
                </motion.p>
            </div>
        </div>
    );
};

export default AIAssistant;
