import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import ImpactStats from "@/components/ImpactStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";

const Index = () => {
  const { tr } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <HowItWorks />
      <ImpactStats />


      {/* Footer */}
      <footer className="border-t border-glass py-10">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm font-['Space_Grotesk']">स</span>
              </div>
              <div>
                <p className="font-['Space_Grotesk'] font-bold text-white text-sm">Sarkar Saathi</p>
                <p className="text-xs text-muted-foreground">Your AI Companion for Government Schemes</p>
              </div>
            </div>
            <div className="tricolor-stripe w-32 md:w-48 rounded-full" />
            <p className="text-xs text-muted-foreground">
              © 2025 Sarkar Saathi. Made with ❤️ for India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
