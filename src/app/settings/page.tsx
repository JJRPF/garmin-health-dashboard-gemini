"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { ChevronLeft, Save, Sparkles, Brain } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const { t } = useLang();
  
  const [aiProvider, setAiProvider] = useState<"anthropic" | "gemini">("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [message, setMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration safety: read from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("aiProvider") as "anthropic" | "gemini" | null;
    const savedAnthropicKey = localStorage.getItem("anthropicKey") || "";
    const savedGoogleKey = localStorage.getItem("googleKey") || "";

    if (savedProvider) setAiProvider(savedProvider);
    setAnthropicKey(savedAnthropicKey);
    setGoogleKey(savedGoogleKey);
    setIsHydrated(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem("aiProvider", aiProvider);
    localStorage.setItem("anthropicKey", anthropicKey);
    localStorage.setItem("googleKey", googleKey);
    
    setMessage(t("settings.success"));
    setTimeout(() => setMessage(""), 3000);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-muted">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-sm font-bold text-primary">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-6">
        <div className="card">
          <div className="card-header mb-4">
            <Sparkles size={14} className="text-primary" />
            <span>{t("settings.aiProvider")}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={() => setAiProvider("anthropic")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                aiProvider === "anthropic" 
                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "bg-surface border-border text-muted hover:text-secondary"
              }`}
            >
              <Brain size={16} />
              <span className="text-xs font-semibold">Anthropic</span>
            </button>
            <button
              onClick={() => setAiProvider("gemini")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                aiProvider === "gemini" 
                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "bg-surface border-border text-muted hover:text-secondary"
              }`}
            >
              <Sparkles size={16} />
              <span className="text-xs font-semibold">Gemini</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                {t("settings.anthropicKey")}
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={t("settings.placeholders.anthropic")}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                {t("settings.googleKey")}
              </label>
              <input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder={t("settings.placeholders.google")}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <Save size={18} />
          <span>{t("settings.save")}</span>
        </button>

        {message && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-fade-up">
            {message}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
