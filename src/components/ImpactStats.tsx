import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Globe2, ShieldCheck } from "lucide-react";

interface CounterProps {
  end: number;
  suffix: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

const Counter = ({ end, suffix, label, sublabel, icon: Icon, gradient, delay = 0 }: CounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = end / steps;
          let current = 0;
          setTimeout(() => {
            const timer = setInterval(() => {
              current += increment;
              if (current >= end) {
                setCount(end);
                clearInterval(timer);
              } else {
                setCount(Math.floor(current));
              }
            }, duration / steps);
          }, delay);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: delay / 1000, duration: 0.6 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="counter-card rounded-2xl p-6 text-center transition-all duration-300 group relative overflow-hidden"
    >
      {/* Glow bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-300`} />

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>

      {/* Number */}
      <div className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold text-white mb-1">
        {count.toLocaleString()}
        <span className="text-gradient-brand">{suffix}</span>
      </div>

      {/* Label */}
      <div className="text-sm font-semibold text-foreground mb-0.5">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
    </motion.div>
  );
};

const ImpactStats = () => {
  const stats = [
    {
      end: 700,
      suffix: "M+",
      label: "Potential Reach",
      sublabel: "Rural Indians covered",
      icon: Users,
      gradient: "from-orange-500 to-amber-500",
      delay: 0,
    },
    {
      end: 50,
      suffix: "+",
      label: "Government Schemes",
      sublabel: "Across all ministries",
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-teal-500",
      delay: 150,
    },
    {
      end: 15,
      suffix: "+",
      label: "Languages",
      sublabel: "Voice & text support",
      icon: Globe2,
      gradient: "from-violet-500 to-purple-600",
      delay: 300,
    },
    {
      end: 40,
      suffix: "%",
      label: "Fewer Rejections",
      sublabel: "With AI guidance",
      icon: TrendingUp,
      gradient: "from-blue-500 to-cyan-500",
      delay: 450,
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Radial glow BG */}
      <div className="absolute inset-0 bg-[hsl(220_20%_6%)] pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[hsl(28_100%_54%/0.05)] blur-[120px]" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-glass text-xs text-muted-foreground uppercase tracking-widest mb-4">
            Our Impact
          </span>
          <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold text-white mb-3">
            Numbers That <span className="text-gradient-brand">Matter</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Bridging the gap between citizens and government benefits — at scale.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {stats.map((s, i) => (
            <Counter key={i} {...s} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default ImpactStats;
