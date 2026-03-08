import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, X, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PrefillData {
  scheme_id: string;
  scheme_name: string;
  prefill: {
    full_name?: string;
    annual_income?: string;
    land_size?: string;
    aadhaar_status?: string;
    family_size?: string;
    category?: string;
  };
}

interface ApplicationFormProps {
  data: PrefillData;
  onClose: () => void;
  onSubmitted: () => void;
}

const ApplicationForm = ({ data, onClose, onSubmitted }: ApplicationFormProps) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: data.prefill.full_name || "",
    email: user?.email || "",
    mobile_number: user?.user_metadata?.mobile_number || "",
    annual_income: data.prefill.annual_income || "",
    land_size: data.prefill.land_size || "",
    aadhaar_status: data.prefill.aadhaar_status || "",
    family_size: data.prefill.family_size || "",
    category: data.prefill.category || "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.mobile_number) {
      toast.error("Please fill in name and mobile number");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("applications").insert({
        user_id: user?.id || null,
        scheme_id: data.scheme_id,
        scheme_name: data.scheme_name,
        ...form,
      } as any);
      if (error) throw error;
      toast.success("Application submitted successfully! 🎉");
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { key: "full_name", label: "Full Name", placeholder: "Enter your full name", required: true },
    { key: "email", label: "Email", placeholder: "your@email.com" },
    { key: "mobile_number", label: "Mobile (WhatsApp)", placeholder: "+91 XXXXX XXXXX", required: true },
    { key: "annual_income", label: "Annual Income (₹)", placeholder: "e.g. 1,50,000" },
    { key: "land_size", label: "Land Size", placeholder: "e.g. 1.5 hectares or N/A" },
    { key: "aadhaar_status", label: "Aadhaar Status", placeholder: "Yes / No" },
    { key: "family_size", label: "Family Size", placeholder: "e.g. 5" },
    { key: "category", label: "Category", placeholder: "General / OBC / SC / ST" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mx-2 my-3 glass-card rounded-2xl border border-glass overflow-hidden"
    >
      <div className="gradient-brand px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Apply: {data.scheme_name}</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type="text"
                value={(form as any)[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(220_20%_8%)] border border-glass text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl glass border border-glass text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-brand hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Application
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ApplicationForm;
