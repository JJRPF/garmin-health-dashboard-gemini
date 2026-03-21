"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { ChevronLeft, Save, Sparkles, Brain, User, Lock, Key } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const { t } = useLang();
  
  const [aiProvider, setAiProvider] = useState<"anthropic" | "gemini">("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [garminUsername, setGarminUsername] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [garminOAuth1, setGarminOAuth1] = useState("");
  const [garminOAuth2, setGarminOAuth2] = useState("");
  
  const [message, setMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration safety: read from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("aiProvider") as "anthropic" | "gemini" | null;
    const savedAnthropicKey = localStorage.getItem("anthropicKey") || "";
    const savedGoogleKey = localStorage.getItem("googleKey") || "";
    const savedGarminUsername = localStorage.getItem("garminUsername") || "";
    const savedGarminPassword = localStorage.getItem("garminPassword") || "";
    const savedGarminOAuth1 = localStorage.getItem("garminOAuth1") || "";
    const savedGarminOAuth2 = localStorage.getItem("garminOAuth2") || "";

    if (savedProvider) setAiProvider(savedProvider);
    setAnthropicKey(savedAnthropicKey);
    setGoogleKey(savedGoogleKey);
    setGarminUsername(savedGarminUsername);
    setGarminPassword(savedGarminPassword);
    setGarminOAuth1(savedGarminOAuth1);
    setGarminOAuth2(savedGarminOAuth2);
    setIsHydrated(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem("aiProvider", aiProvider);
    localStorage.setItem("anthropicKey", anthropicKey);
    localStorage.setItem("googleKey", googleKey);
    localStorage.setItem("garminUsername", garminUsername);
    localStorage.setItem("garminPassword", garminPassword);
    localStorage.setItem("garminOAuth1", garminOAuth1);
    localStorage.setItem("garminOAuth2", garminOAuth2);
    
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
        {/* Garmin Section */}
        <div className="card">
          <div className="card-header mb-4">
            <User size={14} className="text-primary" />
            <span>{t("settings.garminSection")}</span>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                {t("settings.garminUsername")}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={garminUsername}
                  onChange={(e) => setGarminUsername(e.target.value)}
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                {t("settings.garminPassword")}
              </label>
              <input
                type="password"
                value={garminPassword}
                onChange={(e) => setGarminPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2 border-t border-border mt-2">
              <p className="text-[10px] text-muted mb-4 italic">
                {t("settings.mfaNote")}
              </p>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                    {t("settings.garminOAuth1")}
                  </label>
                  <textarea
                    value={garminOAuth1}
                    onChange={(e) => setGarminOAuth1(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono h-20 focus:outline-none focus:border-primary transition-colors"
                    placeholder='{"oauth_token":"...","oauth_token_secret":"..."}'
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">
                    {t("settings.garminOAuth2")}
                  </label>
                  <textarea
                    value={garminOAuth2}
                    onChange={(e) => setGarminOAuth2(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono h-20 focus:outline-none focus:border-primary transition-colors"
                    placeholder='{"access_token":"...","refresh_token":"..."}'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider Section */}
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
