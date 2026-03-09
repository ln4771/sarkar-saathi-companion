import { useLanguage } from "@/contexts/LanguageContext";
import { MessageSquare, Mic, WifiOff, FileCheck, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const HeroSection = () => {
  const { tr } = useLanguage();

  const features = [
    { icon: Mic, label: tr("voiceFirst"), color: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400" },
    { icon: WifiOff, label: tr("worksOffline"), color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400" },
    { icon: FileCheck, label: tr("schemesCount"), color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(28_100%_54%/0.06)] blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(150_55%_38%/0.07)] blur-[100px]" />
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-[hsl(220_100%_60%/0.04)] blur-[80px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(210 20% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 20% 96%) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-[15%] right-[15%] w-3 h-3 rounded-full bg-[hsl(28_100%_54%)]"
          animate={{ y: [0, -15, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-[60%] right-[5%] w-2 h-2 rounded-full bg-[hsl(150_55%_38%)]"
          animate={{ y: [0, 10, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-[40%] left-[8%] w-4 h-4 rounded-full border border-[hsl(28_100%_54%/0.4)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative py-20 md:py-32 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[hsl(28_100%_54%/0.25)] text-sm font-medium">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-[hsl(28_100%_54%)]" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-[hsl(28_100%_54%)] animate-ping opacity-60" />
              </div>
              <span className="text-[hsl(28,100%,70%)]">AI-Powered</span>
              <span className="text-border">•</span>
              <span className="text-muted-foreground">Multilingual</span>
              <span className="text-border">•</span>
              <span className="text-emerald-400">100% Free</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6">
              <span className="text-gradient-hero">Sarkar Saathi</span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
          >
            {tr("tagline")} — in your language, at your pace, for free.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="https://wa.me/14155238886"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl gradient-brand text-white font-semibold text-base shadow-brand hover:shadow-[0_0_60px_hsl(28_100%_54%/0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <MessageSquare className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              {tr("messageNow")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <Link
              to="/schemes"
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl glass border border-glass text-foreground font-semibold text-base hover:border-[hsl(28_100%_54%/0.4)] hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Zap className="h-5 w-5 text-[hsl(28,100%,64%)] group-hover:text-yellow-400 transition-colors" />
              {tr("exploreSchemes")}
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-br border text-sm font-medium transition-all duration-200 ${f.color}`}
              >
                <f.icon className="h-4 w-4" />
                <span>{f.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scrolling marquee of scheme names */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 overflow-hidden"
        >
          <p className="text-center text-xs text-muted-foreground mb-4 tracking-widest uppercase">Covering popular schemes</p>
          <div className="flex gap-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            {[
              "PM-KISAN", "Ayushman Bharat", "MGNREGA", "PM Awas Yojana", "PM Ujjwala", "PM Mudra", "Sukanya Samriddhi", "PM Fasal Bima", "Jan Dhan Yojana", "NSP Scholarship",
              "PM-KISAN", "Ayushman Bharat", "MGNREGA", "PM Awas Yojana", "PM Ujjwala", "PM Mudra", "Sukanya Samriddhi", "PM Fasal Bima", "Jan Dhan Yojana", "NSP Scholarship",
            ].map((scheme, i) => (
              <motion.span
                key={i}
                className="shrink-0 px-4 py-1.5 rounded-full glass border border-glass text-xs text-muted-foreground whitespace-nowrap"
                animate={{ x: [0, -2000] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: i < 10 ? 0 : 0 }}
              >
                {scheme}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
